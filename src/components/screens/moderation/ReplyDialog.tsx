import React from 'react';
import { Switch } from '../../ui/switch';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../../ui/dialog';
import { DEFAULT_REPLY_TEMPLATES } from './moderationUtils';
import type { Contribution } from '../../../types/contribution';

interface ReplyDialogProps {
    open: boolean;
    contribution: Contribution | null;
    onClose: () => void;
    onSubmit: () => void;
    replyText: string;
    setReplyText: (text: string) => void;
    useDefaultReply: boolean;
    setUseDefaultReply: (use: boolean) => void;
    isLoading: boolean;
}

/**
 * ReplyDialog - Dialog for replying to contributions
 * Extracted from AdminModeration.tsx for better maintainability
 */
export const ReplyDialog: React.FC<ReplyDialogProps> = ({
    open,
    contribution,
    onClose,
    onSubmit,
    replyText,
    setReplyText,
    useDefaultReply,
    setUseDefaultReply,
    isLoading
}) => {
    const defaultReplyText = DEFAULT_REPLY_TEMPLATES.acknowledgment;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Responder Contribuição</DialogTitle>
                    <DialogDescription>
                        Envie uma resposta ao cidadão sobre esta contribuição.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="flex items-center space-x-2">
                        <Switch
                            id="default-reply"
                            checked={useDefaultReply}
                            onCheckedChange={(checked) => {
                                setUseDefaultReply(checked);
                                if (checked) setReplyText(defaultReplyText);
                                else setReplyText('');
                            }}
                        />
                        <Label htmlFor="default-reply">Usar resposta padrão</Label>
                    </div>
                    <div className="space-y-2">
                        <Label>Texto da Resposta</Label>
                        <textarea
                            className="w-full min-h-[100px] p-2 border rounded-md"
                            value={replyText}
                            onChange={(e) => {
                                setReplyText(e.target.value);
                                if (useDefaultReply && e.target.value !== defaultReplyText) {
                                    setUseDefaultReply(false);
                                }
                            }}
                            placeholder="Escreva sua resposta aqui..."
                            disabled={isLoading}
                        />
                    </div>
                    {contribution && (
                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            <p><strong>Título:</strong> {contribution.title}</p>
                            <p><strong>Categoria:</strong> {contribution.category}</p>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancelar
                    </Button>
                    <Button
                        onClick={onSubmit}
                        disabled={!replyText.trim() || isLoading}
                    >
                        {isLoading ? 'Enviando...' : 'Enviar Resposta'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
