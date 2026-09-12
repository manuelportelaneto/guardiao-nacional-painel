import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import { MessageSquare, Send, Users, Mail, Loader2 } from 'lucide-react';

interface BulkNotifyModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipients?: { userId: string; userEmail?: string; contributionTitle?: string }[];
    selectedContributions?: any[];
    onSend: (title: string, message: string, sendEmail: boolean) => Promise<void>;
    loading?: boolean;
    isLoading?: boolean;
}

export const BulkNotifyModal: React.FC<BulkNotifyModalProps> = ({
    isOpen,
    onClose,
    recipients,
    selectedContributions,
    onSend,
    loading = false,
    isLoading = false
}) => {
    const isSubmitting = loading || isLoading;
    const [title, setTitle] = useState('Comunicado da Equipe Guardião Nacional');
    const [message, setMessage] = useState('');
    const [sendEmail, setSendEmail] = useState(true);

    const actualRecipients = recipients || (selectedContributions || []).map(c => ({
        userId: c.userId,
        userEmail: c.email || c.userEmail,
        contributionTitle: c.title
    }));


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        await onSend(title.trim(), message.trim(), sendEmail);
        setMessage('');
        onClose();
    };

    const uniqueAuthorsCount = new Set((actualRecipients || []).map(r => r.userId).filter(Boolean)).size;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md rounded-2xl p-6 bg-white border border-slate-200">
                <DialogHeader className="pb-3 border-b border-slate-100">
                    <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-blue-600" />
                        Enviar Mensagem / Notificação em Massa
                    </DialogTitle>
                </DialogHeader>


                <form onSubmit={handleSubmit} className="space-y-4 pt-3">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-xs text-blue-900">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <span>
                            Mensagem será entregue a <strong>{uniqueAuthorsCount}</strong> {uniqueAuthorsCount === 1 ? 'munícipe' : 'munícipes'} vinculados às ocorrências selecionadas.
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="notifyTitle" className="text-xs font-bold text-slate-700">
                            Título da Notificação
                        </Label>
                        <input
                            id="notifyTitle"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                            placeholder="ex: Atualização sobre sua contribuição"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="notifyMessage" className="text-xs font-bold text-slate-700">
                            Mensagem / Orientação aos Munícipes
                        </Label>
                        <textarea
                            id="notifyMessage"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            required
                            rows={4}
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                            placeholder="Descreva a orientação, atualização sobre a obra ou agradecimento pela colaboração..."
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-2.5">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <div>
                                <Label htmlFor="sendEmail" className="text-xs font-bold text-slate-800 block cursor-pointer">
                                    Disparar também por E-mail
                                </Label>
                                <span className="text-[11px] text-slate-500 block">
                                    Envia aos usuários que possuem e-mail cadastrado
                                </span>
                            </div>
                        </div>
                        <Switch
                            id="sendEmail"
                            checked={sendEmail}
                            onCheckedChange={setSendEmail}
                        />
                    </div>

                    <DialogFooter className="pt-2 gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="text-xs h-9 rounded-xl"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !message.trim()}
                            className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 rounded-xl font-semibold shadow-xs"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Enviando...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    <span>Enviar Mensagem ({uniqueAuthorsCount})</span>
                                </>
                            )}
                        </Button>

                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
