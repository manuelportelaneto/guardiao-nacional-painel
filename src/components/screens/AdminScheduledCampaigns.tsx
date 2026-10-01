import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    Calendar,
    Clock,
    Send,
    Pause,
    Play,
    Eye,
    Mail,
    Bell,
    Shield,
    CheckCircle2,
    AlertCircle,
    RefreshCw,
    Smartphone,
    Sparkles,
    Filter,
    ChevronRight,
    Edit3,
    Trash2,
    ExternalLink,
    Rocket,
    Info,
    CalendarClock,
    LayoutGrid,
    List,
    Layers,
    Share2
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
    scheduledCampaignService,
    type ScheduledCampaign,
    DEFAULT_Q4_CAMPAIGNS
} from '../../services/scheduledCampaignService';

export const AdminScheduledCampaigns: React.FC = () => {
    const { currentUser } = useAuth();
    const [campaigns, setCampaigns] = useState<ScheduledCampaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Modals
    const [previewCampaign, setPreviewCampaign] = useState<ScheduledCampaign | null>(null);
    const [editCampaign, setEditCampaign] = useState<ScheduledCampaign | null>(null);
    const [triggerModalCampaign, setTriggerModalCampaign] = useState<ScheduledCampaign | null>(null);
    const [isTriggering, setIsTriggering] = useState(false);
    const [isReseeding, setIsReseeding] = useState(false);

    // Live countdown update
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = scheduledCampaignService.subscribeCampaigns((data) => {
            setCampaigns(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Filtered list
    const filteredCampaigns = useMemo(() => {
        return campaigns.filter(c => {
            if (categoryFilter !== 'all' && c.category !== categoryFilter) return false;
            if (statusFilter !== 'all' && c.status !== statusFilter) return false;
            return true;
        });
    }, [campaigns, categoryFilter, statusFilter]);

    // Next upcoming scheduled campaign
    const nextCampaign = useMemo(() => {
        const upcoming = campaigns
            .filter(c => c.status === 'SCHEDULED')
            .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        return upcoming.length > 0 ? upcoming[0] : null;
    }, [campaigns]);

    const formatCountdown = (targetDate: Date | string) => {
        const diff = new Date(targetDate).getTime() - currentTime.getTime();
        if (diff <= 0) return 'Vencido / Em processamento';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (days > 0) return `${days}d ${hours}h ${mins}m`;
        return `${hours}h ${mins}m ${secs}s`;
    };

    // Handlers
    const handleTogglePause = async (campaign: ScheduledCampaign) => {
        try {
            const nextStatus = await scheduledCampaignService.togglePauseCampaign(campaign.id, campaign.status);
            toast.success(nextStatus === 'PAUSED' ? `Campanha pausada!` : `Campanha reativada com sucesso!`);
        } catch (err: any) {
            toast.error(`Erro ao alternar status: ${err.message}`);
        }
    };

    const handleConfirmTriggerNow = async () => {
        if (!triggerModalCampaign) return;
        setIsTriggering(true);
        try {
            const msgId = await scheduledCampaignService.triggerCampaignNow(triggerModalCampaign, currentUser?.uid);
            toast.success(`🚀 Campanha disparada com sucesso! (ID Mensagem: ${msgId})`);
            setTriggerModalCampaign(null);
        } catch (err: any) {
            toast.error(`Falha ao disparar campanha: ${err.message}`);
        } finally {
            setIsTriggering(false);
        }
    };

    const handleReseed = async () => {
        if (!window.confirm("Deseja restaurar o cronograma oficial de 10 campanhas para o 4º Trimestre de 2026?")) return;
        setIsReseeding(true);
        try {
            await scheduledCampaignService.seedCampaigns(true);
            toast.success("Cronograma Q4 2026 restaurado com sucesso!");
        } catch (err: any) {
            toast.error(`Erro ao restaurar cronograma: ${err.message}`);
        } finally {
            setIsReseeding(false);
        }
    };

    const handleSaveEdit = async () => {
        if (!editCampaign) return;
        try {
            await scheduledCampaignService.updateCampaign(editCampaign.id, {
                title: editCampaign.title,
                pushTitle: editCampaign.pushTitle,
                pushBody: editCampaign.pushBody,
                emailSubject: editCampaign.emailSubject,
                emailHtml: editCampaign.emailHtml,
                targetDate: editCampaign.targetDate,
                targetTime: editCampaign.targetTime,
                channels: editCampaign.channels,
                category: editCampaign.category,
                deepLink: editCampaign.deepLink
            });
            toast.success("Campanha atualizada com sucesso!");
            setEditCampaign(null);
        } catch (err: any) {
            toast.error(`Erro ao salvar: ${err.message}`);
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case 'cívico':
                return <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-500/20">🇧🇷 Cívico</Badge>;
            case 'segurança':
                return <Badge className="bg-amber-600/10 text-amber-600 border-amber-500/20">🛡️ Segurança</Badge>;
            case 'mobilidade':
                return <Badge className="bg-blue-600/10 text-blue-600 border-blue-500/20">🚗 Mobilidade</Badge>;
            case 'infraestrutura':
                return <Badge className="bg-purple-600/10 text-purple-600 border-purple-500/20">🏗️ Infraestrutura</Badge>;
            case 'comunidade':
                return <Badge className="bg-teal-600/10 text-teal-600 border-teal-500/20">🤝 Comunidade</Badge>;
            default:
                return <Badge variant="outline">🏛️ Institucional</Badge>;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'SCHEDULED':
                return <Badge className="bg-sky-500/10 text-sky-600 border-sky-500/30 gap-1.5"><Clock className="w-3 h-3" /> Programada</Badge>;
            case 'SENT':
                return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 gap-1.5"><CheckCircle2 className="w-3 h-3" /> Enviada</Badge>;
            case 'PAUSED':
                return <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5"><Pause className="w-3 h-3" /> Pausada</Badge>;
            default:
                return <Badge variant="destructive">Falhou</Badge>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 rounded-lg bg-primary/10 text-primary">
                            <CalendarClock className="w-6 h-6" />
                        </span>
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                Cronograma de Campanhas Programadas (Q4 2026)
                            </h2>
                            <p className="text-sm text-muted-foreground">
                                Gestão centralizada de disparos automatizados de Push Notifications e E-mails cívicos com foco em engajamento comunitário.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleReseed}
                        disabled={isReseeding}
                        className="gap-1.5 text-xs"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isReseeding ? 'animate-spin' : ''}`} />
                        Restaurar Padrões Q4
                    </Button>

                    <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
                        <Button
                            variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5"
                            onClick={() => setViewMode('cards')}
                        >
                            <LayoutGrid className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                            size="sm"
                            className="h-7 px-2.5"
                            onClick={() => setViewMode('table')}
                        >
                            <List className="w-3.5 h-3.5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total de Campanhas</p>
                                <h3 className="text-2xl font-bold mt-1 text-foreground">{campaigns.length}</h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Campanhas programadas</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                <Layers className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Na Fila de Disparo</p>
                                <h3 className="text-2xl font-bold mt-1 text-sky-500">
                                    {campaigns.filter(c => c.status === 'SCHEDULED').length}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Aguardando data prevista</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-500">
                                <Clock className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 bg-card/60 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Enviadas / Disparadas</p>
                                <h3 className="text-2xl font-bold mt-1 text-emerald-500">
                                    {campaigns.filter(c => c.status === 'SENT').length}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">Push e e-mails despachados</p>
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-2 border-primary/30 bg-primary/5 backdrop-blur-sm">
                    <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-primary uppercase tracking-wider">Próximo Disparo</p>
                                {nextCampaign ? (
                                    <>
                                        <h3 className="text-lg font-bold mt-1 text-foreground truncate max-w-[170px]" title={nextCampaign.title}>
                                            {nextCampaign.targetDate.split('-').reverse().slice(0, 2).join('/')} às {nextCampaign.targetTime}
                                        </h3>
                                        <p className="text-xs font-semibold text-primary mt-0.5 flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            {formatCountdown(nextCampaign.scheduledAt)}
                                        </p>
                                    </>
                                ) : (
                                    <>
                                        <h3 className="text-lg font-bold mt-1 text-muted-foreground">Nenhuma na fila</h3>
                                        <p className="text-xs text-muted-foreground mt-0.5">Todas foram enviadas</p>
                                    </>
                                )}
                            </div>
                            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                                <Rocket className="w-5 h-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mr-1">
                        <Filter className="w-3.5 h-3.5" />
                        Filtrar:
                    </div>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                            <SelectValue placeholder="Categoria" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas Categorias</SelectItem>
                            <SelectItem value="comunidade">Comunidade</SelectItem>
                            <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                            <SelectItem value="mobilidade">Mobilidade</SelectItem>
                            <SelectItem value="segurança">Segurança</SelectItem>
                            <SelectItem value="cívico">Cívico</SelectItem>
                            <SelectItem value="institucional">Institucional</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="SCHEDULED">Programadas</SelectItem>
                            <SelectItem value="SENT">Enviadas</SelectItem>
                            <SelectItem value="PAUSED">Pausadas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="text-xs text-muted-foreground text-right">
                    Exibindo <span className="font-semibold text-foreground">{filteredCampaigns.length}</span> de {campaigns.length} campanhas
                </div>
            </div>

            {/* Campaign Content */}
            {loading ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-sm">Carregando cronograma de campanhas...</p>
                </div>
            ) : filteredCampaigns.length === 0 ? (
                <Card className="p-10 text-center border-dashed">
                    <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Nenhuma campanha encontrada</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                        Não há campanhas com os filtros selecionados ou a lista ainda não foi gerada.
                    </p>
                    <Button onClick={handleReseed} className="mt-4 gap-1.5" size="sm">
                        <RefreshCw className="w-4 h-4" /> Restaurar 10 Campanhas Oficiais
                    </Button>
                </Card>
            ) : viewMode === 'cards' ? (
                /* Card Timeline View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {filteredCampaigns.map((camp, index) => {
                        const isNext = nextCampaign?.id === camp.id;
                        return (
                            <Card
                                key={camp.id}
                                className={`border transition-all duration-200 hover:shadow-md ${
                                    isNext
                                        ? 'border-primary shadow-sm bg-gradient-to-b from-primary/5 to-transparent'
                                        : 'border-border/60 hover:border-border'
                                }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getCategoryBadge(camp.category)}
                                            {getStatusBadge(camp.status)}
                                            {isNext && (
                                                <Badge className="bg-primary text-primary-foreground font-semibold text-[10px] animate-pulse">
                                                    Próxima da Fila
                                                </Badge>
                                            )}
                                        </div>

                                        <div className="text-right">
                                            <div className="text-xs font-bold text-foreground flex items-center justify-end gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                                {camp.targetDate.split('-').reverse().join('/')}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center justify-end gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {camp.targetTime} BRT
                                            </div>
                                        </div>
                                    </div>

                                    <CardTitle className="text-base font-bold text-foreground mt-2 line-clamp-1">
                                        {camp.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground line-clamp-2">
                                        💡 <strong>Gatilho:</strong> {camp.triggerReason}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    {/* Push Notification Visual Mockup */}
                                    <div className="rounded-lg border border-border/80 bg-muted/40 p-3.5 shadow-inner">
                                        <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/40">
                                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                                                <Smartphone className="w-3.5 h-3.5" />
                                                Push Notification (FCM)
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {camp.channels.includes('push') && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-600">
                                                        <Bell className="w-2.5 h-2.5 mr-1" /> Push
                                                    </span>
                                                )}
                                                {camp.channels.includes('email') && (
                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-600">
                                                        <Mail className="w-2.5 h-2.5 mr-1" /> E-mail
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <p className="text-xs font-bold text-foreground">
                                            {camp.pushTitle}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                            {camp.pushBody}
                                        </p>

                                        {camp.deepLink && (
                                            <div className="mt-2 pt-1.5 border-t border-border/20 flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span className="font-mono text-[10px] truncate max-w-[200px]">
                                                    {camp.deepLink}
                                                </span>
                                                <span className="text-primary text-[10px] font-medium">Ação no App</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status or Countdown */}
                                    <div className="flex items-center justify-between text-xs pt-1">
                                        {camp.status === 'SCHEDULED' ? (
                                            <span className="text-primary font-medium flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                Disparo em: <strong>{formatCountdown(camp.scheduledAt)}</strong>
                                            </span>
                                        ) : camp.status === 'SENT' ? (
                                            <span className="text-emerald-600 font-medium flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                Disparado em {camp.sentAt ? new Date(camp.sentAt).toLocaleDateString('pt-BR') : 'Data recente'}
                                            </span>
                                        ) : (
                                            <span className="text-amber-600 font-medium flex items-center gap-1">
                                                <Pause className="w-3.5 h-3.5" />
                                                Disparo em espera (Pausado)
                                            </span>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 text-xs px-2 gap-1"
                                            onClick={() => setPreviewCampaign(camp)}
                                        >
                                            <Eye className="w-3 h-3" /> Ver Detalhes
                                        </Button>
                                    </div>

                                    {/* Action Bar */}
                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2.5 text-xs gap-1"
                                                onClick={() => handleTogglePause(camp)}
                                                title={camp.status === 'PAUSED' ? 'Retomar agendamento' : 'Pausar agendamento'}
                                            >
                                                {camp.status === 'PAUSED' ? (
                                                    <>
                                                        <Play className="w-3 h-3 text-emerald-500" /> Retomar
                                                    </>
                                                ) : (
                                                    <>
                                                        <Pause className="w-3 h-3 text-amber-500" /> Pausar
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2.5 text-xs gap-1"
                                                onClick={() => setEditCampaign(camp)}
                                            >
                                                <Edit3 className="w-3 h-3" /> Editar
                                            </Button>
                                        </div>

                                        <Button
                                            variant="default"
                                            size="sm"
                                            className="h-8 px-3 text-xs gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                            onClick={() => setTriggerModalCampaign(camp)}
                                        >
                                            <Rocket className="w-3.5 h-3.5" /> Disparar Agora
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <Card className="border border-border/60 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-medium border-b border-border/40">
                                <tr>
                                    <th className="py-3 px-4">Campanha</th>
                                    <th className="py-3 px-4">Data / Horário</th>
                                    <th className="py-3 px-4">Categoria</th>
                                    <th className="py-3 px-4">Canais</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filteredCampaigns.map((camp) => (
                                    <tr key={camp.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="py-3 px-4">
                                            <div className="font-semibold text-foreground">{camp.title}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1 max-w-[280px]">
                                                {camp.pushTitle}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                                            <div className="font-medium text-foreground">
                                                {camp.targetDate.split('-').reverse().join('/')}
                                            </div>
                                            <div className="text-muted-foreground">{camp.targetTime} BRT</div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getCategoryBadge(camp.category)}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                                            <div className="flex items-center gap-1">
                                                {camp.channels.includes('push') && <Badge variant="secondary" className="text-[10px]">Push</Badge>}
                                                {camp.channels.includes('email') && <Badge variant="outline" className="text-[10px]">E-mail</Badge>}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getStatusBadge(camp.status)}
                                        </td>
                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setPreviewCampaign(camp)}
                                                    title="Visualizar"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleTogglePause(camp)}
                                                    title={camp.status === 'PAUSED' ? 'Retomar' : 'Pausar'}
                                                >
                                                    {camp.status === 'PAUSED' ? (
                                                        <Play className="w-4 h-4 text-emerald-500" />
                                                    ) : (
                                                        <Pause className="w-4 h-4 text-amber-500" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => setEditCampaign(camp)}
                                                    title="Editar"
                                                >
                                                    <Edit3 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2.5 text-xs gap-1 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground"
                                                    onClick={() => setTriggerModalCampaign(camp)}
                                                >
                                                    <Rocket className="w-3.5 h-3.5" /> Disparar
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* PREVIEW MODAL */}
            {previewCampaign && (
                <Dialog open={!!previewCampaign} onOpenChange={(open) => !open && setPreviewCampaign(null)}>
                    <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center gap-2">
                                {getCategoryBadge(previewCampaign.category)}
                                {getStatusBadge(previewCampaign.status)}
                            </div>
                            <DialogTitle className="text-xl font-bold mt-1">
                                {previewCampaign.title}
                            </DialogTitle>
                            <DialogDescription>
                                Previsão de envio: <strong>{previewCampaign.targetDate.split('-').reverse().join('/')} às {previewCampaign.targetTime} BRT</strong> &bull; Gatilho: {previewCampaign.triggerReason}
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="push" className="w-full mt-2">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="push" className="gap-2">
                                    <Smartphone className="w-4 h-4" /> Notificação Push
                                </TabsTrigger>
                                <TabsTrigger value="email" className="gap-2">
                                    <Mail className="w-4 h-4" /> Template de E-mail
                                </TabsTrigger>
                            </TabsList>

                            {/* Push Preview */}
                            <TabsContent value="push" className="pt-4">
                                <div className="max-w-md mx-auto bg-slate-950 p-6 rounded-[36px] shadow-2xl border-4 border-slate-800 text-white">
                                    {/* Phone notch */}
                                    <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-4" />

                                    <div className="flex items-center justify-between text-[11px] text-slate-400 mb-4 px-2">
                                        <span>09:41</span>
                                        <span>5G • 100%</span>
                                    </div>

                                    {/* Push Notification Card */}
                                    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/60 rounded-2xl p-4 shadow-xl">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                                                    🛡️
                                                </div>
                                                <span className="text-xs font-semibold text-slate-200">Guardião Nacional</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400">Agora</span>
                                        </div>

                                        <h4 className="text-sm font-bold text-white leading-tight">
                                            {previewCampaign.pushTitle}
                                        </h4>
                                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                                            {previewCampaign.pushBody}
                                        </p>

                                        {previewCampaign.deepLink && (
                                            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                                <span>Ação ao tocar</span>
                                                <span className="text-blue-400 font-mono">{previewCampaign.deepLink}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="text-center mt-6 text-[11px] text-slate-500">
                                        Toque na notificação abre o Guardião no destino programado.
                                    </div>
                                </div>
                            </TabsContent>

                            {/* Email Preview */}
                            <TabsContent value="email" className="pt-4">
                                <div className="border border-border rounded-xl p-4 bg-background">
                                    <div className="border-b pb-3 mb-4 space-y-1">
                                        <div className="text-xs text-muted-foreground">
                                            <strong>Assunto:</strong> {previewCampaign.emailSubject}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                            <strong>Pré-cabeçalho:</strong> {previewCampaign.emailPreview}
                                        </div>
                                    </div>

                                    {/* Email Container */}
                                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-6 max-h-[400px] overflow-y-auto border border-border/40">
                                        <div
                                            className="prose dark:prose-invert max-w-none text-sm"
                                            dangerouslySetInnerHTML={{ __html: previewCampaign.emailHtml }}
                                        />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-4 gap-2">
                            <Button variant="outline" onClick={() => setPreviewCampaign(null)}>
                                Fechar
                            </Button>
                            <Button
                                className="gap-1.5"
                                onClick={() => {
                                    const target = previewCampaign;
                                    setPreviewCampaign(null);
                                    setTriggerModalCampaign(target);
                                }}
                            >
                                <Rocket className="w-4 h-4" /> Disparar Imediatamente
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* EDIT CAMPAIGN MODAL */}
            {editCampaign && (
                <Dialog open={!!editCampaign} onOpenChange={(open) => !open && setEditCampaign(null)}>
                    <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle className="text-lg font-bold">Editar Campanha Programada</DialogTitle>
                            <DialogDescription>
                                Ajuste horários, títulos, copy da notificação push ou conteúdo do e-mail.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Data de Disparo (YYYY-MM-DD)</Label>
                                    <Input
                                        type="date"
                                        value={editCampaign.targetDate}
                                        onChange={(e) => setEditCampaign({ ...editCampaign, targetDate: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Horário de Disparo (HH:mm - Brasília)</Label>
                                    <Input
                                        type="time"
                                        value={editCampaign.targetTime}
                                        onChange={(e) => setEditCampaign({ ...editCampaign, targetTime: e.target.value })}
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs">Título Interno da Campanha</Label>
                                <Input
                                    value={editCampaign.title}
                                    onChange={(e) => setEditCampaign({ ...editCampaign, title: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Categoria Cívica</Label>
                                    <Select
                                        value={editCampaign.category}
                                        onValueChange={(val: any) => setEditCampaign({ ...editCampaign, category: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="comunidade">Comunidade</SelectItem>
                                            <SelectItem value="infraestrutura">Infraestrutura</SelectItem>
                                            <SelectItem value="mobilidade">Mobilidade</SelectItem>
                                            <SelectItem value="segurança">Segurança</SelectItem>
                                            <SelectItem value="cívico">Cívico</SelectItem>
                                            <SelectItem value="institucional">Institucional</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label className="text-xs">Deep Link no App</Label>
                                    <Input
                                        value={editCampaign.deepLink || ''}
                                        onChange={(e) => setEditCampaign({ ...editCampaign, deepLink: e.target.value })}
                                        placeholder="guardiao://report/new"
                                        className="mt-1"
                                    />
                                </div>
                            </div>

                            <div className="border-t pt-3">
                                <Label className="text-xs font-semibold text-primary">Título da Notificação Push</Label>
                                <Input
                                    value={editCampaign.pushTitle}
                                    onChange={(e) => setEditCampaign({ ...editCampaign, pushTitle: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-primary">Corpo da Notificação Push (Curto e direto)</Label>
                                <Textarea
                                    rows={3}
                                    value={editCampaign.pushBody}
                                    onChange={(e) => setEditCampaign({ ...editCampaign, pushBody: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div className="border-t pt-3">
                                <Label className="text-xs font-semibold text-amber-600">Assunto do E-mail</Label>
                                <Input
                                    value={editCampaign.emailSubject}
                                    onChange={(e) => setEditCampaign({ ...editCampaign, emailSubject: e.target.value })}
                                    className="mt-1"
                                />
                            </div>

                            <div>
                                <Label className="text-xs font-semibold text-amber-600">HTML do E-mail</Label>
                                <Textarea
                                    rows={5}
                                    value={editCampaign.emailHtml}
                                    onChange={(e) => setEditCampaign({ ...editCampaign, emailHtml: e.target.value })}
                                    className="mt-1 font-mono text-xs"
                                />
                            </div>
                        </div>

                        <DialogFooter className="gap-2">
                            <Button variant="outline" onClick={() => setEditCampaign(null)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveEdit}>
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* MANUAL TRIGGER CONFIRMATION MODAL */}
            {triggerModalCampaign && (
                <Dialog open={!!triggerModalCampaign} onOpenChange={(open) => !open && !isTriggering && setTriggerModalCampaign(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
                                <Rocket className="w-6 h-6" />
                            </div>
                            <DialogTitle className="text-center text-lg font-bold">
                                Disparar Campanha Agora?
                            </DialogTitle>
                            <DialogDescription className="text-center text-sm">
                                Esta ação enviará a notificação push imediatamente para todos os dispositivos e enfileirará o e-mail oficial da campanha.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="p-3.5 bg-muted/40 rounded-lg border text-xs space-y-2 my-2">
                            <div>
                                <strong className="text-foreground">Campanha:</strong> {triggerModalCampaign.title}
                            </div>
                            <div>
                                <strong className="text-foreground">Push:</strong> {triggerModalCampaign.pushTitle}
                            </div>
                            <div>
                                <strong className="text-foreground">E-mail:</strong> {triggerModalCampaign.emailSubject}
                            </div>
                            <div>
                                <strong className="text-foreground">Canais:</strong> {triggerModalCampaign.channels.join(', ')}
                            </div>
                        </div>

                        <DialogFooter className="gap-2 mt-2">
                            <Button
                                variant="outline"
                                onClick={() => setTriggerModalCampaign(null)}
                                disabled={isTriggering}
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="gap-1.5 bg-primary text-primary-foreground font-semibold"
                                onClick={handleConfirmTriggerNow}
                                disabled={isTriggering}
                            >
                                {isTriggering ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" /> Disparando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" /> Confirmar e Enviar Agora
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
};

export default AdminScheduledCampaigns;
