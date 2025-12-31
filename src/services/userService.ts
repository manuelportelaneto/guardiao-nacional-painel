import { db } from '../firebaseConfig';
import { doc, updateDoc, deleteDoc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export interface UserManagement {
    id: string;
    email: string;
    displayName: string;
    cpf?: string;
    role: 'super_admin' | 'admin' | 'city_admin' | 'user';
    professionalRole?: 'servidor' | 'empresa' | 'cidadao';
    accessLevel?: 1 | 2 | 3;
    isDonor?: boolean;
    status: 'active' | 'blocked';
    badges?: string[];
}

/**
 * Updates a user's role and access levels.
 */
export const promoteUser = async (userId: string, data: Partial<UserManagement>) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp()
    });
};

/**
 * Toggles user status between active and blocked.
 */
export const toggleUserBlock = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'blocked' ? 'active' : 'blocked';
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
    });
    return newStatus;
};

/**
 * Removes a user from the platform (soft or hard delete).
 * For this implementation, we do a hard delete from the 'users' collection.
 */
export const removeUser = async (userId: string) => {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef);
};

/**
 * Adds a new user manually (usually for admins or companies).
 */
export const addNewUser = async (userData: Omit<UserManagement, 'id'>) => {
    // In a real scenario, this would likely trigger a Firebase Auth creation too, 
    // but here we manage the Firestore profile.
    const userRef = doc(db, 'users', userData.email); // Using email as ID or generating one
    await setDoc(userRef, {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
};
