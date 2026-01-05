import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy
} from 'firebase/firestore';
import type { ReportData } from './reportService';

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
        let q = query(
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
                    const d = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                    return d >= filters.startDate!;
                });
            }
            if (filters.endDate) {
                data = data.filter(item => {
                    const d = item.createdAt?.toDate ? item.createdAt.toDate() : new Date(item.createdAt);
                    return d <= filters.endDate!;
                });
            }
        }

        return data;
    }
};
