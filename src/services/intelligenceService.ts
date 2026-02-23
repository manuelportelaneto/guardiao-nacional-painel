import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, limit, orderBy, type DocumentData } from 'firebase/firestore';

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

const MAX_TOTAL_RECORDS = 5000; // Limit to fetch from DB
const MAX_VISIBLE_MARKERS = 1000; // Limit for client performance

/** Apply common filters to a Firestore query. */
function applyFilters(baseQuery: any, filters: IntelligenceFilters) {
    let q = baseQuery;

    if (filters.status && filters.status !== 'all') {
        q = query(q, where('status', '==', filters.status));
    } else {
        q = query(q, where('status', 'in', ['Aprovado', 'Em Análise', 'Resolvido', 'Concluído']));
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

    q = query(q, orderBy('createdAt', 'desc'));
    return q;
}

/** Filter results client-side by map viewport bounds. */
function filterByBounds(docs: any[], bounds: MapBounds) {
    return docs.filter(d => {
        // Location might be in d.location.latitude or d.latitude
        const lat = d.location?.latitude || d.latitude;
        const lng = d.location?.longitude || d.longitude;
        if (!lat || !lng) return false;
        return lat >= bounds.minLat && lat <= bounds.maxLat &&
            lng >= bounds.minLng && lng <= bounds.maxLng;
    });
}

export const intelligenceService = {
    getHeatmapPoints: async (filters: IntelligenceFilters, bounds?: MapBounds): Promise<HeatmapPoint[]> => {
        try {
            let q = applyFilters(query(collection(db, 'contributions')), filters);
            q = query(q, limit(MAX_TOTAL_RECORDS));

            const snapshot = await getDocs(q);
            let docs = snapshot.docs.map(doc => doc.data() as DocumentData);

            if (bounds) docs = filterByBounds(docs, bounds);

            return docs
                .filter(data => (data['location']?.latitude || data['latitude']) && (data['location']?.longitude || data['longitude']))
                .slice(0, MAX_VISIBLE_MARKERS)
                .map(data => ({
                    lat: data['location']?.latitude || data['latitude'],
                    lng: data['location']?.longitude || data['longitude'],
                    intensity: data['riskLevel'] >= 4 ? 1.0 : data['riskLevel'] === 3 ? 0.8 : 0.6 // Slightly higher baseline (0.6) for visibility
                }));
        } catch (error) {
            console.error("Error fetching heatmap data:", error);
            throw error;
        }
    },

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
            console.error("Error fetching map data:", error);
            throw error;
        }
    }
};
