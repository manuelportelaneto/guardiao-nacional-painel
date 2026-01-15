/**
 * Moderation Utilities
 * 
 * Shared helper functions for moderation components
 */

/**
 * Format user display with first name and ID
 */
export const getDisplayUser = (id: string, name?: string): string => {
    const firstName = name ? name.split(' ')[0] : 'Usuário';
    return `${firstName} (ID: ${id})`;
};

/**
 * Format Firestore Timestamp or Date to Brazilian format
 */
export const formatDate = (date: any): string => {
    if (!date) return 'Data desconhecida';
    if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
    if (date instanceof Date) return date.toLocaleDateString('pt-BR');
    return 'Data inválida';
};

/**
 * Report reason labels
 */
export const REPORT_REASON_LABELS: Record<string, string> = {
    'spam': 'Spam',
    'inappropriate': 'Conteúdo Impróprio',
    'false_info': 'Informação Falsa',
    'harassment': 'Assédio',
    'other': 'Outro'
};

/**
 * Get human-readable label for report reason
 */
export const getReasonLabel = (reason: string): string => {
    return REPORT_REASON_LABELS[reason] || reason;
};

/**
 * Default rejection reasons
 */
export const DEFAULT_REJECTION_REASONS = [
    { value: 'duplicate', label: 'Conteúdo duplicado' },
    { value: 'inappropriate', label: 'Conteúdo impróprio' },
    { value: 'false_info', label: 'Informação falsa' },
    { value: 'spam', label: 'Spam ou propaganda' },
    { value: 'quality', label: 'Baixa qualidade' },
    { value: 'off_topic', label: 'Fora do escopo' },
    { value: 'other', label: 'Outro motivo' }
] as const;

/**
 * Default reply templates
 */
export const DEFAULT_REPLY_TEMPLATES = {
    acknowledgment: 'Agradecemos sua contribuição! Ela é muito importante para a melhoria da nossa cidade. Encaminharemos para o setor responsável.',
    in_progress: 'Sua denúncia foi recebida e está sendo tratada pelas autoridades competentes.',
    resolved: 'Informamos que a situação reportada foi resolvida. Obrigado por contribuir!'
} as const;
