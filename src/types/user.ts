
export type UserRole = 'admin' | 'presidente' | 'governador' | 'prefeito' | 'servidor' | 'citizen';

export interface UserData {
    uid: string;
    email: string | null;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    assignedMunicipalities?: string[]; // IDs of cities managed by gestor/servidor
    // ... other fields
}
