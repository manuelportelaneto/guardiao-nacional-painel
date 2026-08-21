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
    | 'LOGIN_SUCCESS'
    | 'LOGOUT'
    | 'USER_ROLE_CHANGE'
    | 'AI_RETROACTIVE_ANALYSIS'
    | 'NOCODE_CATEGORY_UPDATE'
    | 'NOCODE_CATEGORY_DELETE'
    | 'NOCODE_FLAG_TOGGLE'
    | 'NOCODE_FLAG_SAVE'
    | 'NOCODE_BANNER_SAVE'
    | 'NOCODE_BANNER_DELETE'
    | 'NOCODE_AI_CONFIG_UPDATE'
    | 'SRE_SELF_HEAL_COUNTERS'
    | 'SRE_RETRY_NOTIFICATIONS'
    | 'SRE_FLUSH_CACHE'
    | 'WEBHOOK_CONFIG_SAVE'
    | 'WEBHOOK_CONFIG_DELETE'
    | 'WEBHOOK_TEST_DISPATCH'
    | (string & {});
