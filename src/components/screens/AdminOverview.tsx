
import React, { useState, useEffect } from 'react';
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
    Users as UsersIcon,
    Share2,
    Building2,
    Calendar as CalendarIcon,
    Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import StatsWidget from '../widgets/StatsWidget';
import InsightsWidget from '../widgets/InsightsWidget';

import type { Contribution } from '../../types/contribution';
import { useAuth } from '../../context/AuthContext';

const AdminOverview: React.FC = () => {
    const { userData } = useAuth();
    const isPresidente = userData?.role === 'presidente';

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

    const [recentContributions, setRecentContributions] = useState<Contribution[]>([]); // New state

    const [chartData, setChartData] = useState<{
        cityRanking: any[];
        likesRanking: any[];
        statusOverview: any[];
        ratingByCategory: any[];
    }>({ cityRanking: [], likesRanking: [], statusOverview: [], ratingByCategory: [] });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [regionFilter, setRegionFilter] = useState('all');

    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const unsubContribs = onSnapshot(collection(db, 'contributions'), (snap) => {
            let contribs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));

            // Apply Region Filter
            if (regionFilter !== 'all') {
                contribs = contribs.filter(c => c.state?.toLowerCase() === regionFilter.toLowerCase() || c.city?.toLowerCase() === regionFilter.toLowerCase());
            }

            // Apply Date Range Filter
            if (dateRange.from) {
                contribs = contribs.filter(c => {
                    if (!c.createdAt) return false;
                    const cDate = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
                    if (dateRange.to) {
                        return cDate >= dateRange.from! && cDate <= new Date(dateRange.to!.getTime() + 86400000); // include full day
                    }
                    return cDate >= dateRange.from!;
                });
            }

            setRecentContributions(contribs); // Store for InsightsWidget

            const total = contribs.length;
            const resolved = contribs.filter(c => ['Resolvido', 'Concluído'].includes(c.status)).length;
            const cities = new Set(contribs.map(c => c.city).filter(Boolean)).size;
            const shares = contribs.reduce((acc, curr) => acc + (curr.shares || 0), 0);

            const positive = contribs.filter(c => c.status === 'Aprovado' || c.status === 'Resolvido').length;
            const negative = contribs.filter(c => c.status === 'Rejeitado' || c.status === 'Lixo').length;

            const newToday = contribs.filter(c => {
                if (!c.createdAt) return false;
                const date = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
                return date >= today;
            }).length;

            const likesToday = contribs.reduce((acc, c) => acc + (c.likes || 0), 0);

            const ratedContributions = contribs.filter(c => c.rating && c.rating > 0);
            const totalRatingSum = ratedContributions.reduce((acc, c) => acc + (c.rating || 0), 0);
            const averageRating = ratedContributions.length > 0 ? (totalRatingSum / ratedContributions.length).toFixed(1) : "0.0";

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
            const cityMap: Record<string, number> = {};
            contribs.forEach(c => {
                const city = c.city || 'Desconhecido';
                cityMap[city] = (cityMap[city] || 0) + 1;
            });
            const cityRanking = Object.entries(cityMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            const cityLikesMap: Record<string, number> = {};
            contribs.forEach(c => {
                const city = c.city || 'Desconhecido';
                cityLikesMap[city] = (cityLikesMap[city] || 0) + (c.likes || 0);
            });
            const likesRanking = Object.entries(cityLikesMap)
                .map(([name, value]) => ({ name, value }))
                .sort((a, b) => b.value - a.value)
                .slice(0, 5);

            const statusMap: Record<string, number> = {};
            contribs.forEach(c => {
                let status = c.status || 'Em Análise';
                if (status === 'pending' || status === 'Pendente') status = 'Em Análise';
                if (status === 'Publicado') status = 'Aprovado';
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
    }, [regionFilter, dateRange]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-outfit">
                        {isPresidente ? 'Visão Estratégica Nacional' : 'Dashboard Geral'}
                    </h1>
                    <p className="text-muted-foreground">
                        {isPresidente ? 'Dados consolidados para tomada de decisão.' : 'Visão unificada de métricas e indicadores.'}
                    </p>
                </div>

                {/* Filters Toolbar */}
                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-[240px] justification-start text-left font-normal border-gray-200">
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
                        <SelectTrigger className="w-[180px] border-gray-200">
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
                <StatsWidget
                    title="Municípios Atendidos"
                    value={stats.citiesCount}
                    icon={Building2}
                    description="Cidades com ocorrências registradas"
                    className="border-blue-100 bg-blue-50/50"
                />
                <StatsWidget
                    title="Ocorrências"
                    value={stats.totalContributions}
                    icon={FileText}
                    description={`+${stats.newContribsToday} hoje`}
                    trend={{ value: 12, isPositive: true }}
                    className="border-orange-100 bg-orange-50/50"
                />
                <StatsWidget
                    title="Usuários Ativos"
                    value={stats.users}
                    icon={UsersIcon}
                    className="border-green-100 bg-green-50/50"
                />
                <StatsWidget
                    title="Interações"
                    value={stats.likesToday + stats.sharesTotal}
                    icon={Share2}
                    description={`${stats.likesToday} curtidas`}
                    className="border-purple-100 bg-purple-50/50"
                />
            </div>

            {/* Secondary Stats Grid */}
            <div className="grid gap-4 md:grid-cols-3">
                <StatsWidget
                    title="Resultados Positivos"
                    value={stats.positiveContribs}
                    icon={CheckCircle}
                    description="Aprovadas ou Resolvidas"
                    className="bg-green-50"
                    iconClassName="text-green-600"
                />
                <StatsWidget
                    title="Resultados Negativos"
                    value={stats.negativeContribs}
                    icon={AlertTriangle}
                    description="Rejeitadas ou Lixo"
                    className="bg-red-50"
                    iconClassName="text-red-600"
                />
                <StatsWidget
                    title="Resolvidos"
                    value={stats.resolved}
                    icon={CheckCircle}
                    description="Problemas solucionados"
                    className="bg-blue-50"
                    iconClassName="text-blue-600"
                />
            </div>

            {/* Charts & Insights Section */}
            <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
                {/* Insights Widget - New */}
                <InsightsWidget contributions={recentContributions} className="h-full" />

                {/* Ranking de Ocorrências por Cidade */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Ranking de Ocorrências (Cidade)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
                <Card className="lg:col-span-1">
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
                                    {chartData.statusOverview.map((_, index) => (
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
                    <StatsWidget
                        title="Média Nacional de Avaliação"
                        value={stats.averageRating}
                        icon={UsersIcon}
                        description={`${stats.totalEvaluations} avaliações computadas`}
                        className="bg-yellow-100"
                        iconClassName="text-yellow-600"
                    />
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
