import { describe, it, expect } from 'vitest';
import { OFFICIAL_COMMUNICATION_TEMPLATES } from '../../data/officialCommunicationTemplates';
import { getCityNeighborhoods, MUNICIPAL_NEIGHBORHOODS_DB } from '../../data/municipalNeighborhoods';

describe('Central de Comunicação Oficial Municipal', () => {
    describe('Templates Oficiais de Comunicação (OFFICIAL_COMMUNICATION_TEMPLATES)', () => {
        it('deve conter templates para as principais demandas públicas', () => {
            expect(OFFICIAL_COMMUNICATION_TEMPLATES.length).toBeGreaterThanOrEqual(6);
            
            const ids = OFFICIAL_COMMUNICATION_TEMPLATES.map(t => t.id);
            expect(ids).toContain('tpl_obras_interdicao');
            expect(ids).toContain('tpl_saude_vacinacao');
            expect(ids).toContain('tpl_defesa_civil_chuvas');
            expect(ids).toContain('tpl_saneamento_agua');
            expect(ids).toContain('tpl_energia_poda');
            expect(ids).toContain('tpl_combate_dengue');
        });

        it('deve marcar template de Defesa Civil como emergencial e com canal push ativo', () => {
            const defesaCivilTpl = OFFICIAL_COMMUNICATION_TEMPLATES.find(t => t.id === 'tpl_defesa_civil_chuvas');
            expect(defesaCivilTpl).toBeDefined();
            expect(defesaCivilTpl?.isEmergency).toBe(true);
            expect(defesaCivilTpl?.defaultChannels.push).toBe(true);
            expect(defesaCivilTpl?.defaultSubject).toContain('ALERTA DEFESA CIVIL');
        });

        it('deve possuir formatação HTML válida em todos os corpos de mensagens padrão', () => {
            OFFICIAL_COMMUNICATION_TEMPLATES.forEach(tpl => {
                expect(tpl.defaultSubject.trim().length).toBeGreaterThan(5);
                expect(tpl.defaultBody).toContain('<p>');
                expect(tpl.badgeText.length).toBeGreaterThan(2);
            });
        });
    });

    describe('Catálogo de Bairros Municipais (MUNICIPAL_NEIGHBORHOODS_DB)', () => {
        it('deve carregar bairros das 7 cidades do ABC e São Paulo', () => {
            expect(MUNICIPAL_NEIGHBORHOODS_DB['santo-andre']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['sao-bernardo']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['sao-caetano']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['diadema']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['maua']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['ribeirao-pires']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['rio-grande-da-serra']).toBeDefined();
            expect(MUNICIPAL_NEIGHBORHOODS_DB['sao-paulo']).toBeDefined();
        });

        it('deve mapear corretamente bacias críticas de Santo André e São Bernardo', () => {
            const sa = getCityNeighborhoods('santo-andre');
            expect(sa?.criticalBasinNeighborhoods).toContain('Santa Teresinha');
            expect(sa?.criticalBasinNeighborhoods).toContain('Utinga');
            expect(sa?.criticalBasinNeighborhoods).toContain('Campestre');

            const sbc = getCityNeighborhoods('sao-bernardo');
            expect(sbc?.criticalBasinNeighborhoods).toContain('Rudge Ramos');
            expect(sbc?.criticalBasinNeighborhoods).toContain('Taboão');
        });

        it('deve encontrar bairros via nome com acentuação e formatos alternativos', () => {
            const sa1 = getCityNeighborhoods('Santo André');
            expect(sa1?.cityName).toBe('Santo André');

            const sbc1 = getCityNeighborhoods('são bernardo do campo');
            expect(sbc1?.cityName).toBe('São Bernardo do Campo');

            const scs1 = getCityNeighborhoods('sao-caetano-do-sul');
            expect(scs1?.cityName).toBe('São Caetano do Sul');
        });

        it('deve retornar null para cidades inexistentes sem quebrar o fluxo', () => {
            const notFound = getCityNeighborhoods('cidade-inexistente-xyz');
            expect(notFound).toBeNull();
        });
    });
});
