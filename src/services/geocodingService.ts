/**
 * @fileoverview Serviço de Geocodificação e Busca de Endereços, CEP e Cidades (`geocodingService.ts`).
 * 
 * Permite buscar por CEP (ViaCEP + Nominatim), logradouros, bairros e cidades em todo o território nacional,
 * convertendo endereços em coordenadas geográficas precisas (latitude, longitude) para navegação no mapa.
 */

export interface GeocodingResult {
    id: string;
    title: string;
    subtitle: string;
    latitude: number;
    longitude: number;
    type: 'cep' | 'address' | 'city';
    cep?: string;
    city?: string;
    state?: string;
    neighborhood?: string;
    street?: string;
    boundingBox?: [number, number, number, number]; // [minLat, maxLat, minLng, maxLng]
}

class GeocodingService {
    /**
     * Identifica se uma string é um CEP brasileiro válido (8 dígitos, com ou sem traço).
     */
    public isCep(query: string): boolean {
        const cleaned = query.replace(/\D/g, '');
        return cleaned.length === 8;
    }

    /**
     * Busca coordenadas e endereço a partir de um CEP.
     */
    public async searchByCep(cep: string): Promise<GeocodingResult | null> {
        const cleanCep = cep.replace(/\D/g, '');
        if (cleanCep.length !== 8) return null;

        try {
            // 1. Consulta ViaCEP
            const viaCepRes = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
            if (!viaCepRes.ok) return null;
            const viaCepData = await viaCepRes.json();

            if (viaCepData.erro) return null;

            const logradouro = viaCepData.logradouro || '';
            const bairro = viaCepData.bairro || '';
            const localidade = viaCepData.localidade || '';
            const uf = viaCepData.uf || '';

            // 2. Geocodifica para obter Latitude e Longitude precisas via OpenStreetMap Nominatim
            const searchQuery = logradouro 
                ? `${logradouro}, ${bairro}, ${localidade}, ${uf}, Brasil`
                : `${bairro}, ${localidade}, ${uf}, Brasil`;

            let coords = await this.geocodeAddressString(searchQuery);
            if (!coords) {
                // Fallback para cidade e estado
                coords = await this.geocodeAddressString(`${localidade}, ${uf}, Brasil`);
            }

            if (!coords) return null;

            const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;
            const title = logradouro ? `${logradouro}${bairro ? ` - ${bairro}` : ''}` : `CEP ${formattedCep}`;
            const subtitle = `${localidade} - ${uf} • CEP ${formattedCep}`;

            return {
                id: `cep_${cleanCep}`,
                title,
                subtitle,
                latitude: coords.lat,
                longitude: coords.lng,
                type: 'cep',
                cep: formattedCep,
                city: localidade,
                state: uf,
                neighborhood: bairro,
                street: logradouro
            };
        } catch (error) {
            console.error('Erro na busca por CEP:', error);
            return null;
        }
    }

    /**
     * Busca endereços, ruas, bairros e cidades por texto livre no Brasil.
     */
    public async searchAddress(queryText: string): Promise<GeocodingResult[]> {
        const trimmed = queryText.trim();
        if (!trimmed || trimmed.length < 2) return [];

        // Se for CEP, resolve imediatamente
        if (this.isCep(trimmed)) {
            const cepResult = await this.searchByCep(trimmed);
            return cepResult ? [cepResult] : [];
        }

        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&q=${encodeURIComponent(trimmed)}&limit=5&addressdetails=1`;
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                    'User-Agent': 'GuardiaoNacional-IntelligenceMap/1.0'
                }
            });

            if (!response.ok) return [];
            const data = await response.json();

            return data.map((item: any) => {
                const addr = item.address || {};
                const city = addr.city || addr.town || addr.municipality || addr.village || '';
                const state = addr.state_code || addr.state || '';
                const neighborhood = addr.suburb || addr.neighbourhood || addr.city_district || '';
                const street = addr.road || addr.street || '';

                let type: 'address' | 'city' = 'address';
                if (item.type === 'administrative' || item.class === 'boundary' || !street) {
                    type = 'city';
                }

                const title = item.name || street || city || 'Localização';
                const subtitle = [neighborhood, city, state].filter(Boolean).join(' - ');

                return {
                    id: `osm_${item.place_id}`,
                    title,
                    subtitle: subtitle || item.display_name,
                    latitude: parseFloat(item.lat),
                    longitude: parseFloat(item.lon),
                    type,
                    city,
                    state,
                    neighborhood,
                    street
                };
            });
        } catch (error) {
            console.error('Erro na busca por endereço/cidade:', error);
            return [];
        }
    }

    /**
     * Converte string de endereço em latitude e longitude.
     */
    private async geocodeAddressString(addressStr: string): Promise<{ lat: number; lng: number } | null> {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&q=${encodeURIComponent(addressStr)}&limit=1`;
            const response = await fetch(url, {
                headers: {
                    'Accept-Language': 'pt-BR,pt;q=0.9',
                    'User-Agent': 'GuardiaoNacional-IntelligenceMap/1.0'
                }
            });
            if (!response.ok) return null;
            const data = await response.json();
            if (data && data.length > 0) {
                return {
                    lat: parseFloat(data[0].lat),
                    lng: parseFloat(data[0].lon)
                };
            }
            return null;
        } catch (e) {
            return null;
        }
    }
}

export const geocodingService = new GeocodingService();
