import React from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Star } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../../ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../ui/select";

export type ModerationAction =
    | 'approve'
    | 'reject'
    | 'ban'
    | 'approve_contrib'
    | 'reject_contrib'
    | 'reject_approved'
    | 'approve_remove_content';

interface ConfirmActionDialogProps {
    open: boolean;
    action: ModerationAction | null;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    // For approval
    approvalRating?: number;
    setApprovalRating?: (rating: number) => void;
    // For rejection
    rejectionReason?: string;
    setRejectionReason?: (reason: string) => void;
}

/**
 * ConfirmActionDialog - Confirmation dialog for moderation actions
 * Supports approval with rating and rejection with reason
 */
export const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
    open,
    action,
    onClose,
    onConfirm,
    isLoading,
    approvalRating = 5,
    setApprovalRating,
    rejectionReason = '',
    setRejectionReason
}) => {
    const getDialogContent = () => {
        if (action === 'approve_contrib') {
            return {
                title: 'Aprovar Contribuição',
                description: 'Avalie a qualidade desta contribuição antes de aprovar.',
                showRating: true,
                showReason: false,
                confirmText: 'Aprovar',
                confirmVariant: 'default' as const
            };
        }

        if (action === 'reject_contrib' || action === 'reject_approved') {
            return {
                title: 'Rejeitar Contribuição',
                description: 'Informe o motivo da rejeição.',
                showRating: false,
                showReason: true,
                confirmText: 'Rejeitar',
                confirmVariant: 'destructive' as const
            };
        }

        if (action === 'approve_remove_content') {
            return {
                title: 'Remover Conteúdo',
                description: 'O conteúdo será removido e o autor notificado.',
                showRating: false,
                showReason: true,
                confirmText: 'Remover',
                confirmVariant: 'destructive' as const
            };
        }

        if (action === 'approve') {
            return {
                title: 'Aprovar Denúncia',
                description: 'Confirmar a ação de aprovar esta denúncia?',
                showRating: false,
                showReason: false,
                confirmText: 'Confirmar',
                confirmVariant: 'default' as const
            };
        }

        if (action === 'reject') {
            return {
                title: 'Ignorar Denúncia',
                description: 'A denúncia será marcada como ignorada.',
                showRating: false,
                showReason: false,
                confirmText: 'Ignorar',
                confirmVariant: 'secondary' as const
            };
        }

        if (action === 'ban') {
            return {
                title: 'Banir Usuário',
                description: 'O usuário será banido da plataforma.',
                showRating: false,
                showReason: true,
                confirmText: 'Banir',
                confirmVariant: 'destructive' as const
            };
        }

        return {
            title: 'Confirmar Ação',
            description: 'Confirmar esta ação?',
            showRating: false,
            showReason: false,
            confirmText: 'Confirmar',
            confirmVariant: 'default' as const
        };
    };

    const content = getDialogContent();

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{content.title}</DialogTitle>
                    <DialogDescription>{content.description}</DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {content.showRating && setApprovalRating && (
                        <div className="space-y-2">
                            <Label>Avaliação da Contribuição</Label>
                            <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setApprovalRating(star)}
                                        className="focus:outline-none"
                                    >
                                        <Star
                                            className={`h-6 w-6 transition-colors ${star <= approvalRating
                                                    ? 'text-yellow-400 fill-yellow-400'
                                                    : 'text-gray-300'
                                                }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500">
                                {approvalRating} estrela{approvalRating !== 1 ? 's' : ''}
                            </p>
                        </div>
                    )}

                    {content.showReason && setRejectionReason && (
                        <div className="space-y-2">
                            <Label>Motivo</Label>
                            <Select
                                value={rejectionReason}
                                onValueChange={setRejectionReason}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o motivo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="duplicate">Conteúdo duplicado</SelectItem>
                                    <SelectItem value="inappropriate">Conteúdo impróprio</SelectItem>
                                    <SelectItem value="false_info">Informação falsa</SelectItem>
                                    <SelectItem value="spam">Spam ou propaganda</SelectItem>
                                    <SelectItem value="quality">Baixa qualidade</SelectItem>
                                    <SelectItem value="off_topic">Fora do escopo</SelectItem>
                                    <SelectItem value="other">Outro motivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        variant={content.confirmVariant}
                        onClick={onConfirm}
                        disabled={isLoading || (content.showReason && !rejectionReason)}
                    >
                        {isLoading ? 'Processando...' : content.confirmText}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
