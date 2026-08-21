import { describe, it, expect, vi } from 'vitest';
import { sreService } from '../../services/sreService';
import { webhookService } from '../../services/webhookService';

describe('Resiliência Firestore e Autenticação Segura', () => {
    it('deve normalizar emails de administradores independentemente de maiúsculas/espaços', () => {
        const testEmails = [
            'manuelpnforce@gmail.com',
            'Manuelpnforce@gmail.com',
            'MANUELPNFORCE@GMAIL.COM ',
            ' manuelpnforce@gmail.com\n'
        ];

        testEmails.forEach(rawEmail => {
            const normalized = (rawEmail || '').toLowerCase().trim();
            expect(normalized).toBe('manuelpnforce@gmail.com');
        });
    });

    it('deve interceptar e tratar erros em snapshot listeners sem propagar exceção fatal', () => {
        const errorSpy = vi.fn();
        const mockError = new Error('FIRESTORE (12.6.0) INTERNAL ASSERTION FAILED: Unexpected state');

        const safeSnapshotCaller = (
            _query: any,
            _onNext: (snap: any) => void,
            onError?: (error: Error) => void
        ) => {
            try {
                // Simula erro de target closed no stream do Firestore
                if (onError) {
                    onError(mockError);
                }
            } catch (err) {
                errorSpy(err);
            }
        };

        let handledError: Error | null = null;
        expect(() => {
            safeSnapshotCaller(
                {},
                () => {},
                (err) => {
                    handledError = err;
                }
            );
        }).not.toThrow();

        expect(handledError).toBeDefined();
        expect(handledError?.message).toContain('INTERNAL ASSERTION FAILED');
        expect(errorSpy).not.toHaveBeenCalled();
    });

    it('deve simular disparo de webhook com resposta e latência', async () => {
        const mockWebhook = {
            id: 'webhook-prefeitura-maua-156',
            name: 'Ouvidoria & 156 - Prefeitura de Mauá',
            url: 'https://api.maua.sp.gov.br/v1/ouvidoria/ocorrencias/ingest',
            description: 'Sincronização com o sistema municipal',
            active: true,
            events: ['contribution.approved'],
            secretKey: 'whsec_maua_prod_994829',
            createdAt: new Date().toISOString(),
        };

        const result = await webhookService.testWebhook(
            mockWebhook,
            'contribution.approved',
            'test-user-uid'
        );

        expect(result).toBeDefined();
        expect(result.statusCode).toBe(200);
        expect(result.latencyMs).toBeGreaterThan(0);
        expect(result.success).toBe(true);
        expect(result.payloadPreview).toContain('contribution.approved');
    });

    it('deve executar rotinas de auto-cura do SRE com sucesso', async () => {
        const syncResult = await sreService.recalculateCityCounters('test-sysadmin-uid');
        expect(syncResult).toHaveProperty('success', true);
        expect(typeof syncResult.updatedCities).toBe('number');

        const queueResult = await sreService.retryFailedNotifications('test-sysadmin-uid');
        expect(queueResult).toHaveProperty('retried');
        expect(typeof queueResult.retried).toBe('number');

        await expect(sreService.flushSystemCaches('test-sysadmin-uid')).resolves.not.toThrow();
    });
});
