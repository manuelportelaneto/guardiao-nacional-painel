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
    PieChart,
    Pie,
    Cell,
    Legend
} from 'recharts';
import {
    CheckCircle,
    AlertTriangle,
    FileText,
    Menu,
    LayoutDashboard,
    Users as UsersIcon,
    BarChart3,
    Share2,
    LogOut,
    Building2,
    Calendar as CalendarIcon,
    Filter,
    Bell,
    Settings,
    MessageSquare,
    ShieldAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetTrigger } from '../ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import type { Contribution } from '../../types/contribution';

const StatCard: React.FC<{ title: string, value: string, icon: React.ReactNode, description?: string, color: string }> = ({ title, value, icon, description, color }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${color}`}>
                {icon}
            </div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
    </Card>
);

const AdminDashboard: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [stats, setStats] = useState({
        users: 0,
        totalContributions: 0,
        resolved: 0,
        citiesCount: 0,
        likesToday: 0,
        newContribsToday: 0,
        sharesTotal: 0,
        positiveContribs: 0,
        negativeContribs: 0,
        averageRating: 0,
        totalEvaluations: 0
    });

    const [chartData, setChartData] = useState<{
        cityRanking: any[];
        likesRanking: any[];
        statusOverview: any[];
        ratingByCategory: any[];
    }>({ cityRanking: [], likesRanking: [], statusOverview: [], ratingByCategory: [] });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [regionFilter, setRegionFilter] = useState('all');

    useEffect(() => {
        // Real-time listeners for aggregated stats
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const unsubContribs = onSnapshot(collection(db, 'contributions'), (snap) => {
            const contribs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));

            // Basic Counts
            const total = contribs.length;
            const resolved = contribs.filter(c => ['Resolvido', 'Concluído'].includes(c.status)).length;
            const cities = new Set(contribs.map(c => c.city).filter(Boolean)).size;
            const shares = contribs.reduce((acc, curr) => acc + (curr.shares || 0), 0);

            // Comparisons
            const positive = contribs.filter(c => c.status === 'Aprovado' || c.status === 'Resolvido').length;
            const negative = contribs.filter(c => c.status === 'Rejeitado' || c.status === 'Lixo').length;

            // Daily Stats (Mocking/Simulating if field missing)
            const newToday = contribs.filter(c => {
                if (!c.createdAt) return false;
                // Handle Firestore Timestamp or Date
                const date = c.createdAt.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
                return date >= today;
            }).length;

            // Likes (Assuming we track likes on doc)
            const likesToday = contribs.reduce((acc, c) => acc + (c.likes || 0), 0);

            // Calculate Average Ratings
            const ratedContributions = contribs.filter(c => c.rating && c.rating > 0);
            const totalRatingSum = ratedContributions.reduce((acc, c) => acc + (c.rating || 0), 0);
            const averageRating = ratedContributions.length > 0 ? (totalRatingSum / ratedContributions.length).toFixed(1) : "0.0";

            // Ratings by Category
            const ratingByCategoryMap: Record<string, { sum: number, count: number }> = {};
            ratedContributions.forEach(c => {
                const cat = c.category || 'Outros';
                if (!ratingByCategoryMap[cat]) ratingByCategoryMap[cat] = { sum: 0, count: 0 };
                ratingByCategoryMap[cat].sum += (c.rating || 0);
                ratingByCategoryMap[cat].count += 1;
            });
            const ratingByCategory = Object.entries(ratingByCategoryMap).map(([name, data]) => ({
                name,
                value: parseFloat((data.sum / data.count).toFixed(1))
            }));

            setStats(prev => ({
                ...prev,
                totalContributions: total,
                resolved,
                citiesCount: cities,
                sharesTotal: shares,
                positiveContribs: positive,
                negativeContribs: negative,
                newContribsToday: newToday,
                likesToday: likesToday,
                averageRating: parseFloat(averageRating as string),
                totalEvaluations: ratedContributions.length
            }));

            // Prepare Chart Data

            // 1. City Ranking (Occurrences)
            const cityMap: Record<string, number> = {};
            contribs.forEach(c => {
                const city = c.city || 'Desconhecido';
                cityMap[city] = (cityMap[city] || 0) + 1;
            });
            const cityRanking = Object.entries(cityMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            // 2. City Ranking (Likes)
            const cityLikesMap: Record<string, number> = {};
            contribs.forEach(c => {
                const city = c.city || 'Desconhecido';
                cityLikesMap[city] = (cityLikesMap[city] || 0) + (c.likes || 0);
            });
            const likesRanking = Object.entries(cityLikesMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);


            // 3. Status Overview
            const statusMap: Record<string, number> = {};
            contribs.forEach(c => {
                const status = c.status || 'Pendente';
                statusMap[status] = (statusMap[status] || 0) + 1;
            });
            const statusOverview = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

            setChartData({
                cityRanking,
                likesRanking,
                statusOverview,
                ratingByCategory
            });
        });

        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
            setStats(prev => ({ ...prev, users: snap.size }));
        });

        return () => {
            unsubContribs();
            unsubUsers();
        };
    }, []);

    const isMainDashboard = location.pathname === '/admin' || location.pathname === '/admin/dashboard';
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <div className="flex bg-gray-50 min-h-screen">
            {/* Sidebar Content (Shared) */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="md:hidden fixed top-4 left-4 z-50">
                        <Menu />
                    </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                    <div className="h-full bg-slate-900 text-white p-4">
                        <div className="text-xl font-bold mb-8">Guardião Painel</div>
                        <nav className="space-y-2">
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/dashboard'); setSidebarOpen(false); }}>
                                <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/users'); setSidebarOpen(false); }}>
                                <UsersIcon className="mr-2 h-4 w-4" /> Usuários
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/cities'); setSidebarOpen(false); }}>
                                <BarChart3 className="mr-2 h-4 w-4" /> Cidades
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/moderation'); setSidebarOpen(false); }}>
                                <AlertTriangle className="mr-2 h-4 w-4" /> Moderação
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/alerts'); setSidebarOpen(false); }}>
                                <Bell className="mr-2 h-4 w-4" /> Alertas
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/communication'); setSidebarOpen(false); }}>
                                <MessageSquare className="mr-2 h-4 w-4" /> Comunicação
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/logs'); setSidebarOpen(false); }}>
                                <ShieldAlert className="mr-2 h-4 w-4" /> Logs do Sistema
                            </Button>
                            <Button variant="ghost" className="w-full justify-start text-white hover:text-white hover:bg-slate-800" onClick={() => { navigate('/admin/settings'); setSidebarOpen(false); }}>
                                <Settings className="mr-2 h-4 w-4" /> Configurações
                            </Button>
                        </nav>
                        <div className="absolute bottom-4 left-4 right-4">
                            <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" /> Sair
                            </Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Desktop Sidebar */}
            <div className="hidden md:flex w-64 bg-slate-900 text-white flex-col fixed inset-y-0">
                <div className="p-6">
                    <h1 className="text-xl font-bold">Guardião Painel</h1>
                    <p className="text-xs text-slate-400 mt-1">Administração Nacional</p>
                </div>
                <nav className="flex-1 px-4 space-y-2">
                    <Button
                        variant={location.pathname.includes('dashboard') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('dashboard') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/dashboard')}
                    >
                        <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                    </Button>
                    <Button
                        variant={location.pathname.includes('users') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('users') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/users')}
                    >
                        <UsersIcon className="mr-2 h-4 w-4" /> Usuários
                    </Button>
                    <Button
                        variant={location.pathname.includes('cities') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('cities') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/cities')}
                    >
                        <BarChart3 className="mr-2 h-4 w-4" /> Cidades
                    </Button>
                    <Button
                        variant={location.pathname.includes('moderation') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('moderation') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/moderation')}
                    >
                        <AlertTriangle className="mr-2 h-4 w-4" /> Moderação
                    </Button>

                    <Button
                        variant={location.pathname.includes('communication') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('communication') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/communication')}
                    >
                        <MessageSquare className="mr-2 h-4 w-4" /> Comunicação
                    </Button>
                    <Button
                        variant={location.pathname.includes('logs') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('logs') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/logs')}
                    >
                        <ShieldAlert className="mr-2 h-4 w-4" /> Logs do Sistema
                    </Button>
                    <Button
                        variant={location.pathname.includes('settings') ? "secondary" : "ghost"}
                        className={`w-full justify-start ${!location.pathname.includes('settings') && 'text-white hover:text-white hover:bg-slate-800'}`}
                        onClick={() => navigate('/admin/settings')}
                    >
                        <Settings className="mr-2 h-4 w-4" /> Configurações
                    </Button>
                </nav>
                <div className="p-4 border-t border-slate-800">
                    <Button variant="ghost" className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" /> Sair
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 p-8">
                {isMainDashboard ? (
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">Dashboard Geral</h1>
                                <p className="text-muted-foreground">Visão unificada de métricas e indicadores.</p>
                            </div>

                            {/* Filters Toolbar */}
                            <div className="flex flex-wrap items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-[240px] justification-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {dateRange.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "P", { locale: ptBR })} -{" "}
                                                        {format(dateRange.to, "P", { locale: ptBR })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "P", { locale: ptBR })
                                                )
                                            ) : (
                                                <span>Selecione um período</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange.from}
                                            selected={dateRange as any}
                                            onSelect={(range: any) => setDateRange(range)}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Select value={regionFilter} onValueChange={setRegionFilter}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Região/Cidade" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Todas as Regiões</SelectItem>
                                        <SelectItem value="sp">São Paulo</SelectItem>
                                        <SelectItem value="rj">Rio de Janeiro</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Button variant="ghost" size="icon">
                                    <Filter className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <StatCard
                                title="Municípios Atendidos"
                                value={stats.citiesCount.toString()}
                                icon={<Building2 className="h-4 w-4 text-blue-600" />}
                                description="Cidades com ocorrências registradas"
                                color="bg-blue-100"
                            />
                            <StatCard
                                title="Ocorrências"
                                value={stats.totalContributions.toString()}
                                icon={<FileText className="h-4 w-4 text-orange-600" />}
                                description={`+${stats.newContribsToday} hoje`}
                                color="bg-orange-100"
                            />
                            <StatCard
                                title="Usuários Ativos"
                                value={stats.users.toString()}
                                icon={<UsersIcon className="h-4 w-4 text-green-600" />}
                                color="bg-green-100"
                            />
                            <StatCard
                                title="Interações"
                                value={(stats.likesToday + stats.sharesTotal).toString()}
                                icon={<Share2 className="h-4 w-4 text-purple-600" />}
                                description={`${stats.likesToday} curtidas, ${stats.sharesTotal} compartilhamentos`}
                                color="bg-purple-100"
                            />
                        </div>

                        {/* Secondary Stats Grid */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <StatCard
                                title="Resultados Positivos"
                                value={stats.positiveContribs.toString()}
                                icon={<CheckCircle className="h-4 w-4 text-green-600" />}
                                description="Aprovadas ou Resolvidas"
                                color="bg-green-50"
                            />
                            <StatCard
                                title="Resultados Negativos"
                                value={stats.negativeContribs.toString()}
                                icon={<AlertTriangle className="h-4 w-4 text-red-600" />}
                                description="Rejeitadas ou Lixo"
                                color="bg-red-50"
                            />
                            <StatCard
                                title="Resolvidos"
                                value={stats.resolved.toString()}
                                icon={<CheckCircle className="h-4 w-4 text-blue-600" />}
                                description="Problemas solucionados"
                                color="bg-blue-50"
                            />
                        </div>

                        {/* Charts Section */}
                        <div className="grid gap-4 md:grid-cols-2">
                            {/* Ranking de Ocorrências por Cidade */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Ranking de Ocorrências (Cidade)</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.cityRanking} layout="vertical" margin={{ left: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                            <XAxis type="number" />
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Ocorrências" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Status Overview */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Status das Contribuições</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData.statusOverview}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {chartData.statusOverview.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Ranking de Curtidas por Cidade */}
                            <Card className="md:col-span-2">
                                <CardHeader>
                                    <CardTitle>Engajamento por Cidade (Curtidas Totais)</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.likesRanking}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} name="Curtidas" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Avaliação Média por Categoria */}
                            <Card className="md:col-span-1">
                                <CardHeader>
                                    <CardTitle>Média de Avaliação por Categoria</CardTitle>
                                </CardHeader>
                                <CardContent className="h-[250px] w-full min-w-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.ratingByCategory}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                                            <YAxis domain={[0, 5]} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="#ffc658" radius={[4, 4, 0, 0]} name="Nota Média" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            {/* Card Global Stats for Rating */}
                            <div className="grid gap-4 md:grid-cols-2">
                                <StatCard
                                    title="Média Nacional de Avaliação"
                                    value={stats.averageRating.toString()}
                                    icon={<UsersIcon className="h-4 w-4 text-yellow-600" />}
                                    description={`${stats.totalEvaluations} avaliações computadas`}
                                    color="bg-yellow-100"
                                />
                                {/* Add more detailed breakdown if needed, simpler for now */}
                            </div>
                        </div>
                    </div>
                ) : (
                    <Outlet />
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;
