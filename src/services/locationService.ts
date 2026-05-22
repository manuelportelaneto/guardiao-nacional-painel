/**
 * @fileoverview Serviço de Localidades IBGE (`src/services/locationService.ts`).
 *
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Integra o painel à API oficial de Localidades do IBGE (Instituto Brasileiro de Geografia e Estatística).
 * Utilizado primariamente nos formulários administrativos (como cadastro de novos usuários ou
 * filtros do mapa) para garantir que a seleção de Estado e Município seja padronizada e livre de erros.
 *
 * 🏛️ ESTRATÉGIA DE DADOS:
 * 1. 🇧🇷 ESTADOS (`getStates`):
 *    Consulta todos os estados brasileiros e ordena por nome para exibição em dropdowns.
 * 2. 🏙️ MUNICÍPIOS POR UF (`getCitiesByState`):
 *    Dada a sigla do estado (ex: "SP"), consulta apenas os municípios daquela UF,
 *    ordenando alfabeticamente. Reduz a carga de dados em memória.
 *
 * ⚠️ RESILIÊNCIA (Axios):
 * Utiliza o `axios` para requisições HTTP com tratamento de erro básico. Como a API
 * do IBGE é um serviço público gratuito, pode sofrer instabilidades.
 */

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
