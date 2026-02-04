import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCityContributions } from '../../hooks/useContributions';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
} from 'recharts';
import {
    FileText,
    CheckCircle,
    AlertTriangle,
    Menu,
    LayoutDashboard,
    ClipboardList,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft,
    TrendingUp
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ReportDialog } from '../common/ReportDialog';
import { format, subDays, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PredictiveInsights from '../analytics/PredictiveInsights';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

const StatCard: React.FC<{ title: string, value: string | number, icon: React.ReactNode, description: string, color: string, isLoading?: boolean }> = ({ title, value, icon, description, color, isLoading }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </CardHeader>
        <CardContent>
            {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 animate-pulse rounded"></div>
            ) : (
                <div className="text-2xl font-bold">{value}</div>
            )}
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

const CityDashboard: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [reportDialogOpen, setReportDialogOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const cityName = CITY_NAMES[cityId || ''] || cityId;

    // Fetch Real Data
    const { data: contributions, isLoading, error } = useCityContributions(cityId || '');

    // Calculate Stats
    const stats = useMemo(() => {
        if (!contributions) return null;

        const total = contributions.length;
        const active = contributions.filter(c => c.status !== 'completed' && c.status !== 'rejected').length;
        const resolved = contributions.filter(c => c.status === 'completed').length;

        // Efficiency
        const efficiency = total > 0 ? Math.round((resolved / total) * 100) : 0;

        // Chart Data (Last 7 days)
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const d = subDays(new Date(), 6 - i);
            return {
                date: d,
                name: format(d, 'EEE', { locale: ptBR }), // Seg, Ter...
                fullDate: format(d, 'yyyy-MM-dd'),
            };
        });

        const chartData = last7Days.map(day => {
            const dayContributions = contributions.filter(c => {
                const cDate = c.createdAt instanceof Date
                    ? c.createdAt
                    : (c.createdAt as any)?.toDate?.() || new Date(c.createdAt as string);
                return isSameDay(cDate, day.date);
            });

            return {
                name: day.name,
                ocorrencias: dayContributions.length,
                resolvidos: dayContributions.filter(c => c.status === 'completed').length
            };
        });

        return {
            total,
            active,
            resolved,
            efficiency,
            chartData
        };
    }, [contributions]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate('/city/select');
    };

    const navigateToTasks = () => {
        navigate(`/city/${cityId}/tasks`);
        setSidebarOpen(false);
    };

    const navigateToDepartments = () => {
        navigate(`/city/${cityId}/departments`);
        setSidebarOpen(false);
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            {/* Predictive AI Section */}
            {stats && stats.total > 5 && (
                <PredictiveInsights contributions={contributions || []} />
            )}

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Sidebar Menu */}
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

                                {/* Navigation Menu */}
                                <nav className="flex flex-col gap-1 flex-1">
                                    <Button
                                        variant="ghost"
                                        className="justify-start h-12 text-base font-medium bg-orange-50 text-orange-700"
                                        onClick={() => setSidebarOpen(false)}
                                    >
                                        <LayoutDashboard className="mr-3 h-5 w-5" />
                                        Dashboard
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="justify-start h-12 text-base font-medium text-gray-600 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                                        onClick={navigateToTasks}
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

                                {/* Footer Buttons */}
                                <div className="space-y-3 pt-6 border-t border-gray-100">
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start"
                                        onClick={handleBack}
                                    >
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={handleLogout}
                                    >
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Sair do Sistema
                                    </Button>
                                </div>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel - {cityName}</h1>
                        <p className="text-gray-500">
                            {isLoading ? 'Atualizando dados...' : 'Visão geral em tempo real'}
                        </p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
                    {isLoading ? 'Sincronizando...' : 'Dados atualizados'}
                </div>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 p-4 rounded-lg text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Erro ao carregar dados: {(error as Error).message}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Eficiência Global"
                    value={`${stats?.efficiency || 0}%`}
                    icon={<TrendingUp className="h-4 w-4 text-white" />}
                    description="Taxa de resolução total"
                    color="bg-blue-600"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Ocorrências Ativas"
                    value={stats?.active || 0}
                    icon={<AlertTriangle className="h-4 w-4 text-white" />}
                    description="Aguardando ação"
                    color="bg-orange-500"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Resolvidos (Total)"
                    value={stats?.resolved || 0}
                    icon={<CheckCircle className="h-4 w-4 text-white" />}
                    description="Ocorrências finalizadas"
                    color="bg-green-500"
                    isLoading={isLoading}
                />
                <StatCard
                    title="Total Registrado"
                    value={stats?.total || 0}
                    icon={<FileText className="h-4 w-4 text-white" />}
                    description="Histórico completo"
                    color="bg-purple-600"
                    isLoading={isLoading}
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 shadow-sm border-0">
                    <CardHeader>
                        <CardTitle>Fluxo Semanal</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300} minWidth={0}>
                            <BarChart data={stats?.chartData || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="ocorrencias" fill="#f97316" radius={[4, 4, 0, 0]} name="Novas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 shadow-sm border-0">
                    <CardHeader>
                        <CardTitle>Resolução Semanal</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats?.chartData || []}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                                <Line type="monotone" dataKey="resolvidos" stroke="#10b981" name="Resolvidos" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
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

export default CityDashboard;
