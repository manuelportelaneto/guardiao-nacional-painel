/**
 * @fileoverview Serviço de Inteligência Geográfica e Geoprocessamento (`src/services/intelligenceService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele serve como motor analítico de geolocalização do painel administrativo do Guardião.
 * Ele recupera denúncias cívicas com coordenadas geográficas do Firestore, aplica filtros avançados de data/status/categoria,
 * e converte as informações em pontos de calor (**Heatmap Points**) e marcadores dinâmicos para renderização em mapas Leaflet/OpenStreetMap.
 * 
 * 🏛️ CONCEITOS E ARQUITETURA DE PERFORMANCE:
 * 1. 🚀 MAX_TOTAL_RECORDS (Teto de Consulta - 5000 itens):
 *    Como os bancos Firestore cobram por leitura e o navegador tem limites de memória, estabelecemos um teto de leitura 
 *    na nuvem para proteger a cota do Firebase e a banda de rede do usuário.
 * 
 * 2. 🗺️ FILTRAGEM LOCAL POR ENQUADRAMENTO (Map Bounding Box):
 *    Em vez de forçar o Firebase a rodar consultas geográficas ultra complexas (Geoqueries com Geohashes), 
 *    o serviço traz as coordenadas do servidor e realiza uma filtragem geométrica em memória baseada nas bordas visíveis
 *    da tela do mapa do usuário (minLat, maxLat, minLng, maxLng). Isso torna a navegação infinitamente fluida e instantânea.
 * 
 * 3. 🔥 INTENSIDADE DE RISCO VISUAL (Heatmap Weight):
 *    Pontos com maior classificação de risco de segurança ou calamidade (riskLevel) geram maior raio de calor (intensidade 1.0),
 *    enquanto zeladorias leves ganham intensidades menores, destacando visualmente zonas de atenção (hotspots) para a prefeitura.
 */

import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy, type DocumentData } from 'firebase/firestore';

export interface HeatmapPoint {
    lat: number;
    lng: number;
    intensity: number; // Força do brilho no mapa de calor: escala de 0.0 a 1.0
}

export interface IntelligenceFilters {
    status?: string;
    category?: string;
    categories?: string[];
    startDate?: Date;
    endDate?: Date;
}

/** Delimitação geográfica (bounding box) extraída em tempo real do viewport do mapa Leaflet. */
export interface MapBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

const MAX_TOTAL_RECORDS = 5000; // Limite físico de leitura no Firestore por consulta
const MAX_VISIBLE_MARKERS = 1000; // Limite de renderização simultânea na tela para evitar gargalos na GPU do navegador

/**
 * Construtor e formatador dinâmico de queries estruturadas do Firestore.
 * Concatena cláusulas "where" de acordo com os filtros selecionados pelo gestor na UI do painel.
 */
function applyFilters(baseQuery: any, filters: IntelligenceFilters) {
    let q = baseQuery;

    // Se o filtro de status estiver em branco, trazemos apenas ocorrências aprovadas ou ativas na malha urbana
    if (filters.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
    } else {
        q = query(q, where('status', 'in', ['Aprovado', 'Em Análise', 'Resolvido', 'Concluído']));
    }

    if (filters.categories && filters.categories.length > 0 && !filters.categories.includes('all')) {
        if (filters.categories.length === 1) {
            q = query(q, where('category', '==', filters.categories[0]));
        } else if (filters.categories.length <= 10) {
            q = query(q, where('category', 'in', filters.categories));
        }
    } else if (filters.category && filters.category !== 'all') {
        q = query(q, where('category', '==', filters.category));
    }

    if (filters.startDate) {
        q = query(q, where('createdAt', '>=', filters.startDate));
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999); // Ajusta o horário para o final do dia selecionado
        q = query(q, where('createdAt', '<=', end));
    }

    // Ordenação cronológica reversa (denúncias mais novas primeiro)
    q = query(q, orderBy('createdAt', 'desc'));
    return q;
}

/**
 * Filtra documentos em tempo real no cliente de acordo com a área geográfica visível na tela (Viewport Bounding Box).
 * Isso elimina marcadores fora do ângulo de visão do usuário, liberando performance de renderização.
 */
function filterByBounds(docs: any[], bounds: MapBounds) {
    return docs.filter(d => {
        // Suporta coordenadas aninhadas em d.location (app nativo) ou diretamente em d.latitude (legacy/painel)
        const lat = d.location?.latitude || d.latitude;
        const lng = d.location?.longitude || d.longitude;
        if (!lat || !lng) return false;
        return lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng;
    });
}

export const intelligenceService = {
    /**
     * Gera e formata os pontos do Mapa de Calor (Heatmap) baseados no nível de severidade de risco da IA.
     */
    getHeatmapPoints: async (filters: IntelligenceFilters, bounds?: MapBounds): Promise<HeatmapPoint[]> => {
        try {
            let q = applyFilters(query(collection(db, 'contributions')), filters);
            q = query(q, limit(MAX_TOTAL_RECORDS));

            const snapshot = await getDocs(q);
            let docs = snapshot.docs.map(doc => doc.data() as DocumentData);

            // Se o mapa enviou os limites visíveis da tela, faz o descarte geométrico local instantâneo
            if (bounds) docs = filterByBounds(docs, bounds);

            return docs
                .filter(data => (data['location']?.latitude || data['latitude']) && (data['location']?.longitude || data['longitude']))
                .slice(0, MAX_VISIBLE_MARKERS)
                .map(data => ({
                    lat: data['location']?.latitude || data['latitude'],
                    lng: data['location']?.longitude || data['longitude'],
                    // Lógica de Calor: Risco Crítico (≥4) gera intensidade máxima 1.0; Risco Médio (3) gera 0.8; Leve ou Outros gera 0.6
                    intensity: data['riskLevel'] >= 4 ? 1.0 : data['riskLevel'] === 3 ? 0.8 : 0.6
                }));
        } catch (error) {
            console.error("Falha ao recuperar dados geográficos para o Mapa de Calor:", error);
            throw error;
        }
    },

    /**
     * Recupera os metadados completos de ocorrências geoespaciais com paginação e limites inteligentes de segurança.
     */
    getMapData: async (filters: IntelligenceFilters, bounds?: MapBounds): Promise<any[]> => {
        try {
            let q = applyFilters(query(collection(db, 'contributions')), filters);
            q = query(q, limit(MAX_TOTAL_RECORDS));

            const snapshot = await getDocs(q);
            let docs = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) }));

            if (bounds) docs = filterByBounds(docs, bounds);

            return docs
                .filter((data: any) => (data.location?.latitude || data.latitude) && (data.location?.longitude || data.longitude))
                .slice(0, MAX_VISIBLE_MARKERS);
        } catch (error) {
            console.error("Falha ao recuperar registros do Mapa Analítico:", error);
            throw error;
        }
    }
};

