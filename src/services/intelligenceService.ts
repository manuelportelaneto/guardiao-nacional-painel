import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';

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
                // By default, exclude rejected items unless specified
                q = query(q, where('status', '!=', 'rejected'));
            }

            if (filters.category && filters.category !== 'all') {
                q = query(q, where('category', '==', filters.category));
            }

            // Date filtering requires a composite index if mixed with other equality filters
            // For now, we will fetch most recent 500 and filter in memory if needed for simplicity
            // or assume we are just showing the "current state"
            // If startDate is massive, we might need composite indexes.
            // Let's rely on 'createdAt' ordering.

            q = query(q, orderBy('createdAt', 'desc'), limit(1000));

            const snapshot = await getDocs(q);

            const points: HeatmapPoint[] = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.location && data.location.latitude && data.location.longitude) {
                    // Calculate intensity based on risk or likes
                    // Default baseline intensity
                    let intensity = 0.5;

                    // Increase for high risk
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
    }
};
