import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    CheckCircle2,
    Clock,
    XCircle,
    ArrowRight
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Card, CardContent } from '../ui/card';
import { ReportDialog } from '../common/ReportDialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu"
import type { ReportData } from '../../services/reportService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

const STATUS_CONFIG = {
    pending: { label: 'Recebidas', color: 'bg-blue-600', textColor: 'text-blue-700', bgColor: 'bg-blue-50', icon: Clock },
    in_progress: { label: 'Em Análise', color: 'bg-yellow-600', textColor: 'text-yellow-700', bgColor: 'bg-yellow-50', icon: Loader2 },
    completed: { label: 'Resolvidas', color: 'bg-green-600', textColor: 'text-green-700', bgColor: 'bg-green-50', icon: CheckCircle2 },
    rejected: { label: 'Arquivadas', color: 'bg-gray-600', textColor: 'text-gray-700', bgColor: 'bg-gray-50', icon: XCircle },
};

type StatusType = keyof typeof STATUS_CONFIG;

interface KanbanColumnProps {
    statusKey: StatusType;
    title: string;
    tasks: ReportData[];
    color: string;
    onMoveTask: (id: string, newStatus: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, color, statusKey, onMoveTask }) => (
    <div className="flex-1 min-w-[300px] flex flex-col h-full bg-gray-50/50 rounded-xl border border-gray-100">
        <div className={`p-4 rounded-t-xl border-b border-gray-100 bg-white sticky top-0 z-10 flex items-center justify-between`}>
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${color}`}></div>
                <h3 className="font-semibold text-gray-700">{title}</h3>
            </div>
            <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{tasks.length}</span>
        </div>
        <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
            {tasks.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                    Nenhuma tarefa
                </div>
            )}
            {tasks.map((task) => (
                <Card key={task.id} className="cursor-pointer hover:shadow-lg transition-all duration-200 border-gray-200 group bg-white">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{task.category}</span>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-gray-400 hover:text-gray-600">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Mover para...</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        key !== statusKey && (
                                            <DropdownMenuItem key={key} onClick={() => onMoveTask(task.id, key)}>
                                                <div className={`w-2 h-2 rounded-full mr-2 ${config.color}`} />
                                                {config.label}
                                            </DropdownMenuItem>
                                        )
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2">{task.description}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-50">
                            <span>
                                {task.createdAt &&
                                    format(
                                        task.createdAt instanceof Date
                                            ? task.createdAt
                                            : (task.createdAt as any)?.toDate?.() || new Date(task.createdAt as string),
                                        "dd MMM, HH:mm",
                                        { locale: ptBR }
                                    )
                                }
                            </span>
                            {task.imageUrl && (
                                <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-medium text-[10px]">
                                    Com Foto
                                </span>
                            )}
                        </div>
                        {/* Quick Action Button for common flow */}
                        <div className="mt-3 pt-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                            {statusKey === 'pending' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 hover:bg-yellow-50 hover:text-yellow-700 hover:border-yellow-200" onClick={() => onMoveTask(task.id, 'in_progress')}>
                                    Analisar <ArrowRight className="h-3 w-3" />
                                </Button>
                            )}
                            {statusKey === 'in_progress' && (
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-200" onClick={() => onMoveTask(task.id, 'completed')}>
                                    Concluir <CheckCircle2 className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

const TasksKanban: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const cityName = CITY_NAMES[cityId || ''] || cityId;

    // Real Data Hooks
    const { data: contributions, isLoading } = useCityContributions(cityId || '');
    const updateStatusMutation = useUpdateContributionStatus();

    const columns = useMemo(() => {
        if (!contributions) return { pending: [], in_progress: [], completed: [], rejected: [] };

        const pending = contributions.filter(c => !c.status || c.status === 'pending');
        const in_progress = contributions.filter(c => c.status === 'in_progress' || c.status === 'analyzing'); // Handle both if divergent
        const completed = contributions.filter(c => c.status === 'completed');
        const rejected = contributions.filter(c => c.status === 'rejected');

        return { pending, in_progress, completed, rejected };
    }, [contributions]);

    const handleMoveTask = (id: string, newStatus: string) => {
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate(`/city/${cityId}/dashboard`);
    };

    const navigateToDashboard = () => {
        navigate(`/city/${cityId}/dashboard`);
        setSidebarOpen(false);
    };

    const navigateToDepartments = () => {
        navigate(`/city/${cityId}/departments`);
        setSidebarOpen(false);
    };

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="bg-white border-b px-8 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                    <Menu className="h-6 w-6" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="left" className="w-[85vw] sm:w-80 p-0">
                                <div className="p-6 h-full flex flex-col">
                                    <SheetHeader className="mb-6">
                                        <SheetTitle className="text-left flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                                                <Building2 className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block text-sm text-gray-500 font-normal">Menu Principal</span>
                                                {cityName}
                                            </div>
                                        </SheetTitle>
                                    </SheetHeader>

                                    <nav className="flex flex-col gap-1 flex-1">
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-12 text-base font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                            onClick={navigateToDashboard}
                                        >
                                            <LayoutDashboard className="mr-3 h-5 w-5" />
                                            Dashboard
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-12 text-base font-medium bg-orange-50 text-orange-700"
                                            onClick={() => setSidebarOpen(false)}
                                        >
                                            <ClipboardList className="mr-3 h-5 w-5" />
                                            Tarefas
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-12 text-base font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                            onClick={navigateToDepartments}
                                        >
                                            <Building2 className="mr-3 h-5 w-5" />
                                            Secretarias
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-12 text-base font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                            onClick={() => {
                                                setSidebarOpen(false);
                                                setReportDialogOpen(true);
                                            }}
                                        >
                                            <BarChart3 className="mr-3 h-5 w-5" />
                                            Relatórios
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="justify-start h-12 text-base font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                            onClick={() => {
                                                setSidebarOpen(false);
                                                navigate(`/city/${cityId}/settings`);
                                            }}
                                        >
                                            <Settings className="mr-3 h-5 w-5" />
                                            Configurações
                                        </Button>
                                    </nav>

                                    <div className="space-y-3 pt-6 border-t border-gray-100">
                                        <Button variant="outline" className="w-full justify-start" onClick={handleBack}>
                                            <ArrowLeft className="mr-2 h-4 w-4" />
                                            Voltar
                                        </Button>
                                        <Button variant="ghost" className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}>
                                            <LogOut className="mr-2 h-4 w-4" />
                                            Sair do Sistema
                                        </Button>
                                    </div>
                                </div>
                            </SheetContent>
                        </Sheet>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Gestão de Demandas</h1>
                            <p className="text-sm text-gray-500">Fluxo de trabalho de {cityName}</p>
                        </div>
                    </div>
                </div>

                {/* Kanban Board */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden p-8">
                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                            <span className="ml-2 text-gray-500">Carregando quadro...</span>
                        </div>
                    ) : (
                        <div className="flex h-full gap-6 min-w-max pb-4">
                            <KanbanColumn
                                statusKey="pending"
                                title="Recebidas"
                                tasks={columns.pending}
                                color="bg-blue-500"
                                onMoveTask={handleMoveTask}
                            />
                            <KanbanColumn
                                statusKey="in_progress"
                                title="Em Análise / Execução"
                                tasks={columns.in_progress}
                                color="bg-yellow-500"
                                onMoveTask={handleMoveTask}
                            />
                            <KanbanColumn
                                statusKey="completed"
                                title="Concluídas"
                                tasks={columns.completed}
                                color="bg-green-500"
                                onMoveTask={handleMoveTask}
                            />
                            <KanbanColumn
                                statusKey="rejected"
                                title="Arquivadas / Inválidas"
                                tasks={columns.rejected}
                                color="bg-gray-500"
                                onMoveTask={handleMoveTask}
                            />
                        </div>
                    )}
                </div>
            </div>
            <ReportDialog
                open={reportDialogOpen}
                onOpenChange={setReportDialogOpen}
                cityId={cityId || ''}
                cityName={cityName || ''}
            />
        </div>
    );
};

export default TasksKanban;
