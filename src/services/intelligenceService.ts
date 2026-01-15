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
                // Equality filter doesn't force specific orderBy first, so we can order by date directly if we want
                q = query(q, orderBy('createdAt', 'desc'));
            } else {
                // By default, exclude rejected items unless specified
                // Inequality filter (status != rejected) REQUIRES orderBy('status') to be the first orderBy
                q = query(q, where('status', '!=', 'rejected'), orderBy('status'), orderBy('createdAt', 'desc'));
            }

            if (filters.category && filters.category !== 'all') {
                q = query(q, where('category', '==', filters.category));
            }

            q = query(q, limit(1000));

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
