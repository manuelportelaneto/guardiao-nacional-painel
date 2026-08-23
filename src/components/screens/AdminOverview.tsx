import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import {
    AreaChart, Area,
    BarChart, Bar,
    XAxis, YAxis,
    CartesianGrid, Tooltip,
    ResponsiveContainer,
    PieChart, Pie, Cell, Legend,
    LineChart, Line
} from 'recharts';
import {
    CircleCheck, TriangleAlert, FileText, Users as UsersIcon,
    Building2, ThumbsUp, Clock, TrendingUp, Activity,
    Calendar as CalendarIcon, RefreshCw, Shield, MapPin,
    Trophy, Sparkles, AlertCircle, Compass, Zap, CheckCircle2,
    BarChart3, PieChart as PieIcon, LineChart as LineIcon
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InsightsWidget from '../widgets/InsightsWidget';
import type { Contribution } from '../../types/contribution';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import { analyticsIntelligenceService } from '../../services/analyticsIntelligenceService';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

const AdminOverview: React.FC = () => {
    const { userData } = useAuth();
    const { scope, isNational, resetToNational, dataMasking } = useScope();
    const isPresidente = userData?.role === 'presidente' || userData?.role === 'super_admin';

    const [activeTab, setActiveTab] = useState<'overview' | 'territory' | 'trends' | 'efficiency'>('overview');
    const [allContributions, setAllContributions] = useState<Contribution[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [regionFilter, setRegionFilter] = useState('all');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const unsubContribs = onSnapshot(
            collection(db, 'contributions'),
            (snap) => {
                const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
                setAllContributions(all);
                setLoading(false);
            },
            (error) => {
                console.warn('Interrompido listener de contribuições:', error);
                setLoading(false);
            }
        );

        const unsubUsers = onSnapshot(
            collection(db, 'users'),
            (snap) => {
                const usersList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                setAllUsers(usersList);
                setUserCount(snap.size);
            },
            (error) => {
                console.warn('Interrompido listener de usuários:', error);
            }
        );

        return () => {
            unsubContribs();
            unsubUsers();
        };
    }, []);

    // Filtragem de dados por Escopo Federativo e Data
    const contribs = useMemo(() => {
        let data = [...allContributions];

        if (scope.level === 'STATE' && scope.state) {
            data = data.filter(c => c.state?.toUpperCase() === scope.state?.toUpperCase());
        } else if (scope.level === 'MUNICIPAL' || scope.level === 'DEPARTMENT') {
            data = data.filter(c => {
                const cCity = (c.city || '').toLowerCase();
                const cCityId = ((c as any).cityId || '').toLowerCase();
                const targetId = (scope.cityId || '').toLowerCase();
                const targetName = (scope.cityName || '').toLowerCase();
                return (targetId && cCityId === targetId) ||
                       (targetId && cCity === targetId) ||
                       (targetName && cCity === targetName);
            });
        }

        if (regionFilter !== 'all') {
            data = data.filter(c => c.state?.toLowerCase() === regionFilter || c.city?.toLowerCase() === regionFilter);
        }

        if (dateRange.from) {
            data = data.filter(c => {
                if (!c.createdAt) return false;
                const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
                if (dateRange.to) return d >= dateRange.from! && d <= new Date(dateRange.to!.getTime() + 86400000);
                return d >= dateRange.from!;
            });
        }
        return data;
    }, [allContributions, scope, regionFilter, dateRange]);

    // Motor de Inteligência Analítica Real
    const analytics = useMemo(() => {
        return analyticsIntelligenceService.computeAnalytics(contribs, allUsers);
    }, [contribs, allUsers]);

    // Métricas para a Visão Geral
    const today = startOfDay(new Date());
    const total = contribs.length;
    const approved = contribs.filter(c => c.status === 'Aprovado' || c.status === 'in_progress').length;
    const underReview = contribs.filter(c => c.status === 'Em Análise' || c.status === 'pending').length;
    const resolved = contribs.filter(c => ['Resolvido', 'Concluído', 'completed'].includes(c.status || '')).length;
    const newToday = contribs.filter(c => {
        if (!c.createdAt) return false;
        const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
        return d >= today;
    }).length;
    const cities = new Set(contribs.map(c => c.city).filter(Boolean)).size;

    // Linha do tempo dos últimos 14 dias
    const timelineData = useMemo(() => {
        return Array.from({ length: 14 }, (_, i) => {
            const date = subDays(new Date(), 13 - i);
            const dayStr = format(date, 'dd/MM', { locale: ptBR });
            const count = contribs.filter(c => {
                if (!c.createdAt) return false;
                const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
                return format(d, 'dd/MM') === dayStr;
            }).length;
            return { date: dayStr, count };
        });
    }, [contribs]);

    // Distribuição de Status
    const statusData = useMemo(() => {
        const statusMap: Record<string, number> = {};
        contribs.forEach(c => {
            let s = c.status || 'Em Análise';
            if (s === 'pending') s = 'Em Análise';
            if (s === 'completed') s = 'Resolvido';
            if (s === 'Publicado') s = 'Aprovado';
            statusMap[s] = (statusMap[s] || 0) + 1;
        });
        const statusColors: Record<string, string> = {
            'Aprovado': '#10b981', 'Em Análise': '#3b82f6',
            'Rejeitado': '#ef4444', 'Resolvido': '#10b981', 'Lixo': '#6b7280'
        };
        return Object.entries(statusMap).map(([name, value]) => ({
            name, value, fill: statusColors[name] || '#94a3b8'
        }));
    }, [contribs]);

    // Categorias
    const catData = useMemo(() => {
        const catMap: Record<string, number> = {};
        contribs.forEach(c => { const ct = c.category || 'Outros'; catMap[ct] = (catMap[ct] || 0) + 1; });
        return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
            .map(([name, value]) => ({ name, value }));
    }, [contribs]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ─── 0. Cabeçalho e Filtros ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Activity className="h-7 w-7 text-blue-600" />
                        {isPresidente ? '🇧🇷 Inteligência Estratégica & Analytics' : '📊 Dashboard Analítico Territorial'}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                        Cruzamento multidimensional de demandas urbanas, previsões e eficiência governamental com dados 100% reais.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-8 text-xs font-normal border-slate-200 bg-white">
                                <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-slate-500" />
                                {dateRange.from
                                    ? dateRange.to
                                        ? `${format(dateRange.from, 'P', { locale: ptBR })} – ${format(dateRange.to, 'P', { locale: ptBR })}`
                                        : format(dateRange.from, 'P', { locale: ptBR })
                                    : 'Todos os períodos'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar initialFocus mode="range" defaultMonth={dateRange.from}
                                selected={dateRange as any} onSelect={(r: any) => setDateRange(r)} numberOfMonths={2} />
                        </PopoverContent>
                    </Popover>

                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setLastRefresh(new Date())}>
                        <RefreshCw className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>
            </div>

            {/* Banner de Escopo Federativo */}
            {!isNational && (
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md border border-blue-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-200 border border-blue-400/30">
                            {scope.level === 'STATE' ? <MapPin className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                        </div>
                        <div>
                            <span className="font-bold text-sm">
                                {scope.level === 'STATE' && `Escopo Estadual: ${scope.state}`}
                                {scope.level === 'MUNICIPAL' && `Escopo Municipal: ${scope.cityName || scope.cityId}`}
                                {scope.level === 'DEPARTMENT' && `Secretaria: ${scope.departmentName || scope.departmentId} (${scope.cityName || scope.cityId})`}
                            </span>
                            <p className="text-xs text-blue-200/80 mt-0.5">
                                Cruzamentos e predições restritos à jurisdição ativa ({total} ocorrências reais no banco).
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={resetToNational}
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs shrink-0"
                    >
                        Visão Nacional (Brasil)
                    </Button>
                </div>
            )}

            {/* ─── 1. Abas Analíticas ─── */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 max-w-2xl bg-slate-100 p-1 rounded-xl">
                    <TabsTrigger value="overview" className="text-xs gap-1.5 font-bold">
                        <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                        Panorama Geral
                    </TabsTrigger>
                    <TabsTrigger value="territory" className="text-xs gap-1.5 font-bold">
                        <Compass className="w-3.5 h-3.5 text-indigo-600" />
                        Cruzamento & Bairros
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="text-xs gap-1.5 font-bold">
                        <LineIcon className="w-3.5 h-3.5 text-amber-600" />
                        Tendências & Picos
                    </TabsTrigger>
                    <TabsTrigger value="efficiency" className="text-xs gap-1.5 font-bold">
                        <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                        Rankings & Eficiência
                    </TabsTrigger>
                </TabsList>

                {/* ─── ABA 1: Panorama Geral ─── */}
                <TabsContent value="overview" className="space-y-6 pt-2">
                    {/* Primary KPI Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <Card className="bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl shadow-sm border-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-blue-100">Total de Demandas</p>
                                    <p className="text-3xl font-black mt-0.5">{total}</p>
                                    <p className="text-[11px] text-blue-200 mt-1">+{newToday} registradas hoje</p>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <FileText className="w-6 h-6 text-white" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white rounded-2xl shadow-sm border-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-indigo-100">Engajamento Cívico</p>
                                    <p className="text-3xl font-black mt-0.5">{analytics.citizenEngagementIndex} / 100</p>
                                    <p className="text-[11px] text-indigo-200 mt-1">Índice CEI do Território</p>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <Sparkles className="w-6 h-6 text-white" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-emerald-600 to-emerald-800 text-white rounded-2xl shadow-sm border-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-emerald-100">Taxa de Resolução</p>
                                    <p className="text-3xl font-black mt-0.5">{analytics.resolutionRate}%</p>
                                    <p className="text-[11px] text-emerald-200 mt-1">{resolved} ocorrências resolvidas</p>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-amber-600 to-amber-800 text-white rounded-2xl shadow-sm border-0">
                            <CardContent className="p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[11px] font-bold uppercase text-amber-100">Tempo Médio (TMA)</p>
                                    <p className="text-3xl font-black mt-0.5">{analytics.avgResolutionTimeHours}h</p>
                                    <p className="text-[11px] text-amber-200 mt-1">Velocidade de atendimento</p>
                                </div>
                                <div className="p-3 bg-white/10 rounded-2xl">
                                    <Clock className="w-6 h-6 text-white" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Gráficos de Atividade e Distribuição */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="md:col-span-2 rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-slate-900">Histórico de Ocorrências (Últimos 14 Dias)</CardTitle>
                                    <Badge variant="outline" className="text-xs bg-slate-50">{newToday} hoje</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <AreaChart data={timelineData}>
                                        <defs>
                                            <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#blueGrad)" name="Ocorrências" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-900">Status das Demandas</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={3} dataKey="value">
                                            {statusData.map((entry, i) => (
                                                <Cell key={i} fill={entry.fill} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── ABA 2: Cruzamento Territorial & Bairros ─── */}
                <TabsContent value="territory" className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Tabela de Cruzamento Bairro x Demandas */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-blue-600" />
                                    Cruzamento Territorial de Bairros & Severidade
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Volume de incidentes e taxa de resolução por localidade.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.neighborhoodCross.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        Nenhum dado territorial registrado no período.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {analytics.neighborhoodCross.map((item, i) => (
                                            <div key={item.neighborhood} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        <span className="font-bold text-xs text-slate-800">{item.neighborhood}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] bg-white font-mono">
                                                        {item.total} demandas ({item.resolutionRate}% resolvidas)
                                                    </Badge>
                                                </div>

                                                {/* Categorias mais frequentes */}
                                                <div className="flex flex-wrap gap-1">
                                                    {Object.entries(item.categories).map(([cat, count]) => (
                                                        <span key={cat} className="text-[10px] bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                                            {cat}: <strong>{count}</strong>
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pontos Críticos de Reincidência */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <TriangleAlert className="w-4 h-4 text-amber-500" />
                                    Pontos Críticos de Reincidência Urbana
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Locais com reabertura ou múltiplos chamados para o mesmo logradouro.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.criticalRecurrencePoints.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        Nenhum logradouro com reincidência crítica detectada no período.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {analytics.criticalRecurrencePoints.map(p => (
                                            <div key={p.location} className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 flex items-center justify-between">
                                                <div>
                                                    <div className="font-bold text-xs text-slate-900">{p.location}</div>
                                                    <div className="text-[10px] text-amber-800">Categoria predominante: {p.category}</div>
                                                </div>
                                                <Badge className="bg-amber-600 text-white text-xs font-mono font-bold">
                                                    {p.count} chamados
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── ABA 3: Tendências, Picos & Previsões ─── */}
                <TabsContent value="trends" className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Projeção Linear para os Próximos 7 Dias */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-blue-600" />
                                    Previsão Preditiva de Demandas (Próximos 7 Dias)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Média móvel e projeção estatística calculada a partir do histórico recente.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={220}>
                                    <LineChart data={analytics.predictiveTrends}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} />
                                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                        <Line type="monotone" dataKey="predicted" stroke="#3b82f6" strokeWidth={2.5} strokeDasharray="4 4" name="Previsão Estimada" dot={{ r: 4 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* Distribuição Horária dos Chamados */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-600" />
                                    Picos de Incidência por Faixa Horária
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Concentração horária em que os munícipes mais enviam relatos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-2">
                                {analytics.hourlyDistribution.map(h => (
                                    <div key={h.hourRange} className="space-y-1">
                                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                                            <span>{h.hourRange}</span>
                                            <span>{h.count} ocorrências ({h.percentage}%)</span>
                                        </div>
                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${h.percentage}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ─── ABA 4: Rankings & Eficiência ─── */}
                <TabsContent value="efficiency" className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Ranking de Eficiência das Secretarias */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    Eficiência Operacional por Secretaria
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Desempenho de resolução e tempo médio de atendimento (TMA).
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.departmentEfficiency.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        Nenhuma secretaria com demandas atribuídas.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {analytics.departmentEfficiency.map(dept => (
                                            <div key={dept.department} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-slate-800">{dept.department}</span>
                                                    <Badge variant="outline" className="text-[10px] font-mono bg-white text-emerald-700 border-emerald-200">
                                                        {dept.resolutionRate}% resolvidas
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between text-[11px] text-slate-500">
                                                    <span>Total Atribuído: <strong>{dept.totalAssigned}</strong></span>
                                                    <span>Tempo Médio: <strong>{dept.avgResolutionHours}h</strong></span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Ranking de Cidadãos Mais Ativos */}
                        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    Munícipes Mais Ativos (Gamificação Cívica)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Colaboradores com maior volume de contribuições aprovadas e endossos.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {analytics.citizenRanking.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs">
                                        Nenhum registro de participação cívica no período.
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {analytics.citizenRanking.map((c, i) => (
                                            <div key={c.userId} className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                                <div className="flex items-center gap-2.5">
                                                    <span className={`w-6 h-6 rounded-full text-xs font-black flex items-center justify-center ${
                                                        i === 0 ? 'bg-amber-100 text-amber-800' : (i === 1 ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-600')
                                                    }`}>
                                                        {i + 1}º
                                                    </span>
                                                    <div>
                                                        <div className="font-bold text-xs text-slate-900">{c.name}</div>
                                                        <div className="text-[10px] text-slate-400">
                                                            {c.approvedContributions} aprovadas • {c.totalEndorsements} endossos
                                                        </div>
                                                    </div>
                                                </div>
                                                <Badge className="bg-blue-600 text-white font-mono text-[10px]">
                                                    {c.engagementScore} pts
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminOverview;
