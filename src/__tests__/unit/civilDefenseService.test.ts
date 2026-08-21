import { describe, it, expect, vi, beforeEach } from 'vitest';
import { civilDefenseService } from '../../services/civilDefenseService';

describe('Serviço de Defesa Civil e Pontos de Risco (civilDefenseService)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('deve retornar pontos críticos de alagamento para Santo André e cidades do ABC Paulista', () => {
        const saPoints = civilDefenseService.getCriticalFloodPoints('santo-andre');
        expect(saPoints.length).toBeGreaterThan(0);
        expect(saPoints[0].cityName).toBe('Santo André');
        expect(saPoints[0].riverOrBasin).toBeDefined();
        expect(saPoints[0].criticalWaterLevelCm).toBeGreaterThan(0);
    });

    it('deve retornar pontos críticos de alagamento para São Bernardo do Campo e São Paulo', () => {
        const sbcPoints = civilDefenseService.getCriticalFloodPoints('sao-bernardo');
        const spPoints = civilDefenseService.getCriticalFloodPoints('sao-paulo');

        expect(sbcPoints.length).toBeGreaterThan(0);
        expect(spPoints.length).toBeGreaterThan(0);
        expect(sbcPoints.some(p => p.name.includes('Lions'))).toBe(true);
        expect(spPoints.some(p => p.name.includes('Marginal Tietê'))).toBe(true);
    });

    it('deve retornar áreas de risco geológico / encostas com saturação de solo', () => {
        const geoAreas = civilDefenseService.getGeologicalRiskAreas('maua');
        expect(geoAreas.length).toBeGreaterThan(0);
        expect(geoAreas[0].neighborhood).toBe('Jardim Zaíra');
        expect(geoAreas[0].soilSaturationPercent).toBeGreaterThan(0);
        expect(geoAreas[0].vulnerabilityLevel).toBe('MUITO_ALTA');
    });

    it('deve retornar alertas ativos e filtrar por estado/município', async () => {
        const alerts = await civilDefenseService.getAlertsForScope('SP', 'Santo André');
        expect(alerts.length).toBeGreaterThan(0);
        expect(alerts[0].severity).toBeDefined();
        expect(alerts[0].instructions.length).toBeGreaterThan(0);
        expect(alerts[0].riskLevel).toBeGreaterThanOrEqual(1);
    });

    it('deve retornar incidentes de trânsito em tempo real', () => {
        const traffic = civilDefenseService.getLiveTrafficIncidents('santo-andre');
        expect(traffic.length).toBeGreaterThan(0);
        expect(traffic[0].delayMinutes).toBeGreaterThan(0);
        expect(traffic[0].severity).toBeDefined();
    });
});
