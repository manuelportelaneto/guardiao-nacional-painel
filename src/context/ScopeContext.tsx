/**
 * @fileoverview Provedor do Contexto de Jurisdição e Escopo Federativo (`ScopeContext`).
 * 
 * Permite que o SysAdmin Global opere em nível Nacional ou emule e controle a visão
 * de qualquer Estado, Município ou Secretaria com filtragem contextual automática.
 */

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { JurisdictionScope, JurisdictionLevel } from '../types/scope';

import { dataSyncService } from '../services/dataSyncService';

interface ScopeContextType {
    scope: JurisdictionScope;
    setScope: (newScope: JurisdictionScope) => void;
    setJurisdiction: (level: JurisdictionLevel, state?: string, cityId?: string, cityName?: string, departmentId?: string, departmentName?: string) => void;
    resetToNational: () => void;
    isNational: boolean;
    isState: boolean;
    isCity: boolean;
    isDepartment: boolean;
    isEmulating: boolean;
    dataMasking: boolean; // Se ativo, mascara CPFs, telefones e emails de cidadãos
    setDataMasking: (mask: boolean) => void;
    availableStates: { uf: string; name: string }[];
    availableCities: { id: string; name: string; state: string; totalContributions?: number; status?: string }[];
    scanForNewJurisdictions: (force?: boolean) => Promise<{ newCount: number; totalCities: number }>;
}

const BRAZIL_STATES = [
    { uf: 'AC', name: 'Acre' },
    { uf: 'AL', name: 'Alagoas' },
    { uf: 'AP', name: 'Amapá' },
    { uf: 'AM', name: 'Amazonas' },
    { uf: 'BA', name: 'Bahia' },
    { uf: 'CE', name: 'Ceará' },
    { uf: 'DF', name: 'Distrito Federal' },
    { uf: 'ES', name: 'Espírito Santo' },
    { uf: 'GO', name: 'Goiás' },
    { uf: 'MA', name: 'Maranhão' },
    { uf: 'MT', name: 'Mato Grosso' },
    { uf: 'MS', name: 'Mato Grosso do Sul' },
    { uf: 'MG', name: 'Minas Gerais' },
    { uf: 'PA', name: 'Pará' },
    { uf: 'PB', name: 'Paraíba' },
    { uf: 'PR', name: 'Paraná' },
    { uf: 'PE', name: 'Pernambuco' },
    { uf: 'PI', name: 'Piauí' },
    { uf: 'RJ', name: 'Rio de Janeiro' },
    { uf: 'RN', name: 'Rio Grande do Norte' },
    { uf: 'RS', name: 'Rio Grande do Sul' },
    { uf: 'RO', name: 'Rondônia' },
    { uf: 'RR', name: 'Roraima' },
    { uf: 'SC', name: 'Santa Catarina' },
    { uf: 'SP', name: 'São Paulo' },
    { uf: 'SE', name: 'Sergipe' },
    { uf: 'TO', name: 'Tocantins' },
];

const INITIAL_CITIES = [
    { id: 'sao-paulo', name: 'São Paulo', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'santo-andre', name: 'Santo André', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'sao-bernardo', name: 'São Bernardo do Campo', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'sao-caetano', name: 'São Caetano do Sul', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'diadema', name: 'Diadema', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'maua', name: 'Mauá', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'ribeirao-pires', name: 'Ribeirão Pires', state: 'SP', status: 'Monitoramento Cívico' },
    { id: 'rio-grande-da-serra', name: 'Rio Grande da Serra', state: 'SP', status: 'Monitoramento Cívico' },
];

const DEFAULT_SCOPE: JurisdictionScope = {
    level: 'NATIONAL',
    isEmulated: false,
};

const ScopeContext = createContext<ScopeContextType>({
    scope: DEFAULT_SCOPE,
    setScope: () => {},
    setJurisdiction: () => {},
    resetToNational: () => {},
    isNational: true,
    isState: false,
    isCity: false,
    isDepartment: false,
    isEmulating: false,
    dataMasking: false,
    setDataMasking: () => {},
    availableStates: BRAZIL_STATES,
    availableCities: INITIAL_CITIES,
    scanForNewJurisdictions: async () => ({ newCount: 0, totalCities: INITIAL_CITIES.length }),
});

export const ScopeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { userData } = useAuth();
    const [scope, setScope] = useState<JurisdictionScope>(DEFAULT_SCOPE);
    const [dataMasking, setDataMasking] = useState<boolean>(false);
    const [cities, setCities] = useState(INITIAL_CITIES);

    // Carrega cidades descobertas previamente salvas no cache diário
    useEffect(() => {
        const cachedDiscovered = dataSyncService.getDiscoveredCities();
        if (cachedDiscovered.length > 0) {
            const map = new Map<string, any>();
            INITIAL_CITIES.forEach(c => map.set(c.id, c));
            cachedDiscovered.forEach(c => {
                if (!map.has(c.id)) {
                    map.set(c.id, {
                        id: c.id,
                        name: c.name,
                        state: c.state,
                        totalContributions: c.totalContributions,
                        status: c.status || 'Monitoramento Cívico'
                    });
                }
            });
            setCities(Array.from(map.values()));
        }
    }, []);

    // Função de escaneamento de novas jurisdições a partir das contribuições
    const scanForNewJurisdictions = async (force = true) => {
        const result = await dataSyncService.syncData(force);
        const map = new Map<string, any>();
        INITIAL_CITIES.forEach(c => map.set(c.id, c));
        
        let newCount = 0;
        result.newCitiesDiscovered.forEach(c => {
            if (!map.has(c.id)) {
                newCount++;
            }
            map.set(c.id, {
                id: c.id,
                name: c.name,
                state: c.state,
                totalContributions: c.totalContributions,
                status: c.status || 'Monitoramento Cívico'
            });
        });

        const merged = Array.from(map.values());
        setCities(merged);
        return { newCount, totalCities: merged.length };
    };

    // Ajusta o escopo inicial com base no papel do usuário caso não seja super admin
    useEffect(() => {
        if (!userData) return;

        if (userData.role === 'super_admin' || userData.role === 'presidente') {
            return;
        }

        if (userData.role === 'governador' && userData.state) {
            setScope({
                level: 'STATE',
                state: userData.state,
                isEmulated: false,
            });
            setDataMasking(true);
        } else if ((userData.role === 'prefeito' || userData.role === 'city_admin') && userData.cityId) {
            const city = cities.find(c => c.id === userData.cityId);
            setScope({
                level: 'MUNICIPAL',
                cityId: userData.cityId,
                cityName: city?.name || userData.cityId,
                state: city?.state,
                isEmulated: false,
            });
            setDataMasking(true);
        } else if (userData.role === 'servidor') {
            const city = cities.find(c => c.id === userData.cityId);
            setScope({
                level: 'DEPARTMENT',
                cityId: userData.cityId,
                cityName: city?.name || userData.cityId,
                state: city?.state,
                isEmulated: false,
            });
            setDataMasking(true);
        }
    }, [userData, cities]);

    const setJurisdiction = (
        level: JurisdictionLevel,
        state?: string,
        cityId?: string,
        cityName?: string,
        departmentId?: string,
        departmentName?: string
    ) => {
        setScope({
            level,
            state,
            cityId,
            cityName,
            departmentId,
            departmentName,
            isEmulated: userData?.role === 'super_admin' || userData?.role === 'presidente',
        });
    };

    const resetToNational = () => {
        setScope(DEFAULT_SCOPE);
    };

    const isNational = scope.level === 'NATIONAL';
    const isState = scope.level === 'STATE';
    const isCity = scope.level === 'MUNICIPAL';
    const isDepartment = scope.level === 'DEPARTMENT';
    const isEmulating = !!scope.isEmulated;

    return (
        <ScopeContext.Provider
            value={{
                scope,
                setScope,
                setJurisdiction,
                resetToNational,
                isNational,
                isState,
                isCity,
                isDepartment,
                isEmulating,
                dataMasking,
                setDataMasking,
                availableStates: BRAZIL_STATES,
                availableCities: cities,
                scanForNewJurisdictions,
            }}
        >
            {children}
        </ScopeContext.Provider>
    );
};

export const useScope = () => useContext(ScopeContext);
