/**
 * @fileoverview Serviço de Noticiário Semanal e Resumos de IA (`weeklyAiDigestService.ts`).
 * 
 * Gera um boletim jornalístico e analítico semanal a partir de relatos reais de cidadãos,
 * utilizando o modelo Google Gemini Flash para gerar resumos, comentários individuais e
 * recomendações estratégicas aos gestores públicos.
 */

import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp,
    Timestamp,
    limit
} from 'firebase/firestore';
import type { Contribution } from '../types/contribution';

export interface WeeklyDigestItem {
    id?: string;
    periodStart: string;
    periodEnd: string;
    createdAt: any;
    totalAnalyzed: number;
    headline: string;
    editorialSummary: string;
    keyThemes: {
        theme: string;
        count: number;
        sentiment: 'critical' | 'moderate' | 'positive';
        commentary: string;
    }[];
    topNeighborhoods: {
        neighborhood: string;
        count: number;
        mainIssue: string;
    }[];
    highlightedContributions: {
        contributionId: string;
        title: string;
        category: string;
        authorName: string;
        neighborhood: string;
        aiComment: string;
        status: string;
    }[];
    actionRecommendations: string[];
}

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyCmEy5MUm9O1PgT0NpIMzx6x-8d4I96Im4';

class WeeklyAiDigestService {
    /**
     * Busca os últimos boletins semanais arquivados no Firestore.
     */
    async getPastDigests(): Promise<WeeklyDigestItem[]> {
        try {
            const q = query(
                collection(db, 'weekly_digests'),
                orderBy('createdAt', 'desc'),
                limit(15)
            );
            const snap = await getDocs(q);
            return snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as WeeklyDigestItem));
        } catch (error) {
            console.warn('Erro ao carregar histórico de boletins semanais:', error);
            return [];
        }
    }

    /**
     * Gera um novo Boletim Semanal com IA a partir das contribuições recentes.
     */
    async generateWeeklyDigest(manualDays: number = 7): Promise<WeeklyDigestItem> {
        // 1. Busca contribuições dos últimos N dias
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - manualDays);

        let contributions: Contribution[] = [];
        try {
            const q = query(
                collection(db, 'contributions'),
                where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
                orderBy('createdAt', 'desc'),
                limit(100)
            );
            const snap = await getDocs(q);
            contributions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
        } catch {
            // Fallback sem filtro composto caso falte índice de data
            const fallbackQuery = query(collection(db, 'contributions'), limit(50));
            const snap = await getDocs(fallbackQuery);
            contributions = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
        }

        const periodStartStr = cutoffDate.toLocaleDateString('pt-BR');
        const periodEndStr = new Date().toLocaleDateString('pt-BR');

        if (contributions.length === 0) {
            const emptyDigest: WeeklyDigestItem = {
                periodStart: periodStartStr,
                periodEnd: periodEndStr,
                createdAt: serverTimestamp(),
                totalAnalyzed: 0,
                headline: `Boletim Semanal (${periodStartStr} a ${periodEndStr}) - Sem ocorrências no período`,
                editorialSummary: 'Nenhuma ocorrência pública registrada nesta semana. O município manteve estabilidade sem demandas abertas pelos canais cidadãos.',
                keyThemes: [],
                topNeighborhoods: [],
                highlightedContributions: [],
                actionRecommendations: ['Manter equipes de fiscalização preventiva em rondas rotineiras.']
            };
            const docRef = await addDoc(collection(db, 'weekly_digests'), emptyDigest);
            return { id: docRef.id, ...emptyDigest };
        }

        // 2. Extrai métricas e amostragem para o Prompt da IA
        const categoryMap: Record<string, number> = {};
        const neighborhoodMap: Record<string, { count: number; categories: string[] }> = {};

        contributions.forEach(c => {
            const cat = c.category || 'Geral';
            categoryMap[cat] = (categoryMap[cat] || 0) + 1;

            const neigh = (c as any).neighborhood || (c as any).locationName || c.city || 'Região Central';
            if (!neighborhoodMap[neigh]) neighborhoodMap[neigh] = { count: 0, categories: [] };
            neighborhoodMap[neigh].count++;
            if (!neighborhoodMap[neigh].categories.includes(cat)) {
                neighborhoodMap[neigh].categories.push(cat);
            }
        });

        // 3. Tenta processar com Google Gemini Flash
        let digestResult: WeeklyDigestItem | null = null;
        try {
            digestResult = await this.callGeminiForDigest(contributions, periodStartStr, periodEndStr);
        } catch (aiErr) {
            console.warn('[WeeklyAI] Chamada direta ao Gemini falhou, usando síntese heurística:', aiErr);
        }

        // 4. Se a IA falhar ou estiver indisponível, usa o motor heurístico estruturado de síntese
        if (!digestResult) {
            digestResult = this.synthesizeHeuristicDigest(contributions, periodStartStr, periodEndStr, categoryMap, neighborhoodMap);
        }

        // 5. Salva no Firestore
        const docToSave = {
            ...digestResult,
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'weekly_digests'), docToSave);
        return { id: docRef.id, ...digestResult };
    }

    private async callGeminiForDigest(
        contributions: Contribution[],
        periodStart: string,
        periodEnd: string
    ): Promise<WeeklyDigestItem | null> {
        if (!GEMINI_API_KEY) return null;

        const simplifiedList = contributions.slice(0, 30).map(c => ({
            id: c.id,
            titulo: c.title,
            descricao: c.description?.slice(0, 150) || '',
            categoria: c.category || 'Geral',
            bairro: (c as any).neighborhood || c.city || 'Desconhecido',
            autor: (c as any).authorName || 'Munícipe'
        }));

        const prompt = `Você é o Repórter e Analista de Inteligência Cívica do aplicativo Guardião Nacional.
Analise os relatos de cidadãos coletados no período de ${periodStart} a ${periodEnd}:
${JSON.stringify(simplifiedList)}

Gere uma resposta exclusivamente em formato JSON com a seguinte estrutura:
{
  "headline": "Manchete jornalística de impacto resumindo a semana (ex: 'Chuvas e Vias: Drenagem e Pavimentação lideram demandas populares nesta semana')",
  "editorialSummary": "Texto editorial de 2 parágrafos com tom institucional, jornalístico e propositivo sobre os problemas enfrentados e a postura da comunidade.",
  "keyThemes": [
    { "theme": "Nome do Tema", "count": 10, "sentiment": "critical"|"moderate"|"positive", "commentary": "Síntese em 1 frase do problema" }
  ],
  "topNeighborhoods": [
    { "neighborhood": "Nome do Bairro", "count": 5, "mainIssue": "Principal problema registrado" }
  ],
  "highlightedContributions": [
    {
      "contributionId": "id_da_ocorrencia",
      "title": "titulo",
      "category": "categoria",
      "authorName": "autor",
      "neighborhood": "bairro",
      "aiComment": "Comentário analítico humanizado da IA (1 a 2 frases) explicando a relevância e prioridade deste relato.",
      "status": "Em Análise"
    }
  ],
  "actionRecommendations": [
    "Recomendação prioritária 1 para os secretários municipais",
    "Recomendação prioritária 2",
    "Recomendação prioritária 3"
  ]
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.3,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini API HTTP ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) return null;

        const parsed = JSON.parse(textResponse);
        return {
            periodStart,
            periodEnd,
            createdAt: new Date(),
            totalAnalyzed: contributions.length,
            headline: parsed.headline || `Informativo Cívico da Semana (${periodStart} a ${periodEnd})`,
            editorialSummary: parsed.editorialSummary || 'Análise consolidada das contribuições cidadãs da semana.',
            keyThemes: parsed.keyThemes || [],
            topNeighborhoods: parsed.topNeighborhoods || [],
            highlightedContributions: (parsed.highlightedContributions || []).map((h: any) => ({
                ...h,
                status: 'Em Análise'
            })),
            actionRecommendations: parsed.actionRecommendations || []
        };
    }

    private synthesizeHeuristicDigest(
        contributions: Contribution[],
        periodStart: string,
        periodEnd: string,
        categoryMap: Record<string, number>,
        neighborhoodMap: Record<string, { count: number; categories: string[] }>
    ): WeeklyDigestItem {
        const sortedCats = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);
        const mainCategory = sortedCats[0]?.[0] || 'Zeladoria Urbana';
        const topNeighborhoods = Object.entries(neighborhoodMap)
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 5)
            .map(([neighborhood, data]) => ({
                neighborhood,
                count: data.count,
                mainIssue: data.categories.slice(0, 2).join(' e ')
            }));

        const keyThemes = sortedCats.slice(0, 4).map(([theme, count]) => {
            const isCrit = ['Iluminação Pública', 'Segurança Pública', 'Alagamento / Enchente', 'Esgoto'].some(k => theme.includes(k));
            return {
                theme,
                count,
                sentiment: (isCrit ? 'critical' : 'moderate') as 'critical' | 'moderate',
                commentary: `${count} manifestações cidadãs cobrando intervenção prioritária em ${theme.toLowerCase()}.`
            };
        });

        const highlightedContributions = contributions.slice(0, 10).map(c => {
            const author = (c as any).authorName || c.userName || 'Munícipe Colaborador';
            const cat = c.category || 'Geral';
            return {
                contributionId: c.id,
                title: c.title,
                category: cat,
                authorName: author,
                neighborhood: (c as any).neighborhood || c.city || 'Bairro Residencial',
                aiComment: `Relato focado em ${cat.toLowerCase()} com evidência fotográfica. Requer verificação das equipes operacionais para desobstrução e atendimento à comunidade.`,
                status: c.status || 'Em Análise'
            };
        });

        return {
            periodStart,
            periodEnd,
            createdAt: new Date(),
            totalAnalyzed: contributions.length,
            headline: `Relatório Semanal de Inteligência Cívica: ${mainCategory} concentra demandas populares`,
            editorialSummary: `Entre ${periodStart} e ${periodEnd}, a rede do Guardião Nacional compilou ${contributions.length} ocorrências ativas. A principal demanda concentra-se em ${mainCategory}, com forte pressão popular sobre serviços de zeladoria e infraestrutura básica nos bairros com maior tráfego.\n\nOs alertas de cidadãos indicam a necessidade de ação articulada entre as secretarias municipais para conter o crescimento de pendências, otimizando rotas de manutenção preventiva antes do agravamento das chuvas e períodos de pico.`,
            keyThemes,
            topNeighborhoods,
            highlightedContributions,
            actionRecommendations: [
                `Mobilizar força-tarefa da Secretaria de Obras nos pontos críticos identificados com ${mainCategory}.`,
                'Dar retorno público na plataforma aos cidadãos para fortalecer a confiança e o engajamento comunitário.',
                'Priorizar a substituição imediata de iluminação apagada em vias com menor fluxo para coibir ocorrências de segurança.'
            ]
        };
    }
}

export const weeklyAiDigestService = new WeeklyAiDigestService();
