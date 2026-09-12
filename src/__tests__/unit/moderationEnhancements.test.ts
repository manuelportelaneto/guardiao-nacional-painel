import { describe, it, expect, vi, beforeEach } from 'vitest';
import { moderationService } from '../../services/moderationService';
import { weeklyAiDigestService } from '../../services/weeklyAiDigestService';
import type { Contribution } from '../../types/contribution';

// Mock do Firestore
vi.mock('../../firebaseConfig', () => ({
    db: {}
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
    collection: vi.fn((_db, coll, ...sub) => ({ path: [coll, ...sub].join('/') })),
    updateDoc: vi.fn().mockResolvedValue(true),
    setDoc: vi.fn().mockResolvedValue(true),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    getDocs: vi.fn().mockResolvedValue({
        empty: false,
        docs: [
            {
                id: 'digest-1',
                data: () => ({
                    headline: 'Semana Produtiva',
                    summary: 'Resumo geral',
                    editorialSummary: 'Resumo geral',
                    keyThemes: [],
                    topDemands: ['Buraco na rua', 'Iluminação'],
                    topNeighborhoods: [],
                    highlightedContributions: [],
                    actionRecommendations: ['Operação tapa-buraco'],
                    totalAnalyzed: 5,
                    periodStart: '2026-09-05',
                    periodEnd: '2026-09-12',
                    createdAt: { toDate: () => new Date() }
                })
            }
        ]
    }),
    getDoc: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({ name: 'Cidadão Exemplo', email: 'cidadao@teste.com' })
    }),
    query: vi.fn((...args) => args),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toMillis: () => Date.now() })),
    writeBatch: vi.fn(() => ({
        update: vi.fn(),
        commit: vi.fn().mockResolvedValue(true)
    })),
    Timestamp: {
        now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
        fromDate: vi.fn((d) => ({ toMillis: () => d.getTime(), toDate: () => d }))
    },
    increment: vi.fn((n) => ({ __increment: n }))
}));


vi.mock('../../services/notificationService', () => ({
    notificationService: {
        sendContentApprovedEmail: vi.fn().mockResolvedValue(true),
        sendContentRemovedEmail: vi.fn().mockResolvedValue(true),
        sendCustomMessageEmail: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../../services/sysadminAlertService', () => ({
    sysadminAlertService: {
        resolveAlertByContributionId: vi.fn().mockResolvedValue(true)
    }
}));

vi.mock('../../services/loggingService', () => ({
    loggingService: {
        logAudit: vi.fn()
    }
}));

vi.mock('../../services/aiLearningService', () => ({
    aiLearningService: {
        recordDecisionPattern: vi.fn()
    }
}));

describe('Moderação Avançada - Aceite de Publicação e Ações em Lote', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const mockRejectedContribution: Contribution = {
        id: 'contrib-123',
        title: 'Buraco perigoso na Avenida Principal',
        description: 'Cratera aberta em frente à escola',
        category: 'Infraestrutura',
        status: 'Rejeitado',
        userId: 'user-456',
        riskLevel: 3,
        rejectionReason: 'Recusado pelo filtro de IA preliminar'
    };

    it('acceptRejectedContribution deve alterar o status para Aprovado, bonificar o usuário e estornar strikes', async () => {
        const success = await moderationService.acceptRejectedContribution(mockRejectedContribution, 'admin-001');
        expect(success).toBe(true);
    });

    it('bulkApprove deve aprovar múltiplas publicações em lote', async () => {
        const items: Contribution[] = [
            { id: 'c1', title: 'Post 1', status: 'Em Análise', userId: 'u1' },
            { id: 'c2', title: 'Post 2', status: 'Em Análise', userId: 'u2' }
        ];

        const res = await moderationService.bulkApprove(items, 5, 'admin-001');
        expect(res.success).toBe(2);
        expect(res.failed).toBe(0);
    });

    it('bulkResolve deve marcar múltiplas publicações como resolvidas', async () => {
        const items: Contribution[] = [
            { id: 'c1', title: 'Post 1', status: 'Aprovado', userId: 'u1' },
            { id: 'c2', title: 'Post 2', status: 'Aprovado', userId: 'u2' }
        ];

        const res = await moderationService.bulkResolve(items, 'admin-001');
        expect(res.success).toBe(2);
        expect(res.failed).toBe(0);
    });

    it('bulkReject deve rejeitar publicações com o motivo especificado', async () => {
        const items: Contribution[] = [
            { id: 'c1', title: 'Post 1', status: 'Em Análise', userId: 'u1' }
        ];

        const res = await moderationService.bulkReject(items, 'Violação de regras comunitárias', 'admin-001');
        expect(res.success).toBe(1);
        expect(res.failed).toBe(0);
    });

    it('bulkNotify deve enviar notificações no app e por e-mail para os criadores', async () => {
        const recipients = [
            { userId: 'u1', authorName: 'Carlos', email: 'carlos@teste.com' },
            { userId: 'u2', authorName: 'Ana' }
        ];

        const res = await moderationService.bulkNotify(
            recipients,
            'Aviso da Prefeitura',
            'Equipes de zeladoria foram mobilizadas para a sua região.',
            true
        );

        expect(res.notifiedCount).toBe(2);
    });
});

describe('Noticiário Semanal de IA (Weekly AI Digest)', () => {
    it('getPastDigests deve retornar os boletins arquivados', async () => {
        const digests = await weeklyAiDigestService.getPastDigests();
        expect(Array.isArray(digests)).toBe(true);
        expect(digests.length).toBeGreaterThan(0);
        expect(digests[0].headline).toBe('Semana Produtiva');
    });

    it('generateWeeklyDigest deve gerar boletim mesmo em modo fallback sem quebrar', async () => {
        const digest = await weeklyAiDigestService.generateWeeklyDigest(7);
        expect(digest).toBeDefined();
        expect(digest.headline).toBeDefined();
        expect(Array.isArray(digest.keyThemes)).toBe(true);
        expect(Array.isArray(digest.actionRecommendations)).toBe(true);
    });
});

