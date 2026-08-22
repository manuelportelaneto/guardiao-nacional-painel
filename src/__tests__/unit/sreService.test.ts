import { describe, it, expect } from 'vitest';
import { sreService } from '../../services/sreService';

describe('Serviço de Observabilidade e SRE (sreService)', () => {
    describe('Checagem Ativa de Saúde dos Microserviços', () => {
        it('deve retornar status e latência de todos os nós de infraestrutura', async () => {
            const healthNodes = await sreService.checkSystemHealth();
            expect(healthNodes.length).toBeGreaterThanOrEqual(4);

            const services = healthNodes.map(h => h.service);
            expect(services).toContain('firebase_auth');
            expect(services).toContain('cloud_firestore');
            expect(services).toContain('cloud_functions');
            expect(services).toContain('brevo_email');
        });
    });

    describe('Métricas Globais de SRE', () => {
        it('deve calcular métricas operacionais com latência média e taxa de erro', async () => {
            const metrics = await sreService.getSREMetrics();
            expect(metrics).toBeDefined();
            expect(metrics.services.length).toBeGreaterThan(0);
            expect(metrics.averageLatencyMs).toBeGreaterThanOrEqual(0);
            expect(metrics.uptimePercent).toBeGreaterThanOrEqual(95);
        });
    });
});
