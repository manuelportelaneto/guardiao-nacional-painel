import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    Printer, MapPin, Calendar, Clock, User, Building2,
    CheckCircle2, AlertTriangle, ArrowRight, ShieldAlert, FileText, Check, Truck
} from 'lucide-react';
import { workOrderService, type WorkOrder, type WorkOrderStatus } from '../../services/workOrderService';
import { toast } from 'sonner';

interface WorkOrderDetailsModalProps {
    workOrder: WorkOrder | null;
    open: boolean;
    onClose: () => void;
    onStatusChange: (id: string, newStatus: WorkOrderStatus, notes?: string) => Promise<void>;
    onAssignTeam: (id: string, department: string, officialName: string, teamCode: string) => Promise<void>;
}

export const WorkOrderDetailsModal: React.FC<WorkOrderDetailsModalProps> = ({
    workOrder,
    open,
    onClose,
    onStatusChange,
    onAssignTeam
}) => {
    if (!workOrder) return null;

    const [selectedDepartment, setSelectedDepartment] = useState(workOrder.department);
    const [officialName, setOfficialName] = useState(workOrder.assignedTo?.officialName || '');
    const [teamCode, setTeamCode] = useState(workOrder.assignedTo?.teamCode || '');
    const [completionNotes, setCompletionNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const slaInfo = workOrderService.calculateSla(workOrder.createdAt, workOrder.slaHoursTotal, workOrder.completedAt);

    const handlePrint = () => {
        window.print();
    };

    const handleSaveAssignment = async () => {
        setIsSaving(true);
        try {
            await onAssignTeam(workOrder.id, selectedDepartment, officialName, teamCode);
            toast.success('Equipe responsável atualizada com sucesso!');
        } catch (e) {
            toast.error('Erro ao atualizar equipe.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdvanceStatus = async (targetStatus: WorkOrderStatus) => {
        setIsSaving(true);
        try {
            await onStatusChange(workOrder.id, targetStatus, completionNotes);
            toast.success(`Ordem de Serviço movida para ${targetStatus.toUpperCase()}!`);
            onClose();
        } catch (e) {
            toast.error('Erro ao atualizar status.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                                <FileText className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                    <span>Ordem de Serviço {workOrder.protocol}</span>
                                    <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 border-slate-300">
                                        {workOrder.category}
                                    </Badge>
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    {workOrder.cityName} • Registrada em {new Date(workOrder.createdAt).toLocaleString('pt-BR')}
                                </DialogDescription>
                            </div>
                        </div>

                        {/* SLA Badge */}
                        <Badge className={`text-xs font-semibold px-2.5 py-1 ${
                            slaInfo.status === 'OVERDUE'
                                ? 'bg-red-600 text-white'
                                : (slaInfo.status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white')
                        }`}>
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            SLA: {slaInfo.formattedLabel}
                        </Badge>
                    </div>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                    {/* Coluna 1: Dados da Ocorrência & Imagem */}
                    <div className="space-y-4">
                        <div>
                            <Label className="text-xs font-bold text-slate-500 uppercase">Descrição da Demanda</Label>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-800 mt-1 leading-relaxed">
                                {workOrder.description}
                            </div>
                        </div>

                        {workOrder.imageUrl && (
                            <div>
                                <Label className="text-xs font-bold text-slate-500 uppercase">Registro Fotográfico de Campo</Label>
                                <div className="mt-1 rounded-xl overflow-hidden border border-slate-200 h-48 bg-slate-100 relative group">
                                    <img 
                                        src={workOrder.imageUrl} 
                                        alt="Registro de Campo" 
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                    />
                                    <a
                                        href={workOrder.imageUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur text-white text-[10px] px-2 py-1 rounded-md font-semibold hover:bg-slate-900"
                                    >
                                        Ampliar Foto ↗
                                    </a>
                                </div>
                            </div>
                        )}

                        <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5 text-xs text-slate-700">
                            <div className="font-bold flex items-center gap-1.5 text-blue-900">
                                <MapPin className="w-4 h-4 text-blue-600" /> Endereço & Localização
                            </div>
                            <p>{workOrder.address || 'Logradouro não informado'}</p>
                            {workOrder.neighborhood && (
                                <p className="font-medium text-slate-600">Bairro: {workOrder.neighborhood}</p>
                            )}
                            {workOrder.latitude && workOrder.longitude && (
                                <p className="text-[10px] font-mono text-slate-500">
                                    GPS: {workOrder.latitude.toFixed(5)}, {workOrder.longitude.toFixed(5)}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Coluna 2: Despacho, Equipe & Transição de Etapas */}
                    <div className="space-y-4">
                        {/* Atribuição de Equipe */}
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <Truck className="w-4 h-4 text-blue-600" /> Atribuição Operacional
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs">Secretaria Responsável</Label>
                                <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                                    <SelectTrigger className="text-xs bg-white">
                                        <SelectValue placeholder="Selecione a secretaria" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Secretaria de Mobilidade & Pavimentação">Secretaria de Mobilidade & Pavimentação</SelectItem>
                                        <SelectItem value="Secretaria de Obras & Serviços Urbanos">Secretaria de Obras & Serviços Urbanos</SelectItem>
                                        <SelectItem value="Departamento de Engenharia de Tráfego">Departamento de Engenharia de Tráfego</SelectItem>
                                        <SelectItem value="Secretaria de Meio Ambiente & Zeladoria">Secretaria de Meio Ambiente & Zeladoria</SelectItem>
                                        <SelectItem value="Coordenadoria Municipal de Defesa Civil">Coordenadoria Municipal de Defesa Civil</SelectItem>
                                        <SelectItem value="Secretaria de Segurança Cidadã & GCM">Secretaria de Segurança Cidadã & GCM</SelectItem>
                                        <SelectItem value="Secretaria Municipal de Saúde">Secretaria Municipal de Saúde</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Servidor / Fiscal</Label>
                                    <Input
                                        placeholder="Ex: Carlos Santos"
                                        value={officialName}
                                        onChange={e => setOfficialName(e.target.value)}
                                        className="text-xs h-8 bg-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-[11px]">Código Viatura / Equipe</Label>
                                    <Input
                                        placeholder="Ex: VTR-04 / EQ-ASPALTO"
                                        value={teamCode}
                                        onChange={e => setTeamCode(e.target.value)}
                                        className="text-xs h-8 bg-white"
                                    />
                                </div>
                            </div>

                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={handleSaveAssignment} 
                                disabled={isSaving}
                                className="w-full text-xs h-8 bg-white"
                            >
                                <Check className="w-3.5 h-3.5 mr-1" /> Salvar Designação
                            </Button>
                        </div>

                        {/* Transição de Etapas da O.S. */}
                        <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                                <span>Avançar Etapa da O.S.</span>
                                <Badge className="bg-slate-800 text-slate-200 text-[10px]">
                                    Status Atual: {workOrder.status.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {workOrder.status === 'open' && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleAdvanceStatus('in_progress')}
                                        disabled={isSaving}
                                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs col-span-2"
                                    >
                                        <Truck className="w-3.5 h-3.5 mr-1.5" /> Despachar para Campo
                                    </Button>
                                )}
                                {workOrder.status === 'in_progress' && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleAdvanceStatus('inspection')}
                                        disabled={isSaving}
                                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs col-span-2"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Enviar para Vistoria Final
                                    </Button>
                                )}
                                {workOrder.status === 'inspection' && (
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleAdvanceStatus('completed')}
                                        disabled={isSaving}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs col-span-2"
                                    >
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Concluir & Notificar Cidadão
                                    </Button>
                                )}
                                {workOrder.status === 'completed' && (
                                    <div className="col-span-2 text-center text-xs text-emerald-400 font-semibold py-1">
                                        ✅ Ordem de Serviço concluída e arquivada com sucesso.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t pt-3 flex items-center justify-between">
                    <Button type="button" variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs">
                        <Printer className="w-4 h-4" /> Imprimir Ficha de Campo
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs">
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
