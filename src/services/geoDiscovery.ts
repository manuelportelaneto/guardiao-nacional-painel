import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const stateToRegion: Record<string, string> = {
    'AC': 'Norte', 'AP': 'Norte', 'AM': 'Norte', 'PA': 'Norte', 'RO': 'Norte', 'RR': 'Norte', 'TO': 'Norte',
    'AL': 'Nordeste', 'BA': 'Nordeste', 'CE': 'Nordeste', 'MA': 'Nordeste', 'PB': 'Nordeste', 'PE': 'Nordeste', 'PI': 'Nordeste', 'RN': 'Nordeste', 'SE': 'Nordeste',
    'DF': 'Centro-Oeste', 'GO': 'Centro-Oeste', 'MT': 'Centro-Oeste', 'MS': 'Centro-Oeste',
    'ES': 'Sudeste', 'MG': 'Sudeste', 'RJ': 'Sudeste', 'SP': 'Sudeste',
    'PR': 'Sul', 'RS': 'Sul', 'SC': 'Sul'
};

export interface GeoLocation {
    city: string;
    state: string;
    region: string;
    country: string;
}

/**
 * Extracts geographical hierarchy from an address string.
 * Expected format: "City, State - Brasil" or similar.
 * For simplicity, we assume the format is handled by the reporting screen.
 */
export const extractGeoHierarchy = (address: string): GeoLocation => {
    // Basic regex to pull City and state code (UF)
    // Example: "São Paulo, SP - Brasil"
    const parts = address.split(',').map(p => p.trim());
    let city = 'Desconhecido';
    let state = 'UF';
    let region = 'Brasil';

    if (parts.length >= 1) {
        city = parts[0];
    }

    if (parts.length >= 2) {
        const statePart = parts[1].split('-')[0].trim();
        state = statePart.toUpperCase().substring(0, 2);
    }

    region = stateToRegion[state] || 'Desconhecido';

    return {
        city,
        state,
        region,
        country: 'Brasil'
    };
};

/**
 * Ensures the geographical hierarchy exists in Firestore.
 */
export const ensureGeoHierarchyExists = async (geo: GeoLocation) => {
    const { country, region, state, city } = geo;

    // Brasil
    const countryRef = doc(db, 'geo_hierarchy', country);
    const countrySnap = await getDoc(countryRef);
    if (!countrySnap.exists()) {
        await setDoc(countryRef, { name: country, type: 'country', createdAt: serverTimestamp() });
    }

    // Region
    const regionRef = doc(db, 'geo_hierarchy', country, 'regions', region);
    const regionSnap = await getDoc(regionRef);
    if (!regionSnap.exists()) {
        await setDoc(regionRef, { name: region, type: 'region', createdAt: serverTimestamp() });
    }

    // State
    const stateRef = doc(db, 'geo_hierarchy', country, 'regions', region, 'states', state);
    const stateSnap = await getDoc(stateRef);
    if (!stateSnap.exists()) {
        await setDoc(stateRef, { name: state, type: 'state', status: 'active', createdAt: serverTimestamp() });
    }

    // City
    const cityRef = doc(db, 'cities', city); // Keeping cities flattened for easier direct access, but linking geo
    const citySnap = await getDoc(cityRef);
    if (!citySnap.exists()) {
        await setDoc(cityRef, {
            name: city,
            uf: state,
            region,
            country,
            status: 'active',
            createdAt: serverTimestamp(),
            lastActivity: serverTimestamp()
        });
    }
};
