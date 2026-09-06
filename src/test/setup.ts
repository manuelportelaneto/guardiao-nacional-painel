import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
    cleanup();
});

// Mock Firebase - prevent actual Firebase initialization
vi.mock('../firebaseConfig', () => ({
    app: {},
    auth: {
        currentUser: null,
        onAuthStateChanged: vi.fn((_auth, callback) => {
            // Mock implementation that immediately calls callback with null (logged out) or a mock user
            // For now, simpler to just simulate callback
            // callback(null); // Doing nothing by default to let tests control it via mock properties if needed
            return () => { }; // unsubscribe
        }),
        signInWithEmailAndPassword: vi.fn(),
        createUserWithEmailAndPassword: vi.fn(),
        signOut: vi.fn(),
        GoogleAuthProvider: vi.fn(),
        signInWithPopup: vi.fn(),
    },
    db: {
        collection: vi.fn(),
        doc: vi.fn(),
    },
    storage: {},
}));

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        currentUser: null,
        onAuthStateChanged: vi.fn(),
    })),
    signInWithEmailAndPassword: vi.fn(),
    signInWithPopup: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    signOut: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    onAuthStateChanged: vi.fn(() => {
        return vi.fn(); // unsubscribe
    }),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({
        docs: [],
        empty: true,
        size: 0,
        forEach: function (cb: any) { this.docs.forEach(cb); }
    })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    addDoc: vi.fn(() => Promise.resolve({ id: 'mock-doc-id' })),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    onAuthStateChanged: vi.fn(() => {
        return vi.fn(); // unsubscribe
    }),
    onSnapshot: vi.fn((_ref, callback, _errorCb) => {
        if (typeof callback === 'function') {
            callback({
                docs: [],
                empty: true,
                size: 0,
                forEach: function (cb: any) { this.docs.forEach(cb); }
            });
        }
        return vi.fn();
    }),
    serverTimestamp: vi.fn(() => new Date()),
    increment: vi.fn((val: number) => val),
    Timestamp: {
        now: vi.fn(() => ({ toDate: () => new Date() })),
        fromDate: vi.fn((date) => ({ toDate: () => date })),
    },
}));

// Mock firebase/storage
vi.mock('firebase/storage', () => ({
    getStorage: vi.fn(),
    ref: vi.fn(),
    uploadBytes: vi.fn(),
    getDownloadURL: vi.fn(),
}));

// Mock global fetch for Geocoding API and IP fetching
global.fetch = vi.fn().mockImplementation((url: string) => {
    if (url.includes('maps.googleapis.com')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({
                status: 'OK',
                results: [{ formatted_address: 'Endereço Mock via Fetch' }]
            }),
        });
    }
    if (url.includes('ipapi.co') || url.includes('api.ipify.org')) {
        return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ ip: '127.0.0.1' }),
        });
    }
    return Promise.reject(new Error('Fetch not mocked for this URL'));
});

// Mock Google Maps API
global.google = {
    maps: {
        LatLng: vi.fn((lat, lng) => ({ lat: () => lat, lng: () => lng })),
        LatLngBounds: vi.fn(() => ({
            extend: vi.fn(),
            getCenter: vi.fn(() => ({ lat: () => 0, lng: () => 0 })),
        })),
        places: {
            AutocompleteService: vi.fn(() => ({
                getPlacePredictions: vi.fn(),
            })),
            PlacesService: vi.fn(() => ({
                getDetails: vi.fn(),
            })),
        },
        Geocoder: vi.fn(() => ({
            geocode: vi.fn((request, callback) => {
                callback([{ formatted_address: 'Endereço Mock' }], 'OK');
            }),
        })),
        GeocoderStatus: {
            OK: 'OK',
        },
    },
} as any;

// Mock React Router
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({}),
        useLocation: () => ({ pathname: '/', state: {} }),
        useBlocker: () => ({ state: 'unblocked', proceed: vi.fn(), reset: vi.fn() }),
    };
});
