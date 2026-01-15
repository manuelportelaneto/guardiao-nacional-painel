import { describe, it, expect } from 'vitest';
import {
    getDisplayUser,
    formatDate,
    getReasonLabel,
    REPORT_REASON_LABELS,
    DEFAULT_REJECTION_REASONS
} from '../../components/screens/moderation/moderationUtils';

describe('moderationUtils', () => {
    describe('getDisplayUser', () => {
        it('should return formatted string with name and ID', () => {
            expect(getDisplayUser('abc123', 'João Silva')).toBe('João (ID: abc123)');
        });

        it('should use first name only', () => {
            expect(getDisplayUser('abc123', 'Maria Antonieta da Silva')).toBe('Maria (ID: abc123)');
        });

        it('should fallback to "Usuário" when name is undefined', () => {
            expect(getDisplayUser('abc123')).toBe('Usuário (ID: abc123)');
        });

        it('should fallback to "Usuário" when name is empty', () => {
            expect(getDisplayUser('abc123', '')).toBe('Usuário (ID: abc123)');
        });
    });

    describe('formatDate', () => {
        it('should format Date object to pt-BR', () => {
            const date = new Date('2026-01-15');
            expect(formatDate(date)).toMatch(/15\/01\/2026/);
        });

        it('should handle null/undefined', () => {
            expect(formatDate(null)).toBe('Data desconhecida');
            expect(formatDate(undefined)).toBe('Data desconhecida');
        });

        it('should format Firestore Timestamp-like objects', () => {
            const mockTimestamp = {
                toDate: () => new Date('2026-01-15')
            };
            expect(formatDate(mockTimestamp)).toMatch(/15\/01\/2026/);
        });

        it('should return "Data inválida" for invalid input', () => {
            expect(formatDate('not a date')).toBe('Data inválida');
            expect(formatDate(123)).toBe('Data inválida');
        });
    });

    describe('getReasonLabel', () => {
        it('should return label for known reasons', () => {
            expect(getReasonLabel('spam')).toBe('Spam');
            expect(getReasonLabel('inappropriate')).toBe('Conteúdo Impróprio');
            expect(getReasonLabel('false_info')).toBe('Informação Falsa');
            expect(getReasonLabel('harassment')).toBe('Assédio');
            expect(getReasonLabel('other')).toBe('Outro');
        });

        it('should return original value for unknown reasons', () => {
            expect(getReasonLabel('unknown_reason')).toBe('unknown_reason');
            expect(getReasonLabel('custom')).toBe('custom');
        });
    });

    describe('REPORT_REASON_LABELS', () => {
        it('should have 5 predefined reasons', () => {
            expect(Object.keys(REPORT_REASON_LABELS)).toHaveLength(5);
        });
    });

    describe('DEFAULT_REJECTION_REASONS', () => {
        it('should have multiple rejection reasons with value and label', () => {
            expect(DEFAULT_REJECTION_REASONS.length).toBeGreaterThan(0);
            DEFAULT_REJECTION_REASONS.forEach(reason => {
                expect(reason).toHaveProperty('value');
                expect(reason).toHaveProperty('label');
            });
        });
    });
});
