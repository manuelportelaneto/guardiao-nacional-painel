import React from 'react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { BulkActionsBar } from '../../components/screens/moderation/BulkActionsBar';
import { BulkNotifyModal } from '../../components/screens/moderation/BulkNotifyModal';
import { WeeklyDigestModal } from '../../components/screens/moderation/WeeklyDigestModal';
import { ModerationCard } from '../../components/screens/moderation/ModerationCard';
import type { Contribution } from '../../types/contribution';

beforeAll(() => {
    global.ResizeObserver = class ResizeObserver {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
});


vi.mock('../../firebaseConfig', () => ({
    db: {}
}));

vi.mock('firebase/firestore', () => ({
    doc: vi.fn(),
    collection: vi.fn(),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    addDoc: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
    getDoc: vi.fn().mockResolvedValue({ exists: () => false }),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    serverTimestamp: vi.fn(),
    writeBatch: vi.fn(),
    Timestamp: {
        now: vi.fn(() => ({ toMillis: () => Date.now(), toDate: () => new Date() })),
        fromDate: vi.fn((d) => ({ toMillis: () => d.getTime(), toDate: () => d }))
    },
    increment: vi.fn()
}));

vi.mock('../../context/AuthContext', () => ({
    useAuth: () => ({
        currentUser: { uid: 'admin-123', email: 'admin@guardiaonacional.com' },
        userRole: 'ADMIN'
    })
}));

vi.mock('../../context/ScopeContext', () => ({
    useScope: () => ({
        scope: { level: 'NATIONAL' },
        isNational: true,
        resetToNational: vi.fn(),
        dataMasking: false
    })
}));

describe('Renderização dos Novos Componentes de Moderação', () => {
    it('BulkActionsBar deve renderizar quando houver itens selecionados', () => {
        render(
            <BulkActionsBar
                selectedCount={3}
                onApprove={vi.fn()}
                onResolve={vi.fn()}
                onReject={vi.fn()}
                onNotify={vi.fn()}
                onClear={vi.fn()}
                isLoading={false}
            />
        );

        expect(screen.getByText('itens selecionados')).toBeDefined();
        expect(screen.getByText(/Aprovar/)).toBeDefined();
        expect(screen.getByText(/Resolvido/)).toBeDefined();
        expect(screen.getByText('Rejeitar')).toBeDefined();
        expect(screen.getByText('Notificar')).toBeDefined();
    });

    it('ModerationCard deve exibir botão "Aceitar Publicação" em itens rejeitados pela IA', () => {
        const aiRejectedContrib: Contribution = {
            id: 'c-rejected-ai',
            title: 'Lixo acumulado na praça',
            status: 'Rejeitado',
            userId: 'user-777',
            category: 'Limpeza Urbana',
            rejectionReason: 'Recusado automaticamente pela IA de análise de texto',
            aiAnalysis: [{ isSafe: false }]
        };

        render(
            <ModerationCard
                item={aiRejectedContrib}
                tab="rejected"
                onClick={vi.fn()}
                onAction={vi.fn()}
                onReply={vi.fn()}
                isSelected={false}
                onToggleSelect={vi.fn()}
            />
        );

        expect(screen.getByText('Aceitar Publicação')).toBeDefined();
        expect(screen.getByText('Recusado pela IA')).toBeDefined();
    });

    it('ModerationCard não deve exibir botão "Aceitar Publicação" em fila regular', () => {
        const regularContrib: Contribution = {
            id: 'c-queue',
            title: 'Poste quebrado',
            status: 'Em Análise',
            userId: 'user-888',
            category: 'Iluminação'
        };

        render(
            <ModerationCard
                item={regularContrib}
                tab="queue"
                onClick={vi.fn()}
                onAction={vi.fn()}
                onReply={vi.fn()}
                isSelected={false}
                onToggleSelect={vi.fn()}
            />
        );

        expect(screen.queryByText('Aceitar Publicação')).toBeNull();
        expect(screen.getByText('Aprovar')).toBeDefined();
        expect(screen.getByText('Rejeitar')).toBeDefined();
    });

    it('BulkNotifyModal deve renderizar campos de envio de mensagem', () => {
        const contributions: Contribution[] = [
            { id: 'c1', title: 'Post 1', status: 'Aprovado', userId: 'u1' }
        ];

        render(
            <BulkNotifyModal
                isOpen={true}
                onClose={vi.fn()}
                onSend={vi.fn()}
                selectedContributions={contributions}
                isLoading={false}
            />
        );

        expect(screen.getByText('Enviar Mensagem / Notificação em Massa')).toBeDefined();
        expect(screen.getByPlaceholderText(/Descreva a orientação/)).toBeDefined();
    });


    it('WeeklyDigestModal deve renderizar cabeçalho do Noticiário Semanal de IA', () => {
        render(
            <WeeklyDigestModal
                isOpen={true}
                onClose={vi.fn()}
            />
        );

        expect(screen.getByText(/Noticiário Semanal Cívico/)).toBeDefined();
        expect(screen.getByText(/Gerar Novo Boletim/)).toBeDefined();
    });
});

