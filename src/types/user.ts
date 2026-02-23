
export type UserRole = 'super_admin' | 'admin' | 'city_admin' | 'presidente' | 'governador' | 'prefeito' | 'servidor' | 'citizen';

export interface UserData {
    uid: string;
    email: string | null;
    role: UserRole;
    firstName?: string;
    lastName?: string;
    displayName?: string;
    photoURL?: string;
    accessLevel?: number;
    /**
     * For staff users (servidor, prefeito, etc.) with a single city assignment.
     * Used for automatic redirect after login.
     */
    cityId?: string;
    /**
     * For admins/gestores who manage multiple cities.
     * If set, user is directed to CitySelector to choose which city to manage.
     */
    assignedMunicipalities?: string[];
    /**
     * The state (UF) the user belongs to (e.g., 'SP', 'RJ').
     */
    state?: string;
}
