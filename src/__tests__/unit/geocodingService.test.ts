import { describe, it, expect, vi, beforeEach } from 'vitest';
import { geocodingService } from '../../services/geocodingService';

describe('Serviço de Geocodificação e Busca de CEP / Endereços (geocodingService)', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it('deve identificar corretamente se uma string é um CEP brasileiro', () => {
        expect(geocodingService.isCep('09321010')).toBe(true);
        expect(geocodingService.isCep('09321-010')).toBe(true);
        expect(geocodingService.isCep('01310-100')).toBe(true);
        expect(geocodingService.isCep('Avenida Paulista')).toBe(false);
        expect(geocodingService.isCep('12345')).toBe(false);
    });

    it('deve geocodificar CEP integrando ViaCEP com Nominatim OSM', async () => {
        const mockViaCep = {
            cep: '09321-010',
            logradouro: 'Rua das Flores',
            bairro: 'Jardim Primavera',
            localidade: 'Mauá',
            uf: 'SP'
        };

        const mockNominatim = [
            {
                lat: '-23.6666',
                lon: '-46.5322',
                display_name: 'Rua das Flores, Mauá, SP, Brasil'
            }
        ];

        vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
            const urlStr = String(url);
            if (urlStr.includes('viacep.com.br')) {
                return {
                    ok: true,
                    json: async () => mockViaCep
                } as any;
            }
            if (urlStr.includes('nominatim.openstreetmap.org')) {
                return {
                    ok: true,
                    json: async () => mockNominatim
                } as any;
            }
            return { ok: false } as any;
        });

        const result = await geocodingService.searchByCep('09321010');

        expect(result).not.toBeNull();
        expect(result?.city).toBe('Mauá');
        expect(result?.state).toBe('SP');
        expect(result?.latitude).toBeCloseTo(-23.6666);
        expect(result?.longitude).toBeCloseTo(-46.5322);
        expect(result?.cep).toBe('09321-010');
    });

    it('deve buscar endereços livres e cidades via OpenStreetMap Nominatim', async () => {
        const mockNominatim = [
            {
                place_id: 12345,
                lat: '-23.5614',
                lon: '-46.6559',
                name: 'Avenida Paulista',
                display_name: 'Avenida Paulista, Bela Vista, São Paulo, SP, Brasil',
                address: {
                    road: 'Avenida Paulista',
                    suburb: 'Bela Vista',
                    city: 'São Paulo',
                    state: 'SP'
                }
            }
        ];

        vi.spyOn(global, 'fetch').mockImplementation(async (url: any) => {
            return {
                ok: true,
                json: async () => mockNominatim
            } as any;
        });

        const results = await geocodingService.searchAddress('Avenida Paulista, SP');

        expect(results.length).toBe(1);
        expect(results[0].title).toBe('Avenida Paulista');
        expect(results[0].city).toBe('São Paulo');
        expect(results[0].latitude).toBeCloseTo(-23.5614);
        expect(results[0].longitude).toBeCloseTo(-46.6559);
    });
});
