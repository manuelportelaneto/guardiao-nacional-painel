
import axios from 'axios';

export interface IbgeUf {
    id: number;
    sigla: string;
    nome: string;
}

export interface IbgeMunicipio {
    id: number;
    nome: string;
}

const IBGE_API_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades';

export const locationService = {
    getStates: async (): Promise<IbgeUf[]> => {
        try {
            // Returns list of UF sorted by name
            const response = await axios.get<IbgeUf[]>(`${IBGE_API_BASE}/estados?orderBy=nome`);
            return response.data;
        } catch (error) {
            console.error("Error fetching states:", error);
            return [];
        }
    },

    getCitiesByState: async (ufSigla: string): Promise<IbgeMunicipio[]> => {
        try {
            // Returns cities for a given UF
            const response = await axios.get<IbgeMunicipio[]>(`${IBGE_API_BASE}/estados/${ufSigla}/municipios?orderBy=nome`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching cities for ${ufSigla}:`, error);
            return [];
        }
    }
};
