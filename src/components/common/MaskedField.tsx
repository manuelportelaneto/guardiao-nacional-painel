import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Eye, EyeOff, Lock, ShieldCheck, AlertCircle } from 'lucide-react';
import { lgpdAuditService, LGPD_LEGAL_BASES, type PiiFieldType } from '../../services/lgpdAuditService';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'sonner';

interface MaskedFieldProps {
    fieldType: PiiFieldType;
    rawValue: string;
    resourceName: string;
    resourceId: string;
    className?: string;
}

export const MaskedField: React.FC<MaskedFieldProps> = ({
    fieldType,
    rawValue,
    resourceName,
    resourceId,
    className = ''
}) => {
    const { currentUser } = useAuth();
    const [isUnmasked, setIsUnmasked] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedLegalBasis, setSelectedLegalBasis] = useState(LGPD_LEGAL_BASES[0].id);
    const [justification, setJustification] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Valor mascarado padrão
    const getMaskedValue = () => {
        switch (fieldType) {
            case 'cpf': return lgpdAuditService.maskCpf(rawValue);
            case 'email': return lgpdAuditService.maskEmail(rawValue);
            case 'phone': return lgpdAuditService.maskPhone(rawValue);
            case 'full_name': return lgpdAuditService.maskName(rawValue);
            case 'address': return lgpdAuditService.maskAddress(rawValue);
            default: return '********';
        }
    };

    const handleConfirmUnmask = async () => {
        if (!justification.trim() || justification.trim().length < 5) {
            toast.error('Informe uma justificativa com pelo menos 5 caracteres para fins de auditoria.');
            return;
        }

        setIsLoading(true);
        try {
            const legalBasisObj = LGPD_LEGAL_BASES.find(b => b.id === selectedLegalBasis) || LGPD_LEGAL_BASES[0];

            await lgpdAuditService.logPiiAccess({
                userEmail: currentUser?.email || 'servidor@prefeitura.gov.br',
                userName: currentUser?.displayName || 'Servidor Público',
                userRole: 'Servidor / Fiscal Municipal',
                targetResource: resourceName,
                targetResourceId: resourceId,
                accessedFields: [fieldType],
                legalBasis: `${legalBasisObj.code} (${legalBasisObj.description.slice(0, 35)}...)`,
                justification: justification.trim()
            });

            setIsUnmasked(true);
            setModalOpen(false);
            toast.success('Dado desmascarado. Acesso registrado na auditoria LGPD.');
        } catch (e) {
            toast.error('Falha ao registrar auditoria.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
            <span className={`font-mono text-xs ${isUnmasked ? 'text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200' : 'text-slate-600'}`}>
                {isUnmasked ? rawValue : getMaskedValue()}
            </span>

            {!isUnmasked ? (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setModalOpen(true)}
                    className="h-6 w-6 text-slate-400 hover:text-blue-600"
                    title="Revelar dado pessoal (Requer justificativa LGPD)"
                >
                    <Eye className="w-3.5 h-3.5" />
                </Button>
            ) : (
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsUnmasked(false)}
                    className="h-6 w-6 text-emerald-600 hover:text-slate-600"
                    title="Ocultar novamente"
                >
                    <EyeOff className="w-3.5 h-3.5" />
                </Button>
            )}

            {/* Modal de Desmascaramento Auditado */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 mb-2">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <span>Acesso a Dado Pessoal (LGPD)</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {fieldType}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Para visualizar o dado real do munícipe no recurso <strong>{resourceId}</strong>, selecione a base legal e informe a justificativa pública.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Base Legal (Art. 7º - Lei 13.709/2018)</Label>
                            <Select value={selectedLegalBasis} onValueChange={setSelectedLegalBasis}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {LGPD_LEGAL_BASES.map(basis => (
                                        <SelectItem key={basis.id} value={basis.id} className="text-xs">
                                            <strong>{basis.code}</strong> - {basis.description}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Justificativa Operacional</Label>
                            <Textarea
                                placeholder="Ex: Contato com o cidadão para confirmar ponto exato da vistoria de campo."
                                value={justification}
                                onChange={e => setJustification(e.target.value)}
                                className="text-xs min-h-[70px]"
                            />
                        </div>

                        <div className="p-2.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                                Este acesso será registrado com seu e-mail funcional, cargo, data/hora e IP para fins de auditoria da ANPD e Ministério Público.
                            </span>
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs">
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleConfirmUnmask}
                            disabled={isLoading}
                            className="text-xs bg-blue-700 hover:bg-blue-800 text-white"
                        >
                            Confirmar & Revelar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};
