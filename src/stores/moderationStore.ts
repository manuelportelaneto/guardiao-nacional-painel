/**
 * Zustand Store: Moderation State
 * 
 * Centralized state management for the moderation module
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
