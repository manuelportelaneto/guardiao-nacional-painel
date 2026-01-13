import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { AuditLog, AuditAction } from '../types/audit';
import type { ErrorLog } from '../types/errorLog';

const COLLECTIONS = {
    AUDIT: 'audit_logs',
    ERROR: 'error_logs'
};

class LoggingService {
    /**
     * Logs a critical administrative action.
     * @param action The type of action performed (e.g., USER_BAN)
     * @param actorId The ID of the admin performing the action
     * @param targetId The ID of the affected entity (user/contribution)
     * @param details Key-value pairs describing the change
     */
    async logAudit(action: AuditAction, actorId: string, targetId: string, details: Record<string, any>) {
        try {
            const auditData: AuditLog = {
                action,
                actorId,
                targetId,
                details,
                timestamp: Timestamp.now(),
                // IP tracking would require a backend function, omitted here for client-side simplicity
            };

            await addDoc(collection(db, COLLECTIONS.AUDIT), auditData);
            console.log(`[Audit] ${action} logged.`);
        } catch (error) {
            // If audit logging fails, we should at least console error it.
            // In a stricter system, this might block the action.
            console.error("Failed to log audit action:", error);
            this.logError({
                message: "Failed to log audit action",
                stack: JSON.stringify(error),
                path: 'loggingService.ts',
                deviceInfo: this.getDeviceInfo()
            });
        }
    }

    /**
     * Logs an application error for debugging.
     * @param error The error object or message
     * @param context Additional context (userId, path)
     */
    async logError(errorData: Partial<ErrorLog> & { message: string }) {
        if (import.meta.env.MODE === 'development') {
            console.warn('[Dev] Error Log skipped:', errorData);
            return;
        }

        try {
            const errorLog: ErrorLog = {
                message: errorData.message,
                code: errorData.code || 'UNKNOWN',
                stack: errorData.stack,
                userId: errorData.userId,
                path: errorData.path || window.location.pathname,
                timestamp: Timestamp.now(),
                deviceInfo: errorData.deviceInfo || this.getDeviceInfo()
            };

            await addDoc(collection(db, COLLECTIONS.ERROR), errorLog);
        } catch (innerError) {
            console.error("CRITICAL: Failed to write to error_logs", innerError);
        }
    }

    private getDeviceInfo() {
        return {
            userAgent: navigator.userAgent,
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language
        };
    }
}

export const loggingService = new LoggingService();
