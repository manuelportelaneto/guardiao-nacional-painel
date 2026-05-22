/**
 * @fileoverview Serviço de Denúncias Cívicas do Painel Administrativo (`src/services/contributionService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele provê a camada de leitura e atualização de denúncias cívicas para o painel do gestor municipal. 
 * É a ponte entre as telas de moderação/CRM do `guardiao-painel` e a coleção `contributions` no Firestore.
 * 
 * 🏛️ CONCEITOS E DECISÕES DE ENGENHARIA:
 * 1. 🔍 LIMITAÇÃO DE ÍNDICES COMPOSTOS DO FIRESTORE:
 *    O Firestore exige índices compostos explicitamente criados no Console do Firebase para qualquer
 *    query que combine múltiplos `where()` com `orderBy()`. Para evitar erros de índice durante o
 *    desenvolvimento ou ao aplicar filtros arbitrários (status + categoria + período de datas), a query
 *    principal usa apenas `cityId + orderBy(createdAt)` — um índice simples que já existe.
 *    Os demais filtros são processados localmente no cliente (Client-Side Filtering), evitando a
 *    necessidade de criar múltiplos índices compostos para cada combinação possível de filtro.
 * 
 * 2. ⛓️ ENCADEAMENTO AUTOMÁTICO DE AUTOMAÇÃO (Automation Trigger Chain):
 *    Sempre que um gestor atualiza o status de uma denúncia (ex: `pending` → `resolved`), o serviço
 *    dispara o motor de automação (`automationService.runAutomation`) com o evento `status_updated`.
 *    Isso aciona regras como notificações automáticas ao cidadão ou geração de relatórios de SLA.
 *    A denúncia é buscada novamente no banco ANTES de disparar a automação para garantir que o motor
 *    receba o documento atualizado, com o novo status já gravado.
 */

import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    doc,
    updateDoc,
    getDoc
} from 'firebase/firestore';
import type { ReportData } from './reportService';
import { automationService } from './automationService';

export const contributionService = {

    /**
     * Busca denúncias cívicas filtradas pelo município do gestor logado.
     * 
     * A query principal filtra apenas por `cityId` e ordena por data de criação.
     * Filtros secundários (status, categoria, data) são aplicados localmente em memória
     * para contornar as limitações de índices compostos do Firestore.
     */
    async getCityContributions(cityId: string, filters?: {
        status?: string,
        category?: string,
        startDate?: Date,
        endDate?: Date
    }): Promise<ReportData[]> {
        const contributionsRef = collection(db, 'contributions');

        // Query mínima: apenas cityId + ordenação temporal para não exigir índice composto
        const q = query(
            contributionsRef,
            where('cityId', '==', cityId),
            orderBy('createdAt', 'desc')
        );

        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ReportData[];

        // Filtragem secundária local (client-side) para suportar combinações arbitrárias de filtros
        if (filters) {
            if (filters.status && filters.status !== 'all') {
                data = data.filter(item => item.status === filters.status);
            }
            if (filters.category && filters.category !== 'all') {
                data = data.filter(item => item.category === filters.category);
            }
            if (filters.startDate) {
                // Compatível com Timestamps do Firestore (objetos com .toDate()) e strings ISO
                data = data.filter(item => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const d = (item.createdAt as any)?.toDate ? (item.createdAt as any).toDate() : new Date(item.createdAt as string | number | Date);
                    return d >= filters.startDate!;
                });
            }
            if (filters.endDate) {
                data = data.filter(item => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const d = (item.createdAt as any)?.toDate ? (item.createdAt as any).toDate() : new Date(item.createdAt as string | number | Date);
                    return d <= filters.endDate!;
                });
            }
        }

        return data;
    },

    /**
     * Atualiza o status de uma denúncia e dispara o motor de automação em cadeia.
     * 
     * Fluxo:
     * 1. Atualiza o campo `status` e `updatedAt` no documento do Firestore.
     * 2. Recarrega o documento atualizado para garantir que o motor de automação
     *    receba o estado mais recente (incluindo o novo status gravado).
     * 3. Dispara `automationService.runAutomation('status_updated', ...)` 
     *    para que regras configuradas pelo gestor (ex: notificar cidadão) sejam executadas.
     */
    async updateStatus(contributionId: string, newStatus: string): Promise<void> {
        const docRef = doc(db, 'contributions', contributionId);

        // 1. Atualização atômica de status
        await updateDoc(docRef, {
            status: newStatus,
            updatedAt: new Date()
        });

        // 2. Releitura para garantir consistência de dados antes do disparo de automação
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            // 3. Disparo do motor de automação com o documento já atualizado
            await automationService.runAutomation('status_updated', { id: contributionId, ...snap.data() });
        }
    }
};
