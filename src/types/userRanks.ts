/**
 * User Ranking System
 * 
 * Gamified progression system that rewards users for platform engagement.
 * Ranks are awarded based on contributions, donations, and petition signatures.
 */

export enum UserRankId {
    OBSERVADOR = 'observador',
    ATIVO = 'ativo',
    ENGAJADO = 'engajado',
    SOLIDARIO = 'solidario',
    MOBILIZADOR = 'mobilizador',
    GUARDIAO = 'guardiao'
}

export interface UserRank {
    id: UserRankId;
    name: string;
    emoji: string;
    minContributions: number;
    requiresDonation: boolean;
    requiresPetition: boolean;
    description: string;
}

export interface UserStats {
    contributionCount: number;
    donationCount: number;
    petitionCount: number;
}

/**
 * All available user ranks, ordered from lowest to highest
 */
export const USER_RANKS: UserRank[] = [
    {
        id: UserRankId.OBSERVADOR,
        name: 'Cidadão Observador',
        emoji: '🔍',
        minContributions: 0,
        requiresDonation: false,
        requiresPetition: false,
        description: 'Observa e aprende sobre a comunidade. Primeira patente recebida ao se cadastrar.'
    },
    {
        id: UserRankId.ATIVO,
        name: 'Cidadão Ativo',
        emoji: '📢',
        minContributions: 15,
        requiresDonation: false,
        requiresPetition: false,
        description: 'Participante ativo que contribui regularmente para a plataforma.'
    },
    {
        id: UserRankId.ENGAJADO,
        name: 'Cidadão Engajado',
        emoji: '🤝',
        minContributions: 50,
        requiresDonation: false,
        requiresPetition: false,
        description: 'Membro engajado que demonstra comprometimento com a comunidade.'
    },
    {
        id: UserRankId.SOLIDARIO,
        name: 'Cidadão Solidário',
        emoji: '⭐',
        minContributions: 100,
        requiresDonation: true,
        requiresPetition: false,
        description: 'Apoiador solidário que contribui financeiramente para causas importantes.'
    },
    {
        id: UserRankId.MOBILIZADOR,
        name: 'Cidadão Mobilizador',
        emoji: '🏛️',
        minContributions: 200,
        requiresDonation: false,
        requiresPetition: true,
        description: 'Organizador comunitário que mobiliza outros cidadãos através de petições.'
    },
    {
        id: UserRankId.GUARDIAO,
        name: 'Guardião da Comunidade',
        emoji: '👑',
        minContributions: 500,
        requiresDonation: true,
        requiresPetition: true,
        description: 'Guardião exemplar que lidera pelo exemplo em todas as formas de participação.'
    }
];

/**
 * Calculate the user's current rank based on their statistics
 * 
 * @param stats User statistics (contributions, donations, petitions)
 * @returns The highest rank the user qualifies for
 */
export function calculateUserRank(stats: UserStats): UserRank {
    // Find the highest rank the user qualifies for
    // We iterate in reverse to find the highest qualifying rank first
    for (let i = USER_RANKS.length - 1; i >= 0; i--) {
        const rank = USER_RANKS[i];

        // Check if user meets all requirements for this rank
        const meetsContributions = stats.contributionCount >= rank.minContributions;
        const meetsDonation = !rank.requiresDonation || stats.donationCount > 0;
        const meetsPetition = !rank.requiresPetition || stats.petitionCount > 0;

        if (meetsContributions && meetsDonation && meetsPetition) {
            return rank;
        }
    }

    // Default to the first rank (Observador) if no other rank matches
    return USER_RANKS[0];
}

/**
 * Get a rank by its ID
 */
export function getRankById(id: UserRankId): UserRank | undefined {
    return USER_RANKS.find(rank => rank.id === id);
}

/**
 * Get the next rank after the current one
 */
export function getNextRank(currentRank: UserRank): UserRank | null {
    const currentIndex = USER_RANKS.findIndex(rank => rank.id === currentRank.id);
    if (currentIndex === -1 || currentIndex === USER_RANKS.length - 1) {
        return null; // Already at the highest rank
    }
    return USER_RANKS[currentIndex + 1];
}
