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
