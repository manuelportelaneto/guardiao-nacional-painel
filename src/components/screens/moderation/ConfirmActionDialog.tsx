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
                        <div className="space-y-3">
                            <Label className="text-xs font-semibold text-slate-700">Motivo da Recusa / Devolução</Label>
                            <Select
                                value={rejectionReason}
                                onValueChange={setRejectionReason}
                            >
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Selecione o motivo oficial" />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem value="lgpd_pii">🛡️ Violação LGPD (Rosto, Placa, Telefone ou CPF na foto/texto)</SelectItem>
                                    <SelectItem value="commercial">🏪 Comércio / Venda / Divulgação Comercial Não Permitida</SelectItem>
                                    <SelectItem value="defamation">⚖️ Ataque Pessoal / Difamação ou Acusação Sem Provas</SelectItem>
                                    <SelectItem value="unclear_location">📍 Localização ou Endereço Incorreto / Divergente</SelectItem>
                                    <SelectItem value="quality">📷 Foto Ilegível / Texto Vago ou Insuficiente</SelectItem>
                                    <SelectItem value="duplicate">📑 Ocorrência Duplicada / Já Cadastrada</SelectItem>
                                    <SelectItem value="false_info">❌ Informação Incorreta ou Trote</SelectItem>
                                    <SelectItem value="other">📝 Outro Motivo Específico</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Orientação Didática Explicativa */}
                            {rejectionReason === 'lgpd_pii' && (
                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                                    <span className="font-bold flex items-center gap-1">🛡️ Mensagem Didática LGPD ao Cidadão:</span>
                                    <p className="text-[11px] leading-relaxed">
                                        "Por motivos de conformidade com a LGPD (Lei 13.709/2018), não é permitido incluir fotos com rostos de pessoas, placas de veículos, documentos ou telefones. Por favor, reenvie desfocando ou removendo os dados pessoais."
                                    </p>
                                </div>
                            )}

                            {rejectionReason === 'commercial' && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-xs text-blue-900 space-y-1">
                                    <span className="font-bold flex items-center gap-1">🏪 Orientação de Finalidade Cívica:</span>
                                    <p className="text-[11px] leading-relaxed">
                                        "O Guardião Nacional é exclusivo para demandas de zeladoria urbana, segurança e interesse público. Anúncios comerciais e vendas não são permitidos na plataforma."
                                    </p>
                                </div>
                            )}

                            {rejectionReason === 'unclear_location' && (
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-1">
                                    <span className="font-bold">📍 Orientação Geográfica:</span>
                                    <p className="text-[11px] leading-relaxed">
                                        "Não foi possível confirmar o endereço da ocorrência. Por favor, use o marcador do mapa ou informe o CEP e ponto de referência correto ao reenviar."
                                    </p>
                                </div>
                            )}
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
