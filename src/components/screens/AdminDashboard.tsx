
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import {
    Users,
    FileText,
    CheckCircle,
    AlertTriangle,
    Menu,
    LayoutDashboard,
    Users as UsersIcon,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';

const data = [
    { name: 'Seg', ocorrencias: 4, resolvidos: 2 },
    { name: 'Ter', ocorrencias: 3, resolvidos: 1 },
    { name: 'Qua', ocorrencias: 2, resolvidos: 3 },
    { name: 'Qui', ocorrencias: 7, resolvidos: 4 },
    { name: 'Sex', ocorrencias: 5, resolvidos: 2 },
    { name: 'Sab', ocorrencias: 6, resolvidos: 3 },
    { name: 'Dom', ocorrencias: 4, resolvidos: 4 },
];

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

const AdminDashboard: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Real-time stats
    const [stats, setStats] = useState({
        users: 0,
        contributions: 0,
        resolved: 0,
        cities: 0
    });

    useEffect(() => {
        // Simple counts. In production, these should be cached or use cloud function aggregates for huge DBs.
        // For current scale, onSnapshot works fine.
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setStats(prev => ({ ...prev, users: snap.size }));
        });

        const unsubContribs = onSnapshot(collection(db, 'contributions'), (snap) => {
            setStats(prev => ({ ...prev, contributions: snap.size }));
            const resolvedCount = snap.docs.filter(doc => doc.data().status === 'resolved' || doc.data().status === 'concluded').length;
            setStats(prev => ({ ...prev, resolved: resolvedCount }));
        });

        const unsubCities = onSnapshot(collection(db, 'cities'), (snap) => {
            setStats(prev => ({ ...prev, cities: snap.size }));
        });

        return () => {
            unsubUsers();
            unsubContribs();
            unsubCities();
        };
    }, []);

    const isMainDashboard = location.pathname === '/admin' || location.pathname === '/admin/dashboard';

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate('/hub');
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
                                <SheetTitle>Menu de Navegação</SheetTitle>
                            </SheetHeader>

                            {/* Navigation Menu */}
                            <nav className="flex flex-col gap-2 mt-6">
                                <Button
                                    variant={isMainDashboard ? "secondary" : "ghost"}
                                    className="justify-start hover:bg-blue-50 hover:text-blue-600"
                                    onClick={() => { navigate('/admin'); setSidebarOpen(false); }}
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Button>
                                <Button
                                    variant={location.pathname.includes('users') ? "secondary" : "ghost"}
                                    className="justify-start hover:bg-blue-50 hover:text-blue-600"
                                    onClick={() => { navigate('/admin/users'); setSidebarOpen(false); }}
                                >
                                    <UsersIcon className="mr-2 h-4 w-4" />
                                    Usuários
                                </Button>
                                <Button
                                    variant={location.pathname.includes('cities') ? "secondary" : "ghost"}
                                    className="justify-start hover:bg-blue-50 hover:text-blue-600"
                                    onClick={() => { navigate('/admin/cities'); setSidebarOpen(false); }}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    Cidades
                                </Button>
                                <Button
                                    variant={location.pathname.includes('moderation') ? "secondary" : "ghost"}
                                    className="justify-start hover:bg-red-50 hover:text-red-600"
                                    onClick={() => { navigate('/admin/moderation'); setSidebarOpen(false); }}
                                >
                                    <AlertTriangle className="mr-2 h-4 w-4" />
                                    Moderação
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Relatórios Avançados
                                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Em breve</span>
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
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard Geral</h1>
                        <p className="text-gray-500">Visão unificada de todas as prefeituras.</p>
                    </div>
                </div>
                <div className="text-sm text-gray-500 bg-white px-4 py-2 rounded-lg border shadow-sm">
                    Última atualização: Agora mesmo
                </div>
            </div>

            {isMainDashboard ? (
                <>
                    {/* Stats Grid */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <StatCard
                            title="Total de Usuários"
                            value={stats.users.toLocaleString()}
                            icon={<Users className="h-4 w-4 text-white" />}
                            description="Base de usuários ativa"
                            color="bg-blue-600"
                        />
                        <StatCard
                            title="Ocorrências Totais"
                            value={stats.contributions.toLocaleString()}
                            icon={<AlertTriangle className="h-4 w-4 text-white" />}
                            description="Acúmulo histórico"
                            color="bg-orange-500"
                        />
                        <StatCard
                            title="Resolvidos"
                            value={stats.resolved.toLocaleString()}
                            icon={<CheckCircle className="h-4 w-4 text-white" />}
                            description={`${stats.contributions > 0 ? ((stats.resolved / stats.contributions) * 100).toFixed(1) : 0}% de resolução`}
                            color="bg-green-500"
                        />
                        <StatCard
                            title="Municípios"
                            value={stats.cities.toLocaleString()}
                            icon={<FileText className="h-4 w-4 text-white" />}
                            description="Cidades em implantação"
                            color="bg-purple-600"
                        />
                    </div>

                    {/* Charts Row */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="col-span-1 shadow-sm border-0">
                            <CardHeader>
                                <CardTitle>Monitoramento de Fluxo</CardTitle>
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
                                        <Bar dataKey="ocorrencias" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Ocorrências" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="col-span-1 shadow-sm border-0">
                            <CardHeader>
                                <CardTitle>Nível de Engajamento</CardTitle>
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
                </>
            ) : (
                <Outlet />
            )}
        </div>
    );
};

export default AdminDashboard;
