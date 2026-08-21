/**
 * @fileoverview Serviço de Cache Diário (24h) e Descoberta Automática de Jurisdições (`dataSyncService.ts`).
 * 
 * Reduz drasticamente o consumo de leituras no Firestore lendo dados apenas 1x ao dia,
 * permitindo ao SysAdmin forçar a sincronização a qualquer momento para relatórios ou auditoria.
 * Ao ler as contribuições, detecta automaticamente novos municípios e estados que enviaram demandas.
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { Contribution } from '../types/contribution';

const CACHE_KEY_CONTRIBUTIONS = 'guardiao_daily_contributions_cache';
const CACHE_KEY_LAST_SYNC = 'guardiao_daily_last_sync_timestamp';
const CACHE_KEY_DISCOVERED_CITIES = 'guardiao_discovered_jurisdictions';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export interface DiscoveredCity {
    id: string;
    name: string;
    state: string;
    totalContributions: number;
    firstDiscoveredAt: string;
    status: 'Monitoramento Cívico' | 'Em Análise' | 'Ativa';
}

export interface SyncResult {
    contributions: Contribution[];
    newCitiesDiscovered: DiscoveredCity[];
    fromCache: boolean;
    lastSyncAt: Date;
    totalRead: number;
}

export const dataSyncService = {
    /**
     * Retorna a data/hora da última sincronização completa do banco de dados.
     */
    getLastSyncTime(): Date | null {
        const raw = localStorage.getItem(CACHE_KEY_LAST_SYNC);
        return raw ? new Date(parseInt(raw, 10)) : null;
    },

    /**
     * Retorna a lista de cidades descobertas salvas em cache.
     */
    getDiscoveredCities(): DiscoveredCity[] {
        try {
            const raw = localStorage.getItem(CACHE_KEY_DISCOVERED_CITIES);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    },

    /**
     * Obtém contribuições com política de cache de 24h para economizar leituras do Firestore.
     * Caso `forceRefresh` seja true ou o cache tenha mais de 24h, executa a leitura completa do Firestore.
     */
    async syncData(forceRefresh = false): Promise<SyncResult> {
        const lastSyncRaw = localStorage.getItem(CACHE_KEY_LAST_SYNC);
        const lastSyncTimestamp = lastSyncRaw ? parseInt(lastSyncRaw, 10) : 0;
        const isExpired = Date.now() - lastSyncTimestamp > ONE_DAY_MS;

        // Se cache ainda é válido (< 24h) e não foi forçado, retorna cache local sem ler Firestore
        if (!forceRefresh && !isExpired && lastSyncRaw) {
            const cachedContribsRaw = localStorage.getItem(CACHE_KEY_CONTRIBUTIONS);
            if (cachedContribsRaw) {
                try {
                    const contributions: Contribution[] = JSON.parse(cachedContribsRaw);
                    return {
                        contributions,
                        newCitiesDiscovered: this.getDiscoveredCities(),
                        fromCache: true,
                        lastSyncAt: new Date(lastSyncTimestamp),
                        totalRead: contributions.length,
                    };
                } catch {
                    // Se falhar o parse, força nova leitura
                }
            }
        }

        // Leitura completa no Firestore (1x ao dia ou forçada)
        const snap = await getDocs(collection(db, 'contributions'));
        const contributions: Contribution[] = snap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Contribution[];

        // Motor de Descoberta Automática de Jurisdições
        const discoveredMap = new Map<string, DiscoveredCity>();
        
        // Carrega cidades já conhecidas
        const knownCities = this.getDiscoveredCities();
        knownCities.forEach(c => discoveredMap.set(c.id, c));

        contributions.forEach(c => {
            const cityName = c.city?.trim();
            const stateName = c.state?.trim().toUpperCase() || 'SP';
            if (cityName) {
                const slug = cityName.toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-');
                
                const existing = discoveredMap.get(slug);
                if (existing) {
                    existing.totalContributions += 1;
                } else {
                    discoveredMap.set(slug, {
                        id: slug,
                        name: cityName,
                        state: stateName,
                        totalContributions: 1,
                        firstDiscoveredAt: new Date().toISOString(),
                        status: 'Monitoramento Cívico'
                    });
                }
            }
        });

        const allDiscovered = Array.from(discoveredMap.values());

        // Salva snapshot no cache local
        try {
            localStorage.setItem(CACHE_KEY_CONTRIBUTIONS, JSON.stringify(contributions));
            localStorage.setItem(CACHE_KEY_LAST_SYNC, Date.now().toString());
            localStorage.setItem(CACHE_KEY_DISCOVERED_CITIES, JSON.stringify(allDiscovered));
        } catch (e) {
            console.warn('Não foi possível salvar cache local de contribuições:', e);
        }

        return {
            contributions,
            newCitiesDiscovered: allDiscovered,
            fromCache: false,
            lastSyncAt: new Date(),
            totalRead: contributions.length,
        };
    }
};
