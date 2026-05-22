/**
 * @fileoverview Store de Estado Global da Moderação (`src/stores/moderationStore.ts`).
 *
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Gerencia o estado compartilhado dos modais e diálogos da tela de moderação de denúncias
 * usando Zustand — uma biblioteca de gerenciamento de estado React leve e sem boilerplate.
 *
 * 🏛️ POR QUE ZUSTAND (E NÃO useState LOCAL)?
 * A tela de moderação (`AdminModeration`) tem múltiplos componentes que precisam acessar
 * e modificar o mesmo estado de diálogo (botão de ação → abre modal de confirmação →
 * submete → fecha modal). Passar esses estados via props causaria "prop drilling" excessivo.
 * O Zustand resolve isso com um store global simples, sem Context API nem Redux.
 *
 * 🎭 ESTADOS GERENCIADOS:
 * 1. `confirmDialog`: Controla o modal de confirmação de ação (aprovar, rejeitar, banir).
 *    Armazena qual `action`, qual `contribution` e qual `report` estão em análise.
 * 2. `replyDialog`: Controla o modal de resposta ao cidadão com texto e template padrão.
 * 3. Campos de formulário: `rejectionReason`, `approvalRating`, `replyText`, `useDefaultReply`.
 *
 * 🔌 SELETORES OTIMIZADOS:
 * Os hooks `useConfirmDialog()` e `useReplyDialog()` são seletores que acessam
 * apenas a fatia de estado relevante, evitando re-renders desnecessários em componentes
 * que não dependem de toda a store.
 */

import { create } from 'zustand';
import type { Contribution } from '../types/contribution';

// Report interface (same as in AdminModeration)
interface Report {
    id: string;
    contributionId: string;
    reporterId: string;
    reason: string;
    createdAt: any;
    status: 'pending' | 'approved' | 'rejected';
}

interface ReportWithContribution extends Report {
    contribution?: Contribution;
    reporterEmail?: string;
    contributorEmail?: string;
}

type ModerationAction =
    | 'approve'
    | 'reject'
    | 'ban'
    | 'approve_contrib'
    | 'reject_contrib'
    | 'reject_approved'
    | 'approve_remove_content';

interface ModerationDialogState {
    // Confirm Dialog
    confirmDialog: {
        open: boolean;
        action: ModerationAction | null;
        report: ReportWithContribution | null;
        contribution: Contribution | null;
    };

    // Reply Dialog
    replyDialog: {
        open: boolean;
        contribution: Contribution | null;
    };

    // Form state
    rejectionReason: string;
    approvalRating: number;
    replyText: string;
    useDefaultReply: boolean;

    // Actions
    setConfirmDialog: (dialog: Partial<ModerationDialogState['confirmDialog']>) => void;
    openConfirmDialog: (action: ModerationAction, contribution?: Contribution, report?: ReportWithContribution) => void;
    closeConfirmDialog: () => void;

    setReplyDialog: (dialog: Partial<ModerationDialogState['replyDialog']>) => void;
    openReplyDialog: (contribution: Contribution) => void;
    closeReplyDialog: () => void;

    setRejectionReason: (reason: string) => void;
    setApprovalRating: (rating: number) => void;
    setReplyText: (text: string) => void;
    setUseDefaultReply: (use: boolean) => void;

    resetDialogState: () => void;
}

const initialState = {
    confirmDialog: {
        open: false,
        action: null as ModerationAction | null,
        report: null as ReportWithContribution | null,
        contribution: null as Contribution | null,
    },
    replyDialog: {
        open: false,
        contribution: null as Contribution | null,
    },
    rejectionReason: '',
    approvalRating: 5,
    replyText: '',
    useDefaultReply: false,
};

export const useModerationStore = create<ModerationDialogState>((set) => ({
    ...initialState,

    setConfirmDialog: (dialog) =>
        set((state) => ({
            confirmDialog: { ...state.confirmDialog, ...dialog }
        })),

    openConfirmDialog: (action, contribution, report) =>
        set({
            confirmDialog: {
                open: true,
                action,
                contribution: contribution || null,
                report: report || null
            }
        }),

    closeConfirmDialog: () =>
        set({
            confirmDialog: {
                open: false,
                action: null,
                contribution: null,
                report: null
            },
            rejectionReason: '',
            approvalRating: 5,
        }),

    setReplyDialog: (dialog) =>
        set((state) => ({
            replyDialog: { ...state.replyDialog, ...dialog }
        })),

    openReplyDialog: (contribution) =>
        set({
            replyDialog: { open: true, contribution }
        }),

    closeReplyDialog: () =>
        set({
            replyDialog: { open: false, contribution: null },
            replyText: '',
            useDefaultReply: false,
        }),

    setRejectionReason: (rejectionReason) => set({ rejectionReason }),
    setApprovalRating: (approvalRating) => set({ approvalRating }),
    setReplyText: (replyText) => set({ replyText }),
    setUseDefaultReply: (useDefaultReply) => set({ useDefaultReply }),

    resetDialogState: () => set(initialState),
}));

/**
 * Hook for selected items (optimized selectors)
 */
export const useConfirmDialog = () => useModerationStore((state) => state.confirmDialog);
export const useReplyDialog = () => useModerationStore((state) => state.replyDialog);
