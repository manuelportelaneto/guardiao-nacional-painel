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
     * Busca ocorrências filtradas por cidade
     */
    async getCityContributions(cityId: string, filters?: {
        status?: string,
        category?: string,
        startDate?: Date,
        endDate?: Date
    }): Promise<ReportData[]> {
        const contributionsRef = collection(db, 'contributions');
        const q = query(
            contributionsRef,
            where('cityId', '==', cityId),
            orderBy('createdAt', 'desc')
        );

        // Firebase requires composite indexes for multiple where + orderBy.
        // For simplicity and to avoid index errors in this demo phase, 
        // we'll apply some filters client-side if they are complex, 
        // or just use the basic city filter.

        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as ReportData[];

        // Client-side filtering for robustness
        if (filters) {
            if (filters.status && filters.status !== 'all') {
                data = data.filter(item => item.status === filters.status);
            }
            if (filters.category && filters.category !== 'all') {
                data = data.filter(item => item.category === filters.category);
            }
            if (filters.startDate) {
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
     * Atualiza o status de uma ocorrência
     */
    async updateStatus(contributionId: string, newStatus: string): Promise<void> {
        const docRef = doc(db, 'contributions', contributionId);
        await updateDoc(docRef, {
            status: newStatus,
            updatedAt: new Date()
        });

        // Trigger Automation
        // We need to fetch the contribution data first to pass it to the engine, 
        // but for now we'll pass the ID and let the engine handle it or just pass minimal data
        // Ideally runAutomation should fetch if needed, but current impl expects full entity.
        // Let's fetch it for correctness.
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            await automationService.runAutomation('status_updated', { id: contributionId, ...snap.data() });
        }
    }
};
