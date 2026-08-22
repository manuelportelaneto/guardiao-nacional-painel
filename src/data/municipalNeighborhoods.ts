/**
 * @fileoverview Catálogo de Bairros Municipais e Estimativas de População
 * Permite segmentação territorial cirúrgica de comunicados oficiais por bairros.
 */

export interface CityNeighborhoodData {
    cityId: string;
    cityName: string;
    state: string;
    neighborhoods: string[];
    criticalBasinNeighborhoods?: string[];
    criticalSlopeNeighborhoods?: string[];
}

export const MUNICIPAL_NEIGHBORHOODS_DB: Record<string, CityNeighborhoodData> = {
    'santo-andre': {
        cityId: 'santo-andre',
        cityName: 'Santo André',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Campestre', 'Jardim', 'Vila Bastos', 'Vila Guiomar',
            'Casa Branca', 'Bangu', 'Vila Pires', 'Vila Luzita', 'Parque das Nações',
            'Parque Novo Oratório', 'Santa Teresinha', 'Utinga', 'Camilópolis',
            'Vila Metalúrgica', 'Vila Assis Brasil', 'Jardim Santo André', 'Jardim Bom Pastor',
            'Jardim Alzira Franco', 'Parque Marajoara', 'Capuava', 'Paranapiacaba'
        ],
        criticalBasinNeighborhoods: ['Santa Teresinha', 'Utinga', 'Campestre', 'Capuava', 'Camilópolis'],
        criticalSlopeNeighborhoods: ['Vila Luzita', 'Jardim Santo André', 'Paranapiacaba']
    },
    'sao-bernardo': {
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Rudge Ramos', 'Pauliceia', 'Taboão', 'Baeta Neves',
            'Nova Petrópolis', 'Planalto', 'Assunção', 'Alvarenga', 'Batistini',
            'Demarchi', 'Jardim do Mar', 'Vila Euclides', 'Ferrazópolis', 'Montanhão',
            'Riacho Grande', 'Jardim Silvina', 'Jardim Represa'
        ],
        criticalBasinNeighborhoods: ['Rudge Ramos', 'Taboão', 'Baeta Neves', 'Pauliceia'],
        criticalSlopeNeighborhoods: ['Montanhão', 'Alvarenga', 'Jardim Silvina', 'Riacho Grande']
    },
    'sao-caetano': {
        cityId: 'sao-caetano',
        cityName: 'São Caetano do Sul',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Santa Paula', 'Barcelona', 'Fundação', 'Olímpico',
            'Santo Antônio', 'Osvaldo Cruz', 'São José', 'Prosperidade',
            'Cerâmica', 'Jardim São Caetano', 'Mauá', 'Santa Maria', 'Nova Gerty'
        ],
        criticalBasinNeighborhoods: ['Fundação', 'Prosperidade', 'Jardim São Caetano'],
        criticalSlopeNeighborhoods: []
    },
    'diadema': {
        cityId: 'diadema',
        cityName: 'Diadema',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Conceição', 'Canhema', 'Piraporinha', 'Eldorado',
            'Serraria', 'Taboão', 'Campanário', 'Inamar', 'Casa Grande'
        ],
        criticalBasinNeighborhoods: ['Piraporinha', 'Taboão', 'Canhema'],
        criticalSlopeNeighborhoods: ['Inamar', 'Eldorado', 'Serraria']
    },
    'maua': {
        cityId: 'maua',
        cityName: 'Mauá',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Vila Bocaina', 'Vila Assis Brasil', 'Parque São Vicente',
            'Jardim Zaíra', 'Jardim Guapituba', 'Vila Magini', 'Jardim Itapeva',
            'Jardim Maringá', 'Vila Noêmia', 'Capuava', 'Sertãozinho'
        ],
        criticalBasinNeighborhoods: ['Centro', 'Capuava', 'Vila Magini', 'Parque São Vicente'],
        criticalSlopeNeighborhoods: ['Jardim Zaíra', 'Jardim Itapeva', 'Sertãozinho']
    },
    'ribeirao-pires': {
        cityId: 'ribeirao-pires',
        cityName: 'Ribeirão Pires',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Alto da Boa Vista', 'Santana', 'Quarta Divisão',
            'Ouro Fino Paulista', 'Jardim Luso', 'Vila Sueli', 'Santa Luzia'
        ],
        criticalBasinNeighborhoods: ['Centro', 'Santana'],
        criticalSlopeNeighborhoods: ['Ouro Fino Paulista', 'Quarta Divisão', 'Alto da Boa Vista']
    },
    'rio-grande-da-serra': {
        cityId: 'rio-grande-da-serra',
        cityName: 'Rio Grande da Serra',
        state: 'SP',
        neighborhoods: [
            'Centro', 'Vila Conde', 'Santa Tereza', 'Jardim Encantado',
            'Parque América', 'Vila Niwa', 'Oasis Paulista'
        ],
        criticalBasinNeighborhoods: ['Centro', 'Vila Niwa'],
        criticalSlopeNeighborhoods: ['Santa Tereza', 'Jardim Encantado']
    },
    'sao-paulo': {
        cityId: 'sao-paulo',
        cityName: 'São Paulo',
        state: 'SP',
        neighborhoods: [
            'Sé / Centro Histórico', 'República', 'Bela Vista', 'Consolação', 'Pinheiros',
            'Vila Mariana', 'Moema', 'Itaim Bibi', 'Santana', 'Tucuruvi', 'Tatuapé',
            'Mooca', 'Ipiranga', 'Santo Amaro', 'Campo Limpo', 'Capão Redondo',
            'Itaquera', 'Guaianases', 'São Mateus', 'Brasilândia', 'Freguesia do Ó'
        ],
        criticalBasinNeighborhoods: ['Sé / Centro Histórico', 'Mooca', 'Ipiranga', 'Tatuapé', 'Santo Amaro'],
        criticalSlopeNeighborhoods: ['Brasilândia', 'Capão Redondo', 'São Mateus', 'Freguesia do Ó']
    }
};

/**
 * Retorna os bairros conhecidos de uma cidade (ou array vazio caso a cidade não esteja no catálogo prévio).
 */
export function getCityNeighborhoods(cityIdOrName?: string): CityNeighborhoodData | null {
    if (!cityIdOrName) return null;
    const normalized = cityIdOrName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_\s]+/g, '-');
    
    // Busca direta por chave
    if (MUNICIPAL_NEIGHBORHOODS_DB[normalized]) {
        return MUNICIPAL_NEIGHBORHOODS_DB[normalized];
    }

    // Busca por nome aproximado
    for (const key of Object.keys(MUNICIPAL_NEIGHBORHOODS_DB)) {
        if (normalized.includes(key) || key.includes(normalized)) {
            return MUNICIPAL_NEIGHBORHOODS_DB[key];
        }
    }

    return null;
}
