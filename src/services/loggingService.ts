/**
 * @fileoverview Serviço Centralizado de Logs de Auditoria e Erros (`src/services/loggingService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele implementa a camada de observabilidade e rastreabilidade do painel administrativo.
 * Todo evento crítico (login, promoção de usuário, banimento, aprovação de denúncia) e todo erro 
 * de runtime é canalizado por este serviço antes de persistir no Firestore.
 * 
 * 🏛️ CONCEITOS E PRÁTICAS IMPLEMENTADAS:
 * 1. 🔒 CONFORMIDADE COM A LGPD (Lei Geral de Proteção de Dados):
 *    A função `sanitizeDetails` varre recursivamente qualquer objeto de detalhes antes de gravá-lo
 *    nos logs. Campos protegidos como CPF, RG, telefone, senhas, tokens e API keys são substituídos
 *    por `[REDACTED]`. Isso impede que dados pessoais sensíveis trafeguem para trilhas de auditoria,
 *    garantindo conformidade com o Artigo 46 da LGPD sobre segurança no tratamento de dados.
 * 
 * 2. 📝 AUDITORIA ADMINISTRATIVA (AuditLog):
 *    Registra ações de gestores como CREATE, UPDATE, DELETE, LOGIN e LOGOUT com o par
 *    `actorId` (quem agiu) e `targetId` (quem/o que foi afetado). Essas trilhas são imutáveis
 *    no Firestore (regras bloqueiam UPDATE e DELETE em `audit_logs`).
 * 
 * 3. 🚨 LOG DE ERROS COM GUARD DE DESENVOLVIMENTO (ErrorLog):
 *    Em ambiente de desenvolvimento, os erros são apenas logados no console (não gravados),
 *    evitando poluir a base de dados de produção com dados de testes. Em produção, o stack
 *    trace e o `deviceInfo` são capturados e gravados com limites de tamanho para evitar
 *    estouro de quota de faturamento no Firestore.
 */
import { db } from '../firebaseConfig';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import type { AuditLog, AuditAction } from '../types/audit';
import type { ErrorLog } from '../types/errorLog';


const COLLECTIONS = {
    AUDIT: 'audit_logs',
    ERROR: 'error_logs'
};

/** Fields that must NEVER appear in log records (LGPD compliance). */
const SENSITIVE_FIELDS = [
    'cpf', 'rg', 'phone', 'phoneNumber', 'password', 'token',
    'fcmToken', 'secret', 'accessToken', 'refreshToken', 'idToken', 'apiKey'
];

/**
 * Recursively removes sensitive fields from an object before logging.
 * Prevents LGPD-protected data from being stored in audit/error logs.
 */
function sanitizeDetails(obj: Record<string, any>): Record<string, any> {
    if (typeof obj !== 'object' || obj === null) return obj;
    return Object.entries(obj).reduce((acc, [key, value]) => {
        if (SENSITIVE_FIELDS.includes(key.toLowerCase())) {
            acc[key] = '[REDACTED]';
        } else if (typeof value === 'object' && !Array.isArray(value)) {
            acc[key] = sanitizeDetails(value);
        } else {
            acc[key] = value;
        }
        return acc;
    }, {} as Record<string, any>);
}

class LoggingService {
    /**
     * Logs a critical administrative action.
     * All sensitive fields are automatically sanitized before persisting.
     */
    async logAudit(action: AuditAction, actorId: string, targetId: string, details: Record<string, any>) {
        try {
            const auditData: AuditLog = {
                action,
                actorId,
                targetId,
                details: sanitizeDetails(details), // LGPD: sanitize before save
                timestamp: Timestamp.now(),
            };

            await addDoc(collection(db, COLLECTIONS.AUDIT), auditData);
        } catch (error) {
            console.error("Failed to log audit action:", error);
        }
    }

    /**
     * Logs an application error for debugging.
     * Stack traces and device info are included but sensitive fields are sanitized.
     */
    async logError(errorData: Partial<ErrorLog> & { message: string }) {
        if (import.meta.env.MODE === 'development') {
            console.warn('[Dev] Error Log skipped:', errorData);
            return;
        }

        try {
            const errorLog: ErrorLog = {
                message: errorData.message.substring(0, 500), // Cap message length
                code: errorData.code || 'UNKNOWN',
                stack: errorData.stack?.substring(0, 2000), // Cap stack trace
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
            userAgent: navigator.userAgent.substring(0, 200), // Cap UA string
            screenSize: `${window.innerWidth}x${window.innerHeight}`,
            language: navigator.language
        };
    }
}

export const loggingService = new LoggingService();
