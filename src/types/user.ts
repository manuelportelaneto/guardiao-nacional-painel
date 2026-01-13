
export type UserRole = 'super_admin' | 'admin' | 'city_admin' | 'presidente' | 'governador' | 'prefeito' | 'servidor' | 'citizen';

export interface UserData {
    uid: string;
    email: string | null;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    accessLevel?: number;
    assignedMunicipalities?: string[]; // IDs of cities managed by gestor/servidor
    // ... other fields
}
