import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, type DocumentData } from 'firebase/firestore';

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

/** Geographic bounding box from the current Leaflet map viewport. */
export interface MapBounds {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
}

const MAX_MARKERS = 2000; // Performance cap per viewport load

/** Apply common filters to a Firestore query. */
function applyFilters(baseQuery: any, filters: IntelligenceFilters) {
    let q = baseQuery;

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
    return q;
}

/** Filter results client-side by map viewport bounds to avoid Geo queries that require a separate Geo library. */
function filterByBounds(docs: any[], bounds: MapBounds) {
    return docs.filter(d => {
        const lat = d.location?.latitude;
        const lng = d.location?.longitude;
        if (!lat || !lng) return false;
        return lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng;
    });
}

export const intelligenceService = {
    /**
     * Fetches heatmap points, optionally clipped to the current map viewport.
     */
    getHeatmapPoints: async (filters: IntelligenceFilters, bounds?: MapBounds): Promise<HeatmapPoint[]> => {
        try {
            let q = applyFilters(query(collection(db, 'contributions')), filters);
            q = query(q, limit(bounds ? 2000 : 1000)); // Fetch more when bounds filtering will reduce count

            const snapshot = await getDocs(q);
            let docs = snapshot.docs.map(doc => doc.data() as DocumentData);

            if (bounds) docs = filterByBounds(docs, bounds);

            return docs
                .filter(data => data['location']?.latitude && data['location']?.longitude)
                .slice(0, MAX_MARKERS)
                .map(data => ({
                    lat: data['location'].latitude,
                    lng: data['location'].longitude,
                    intensity: data['riskLevel'] >= 4 ? 1.0 : data['riskLevel'] === 3 ? 0.8 : 0.5
                }));
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
            throw error;
        }
    },

    /**
     * Fetches cluster map markers, clipped to the current viewport when bounds are provided.
     * Limits to MAX_MARKERS for performance.
     */
    getMapData: async (filters: IntelligenceFilters, bounds?: MapBounds): Promise<any[]> => {
        try {
            let q = applyFilters(query(collection(db, 'contributions')), filters);
            q = query(q, limit(bounds ? 2000 : 1000));

            const snapshot = await getDocs(q);
            let docs: Record<string, any>[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Record<string, any>) }));

            if (bounds) docs = filterByBounds(docs, bounds);

            return docs
                .filter((data: any) => data.location?.latitude && data.location?.longitude)
                .slice(0, MAX_MARKERS);
        } catch (error) {
            console.error("Error fetching map data:", error);
            throw error;
        }
    }
};
