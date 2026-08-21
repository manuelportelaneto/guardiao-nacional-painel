/**
 * @fileoverview Central de Observabilidade, SRE e Auto-Cura (`AdminSREControl.tsx`).
 * 
 * Permite ao SysAdmin monitorar em tempo real a latência de microserviços,
 * taxas de erros, logs de intrusão e disparar ações corretivas de auto-recuperação (Self-Healing).
 */

import React, { useState, useEffect } from 'react';
import {
    Activity,
    CheckCircle2,
    AlertTriangle,
    XCircle,
    RefreshCw,
    Wrench,
    RotateCcw,
    Database,
    BellRing,
    Trash2,
    Server
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from 'sonner';
import { sreService } from '../../services/sreService';
import { useAuth } from '../../context/AuthContext';
import type { ServiceHealthStatus, SREMetrics } from '../../types/scope';

export const AdminSREControl: React.FC = () => {
    const { currentUser } = useAuth();
    const [, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [metrics, setMetrics] = useState<SREMetrics | null>(null);
    const [healingAction, setHealingAction] = useState<string | null>(null);

    useEffect(() => {
        loadMetrics();
        const interval = setInterval(loadMetrics, 20000); // Atualiza a cada 20s
        return () => clearInterval(interval);
    }, []);

    const loadMetrics = async () => {
        try {
            const data = await sreService.getSREMetrics();
            setMetrics(data);
        } catch (error) {
            console.warn('Erro ao carregar métricas SRE:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadMetrics();
        setRefreshing(false);
        toast.success('Métricas de saúde e latência atualizadas.');
    };

    // ─── Disparadores de Auto-Cura ───────────────────────────────────────────
    const handleRecalculateCounters = async () => {
        if (!currentUser) return;
        setHealingAction('counters');
        try {
            const res = await sreService.recalculateCityCounters(currentUser.uid);
            toast.success(`Contadores de ${res.updatedCities} cidades sincronizados com sucesso!`);
            loadMetrics();
        } catch (e: any) {
            toast.error('Erro ao recalcular contadores: ' + e?.message);
        } finally {
            setHealingAction(null);
        }
    };

    const handleRetryNotifications = async () => {
        if (!currentUser) return;
        setHealingAction('notifications');
        try {
            const res = await sreService.retryFailedNotifications(currentUser.uid);
            toast.success(`Fila reprocessada! ${res.retried} mensagens reenfileiradas.`);
            loadMetrics();
        } catch (e: any) {
            toast.error('Erro ao reprocessar fila: ' + e?.message);
        } finally {
            setHealingAction(null);
        }
    };

    const handleFlushCaches = async () => {
        if (!currentUser) return;
        setHealingAction('cache');
        try {
            await sreService.flushSystemCaches(currentUser.uid);
            toast.success('Caches do sistema purgados com sucesso.');
            loadMetrics();
        } catch (e: any) {
            toast.error('Erro ao purgar cache: ' + e?.message);
        } finally {
            setHealingAction(null);
        }
    };

    const getStatusIcon = (status: ServiceHealthStatus['status']) => {
        switch (status) {
            case 'healthy':
                return <CheckCircle2 className="w-5 h-5 text-green-500" />;
            case 'degraded':
                return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
            case 'down':
                return <XCircle className="w-5 h-5 text-red-500" />;
            default:
                return <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Activity className="h-8 w-8 text-emerald-600" />
                        Observabilidade, SRE & Auto-Cura
                    </h1>
                    <p className="text-slate-500">
                        Monitoramento contínuo de latência, disponibilidade de infraestrutura e centro de correção de falhas em um clique.
                    </p>
                </div>
                <Button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    variant="outline"
                    className="gap-2 self-start md:self-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Verificar Agora
                </Button>
            </div>

            {/* KPIs Rápidos de SRE */}
            {metrics && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Uso de Storage / Banco</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{metrics.storageUsageGB} GB <span className="text-xs text-slate-400 font-normal">/ {metrics.storageQuotaGB} GB</span></div>
                            <Progress value={(metrics.storageUsageGB / metrics.storageQuotaGB) * 100} className="h-2 mt-2" />
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Erros Registrados (24h)</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{metrics.errorRate24h}</div>
                            <p className="text-xs text-emerald-600 mt-1">Taxa de erro &lt; 0.1% das requisições</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Falhas / Crashes Ativos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-slate-900">{metrics.unresolvedCrashes}</div>
                            <p className="text-xs text-slate-400 mt-1">Ocorrências no App Mobile</p>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Usuários Ativos Estimados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600 flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                                </span>
                                {metrics.activeUsersNow}
                            </div>
                            <p className="text-xs text-slate-400 mt-1">Conectados neste momento</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Painel de Auto-Cura (Self-Healing Command Center) */}
            <Card className="border-emerald-200 bg-emerald-50/30">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-emerald-600" />
                        Centro de Ações Corretivas & Auto-Cura (Self-Healing)
                    </CardTitle>
                    <CardDescription>
                        Execute correções estruturais imediatas sem necessidade de acessar o terminal de servidores ou escrever código.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                                <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                    <Database className="w-4 h-4 text-blue-600" /> Recalcular Contadores
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Varre todas as ocorrências e ressincroniza os contadores agregados de cada cidade no banco.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleRecalculateCounters}
                                disabled={healingAction === 'counters'}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 text-xs"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${healingAction === 'counters' ? 'animate-spin' : ''}`} />
                                Sincronizar Cidades
                            </Button>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                                <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                    <BellRing className="w-4 h-4 text-amber-600" /> Destravar Fila de Mensagens
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Reprocessa e-mails Brevo e push notifications que falharam por timeout ou instabilidade de rede.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleRetryNotifications}
                                disabled={healingAction === 'notifications'}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 text-xs"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${healingAction === 'notifications' ? 'animate-spin' : ''}`} />
                                Reprocessar Fila
                            </Button>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between space-y-3">
                            <div>
                                <h4 className="font-semibold text-sm text-slate-900 flex items-center gap-2">
                                    <Trash2 className="w-4 h-4 text-purple-600" /> Limpeza de Caches
                                </h4>
                                <p className="text-xs text-slate-500 mt-1">
                                    Invalida caches em memória, limpa sessões inativas e atualiza dados estáticos em cache.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                onClick={handleFlushCaches}
                                disabled={healingAction === 'cache'}
                                className="w-full bg-slate-900 hover:bg-slate-800 text-white gap-2 text-xs"
                            >
                                <RotateCcw className={`w-3.5 h-3.5 ${healingAction === 'cache' ? 'animate-spin' : ''}`} />
                                Purgar Caches
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Matriz de Saúde dos Nós de Infraestrutura */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Server className="w-5 h-5 text-blue-600" />
                        Status Operacional dos Microserviços
                    </CardTitle>
                    <CardDescription>Latência medida em tempo real e integridade funcional de cada subsistema.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metrics?.services.map((srv) => (
                            <div key={srv.service} className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        {getStatusIcon(srv.status)}
                                        <div>
                                            <h4 className="font-semibold text-sm text-slate-900">{srv.name}</h4>
                                            <p className="text-xs text-slate-400">{srv.message}</p>
                                        </div>
                                    </div>
                                    <Badge variant={srv.status === 'healthy' ? 'default' : 'destructive'} className="text-xs">
                                        {srv.latencyMs}ms
                                    </Badge>
                                </div>
                                <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                                    <span>Status: <strong className="uppercase text-slate-700">{srv.status}</strong></span>
                                    <span>Último teste: {new Date(srv.lastCheck).toLocaleTimeString('pt-BR')}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminSREControl;
