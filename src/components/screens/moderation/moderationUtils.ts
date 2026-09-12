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
    'false_info': 'Informação Incorreta ou Trote',
    'harassment': 'Assédio',
    'other': 'Outro'
};

/**
 * Rejection reason labels for citizen notifications & moderation cards
 */
export const REJECTION_REASON_LABELS: Record<string, string> = {
    'false_info': 'Informação Incorreta, Trote ou Dados Divergentes',
    'lgpd_pii': 'Violação de Privacidade / LGPD (Rosto, Placa ou Dados Pessoais Identificáveis)',
    'commercial': 'Divulgação Comercial ou Publicidade Não Permitida',
    'defamation': 'Difamação, Acusação Sem Provas ou Ataque Pessoal',
    'unclear_location': 'Localização Geográfica Incorreta ou Divergente',
    'quality': 'Foto Ilegível ou Descrição Insuficiente para Atendimento',
    'duplicate': 'Ocorrência Duplicada / Já Cadastrada Anteriormente',
    'spam': 'Spam / Divulgação Repetitiva',
    'inappropriate': 'Conteúdo Impróprio ou Não Condizente com a Finalidade Cívica',
    'other': 'Revisão Administrativa / Ajuste Necessário'
};

/**
 * Get human-readable label for report or rejection reason
 */
export const getReasonLabel = (reason: string): string => {
    if (!reason) return 'Sem motivo especificado';
    return REJECTION_REASON_LABELS[reason] || REPORT_REASON_LABELS[reason] || reason;
};

/**
 * Default rejection reasons
 */
export const DEFAULT_REJECTION_REASONS = [
    { value: 'false_info', label: 'Informação Incorreta, Trote ou Dados Divergentes' },
    { value: 'lgpd_pii', label: 'Violação LGPD (Rosto, Placa ou Dados Pessoais)' },
    { value: 'defamation', label: 'Difamação ou Acusação Sem Provas' },
    { value: 'unclear_location', label: 'Localização Incorreta ou Divergente' },
    { value: 'quality', label: 'Foto Ilegível ou Descrição Insuficiente' },
    { value: 'duplicate', label: 'Ocorrência Duplicada' },
    { value: 'commercial', label: 'Comércio ou Divulgação Não Permitida' },
    { value: 'inappropriate', label: 'Conteúdo Impróprio' },
    { value: 'other', label: 'Outro Motivo Específico' }
] as const;

/**
 * Default reply templates
 */
export const DEFAULT_REPLY_TEMPLATES = {
    acknowledgment: 'Agradecemos sua contribuição! Ela é muito importante para a melhoria da nossa cidade. Encaminharemos para o setor responsável.',
    in_progress: 'Sua denúncia foi recebida e está sendo tratada pelas autoridades competentes.',
    resolved: 'Informamos que a situação reportada foi resolvida. Obrigado por contribuir!'
} as const;
