/**
 * @fileoverview Hook de Denúncias Cívicas com Cache Reativo (`src/hooks/useContributions.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele encapsula a lógica de leitura e atualização de denúncias usando TanStack Query (React Query).
 * Em vez de chamar o `contributionService` diretamente nas telas, os componentes consomem esses 
 * hooks para obter caching automático, estados de loading/error e sincronização reativa.
 * 
 * 🏛️ CONCEITOS DO TANSTACK QUERY:
 * 1. 🔑 `queryKey` — CHAVE DE CACHE ÚNICA:
 *    Cada combinação de `['contributions', cityId, filters]` é tratada como uma entrada única no 
 *    cache em memória. Se dois componentes diferentes pedirem dados com os mesmos argumentos, 
 *    apenas UMA requisição de rede é feita. Os dados são compartilhados automaticamente.
 * 
 * 2. 🔄 `invalidateQueries` — INVALIDAÇÃO AUTOMÁTICA PÓS-MUTAÇÃO:
 *    Após uma mutação bem-sucedida (atualizar o status de uma denúncia), o hook invalida 
 *    automaticamente todas as queries com prefixo `['contributions']`. Isso força uma 
 *    nova busca em background e todos os componentes que consomem essas queries atualizam 
 *    seus dados de forma reativa sem recarregar a página.
 * 
 * 3. ⏸️ `enabled: !!cityId` — QUERY CONDICIONAL:
 *    A query só é disparada quando `cityId` é uma string não-vazia. Isso evita requisições 
 *    ao Firestore com parâmetros inválidos enquanto o usuário ainda está carregando dados de perfil.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contributionService } from '../services/contributionService';

type Filters = {
    status?: string;
    category?: string;
    startDate?: Date;
    endDate?: Date;
};

export function useCityContributions(cityId: string, filters?: Filters) {
    return useQuery({
        queryKey: ['contributions', cityId, filters],
        queryFn: () => contributionService.getCityContributions(cityId, filters),
        enabled: !!cityId,
    });
}

export function useUpdateContributionStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) =>
            contributionService.updateStatus(id, status),
        onSuccess: () => {
            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ['contributions'] });
        },
    });
}
