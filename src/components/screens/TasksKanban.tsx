import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import { useCityContributions, useUpdateContributionStatus } from '../../hooks/useContributions';
import {
    Menu,
    LayoutDashboard,
    ClipboardList,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft,
    Loader2,
    MoreVertical,
    CircleCheckBig,
    Clock,
    CircleX,
    ArrowRight,
    Search,
    Filter,
    Truck,
    User,
    ShieldAlert,
    FileText,
    Printer,
    RefreshCw,
    Sparkles,
    CheckCircle2,
    AlertTriangle,
    Eye
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import type { ReportData } from '../../services/reportService';
import { workOrderService, type WorkOrder, type WorkOrderStatus } from '../../services/workOrderService';
import { WorkOrderDetailsModal } from '../common/WorkOrderDetailsModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

const CITY_NAMES: Record<string, string> = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-bernardo': 'São Bernardo do Campo',
    'sao-caetano': 'São Caetano do Sul',
    'diadema': 'Diadema',
    'ribeirao-pires': 'Ribeirão Pires',
    'rio-grande-da-serra': 'Rio Grande da Serra',
    'sao-paulo': 'São Paulo'
};

const KANBAN_COLUMNS_CONFIG = [
    {
        key: 'pending',
        title: 'Recebidas',
        subtitle: 'Triagem e Abertura de O.S.',
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
        bgColor: 'bg-blue-50/50'
    },
    {
        key: 'in_progress',
        title: 'Em Análise / Execução',
        subtitle: 'Equipe em Deslocamento / Campo',
        color: 'bg-amber-500',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        bgColor: 'bg-amber-50/50'
    },
    {
        key: 'completed',
        title: 'Concluídas',
        subtitle: 'Serviço Executado e Notificado',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        bgColor: 'bg-emerald-50/50'
    },
    {
        key: 'rejected',
        title: 'Arquivadas / Inválidas',
        subtitle: 'Demandas Fora de Escopo / Canceladas',
        color: 'bg-slate-400',
        textColor: 'text-slate-600',
        borderColor: 'border-slate-200',
        bgColor: 'bg-slate-50/50'
    }
];

const TasksKanban: React.FC = () => {
    const { cityId: routeCityId } = useParams<{ cityId: string }>();
    const { scope } = useScope();
    const { logout } = useAuth();
    const navigate = useNavigate();

    // Determina a cidade ativa baseada na rota ou no escopo federativo
    const activeCityId = routeCityId || scope.cityId || 'santo-andre';
    const cityName = CITY_NAMES[activeCityId] || scope.cityName || activeCityId;

    // Filtros Locais
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('ALL');
    const [slaFilter, setSlaFilter] = useState<'ALL' | 'OVERDUE' | 'WARNING'>('ALL');

    // Modal de Detalhes da O.S.
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrder | null>(null);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);

    // Dados reais do Firestore via Hook
    const { data: contributions = [], isLoading, refetch } = useCityContributions(activeCityId);
    const updateStatusMutation = useUpdateContributionStatus();

    // Mapeamento de Ocorrências em Estrutura Rica de Ordens de Serviço
    const workOrders: WorkOrder[] = useMemo(() => {
        return (contributions || []).map((item: any) => {
            const rawCreatedAt = item.createdAt instanceof Date 
                ? item.createdAt.toISOString() 
                : (item.createdAt?.toDate ? item.createdAt.toDate().toISOString() : (item.createdAt || new Date().toISOString()));
            
            const slaTotal = workOrderService.getSlaHoursForCategory(item.category || '');
            const protocol = workOrderService.formatProtocol(item.id || '00000');
            const department = item.department || workOrderService.getDepartmentForCategory(item.category || '');

            let mappedStatus: WorkOrderStatus = 'open';
            if (item.status === 'in_progress' || item.status === 'analisando') mappedStatus = 'in_progress';
            else if (item.status === 'completed' || item.status === 'resolvido') mappedStatus = 'completed';
            else if (item.status === 'rejected' || item.status === 'arquivado') mappedStatus = 'canceled';
            else mappedStatus = 'open';

            return {
                id: item.id,
                protocol,
                title: item.title || item.description?.slice(0, 40) || 'Demanda Urbana',
                description: item.description || '',
                category: item.category || 'outros',
                department,
                status: mappedStatus,
                priority: item.priority || (item.riskLevel >= 4 ? 'CRITICAL' : 'MEDIUM'),
                cityId: activeCityId,
                cityName,
                neighborhood: item.neighborhood || item.bairro || 'Centro',
                address: item.address || item.locationName,
                latitude: item.latitude || item.lat,
                longitude: item.longitude || item.lng,
                imageUrl: item.imageUrl || item.photoUrl,
                assignedTo: item.assignedTo || { officialName: 'Equipe de Plantão', teamCode: 'ZEL-01' },
                slaHoursTotal: slaTotal,
                slaDeadline: new Date(new Date(rawCreatedAt).getTime() + slaTotal * 3600 * 1000).toISOString(),
                createdAt: rawCreatedAt,
                updatedAt: item.updatedAt || rawCreatedAt,
                completedAt: item.completedAt,
                history: item.history || []
            };
        });
    }, [contributions, activeCityId, cityName]);

    // Filtragem de O.S.
    const filteredWorkOrders = useMemo(() => {
        return workOrders.filter(wo => {
            // Busca por texto / protocolo
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matches = wo.title.toLowerCase().includes(q) ||
                    wo.description.toLowerCase().includes(q) ||
                    wo.protocol.toLowerCase().includes(q) ||
                    wo.category.toLowerCase().includes(q) ||
                    (wo.neighborhood && wo.neighborhood.toLowerCase().includes(q));
                if (!matches) return false;
            }

            // Filtro por Secretaria
            if (selectedDepartmentFilter !== 'ALL' && wo.department !== selectedDepartmentFilter) {
                return false;
            }

            // Filtro por SLA
            if (slaFilter !== 'ALL') {
                const sla = workOrderService.calculateSla(wo.createdAt, wo.slaHoursTotal, wo.completedAt);
                if (slaFilter === 'OVERDUE' && !sla.isOverdue) return false;
                if (slaFilter === 'WARNING' && sla.status !== 'WARNING') return false;
            }

            return true;
        });
    }, [workOrders, searchQuery, selectedDepartmentFilter, slaFilter]);

    // Métricas para a barra de topo
    const metrics = useMemo(() => {
        const total = workOrders.length;
        const inProgress = workOrders.filter(w => w.status === 'in_progress').length;
        const completed = workOrders.filter(w => w.status === 'completed').length;
        
        let onTimeCount = 0;
        workOrders.forEach(w => {
            const sla = workOrderService.calculateSla(w.createdAt, w.slaHoursTotal, w.completedAt);
            if (!sla.isOverdue) onTimeCount++;
        });

        const slaCompliancePercent = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;

        return { total, inProgress, completed, slaCompliancePercent };
    }, [workOrders]);

    // Ação: Mudar Status da Demanda
    const handleMoveTask = async (id: string, newStatus: string) => {
        try {
            await updateStatusMutation.mutateAsync({
                id,
                status: newStatus
            });
            toast.success('Status atualizado!');
            if (refetch) refetch();
        } catch (e) {
            toast.error('Erro ao atualizar status.');
        }
    };

    // Ação: Designar Equipe
    const handleAssignTeam = async (id: string, department: string, officialName: string, teamCode: string) => {
        try {
            // Em produção grava no Firestore via update
            toast.success(`Designado para ${department} (${officialName || teamCode})`);
            if (refetch) refetch();
        } catch (e) {
            toast.error('Erro ao designar equipe.');
        }
    };

    const handleOpenDetails = (wo: WorkOrder) => {
        setSelectedWorkOrder(wo);
        setDetailsModalOpen(true);
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* ─── 0. Cabeçalho de Gestão & Indicadores Rápidos (KPIs) ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Gestão de Demandas & Ordens de Serviço (O.S.)
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500">
                        Acompanhamento operacional por secretaria e controle de SLA em tempo real • <strong className="text-slate-800">{cityName}</strong>
                    </p>
                </div>

                {/* KPI Cards Rápidos */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-slate-500 uppercase">Total O.S.</div>
                        <div className="text-lg font-black text-slate-900">{metrics.total}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-amber-700 uppercase">Em Campo</div>
                        <div className="text-lg font-black text-amber-900">{metrics.inProgress}</div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-emerald-700 uppercase">Resolvidas</div>
                        <div className="text-lg font-black text-emerald-900">{metrics.completed}</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl text-center">
                        <div className="text-[10px] font-bold text-blue-700 uppercase">SLA Cumprido</div>
                        <div className="text-lg font-black text-blue-900">{metrics.slaCompliancePercent}%</div>
                    </div>
                </div>
            </div>

            {/* ─── 1. Barra de Filtros & Busca ─── */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200">
                <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <Input
                            placeholder="Buscar por protocolo, rua ou problema..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 text-xs h-9 bg-white"
                        />
                    </div>

                    <Select value={selectedDepartmentFilter} onValueChange={setSelectedDepartmentFilter}>
                        <SelectTrigger className="text-xs h-9 bg-white min-w-[200px]">
                            <SelectValue placeholder="Todas as Secretarias" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todas as Secretarias</SelectItem>
                            <SelectItem value="Secretaria de Mobilidade & Pavimentação">Mobilidade & Pavimentação</SelectItem>
                            <SelectItem value="Secretaria de Obras & Serviços Urbanos">Obras & Serviços Urbanos</SelectItem>
                            <SelectItem value="Departamento de Engenharia de Tráfego">Engenharia de Tráfego</SelectItem>
                            <SelectItem value="Secretaria de Meio Ambiente & Zeladoria">Meio Ambiente & Zeladoria</SelectItem>
                            <SelectItem value="Coordenadoria Municipal de Defesa Civil">Defesa Civil</SelectItem>
                            <SelectItem value="Secretaria Municipal de Saúde">Saúde Pública</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={slaFilter} onValueChange={(val: any) => setSlaFilter(val)}>
                        <SelectTrigger className="text-xs h-9 bg-white min-w-[150px]">
                            <SelectValue placeholder="Status do SLA" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Todos os Prazos</SelectItem>
                            <SelectItem value="OVERDUE">🚨 Apenas Atrasados</SelectItem>
                            <SelectItem value="WARNING">⏳ Próximos do Fim (&lt;24h)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetch && refetch()} 
                        disabled={isLoading}
                        className="h-9 text-xs gap-1.5 bg-white shadow-sm"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                        Atualizar
                    </Button>
                </div>
            </div>

            {/* ─── 2. Quadro Kanban Multicolunas ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 flex-1 items-start min-h-[550px] pb-6">
                {KANBAN_COLUMNS_CONFIG.map(col => {
                    const columnWorkOrders = filteredWorkOrders.filter(w => {
                        if (col.key === 'pending') return w.status === 'open';
                        if (col.key === 'in_progress') return w.status === 'in_progress';
                        if (col.key === 'completed') return w.status === 'completed';
                        if (col.key === 'rejected') return w.status === 'canceled';
                        return false;
                    });

                    return (
                        <div
                            key={col.key}
                            className={`flex flex-col rounded-2xl border ${col.borderColor} ${col.bgColor} p-3 min-h-[500px] h-full shadow-sm`}
                        >
                            {/* Cabeçalho da Coluna */}
                            <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200/80">
                                <div className="flex items-center gap-2">
                                    <div className={`w-3 h-3 rounded-full ${col.color} shadow-sm`} />
                                    <div>
                                        <h3 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                                            {col.title}
                                        </h3>
                                        <p className="text-[10px] text-slate-500 leading-none mt-0.5">
                                            {col.subtitle}
                                        </p>
                                    </div>
                                </div>
                                <Badge className="bg-white text-slate-700 border border-slate-200 text-xs px-2 font-bold shadow-2xl">
                                    {columnWorkOrders.length}
                                </Badge>
                            </div>

                            {/* Cards da Coluna */}
                            <div className="space-y-3 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                {columnWorkOrders.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 text-xs border-2 border-dashed border-slate-200/90 rounded-xl bg-white/40">
                                        Nenhuma Ordem de Serviço nesta etapa
                                    </div>
                                )}

                                {columnWorkOrders.map(wo => {
                                    const sla = workOrderService.calculateSla(wo.createdAt, wo.slaHoursTotal, wo.completedAt);

                                    return (
                                        <Card
                                            key={wo.id}
                                            onClick={() => handleOpenDetails(wo)}
                                            className="cursor-pointer hover:shadow-md transition-all duration-200 border-slate-200 group bg-white relative overflow-hidden"
                                        >
                                            <CardContent className="p-3.5 space-y-2.5">
                                                {/* Linha Superior: Protocolo, Categoria e SLA */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="font-mono text-[10px] font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                            {wo.protocol}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">
                                                            {wo.category}
                                                        </span>
                                                    </div>

                                                    {/* Badge de SLA */}
                                                    <Badge className={`text-[9px] px-1.5 py-0 font-bold ${
                                                        sla.status === 'OVERDUE'
                                                            ? 'bg-red-600 text-white animate-pulse'
                                                            : (sla.status === 'WARNING' ? 'bg-amber-500 text-white' : 'bg-emerald-100 text-emerald-800 border-emerald-200')
                                                    }`}>
                                                        {sla.formattedLabel}
                                                    </Badge>
                                                </div>

                                                {/* Título / Descrição */}
                                                <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug">
                                                    {wo.description || wo.title}
                                                </h4>

                                                {/* Detalhes de Endereço e Secretaria */}
                                                <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-100">
                                                    <div className="flex items-center gap-1 truncate">
                                                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                                        <span className="truncate text-slate-700 font-medium">{wo.department}</span>
                                                    </div>
                                                    {wo.neighborhood && (
                                                        <div className="text-[10px] text-slate-500">
                                                            Bairro: <strong>{wo.neighborhood}</strong>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Rodapé do Card: Data, Foto e Ações Rápidas */}
                                                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                                                    <span>
                                                        {format(new Date(wo.createdAt), "dd MMM, HH:mm", { locale: ptBR })}
                                                    </span>

                                                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                        {wo.imageUrl && (
                                                            <span className="bg-blue-50 text-blue-600 px-1 py-0.5 rounded font-bold text-[9px]">
                                                                📷 Foto
                                                            </span>
                                                        )}

                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-400 hover:text-slate-700">
                                                                    <MoreVertical className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="text-xs">
                                                                <DropdownMenuLabel>Mover Ordem de Serviço</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {col.key !== 'pending' && (
                                                                    <DropdownMenuItem onClick={() => handleMoveTask(wo.id, 'pending')}>
                                                                        📥 Mover para Recebidas
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {col.key !== 'in_progress' && (
                                                                    <DropdownMenuItem onClick={() => handleMoveTask(wo.id, 'in_progress')}>
                                                                        🚜 Mover para Em Execução
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {col.key !== 'completed' && (
                                                                    <DropdownMenuItem onClick={() => handleMoveTask(wo.id, 'completed')}>
                                                                        ✅ Mover para Concluídas
                                                                    </DropdownMenuItem>
                                                                )}
                                                                {col.key !== 'rejected' && (
                                                                    <DropdownMenuItem onClick={() => handleMoveTask(wo.id, 'rejected')} className="text-red-600">
                                                                        ❌ Arquivar / Cancelar
                                                                    </DropdownMenuItem>
                                                                )}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>

                                                {/* Botão de Avanço Rápido no Hover */}
                                                <div 
                                                    className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    {col.key === 'pending' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-[10px] gap-1 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                                                            onClick={() => handleMoveTask(wo.id, 'in_progress')}
                                                        >
                                                            Despachar para Campo <ArrowRight className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                    {col.key === 'in_progress' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-[10px] gap-1 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                                            onClick={() => handleMoveTask(wo.id, 'completed')}
                                                        >
                                                            Concluir Demanda <CircleCheckBig className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Detalhes da Ordem de Serviço */}
            <WorkOrderDetailsModal
                workOrder={selectedWorkOrder}
                open={detailsModalOpen}
                onClose={() => {
                    setDetailsModalOpen(false);
                    setSelectedWorkOrder(null);
                }}
                onStatusChange={async (id, newStatus) => {
                    await handleMoveTask(id, newStatus);
                }}
                onAssignTeam={handleAssignTeam}
            />
        </div>
    );
};

export default TasksKanban;
