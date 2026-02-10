import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

export interface HeatmapPoint {
    lat: number;
    lng: number;
    intensity: number; // 0 to 1
}

export interface IntelligenceFilters {
    status?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
}

export const intelligenceService = {
    /**
     * Fetches data points for the heatmap based on filters.
     * Optimized to fetch only necessary fields (location, severity/risk).
     */
    getHeatmapPoints: async (filters: IntelligenceFilters): Promise<HeatmapPoint[]> => {
        try {
            let q = query(collection(db, 'contributions'));

            // Apply filters
            if (filters.status && filters.status !== 'all') {
                q = query(q, where('status', '==', filters.status));
            } else {
                q = query(q, where('status', '!=', 'rejected'));
            }

            if (filters.category && filters.category !== 'all') {
                q = query(q, where('category', '==', filters.category));
            }

            if (filters.startDate) {
                q = query(q, where('createdAt', '>=', filters.startDate));
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                q = query(q, where('createdAt', '<=', end));
            }

            // Order by for compound queries might require specific index
            // For now, we rely on client-side sorting if needed or index creation
            // q = query(q, orderBy('createdAt', 'desc'));

            q = query(q, limit(1000));

            const snapshot = await getDocs(q);

            const points: HeatmapPoint[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.location && data.location.latitude && data.location.longitude) {
                    let intensity = 0.5;
                    if (data.riskLevel && data.riskLevel >= 4) intensity = 1.0;
                    else if (data.riskLevel === 3) intensity = 0.8;

                    points.push({
                        lat: data.location.latitude,
                        lng: data.location.longitude,
                        intensity
                    });
                }
            });

            return points;
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
            throw error;
        }
    },

    getMapData: async (filters: IntelligenceFilters): Promise<any[]> => {
        try {
            let q = query(collection(db, 'contributions'));

            if (filters.status && filters.status !== 'all') {
                q = query(q, where('status', '==', filters.status));
            } else {
                q = query(q, where('status', '!=', 'rejected'));
            }

            if (filters.category && filters.category !== 'all') {
                q = query(q, where('category', '==', filters.category));
            }

            if (filters.startDate) {
                q = query(q, where('createdAt', '>=', filters.startDate));
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                q = query(q, where('createdAt', '<=', end));
            }

            q = query(q, limit(1000));

            const snapshot = await getDocs(q);

            return snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((data: any) => data.location && data.location.latitude && data.location.longitude);
        } catch (error) {
            console.error("Error fetching map data:", error);
            throw error;
        }
    }
};
