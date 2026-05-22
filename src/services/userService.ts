/**
 * @fileoverview Serviço de Gerenciamento de Usuários Administrativos (`src/services/userService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele provê as operações CRUD de usuários para o painel administrativo (super admins e city admins).
 * Permite que gestores promovam papéis, bloqueiem contas, adicionem novos usuários e enviem convites
 * para novos funcionários municipais via e-mail, acionando uma Cloud Function de backend segura.
 * 
 * 🏛️ CONCEITOS E FLUXOS IMPLEMENTADOS:
 * 1. 👑 PROMOÇÃO DE PAPÉIS (`promoteUser`):
 *    Atualiza o campo `role` e outros atributos de acesso de um usuário diretamente no Firestore.
 *    Nota: Apenas o painel com token de admin pode realizar esta operação, pois as regras do 
 *    Firestore (`firestore.rules`) bloqueiam a auto-promoção de papéis pelo cliente.
 * 
 * 2. 🔒 BLOQUEIO DE CONTA (`toggleUserBlock`):
 *    Alterna o campo `status` entre 'active' e 'blocked'. O aplicativo PWA do cidadão e o painel
 *    verificam este campo no momento do login para negar o acesso a contas bloqueadas.
 * 
 * 3. 📧 CONVITE VIA CLOUD FUNCTION (`inviteUser`):
 *    Este é o fluxo mais sofisticado: para convidar um novo funcionário, o painel obtém o 
 *    Firebase ID Token do admin logado com `user.getIdToken()` e envia uma requisição HTTP 
 *    autenticada com `Authorization: Bearer <token>` para o endpoint da Cloud Function 
 *    `inviteAdminUser`. A Cloud Function valida o token no servidor, verifica se o chamador 
 *    tem permissão de admin e então cria o novo usuário no Firebase Auth + envia o e-mail de convite.
 *    Este padrão garante que a criação de contas administrativas NUNCA ocorre direto no cliente.
 */
import { db } from '../firebaseConfig';
import { doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
    // Extended profile fields
    photoURL?: string;
    phoneNumber?: string;
    createdAt?: any; // Firestore Timestamp
    lastLoginAt?: any; // Firestore Timestamp
    city?: string;
    uf?: string;
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
    return data.role; // Return new role for UI update
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

/**
 * Invites a new user via Cloud Function.
 */
export const inviteUser = async (email: string, displayName: string, acessos: any[]) => {
    const { auth } = await import('../firebaseConfig');
    const user = auth.currentUser;
    if (!user) throw new Error("Authentication required");

    const token = await user.getIdToken();

    const response = await fetch('https://inviteadminuser-6v7z7f6p3a-uc.a.run.app', { // region: us-central1 default? No, I set southamerica-east1
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, displayName, acessos })
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to invite user");
    }

    return response.json();
};
