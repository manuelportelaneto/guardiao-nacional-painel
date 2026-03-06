import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
    Megaphone, Heart, GraduationCap, Building2, ShieldCheck, Users,
    Send, Eye, Clock, CheckCircle2, XCircle, BarChart3,
    Calendar, Filter, Search, AlertTriangle, Leaf
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

// ─── Campaign Categories ────────────────────────────────────────────────────
const CAMPAIGN_CATEGORIES = [
    { id: 'all', label: 'Todas', icon: <Megaphone className="w-4 h-4" />, color: 'bg-slate-100 text-slate-700' },
    { id: 'saude', label: 'Saúde', icon: <Heart className="w-4 h-4" />, color: 'bg-rose-100 text-rose-700' },
    { id: 'educacao', label: 'Educação', icon: <GraduationCap className="w-4 h-4" />, color: 'bg-blue-100 text-blue-700' },
    { id: 'institucional', label: 'Institucional', icon: <ShieldCheck className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    { id: 'prefeitura', label: 'Prefeitura', icon: <Building2 className="w-4 h-4" />, color: 'bg-amber-100 text-amber-700' },
    { id: 'inclusao', label: 'Inclusão Social', icon: <Users className="w-4 h-4" />, color: 'bg-emerald-100 text-emerald-700' },
    { id: 'meio_ambiente', label: 'Meio Ambiente', icon: <Leaf className="w-4 h-4" />, color: 'bg-green-100 text-green-700' },
    { id: 'emergencia', label: 'Emergência', icon: <AlertTriangle className="w-4 h-4" />, color: 'bg-red-100 text-red-700' },
];

interface CampaignMessage {
    id: string;
    title: string;
    body: string;
    type: string;
    tag: string;
    status: string;
    channels: string[];
    createdAt: Date;
    sentAt?: Date;
    stats?: {
        sent?: number;
        delivered?: number;
        opened?: number;
        clicked?: number;
    };
    filters?: {
        location?: { city?: string; state?: string };
        manualEmailList?: string[];
        manualSmsList?: string[];
        manualListExclusive?: boolean;
    };
}

const MarketingScreen: React.FC = () => {
    const [campaigns, setCampaigns] = useState<CampaignMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // Load real campaigns from Firestore
    useEffect(() => {
        const loadCampaigns = async () => {
            try {
                const q = query(
                    collection(db, 'messages'),
                    orderBy('createdAt', 'desc'),
                    limit(100)
                );
                const snap = await getDocs(q);
                const data: CampaignMessage[] = snap.docs.map(doc => {
                    const d = doc.data();
                    return {
                        id: doc.id,
                        title: d.content?.title || d.title || 'Sem título',
                        body: d.content?.body || d.body || '',
                        type: d.type || 'info',
                        tag: d.tag || 'institucional',
                        status: d.status || 'draft',
                        channels: d.channels || [],
                        createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || Date.now()),
                        sentAt: d.sentAt?.toDate ? d.sentAt.toDate() : undefined,
                        stats: d.stats || {},
                        filters: d.filters || {},
                    };
                });
                setCampaigns(data);
            } catch (err) {
                console.error('Error loading campaigns:', err);
            } finally {
                setLoading(false);
            }
        };
        loadCampaigns();
    }, []);

    // Filtered campaigns
    const filtered = useMemo(() => {
        return campaigns.filter(c => {
            if (selectedCategory !== 'all' && !c.tag.toLowerCase().includes(selectedCategory)) return false;
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [campaigns, selectedCategory, statusFilter, searchQuery]);

    // Stats
    const stats = useMemo(() => {
        const total = campaigns.length;
        const sent = campaigns.filter(c => c.status === 'sent').length;
        const failed = campaigns.filter(c => c.status === 'failed').length;
        const totalReach = campaigns.reduce((acc, c) => acc + (c.stats?.sent || 0), 0);
        const emailCount = campaigns.reduce((acc, c) => acc + (c.filters?.manualEmailList?.length || 0), 0);
        return { total, sent, failed, totalReach, emailCount };
    }, [campaigns]);

    // Chart data: campaigns by month
    const chartData = useMemo(() => {
        const months: Record<string, { name: string; sent: number; failed: number }> = {};
        campaigns.forEach(c => {
            const d = c.createdAt;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const label = `${monthNames[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`;
            if (!months[key]) months[key] = { name: label, sent: 0, failed: 0 };
            if (c.status === 'sent') months[key].sent++;
            else if (c.status === 'failed') months[key].failed++;
        });
        return Object.values(months).slice(-6);
    }, [campaigns]);

    // Chart data: by category
    const categoryChart = useMemo(() => {
        const cats: Record<string, number> = {};
        campaigns.forEach(c => {
            const tag = c.tag || 'outro';
            cats[tag] = (cats[tag] || 0) + 1;
        });
        return Object.entries(cats).map(([name, value]) => ({ name, value }));
    }, [campaigns]);

    const getCategoryColor = (tag: string) => {
        const cat = CAMPAIGN_CATEGORIES.find(c => c.id === tag);
        return cat?.color || 'bg-slate-100 text-slate-700';
    };

    const getCategoryIcon = (tag: string) => {
        const cat = CAMPAIGN_CATEGORIES.find(c => c.id === tag);
        return cat?.icon || <Megaphone className="w-4 h-4" />;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'sent': return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 gap-1"><CheckCircle2 className="w-3 h-3" /> Enviada</Badge>;
            case 'failed': return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 gap-1"><XCircle className="w-3 h-3" /> Falhou</Badge>;
            case 'draft': return <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100 gap-1"><Clock className="w-3 h-3" /> Rascunho</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    const getChannelBadges = (channels: string[]) => {
        return channels.map(ch => {
            switch (ch) {
                case 'push': return <Badge key={ch} variant="outline" className="text-xs">📱 Push</Badge>;
                case 'email': return <Badge key={ch} variant="outline" className="text-xs">📧 Email</Badge>;
                case 'sms': return <Badge key={ch} variant="outline" className="text-xs">💬 SMS</Badge>;
                default: return <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>;
            }
        });
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando campanhas...</div>;

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Megaphone className="w-6 h-6 text-blue-500" /> Campanhas Institucionais
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Campanhas de informação ao cidadão, saúde, educação, inclusão social e mensagens de prefeituras.
                    <span className="text-red-500 font-medium"> Proibido uso para promoção política ou financeira.</span>
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.total}</p>
                            <p className="text-xs text-gray-500">Total de Campanhas</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.sent}</p>
                            <p className="text-xs text-gray-500">Enviadas</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.failed}</p>
                            <p className="text-xs text-gray-500">Falhas</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                            <Send className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalReach}</p>
                            <p className="text-xs text-gray-500">Alcance Total</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                            <Eye className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.emailCount}</p>
                            <p className="text-xs text-gray-500">E-mails Enviados</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Campanhas por Mês</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        {chartData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="sent" fill="#10b981" name="Enviadas" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="failed" fill="#ef4444" name="Falhas" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Nenhuma campanha para exibir gráfico.
                            </div>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Distribuição por Categoria</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                        {categoryChart.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={categoryChart} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#3b82f6" name="Campanhas" radius={[0, 4, 4, 0]}>
                                        {categoryChart.map((_, index) => (
                                            <Cell key={index} fill={['#3b82f6', '#10b981', '#f59e0b', '#10b981', '#ef4444', '#06b6d4', '#84cc16'][index % 7]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                                Nenhuma campanha para exibir distribuição.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="flex gap-1 flex-wrap">
                    {CAMPAIGN_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat.id
                                ? 'bg-blue-600 text-white shadow-md'
                                : `${cat.color} hover:opacity-80`
                                }`}
                        >
                            {cat.icon} {cat.label}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2 ml-auto">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Buscar campanha..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-9 w-[200px]"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px]">
                            <Filter className="w-4 h-4 mr-1" />
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="sent">Enviadas</SelectItem>
                            <SelectItem value="failed">Falhas</SelectItem>
                            <SelectItem value="draft">Rascunho</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Campaigns List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-lg border border-dashed">
                        <Megaphone className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-lg font-medium text-gray-900">
                            {campaigns.length === 0 ? 'Nenhuma campanha enviada' : 'Nenhuma campanha encontrada com os filtros atuais'}
                        </h3>
                        <p className="text-gray-500 text-sm mt-1">
                            {campaigns.length === 0
                                ? 'Use a aba "Nova Mensagem" para criar sua primeira campanha institucional.'
                                : 'Tente alterar os filtros de categoria ou status.'}
                        </p>
                    </div>
                ) : (
                    filtered.map(campaign => (
                        <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-4">
                                    {/* Category Icon */}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getCategoryColor(campaign.tag)}`}>
                                        {getCategoryIcon(campaign.tag)}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="font-semibold text-sm truncate">{campaign.title}</h3>
                                            {getStatusBadge(campaign.status)}
                                            {campaign.type === 'emergency' && (
                                                <Badge className="bg-red-600 text-white hover:bg-red-600">🚨 Emergência</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                            {campaign.body.replace(/<[^>]*>/g, '').substring(0, 120)}
                                            {campaign.body.length > 120 ? '...' : ''}
                                        </p>
                                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                                            <span className="text-xs text-gray-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {campaign.createdAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                            <div className="flex gap-1">
                                                {getChannelBadges(campaign.channels)}
                                            </div>
                                            {campaign.filters?.location?.city && (
                                                <Badge variant="outline" className="text-xs gap-1">
                                                    📍 {campaign.filters.location.city}
                                                </Badge>
                                            )}
                                            {campaign.filters?.manualListExclusive && (
                                                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                                                    Lista Externa
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="text-right flex-shrink-0 hidden sm:block">
                                        {campaign.stats?.sent && campaign.stats.sent > 0 ? (
                                            <div>
                                                <p className="text-lg font-bold text-gray-900">{campaign.stats.sent}</p>
                                                <p className="text-xs text-gray-400">alcançados</p>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400">—</p>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Compliance Notice */}
            <Card className="bg-slate-50 border-slate-200">
                <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                        <ShieldCheck className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                        <div className="text-xs text-slate-600 space-y-1">
                            <p className="font-semibold text-slate-700">Política de Uso — Campanhas Institucionais</p>
                            <p>Este módulo é exclusivo para comunicações de <strong>informação pública</strong>, <strong>campanhas de saúde</strong>, <strong>educação</strong>, <strong>inclusão social</strong> e <strong>alertas de emergência</strong>.</p>
                            <p className="text-red-600">⛔ É terminantemente proibido o uso para promoção política, campanha eleitoral, publicidade financeira ou qualquer forma de propaganda com fins lucrativos.</p>
                            <p>Para anúncios comerciais e monetização, utilize exclusivamente a seção <strong>Monetização</strong> do painel.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default MarketingScreen;
