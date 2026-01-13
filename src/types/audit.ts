import { Timestamp } from 'firebase/firestore';

export interface AuditLog {
    id?: string;
    action: string; // e.g., 'USER_BAN', 'CONTRIBUTION_APPROVE', 'SETTINGS_UPDATE'
    actorId: string; // Admin ID
    actorName?: string; // Optional cached name
    targetId: string;
    details: Record<string, any>; // JSON object with changes
    timestamp: Timestamp;
    ip?: string;
}

export type AuditAction =
    | 'USER_BAN'
    | 'USER_UNBAN'
    | 'USER_PROMOTE'
    | 'USER_DEMOTE'
    | 'CONTRIBUTION_APPROVE'
    | 'CONTRIBUTION_REJECT'
    | 'SETTINGS_UPDATE'
    | 'LOGIN_SUCCESS';
