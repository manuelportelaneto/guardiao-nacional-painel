import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
    Users,
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
    ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { ReportDialog } from '../common/ReportDialog';

const data = [
    { name: 'Seg', ocorrencias: 2, resolvidos: 1 },
    { name: 'Ter', ocorrencias: 4, resolvidos: 2 },
    { name: 'Qua', ocorrencias: 1, resolvidos: 2 },
    { name: 'Qui', ocorrencias: 5, resolvidos: 3 },
    { name: 'Sex', ocorrencias: 3, resolvidos: 1 },
    { name: 'Sab', ocorrencias: 2, resolvidos: 2 },
    { name: 'Dom', ocorrencias: 1, resolvidos: 1 },
];

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, description: string, color: string }> = ({ title, value, icon, description, color }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
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
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Sidebar Menu */}
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80">
                            <SheetHeader>
                                <SheetTitle>Menu - {cityName}</SheetTitle>
                            </SheetHeader>

                            {/* Navigation Menu */}
                            <nav className="flex flex-col gap-2 mt-6">
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={navigateToTasks}
                                >
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Tarefas
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={navigateToDepartments}
                                >
                                    <Building2 className="mr-2 h-4 w-4" />
                                    Secretarias
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={() => {
                                        setSidebarOpen(false);
                                        setReportDialogOpen(true);
                                    }}
                                >
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Relatórios
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configurações
                                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Em breve</span>
                                </Button>
                            </nav>

                            {/* Footer Buttons */}
                            <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleBack}
                                >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="w-full"
                                    onClick={handleLogout}
                                >
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Painel - {cityName}</h1>
                        <p className="text-gray-500">Gestão de ocorrências e serviços do município</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
                    Última atualização: Agora mesmo
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Usuários Ativos"
                    value="450"
                    icon={<Users className="h-4 w-4 text-white" />}
                    description="+8% este mês"
                    color="bg-orange-600"
                />
                <StatCard
                    title="Ocorrências Ativas"
                    value="12"
                    icon={<AlertTriangle className="h-4 w-4 text-white" />}
                    description="2 críticas pendentes"
                    color="bg-red-500"
                />
                <StatCard
                    title="Resolvidos (Mês)"
                    value="34"
                    icon={<CheckCircle className="h-4 w-4 text-white" />}
                    description="Taxa de resolução de 85%"
                    color="bg-green-500"
                />
                <StatCard
                    title="Secretarias"
                    value="8"
                    icon={<FileText className="h-4 w-4 text-white" />}
                    description="45 servidores"
                    color="bg-purple-600"
                />
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 shadow-sm border-0">
                    <CardHeader>
                        <CardTitle>Entrada de Ocorrências</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={data}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="ocorrencias" fill="#f97316" radius={[4, 4, 0, 0]} name="Ocorrências" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="col-span-1 shadow-sm border-0">
                    <CardHeader>
                        <CardTitle>Taxa de Resolução</CardTitle>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={data}>
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
