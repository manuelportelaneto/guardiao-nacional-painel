/**
 * @fileoverview War Room & Gestão de Crises em Tempo Real (`WarRoom.tsx`).
 * 
 * Central tática para Defesa Civil, Prefeitos e Secretários:
 * - Monitoramento hidrológico das bacias do ABC Paulista e SP (Tamanduateí, Meninos, Couros, etc.)
 * - Alertas oficiais do INMET e Defesa Civil Nacional
 * - Despacho de equipes de campo e viaturas com controle de status
 * - Acionamento de sirenes comunitárias e ordens de evacuação preventiva
 */

import React, { useEffect, useState } from 'react';
import { useScope } from '../../context/ScopeContext';
import { useAuth } from '../../context/AuthContext';
import { civilDefenseService } from '../../services/civilDefenseService';
import type {
    OfficialCivilDefenseAlert,
    CriticalFloodPoint,
    GeologicalRiskArea,
    TrafficIncident,
    FieldTeam,
    FieldTeamStatus,
    CrisisReadinessLevel
} from '../../types/civilDefense';
import {
    ShieldAlert,
    Waves,
    Mountain,
    Truck,
    Car,
    BellRing,
    RefreshCw,
    Radio
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

export const WarRoom: React.FC = () => {
    const { scope } = useScope();
    const { currentUser } = useAuth();

    // Estado da Sala de Crise
    const [readinessLevel, setReadinessLevel] = useState<CrisisReadinessLevel>('ATENCAO');
    const [refreshing, setRefreshing] = useState(false);

    // Dados de Monitoramento
    const [alerts, setAlerts] = useState<OfficialCivilDefenseAlert[]>([]);
    const [floodPoints, setFloodPoints] = useState<CriticalFloodPoint[]>([]);
    const [geologicalAreas, setGeologicalAreas] = useState<GeologicalRiskArea[]>([]);
    const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
    const [fieldTeams, setFieldTeams] = useState<FieldTeam[]>([]);

    // Modais
    const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
    const [selectedTeamToDispatch, setSelectedTeamToDispatch] = useState<FieldTeam | null>(null);
    const [dispatchLocation, setDispatchLocation] = useState('');
    const [dispatchReason, setDispatchReason] = useState('');
    const [dispatching, setDispatching] = useState(false);

    const [isSirenModalOpen, setIsSirenModalOpen] = useState(false);
    const [sirenRadius, setSirenRadius] = useState(1000);
    const [sirenMessage, setSirenMessage] = useState('ATENÇÃO DEFESA CIVIL: Risco iminente de alagamento e inundação na bacia local. Busque locais elevados imediatamente.');
    const [triggeringSiren, setTriggeringSiren] = useState(false);

    // Carregamento de Dados da Jurisdição
    const loadCrisisData = async () => {
        setRefreshing(true);
        try {
            const cityId = scope.cityId || undefined;
            const state = scope.state || undefined;
            const cityName = scope.cityName || undefined;

            const [alertsData, floodData, geoData, trafficData, teamsData] = await Promise.all([
                civilDefenseService.getAlertsForScope(state, cityName),
                Promise.resolve(civilDefenseService.getCriticalFloodPoints(cityId)),
                Promise.resolve(civilDefenseService.getGeologicalRiskAreas(cityId)),
                Promise.resolve(civilDefenseService.getLiveTrafficIncidents(cityId)),
                civilDefenseService.getFieldTeamsForScope(cityId)
            ]);

            setAlerts(alertsData);
            setFloodPoints(floodData);
            setGeologicalAreas(geoData);
            setTrafficIncidents(trafficData);
            setFieldTeams(teamsData);

            // Ajuste automático do nível de prontidão baseado no risco máximo
            const maxFloodRisk = Math.max(...floodData.map(p => p.riskLevel), 1);
            if (maxFloodRisk >= 5) setReadinessLevel('ALERTA');
            else if (maxFloodRisk >= 4) setReadinessLevel('ATENCAO');
        } catch (e) {
            console.error('Erro ao carregar dados da War Room:', e);
            toast.error('Erro ao atualizar feeds de crise.');
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadCrisisData();
        const interval = setInterval(loadCrisisData, 30000); // Atualiza a cada 30 segundos
        return () => clearInterval(interval);
    }, [scope.cityId, scope.state]);

    // Ações de Despacho
    const handleOpenDispatch = (team: FieldTeam, defaultLocation?: string) => {
        setSelectedTeamToDispatch(team);
        setDispatchLocation(defaultLocation || team.assignedLocation || '');
        setDispatchReason('Prevenção de transbordamento e desobstrução de via');
        setIsDispatchModalOpen(true);
    };

    const handleConfirmDispatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTeamToDispatch) return;

        setDispatching(true);
        try {
            await civilDefenseService.dispatchFieldTeam(
                selectedTeamToDispatch.id,
                dispatchLocation,
                dispatchReason,
                currentUser?.uid || 'sysadmin'
            );
            toast.success(`Viatura ${selectedTeamToDispatch.code} despachada para ${dispatchLocation}!`);
            setIsDispatchModalOpen(false);
            loadCrisisData();
        } catch (e) {
            toast.error('Erro ao despachar equipe.');
        } finally {
            setDispatching(false);
        }
    };

    const handleUpdateTeamStatus = async (teamId: string, newStatus: FieldTeamStatus) => {
        try {
            await civilDefenseService.updateTeamStatus(teamId, newStatus, currentUser?.uid || 'sysadmin');
            toast.success(`Status da equipe atualizado para ${newStatus}`);
            loadCrisisData();
        } catch (e) {
            toast.error('Erro ao atualizar status da equipe.');
        }
    };

    const handleTriggerSiren = async () => {
        setTriggeringSiren(true);
        try {
            const res = await civilDefenseService.triggerEmergencyEvacuationSiren(
                scope.cityName || 'Jurisdição Local',
                sirenRadius,
                sirenMessage,
                currentUser?.uid || 'sysadmin'
            );
            toast.success(`🚨 ALERTA GERAL EMITIDO! ${res.sirensCount} sirenes acionadas em raio de ${sirenRadius}m.`);
            setIsSirenModalOpen(false);
            setReadinessLevel('EMERGENCIA_CALAMIDADE');
        } catch (e) {
            toast.error('Erro ao emitir alerta de evacuação.');
        } finally {
            setTriggeringSiren(false);
        }
    };

    const getReadinessBadge = () => {
        switch (readinessLevel) {
            case 'VIGILANCIA':
                return <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs px-3 py-1 font-bold">🟢 VIGILÂNCIA ORDINÁRIA</Badge>;
            case 'ATENCAO':
                return <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs px-3 py-1 font-bold animate-pulse">🟡 ESTADO DE ATENÇÃO</Badge>;
            case 'ALERTA':
                return <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs px-3 py-1 font-bold animate-pulse">🟠 ESTADO DE ALERTA MÁXIMO</Badge>;
            case 'EMERGENCIA_CALAMIDADE':
                return <Badge className="bg-red-600 text-white border border-red-500 text-xs px-3 py-1 font-bold animate-bounce">🔴 CALAMIDADE / EVACUAÇÃO</Badge>;
        }
    };

    return (
        <div className="space-y-6 pb-12">
            {/* Header da War Room */}
            <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl text-white shadow-xl flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
                            <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
                            WAR ROOM & GESTÃO DE CRISES
                        </h1>
                        {getReadinessBadge()}
                    </div>
                    <p className="text-slate-400 text-xs sm:text-sm">
                        Comando tático integrado: Monitoramento hidrológico do ABC/SP, alertas do INMET e despacho de equipes da Defesa Civil.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {/* Seletor Rápido de Prontidão */}
                    <Select value={readinessLevel} onValueChange={(val: any) => setReadinessLevel(val)}>
                        <SelectTrigger className="w-[180px] bg-slate-900 border-slate-700 text-white text-xs h-9">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-700 text-white z-[9999]">
                            <SelectItem value="VIGILANCIA">🟢 Vigilância</SelectItem>
                            <SelectItem value="ATENCAO">🟡 Atenção</SelectItem>
                            <SelectItem value="ALERTA">🟠 Alerta Máximo</SelectItem>
                            <SelectItem value="EMERGENCIA_CALAMIDADE">🔴 Calamidade</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button
                        size="sm"
                        variant="outline"
                        onClick={loadCrisisData}
                        disabled={refreshing}
                        className="bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800 text-xs h-9 gap-1.5"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>

                    <Button
                        size="sm"
                        onClick={() => setIsSirenModalOpen(true)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs h-9 font-bold gap-1.5 shadow-lg shadow-red-900/40"
                    >
                        <BellRing className="w-3.5 h-3.5 animate-bounce" /> Acionar Sirene / Evacuação
                    </Button>
                </div>
            </div>

            {/* Painel de Indicadores Críticos em Tempo Real */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-400">Pontos de Alagamento</CardTitle>
                        <Waves className="w-4 h-4 text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-blue-400">
                            {floodPoints.filter(p => p.currentStatus !== 'NORMAL').length} <span className="text-xs text-slate-500 font-normal">/ {floodPoints.length} monitorados</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {floodPoints.some(p => p.currentStatus === 'EMERGENCIA') ? '🚨 Transbordamento ativo registrado' : 'Níveis sob monitoramento preventivo'}
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-400">Encostas & Saturação Solo</CardTitle>
                        <Mountain className="w-4 h-4 text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-amber-400">
                            {geologicalAreas.filter(g => g.soilSaturationPercent >= 50).length} <span className="text-xs text-slate-500 font-normal">/ {geologicalAreas.length} encostas</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            CEMADEN: Saturação média em {Math.round(geologicalAreas.reduce((acc, g) => acc + g.soilSaturationPercent, 0) / (geologicalAreas.length || 1))}%
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-400">Equipes em Campo</CardTitle>
                        <Truck className="w-4 h-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-emerald-400">
                            {fieldTeams.filter(t => t.status === 'EM_ATENDIMENTO' || t.status === 'DESLOCANDO').length} <span className="text-xs text-slate-500 font-normal">/ {fieldTeams.length} viaturas</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            {fieldTeams.filter(t => t.status === 'DISPONIVEL').length} viaturas disponíveis para despacho imediato
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-slate-800 text-white shadow-md">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold text-slate-400">Alertas Oficiais Vigentes</CardTitle>
                        <Radio className="w-4 h-4 text-red-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-black text-red-400">
                            {alerts.length} <span className="text-xs text-slate-500 font-normal">avisos INMET/Defesa Civil</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Severidade: {alerts[0]?.severity.replace('_', ' ') || 'Normalidade'}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs de Operação Tática */}
            <Tabs defaultValue="floods" className="space-y-4">
                <TabsList className="bg-slate-900 border border-slate-800 p-1 text-slate-300">
                    <TabsTrigger value="floods" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white text-xs gap-1.5">
                        <Waves className="w-3.5 h-3.5" /> Hidrologia & Alagamentos ({floodPoints.length})
                    </TabsTrigger>
                    <TabsTrigger value="slopes" className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-xs gap-1.5">
                        <Mountain className="w-3.5 h-3.5" /> Encostas & Deslizamentos ({geologicalAreas.length})
                    </TabsTrigger>
                    <TabsTrigger value="teams" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-xs gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Despacho de Equipes ({fieldTeams.length})
                    </TabsTrigger>
                    <TabsTrigger value="traffic" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-xs gap-1.5">
                        <Car className="w-3.5 h-3.5" /> Mobilidade & Trânsito ({trafficIncidents.length})
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="data-[state=active]:bg-red-600 data-[state=active]:text-white text-xs gap-1.5">
                        <Radio className="w-3.5 h-3.5" /> Alertas INMET ({alerts.length})
                    </TabsTrigger>
                </TabsList>

                {/* ─── ABA 1: HIDROLOGIA E PONTOS DE ALAGAMENTO ─── */}
                <TabsContent value="floods" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {floodPoints.map((point) => (
                            <Card key={point.id} className="bg-slate-900 border-slate-800 text-white shadow-md hover:border-blue-500/50 transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/40 mb-1">
                                                {point.cityName} - {point.state}
                                            </Badge>
                                            <CardTitle className="text-sm font-bold text-slate-100">{point.name}</CardTitle>
                                            <CardDescription className="text-xs text-slate-400">{point.riverOrBasin}</CardDescription>
                                        </div>
                                        <Badge className={`${point.currentStatus === 'EMERGENCIA' ? 'bg-red-600' : (point.currentStatus === 'ATENCAO' ? 'bg-amber-600' : 'bg-emerald-600')} text-[10px] uppercase`}>
                                            {point.currentStatus}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Cota Crítica:</span>
                                            <span className="font-bold text-blue-300">{point.criticalWaterLevelCm} cm</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Histórico de Alagamentos:</span>
                                            <span className="font-bold text-slate-200">{point.historicFloodCount} episódios</span>
                                        </div>
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Risco Estrutural:</span>
                                            <span className="font-bold text-red-400">Nível {point.riskLevel} de 5</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400">{point.neighborhood}</span>
                                        <Button
                                            size="sm"
                                            onClick={() => {
                                                const availableTeam = fieldTeams.find(t => t.cityId === point.cityId && t.status === 'DISPONIVEL') || fieldTeams[0];
                                                handleOpenDispatch(availableTeam, `${point.name} (${point.cityName})`);
                                            }}
                                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-7 gap-1 font-semibold"
                                        >
                                            <Truck className="w-3 h-3" /> Despachar Equipe
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 2: ENCOSTAS E RISCO GEOLÓGICO ─── */}
                <TabsContent value="slopes" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {geologicalAreas.map((area) => (
                            <Card key={area.id} className="bg-slate-900 border-slate-800 text-white shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/40 mb-1">
                                                {area.cityName} - {area.neighborhood}
                                            </Badge>
                                            <CardTitle className="text-sm font-bold text-slate-100">{area.name}</CardTitle>
                                        </div>
                                        <Badge className={`${area.vulnerabilityLevel === 'MUITO_ALTA' || area.vulnerabilityLevel === 'ALTA' ? 'bg-red-600' : 'bg-amber-600'} text-[10px]`}>
                                            {area.vulnerabilityLevel}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-[11px]">
                                            <span className="text-slate-400">Saturação do Solo:</span>
                                            <span className={`font-bold ${area.soilSaturationPercent >= 60 ? 'text-red-400' : 'text-amber-400'}`}>{area.soilSaturationPercent}%</span>
                                        </div>
                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${area.soilSaturationPercent >= 60 ? 'bg-red-500' : 'bg-amber-500'}`}
                                                style={{ width: `${area.soilSaturationPercent}%` }}
                                            />
                                        </div>
                                        <p className="text-[11px] text-slate-400 italic pt-1 leading-relaxed">
                                            "{area.threatDescription}"
                                        </p>
                                    </div>
                                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500">
                                        <span>Órgão: {area.monitoredBy}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 3: DESPACHO TÁTICO DE EQUIPES DE CAMPO ─── */}
                <TabsContent value="teams" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {fieldTeams.map((team) => (
                            <Card key={team.id} className="bg-slate-900 border-slate-800 text-white shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 bg-slate-800 rounded-lg text-emerald-400 font-mono font-bold text-sm">
                                                {team.code}
                                            </div>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-slate-100">{team.name}</CardTitle>
                                                <CardDescription className="text-xs text-slate-400">
                                                    {team.cityName} • Líder: {team.leaderName} ({team.operatorCount} operadores)
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className={`${team.status === 'DISPONIVEL' ? 'bg-emerald-600' : (team.status === 'EM_ATENDIMENTO' ? 'bg-red-600' : 'bg-amber-600')} text-[10px] uppercase`}>
                                            {team.status.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Posição / Local Atual:</span>
                                        <span className="text-slate-200 font-semibold">{team.assignedLocation || 'Base Central'}</span>
                                        <p className="text-[11px] text-slate-400 italic mt-0.5">{team.lastStatusUpdate}</p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[10px] text-slate-400 block uppercase font-mono">Equipamentos a Bordo:</span>
                                        <div className="flex flex-wrap gap-1">
                                            {team.equipment.map((eq, i) => (
                                                <span key={i} className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                                                    {eq}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUpdateTeamStatus(team.id, 'DISPONIVEL')}
                                                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-[10px] h-7"
                                            >
                                                Liberar Base
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleUpdateTeamStatus(team.id, 'EM_ATENDIMENTO')}
                                                className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 text-[10px] h-7"
                                            >
                                                Atendimento
                                            </Button>
                                        </div>

                                        <Button
                                            size="sm"
                                            onClick={() => handleOpenDispatch(team)}
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 gap-1 font-semibold"
                                        >
                                            <Radio className="w-3 h-3" /> Despachar Viatura
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 4: MOBILIDADE E TRÂNSITO ─── */}
                <TabsContent value="traffic" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trafficIncidents.map((inc) => (
                            <Card key={inc.id} className="bg-slate-900 border-slate-800 text-white shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <Badge variant="outline" className="text-[10px] text-indigo-400 border-indigo-500/40 mb-1">
                                                {inc.city} - {inc.state}
                                            </Badge>
                                            <CardTitle className="text-sm font-bold text-slate-100">{inc.title}</CardTitle>
                                        </div>
                                        <Badge className={`${inc.severity === 'BLOQUEIO_TOTAL' ? 'bg-red-600' : 'bg-amber-600'} text-[10px]`}>
                                            {inc.severity.replace('_', ' ')}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                    <p className="text-slate-300 leading-relaxed">{inc.description}</p>
                                    <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                                        <span>Impacto: +{inc.delayMinutes} min de atraso</span>
                                        <span>Reportado: {new Date(inc.reportedAt).toLocaleTimeString('pt-BR')}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 5: ALERTAS OFICIAIS DO INMET ─── */}
                <TabsContent value="alerts" className="space-y-4">
                    <div className="space-y-3">
                        {alerts.map((al) => (
                            <Card key={al.id} className="bg-slate-900 border-slate-800 text-white shadow-md">
                                <CardHeader className="pb-2">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{al.icon}</span>
                                            <div>
                                                <CardTitle className="text-sm font-bold text-slate-100">{al.title}</CardTitle>
                                                <CardDescription className="text-xs text-slate-400">Fonte Oficial: {al.source}</CardDescription>
                                            </div>
                                        </div>
                                        <Badge className="bg-red-600 text-white text-[10px]">
                                            {al.severity}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs">
                                    <p className="text-slate-300 leading-relaxed">{al.description}</p>
                                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1">
                                        <span className="text-[10px] text-amber-400 font-bold uppercase block">Instruções à População:</span>
                                        <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                                            {al.instructions.map((ins, idx) => (
                                                <li key={idx}>{ins}</li>
                                            ))}
                                        </ul>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>

            {/* ─── MODAL DE DESPACHO DE VIATURA / EQUIPE ─── */}
            <Dialog open={isDispatchModalOpen} onOpenChange={setIsDispatchModalOpen}>
                <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-white">
                            <Truck className="w-5 h-5 text-emerald-500" />
                            Despachar Viatura de Campo
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Envie a equipe tática com prioridade de atendimento e geolocalização da ocorrência.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedTeamToDispatch && (
                        <form onSubmit={handleConfirmDispatch} className="space-y-3 py-2">
                            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                                <span className="text-xs font-bold text-emerald-400 block">{selectedTeamToDispatch.name} ({selectedTeamToDispatch.code})</span>
                                <span className="text-[11px] text-slate-400">Líder: {selectedTeamToDispatch.leaderName} • {selectedTeamToDispatch.operatorCount} Operadores</span>
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300">Ponto de Destino / Endereço Crítico *</Label>
                                <Input
                                    required
                                    value={dispatchLocation}
                                    onChange={e => setDispatchLocation(e.target.value)}
                                    className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                                    placeholder="Ex: Av. dos Estados / Craisa - Santo André"
                                />
                            </div>

                            <div>
                                <Label className="text-xs text-slate-300">Ordem de Operação / Motivo *</Label>
                                <Input
                                    required
                                    value={dispatchReason}
                                    onChange={e => setDispatchReason(e.target.value)}
                                    className="bg-slate-950 border-slate-700 text-white text-xs mt-1"
                                    placeholder="Ex: Resgate de ilhados e bloqueio de tráfego"
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={() => setIsDispatchModalOpen(false)} className="bg-slate-800 border-slate-700 text-slate-300 text-xs">
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={dispatching} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                                    {dispatching ? 'Despachando...' : 'Confirmar e Despachar'}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ─── MODAL DE ACIONAMENTO DE SIRENE E EVACUAÇÃO ─── */}
            <Dialog open={isSirenModalOpen} onOpenChange={setIsSirenModalOpen}>
                <DialogContent className="bg-slate-950 border-red-800/80 text-white max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-400 text-lg font-black">
                            <BellRing className="w-6 h-6 animate-bounce text-red-500" />
                            ACIONAMENTO DE SIRENE & ORDEM DE EVACUAÇÃO
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-xs">
                            Este comando acionará o sinal sonoro de emergência nas sirenes comunitárias e enviará push broadcast com som de alerta para todos os cidadãos na área de risco.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="p-3 bg-red-950/40 border border-red-500/50 rounded-xl space-y-1">
                            <span className="text-xs font-bold text-red-300 flex items-center gap-1">
                                ⚠️ Protocolo de Calamidade e Defesa Civil:
                            </span>
                            <p className="text-[11px] text-red-200/90 leading-relaxed">
                                Use apenas em cenários de risco iminente de colapso de barragem, deslizamento de terra com vítimas potenciais ou transbordamento severo de rios.
                            </p>
                        </div>

                        <div>
                            <Label className="text-xs text-slate-300">Raio de Abrangência do Alerta</Label>
                            <Select value={sirenRadius.toString()} onValueChange={(val) => setSirenRadius(parseInt(val, 10))}>
                                <SelectTrigger className="bg-slate-900 border-slate-700 text-white text-xs mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-700 text-white z-[9999]">
                                    <SelectItem value="500">500 metros (Área local concentrada)</SelectItem>
                                    <SelectItem value="1000">1.000 metros (Bairro / Bacia hidrográfica)</SelectItem>
                                    <SelectItem value="2500">2.500 metros (Região expandida)</SelectItem>
                                    <SelectItem value="5000">5.000 metros (Perímetro municipal amplo)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label className="text-xs text-slate-300">Mensagem Oficial de Evacuação</Label>
                            <Input
                                value={sirenMessage}
                                onChange={e => setSirenMessage(e.target.value)}
                                className="bg-slate-900 border-slate-700 text-white text-xs mt-1"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={() => setIsSirenModalOpen(false)} className="bg-slate-900 border-slate-700 text-slate-300 text-xs">
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={handleTriggerSiren}
                            disabled={triggeringSiren}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-lg shadow-red-900/60"
                        >
                            {triggeringSiren ? 'Disparando...' : 'CONFIRMAR ACIONAMENTO GERAL'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default WarRoom;
