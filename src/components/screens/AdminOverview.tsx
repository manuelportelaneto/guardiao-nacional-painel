
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import {
    AreaChart, Area,
    BarChart, Bar,
    XAxis, YAxis,
    CartesianGrid, Tooltip,
    ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    CheckCircle, AlertTriangle, FileText, Users as UsersIcon,
    Building2, ThumbsUp, Clock, TrendingUp, Activity,
    Calendar as CalendarIcon, Star, RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format, subDays, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import InsightsWidget from '../widgets/InsightsWidget';

import type { Contribution } from '../../types/contribution';
import { useAuth } from '../../context/AuthContext';

// ─── Stat Card — improved version ────────────────────────────────────────────
interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    description?: string;
    trend?: number;
    gradient: string;
    iconBg: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, description, trend, gradient, iconBg }) => (
    <Card className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow ${gradient}`}>
        <CardContent className="p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold text-white/70 uppercase tracking-widest mb-1">{title}</p>
                    <p className="text-3xl font-extrabold text-white leading-none">{value}</p>
                    {description && <p className="text-xs text-white/60 mt-1.5">{description}</p>}
                </div>
                <div className={`p-3 rounded-xl ${iconBg}`}>
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            {trend !== undefined && (
                <div className="mt-3 flex items-center gap-1 text-xs text-white/80">
                    <TrendingUp className="w-3 h-3" />
                    <span>{trend > 0 ? `+${trend}` : trend}% vs. período anterior</span>
                </div>
            )}
        </CardContent>
    </Card>
);

// ─── Timeline mini chart ──────────────────────────────────────────────────────
interface TimelineData { date: string; count: number; }

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminOverview: React.FC = () => {
    const { userData } = useAuth();
    const isPresidente = userData?.role === 'presidente';

    const [recentContributions, setRecentContributions] = useState<Contribution[]>([]);
    const [allContributions, setAllContributions] = useState<Contribution[]>([]);
    const [userCount, setUserCount] = useState(0);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [regionFilter, setRegionFilter] = useState('all');
    const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

    useEffect(() => {
        const unsubContribs = onSnapshot(collection(db, 'contributions'), (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
            setAllContributions(all);
        });
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => setUserCount(snap.size));
        return () => { unsubContribs(); unsubUsers(); };
    }, []);

    // Filtered contributions
    const contribs = React.useMemo(() => {
        let data = [...allContributions];
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
    }, [allContributions, regionFilter, dateRange]);

    useEffect(() => { setRecentContributions(contribs); }, [contribs]);

    // ─── KPI computation ─────────────────────────────────────────────────────
    const today = startOfDay(new Date());
    const total = contribs.length;
    const approved = contribs.filter(c => c.status === 'Aprovado' || c.status === 'in_progress').length;
    const rejected = contribs.filter(c => c.status === 'Rejeitado' || c.status === 'Lixo').length;
    const resolved = contribs.filter(c => ['Resolvido', 'Concluído'].includes(c.status)).length;
    const underReview = contribs.filter(c => c.status === 'Em Análise').length;
    const newToday = contribs.filter(c => {
        if (!c.createdAt) return false;
        const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
        return d >= today;
    }).length;
    const cities = new Set(contribs.map(c => c.city).filter(Boolean)).size;
    const totalLikes = contribs.reduce((a, c) => a + (c.likes || 0), 0);
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 0;

    // Rating stats
    const rated = contribs.filter(c => c.rating && c.rating > 0);
    const avgRating = rated.length > 0
        ? (rated.reduce((a, c) => a + (c.rating || 0), 0) / rated.length).toFixed(1)
        : '—';

    // ─── Chart data ──────────────────────────────────────────────────────────
    // Last 14 days timeline
    const timelineData: TimelineData[] = Array.from({ length: 14 }, (_, i) => {
        const date = subDays(new Date(), 13 - i);
        const dayStr = format(date, 'dd/MM', { locale: ptBR });
        const count = contribs.filter(c => {
            if (!c.createdAt) return false;
            const d = (c.createdAt as any).toDate ? (c.createdAt as any).toDate() : new Date(c.createdAt);
            return format(d, 'dd/MM') === dayStr;
        }).length;
        return { date: dayStr, count };
    });

    // Status distribution
    const statusMap: Record<string, number> = {};
    contribs.forEach(c => {
        let s = c.status || 'Em Análise';
        if (s === 'pending') s = 'Em Análise';
        if (s === 'Publicado') s = 'Aprovado';
        statusMap[s] = (statusMap[s] || 0) + 1;
    });
    const statusColors: Record<string, string> = {
        'Aprovado': '#10b981', 'Em Análise': '#3b82f6',
        'Rejeitado': '#ef4444', 'Resolvido': '#8b5cf6', 'Lixo': '#6b7280'
    };
    const statusData = Object.entries(statusMap).map(([name, value]) => ({
        name, value, fill: statusColors[name] || '#94a3b8'
    }));

    // City ranking
    const cityMap: Record<string, number> = {};
    contribs.forEach(c => { const ct = c.city || 'Desconhecido'; cityMap[ct] = (cityMap[ct] || 0) + 1; });
    const cityRanking = Object.entries(cityMap).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([name, value]) => ({ name, value }));

    // Category distribution
    const catMap: Record<string, number> = {};
    contribs.forEach(c => { const ct = c.category || 'Outros'; catMap[ct] = (catMap[ct] || 0) + 1; });
    const catData = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([name, value]) => ({ name, value }));

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* ─── Header ──────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">
                        {isPresidente ? '🇧🇷 Visão Estratégica Nacional' : '📊 Dashboard Geral'}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isPresidente
                            ? 'Indicadores consolidados para tomada de decisão estratégica.'
                            : `Atualizado ${format(lastRefresh, "HH:mm 'de' dd/MM", { locale: ptBR })}`}
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Date range */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="h-9 text-xs font-normal border-gray-200">
                                <CalendarIcon className="mr-2 h-3.5 w-3.5" />
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

                    {/* Region */}
                    <Select value={regionFilter} onValueChange={setRegionFilter}>
                        <SelectTrigger className="w-[140px] h-9 text-xs border-gray-200">
                            <SelectValue placeholder="Região" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Regiões</SelectItem>
                            <SelectItem value="sp">São Paulo</SelectItem>
                            <SelectItem value="rj">Rio de Janeiro</SelectItem>
                            <SelectItem value="mg">Minas Gerais</SelectItem>
                            <SelectItem value="ba">Bahia</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="ghost" size="icon" className="h-9 w-9"
                        onClick={() => setLastRefresh(new Date())}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* ─── Alert banner se há muitas em análise ────────────────────────── */}
            {underReview > 10 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-semibold text-amber-800">Fila de Moderação Alta</p>
                        <p className="text-xs text-amber-700 mt-0.5">
                            {underReview} contribuições aguardam revisão. Acesse a <strong>Moderação</strong> para processar.
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto shrink-0 text-amber-700 border-amber-300">
                        {underReview} pendentes
                    </Badge>
                </div>
            )}

            {/* ─── Primary KPI Grid ─────────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total de Ocorrências" value={total}
                    description={`+${newToday} hoje`}
                    icon={FileText} gradient="bg-gradient-to-br from-blue-500 to-blue-700"
                    iconBg="bg-blue-400/30" />
                <StatCard title="Usuários Registrados" value={userCount}
                    icon={UsersIcon} gradient="bg-gradient-to-br from-violet-500 to-violet-700"
                    iconBg="bg-violet-400/30" />
                <StatCard title="Municípios Atendidos" value={cities}
                    description="Cidades com ocorrências"
                    icon={Building2} gradient="bg-gradient-to-br from-emerald-500 to-emerald-700"
                    iconBg="bg-emerald-400/30" />
                <StatCard title="Taxa de Aprovação" value={`${approvalRate}%`}
                    description={`${approved} aprovadas`}
                    icon={TrendingUp} gradient="bg-gradient-to-br from-orange-500 to-orange-700"
                    iconBg="bg-orange-400/30" />
            </div>

            {/* ─── Secondary metrics ───────────────────────────────────────────── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Em Análise', value: underReview, icon: Clock, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
                    { label: 'Aprovadas', value: approved, icon: CheckCircle, bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
                    { label: 'Resolvidas', value: resolved, icon: Activity, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
                    { label: 'Curtidas Totais', value: totalLikes, icon: ThumbsUp, bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
                ].map(({ label, value, icon: Icon, bg, text, border }) => (
                    <Card key={label} className={`border ${border} ${bg} shadow-sm`}>
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl bg-white shadow-sm`}>
                                <Icon className={`w-5 h-5 ${text}`} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{value}</p>
                                <p className="text-xs text-gray-500">{label}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* ─── Charts Row 1 ─────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* Activity timeline */}
                <Card className="md:col-span-2 shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold">Atividade (Últimos 14 dias)</CardTitle>
                            <Badge variant="secondary">{newToday} hoje</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
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
                                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2}
                                    fill="url(#blueGrad)" name="Contribuições" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Status pie */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Status das Contribuições</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={statusData} cx="50%" cy="50%"
                                    innerRadius={52} outerRadius={72}
                                    paddingAngle={3} dataKey="value">
                                    {statusData.map((entry, i) => (
                                        <Cell key={i} fill={entry.fill} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(v) => [v, '']}
                                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Legend iconType="circle" iconSize={8}
                                    wrapperStyle={{ fontSize: 11 }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts Row 2 ─────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-3">
                {/* AI Insights widget */}
                <InsightsWidget contributions={recentContributions} className="h-full" />

                {/* City ranking */}
                <Card className="md:col-span-2 shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Top Municípios por Ocorrências</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={cityRanking} layout="vertical" margin={{ left: 8, right: 16 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" tick={{ fontSize: 10 }} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} tickLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" radius={[0, 6, 6, 0]} name="Ocorrências">
                                    {cityRanking.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Charts Row 3 ─────────────────────────────────────────────────── */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Category bar */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Ocorrências por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={catData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} />
                                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Quantidade">
                                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Rating & resolution */}
                <Card className="shadow-sm border-gray-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base font-bold">Métricas de Qualidade</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5 pt-2">
                            {[
                                {
                                    label: 'Avaliação Média',
                                    value: avgRating,
                                    sub: `${rated.length} avaliações`,
                                    icon: Star,
                                    color: 'text-yellow-500',
                                    bar: rated.length > 0 ? Math.round((parseFloat(avgRating as string) / 5) * 100) : 0,
                                    barColor: 'bg-yellow-400'
                                },
                                {
                                    label: 'Taxa de Resolução',
                                    value: `${total > 0 ? Math.round((resolved / total) * 100) : 0}%`,
                                    sub: `${resolved} resolvidas de ${total}`,
                                    icon: CheckCircle,
                                    color: 'text-green-500',
                                    bar: total > 0 ? Math.round((resolved / total) * 100) : 0,
                                    barColor: 'bg-green-400'
                                },
                                {
                                    label: 'Taxa de Rejeição',
                                    value: `${total > 0 ? Math.round((rejected / total) * 100) : 0}%`,
                                    sub: `${rejected} rejeitadas de ${total}`,
                                    icon: AlertTriangle,
                                    color: 'text-red-500',
                                    bar: total > 0 ? Math.round((rejected / total) * 100) : 0,
                                    barColor: 'bg-red-400'
                                },
                                {
                                    label: 'Engajamento',
                                    value: totalLikes,
                                    sub: `${Math.round(totalLikes / Math.max(total, 1) * 10) / 10} curtidas/contrib.`,
                                    icon: ThumbsUp,
                                    color: 'text-pink-500',
                                    bar: Math.min(100, totalLikes),
                                    barColor: 'bg-pink-400'
                                },
                            ].map(({ label, value, sub, icon: Icon, color, bar, barColor }) => (
                                <div key={label}>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <div className="flex items-center gap-2">
                                            <Icon className={`w-4 h-4 ${color}`} />
                                            <span className="text-sm font-medium text-gray-700">{label}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-bold text-gray-900">{value}</span>
                                            <p className="text-[10px] text-gray-400">{sub}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                                        <div className={`${barColor} h-1.5 rounded-full transition-all`} style={{ width: `${bar}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminOverview;
