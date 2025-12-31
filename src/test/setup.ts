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
        onAuthStateChanged: vi.fn((callback) => {
            callback(null);
            return vi.fn(); // unsubscribe
        }),
        signInWithEmailAndPassword: vi.fn(),
        signInWithPopup: vi.fn(),
        signOut: vi.fn(),
        createUserWithEmailAndPassword: vi.fn(),
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
    onAuthStateChanged: vi.fn((auth, callback) => {
        callback(null);
        return vi.fn();
    }),
}));

// Mock firebase/firestore
vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    collection: vi.fn(),
    doc: vi.fn(),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => false, data: () => null })),
    setDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    onSnapshot: vi.fn((ref, callback) => {
        callback({ docs: [] });
        return vi.fn();
    }),
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

// Mock React Router
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({}),
        useLocation: () => ({ pathname: '/' }),
    };
});
