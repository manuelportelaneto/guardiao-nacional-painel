import React, { useState, useEffect, useMemo } from 'react';
import {
    ShieldAlert, AlertTriangle, CloudRain, Wind, Waves, Mountain,
    RefreshCw, Filter, CheckCircle2, Clock, MapPin, Building,
    Calendar, ArrowRight, BellOff, Siren, Search, ExternalLink, Check
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../ui/card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Badge } from '../../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { civilDefenseService } from '../../../services/civilDefenseService';
import type { OfficialCivilDefenseAlert } from '../../../types/civilDefense';
import { useScope } from '../../../context/ScopeContext';
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebaseConfig';
import { toast } from 'sonner';

interface CivilDefenseAlertQueueProps {
    onSelectAlertForDispatch: (alert: OfficialCivilDefenseAlert) => void;
}

interface ActiveEmergencyMessage {
    id: string;
    title: string;
    body?: string;
    createdAt?: any;
    expiresAt?: any;
    status?: string;
}

export const CivilDefenseAlertQueue: React.FC<CivilDefenseAlertQueueProps> = ({ onSelectAlertForDispatch }) => {
    const { scope, isNational, availableStates } = useScope();
    const activeCityName = scope.cityName;
    const activeState = scope.state;

    const [alerts, setAlerts] = useState<OfficialCivilDefenseAlert[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterSource, setFilterSource] = useState<string>('ALL');
    const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
    const [filterState, setFilterState] = useState<string>('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Alertas ativos de emergência no Firestore (para encerramento manual sob demanda)
    const [activeEmergencies, setActiveEmergencies] = useState<ActiveEmergencyMessage[]>([]);
    const [loadingEmergencies, setLoadingEmergencies] = useState(false);
    const [concludingId, setConcludingId] = useState<string | null>(null);

    // Carrega alertas oficiais dos órgãos governamentais respeitando o escopo federativo
    const loadOfficialAlerts = async () => {
        setLoading(true);
        try {
            // Se for escopo Nacional ou não houver cidade/estado fixado, carrega os alertas de todo o país
            const list = (isNational || (!activeCityName && !activeState))
                ? await civilDefenseService.getAlertsForScope()
                : await civilDefenseService.getAlertsForScope(activeState, activeCityName);
            setAlerts(list);
        } catch (err) {
            console.error('Falha ao sincronizar alertas governamentais:', err);
            toast.error('Erro ao conectar com APIs do INMET / Defesa Civil.');
        } finally {
            setLoading(false);
        }
    };

    // Carrega emergências ativas no banco de dados
    const loadActiveEmergencies = async () => {
        setLoadingEmergencies(true);
        try {
            const q = query(
                collection(db, 'messages'),
                where('isEmergency', '==', true)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as ActiveEmergencyMessage));
            setActiveEmergencies(list);
        } catch (err) {
            console.warn('Erro ao carregar emergências ativas:', err);
        } finally {
            setLoadingEmergencies(false);
        }
    };

    useEffect(() => {
        loadOfficialAlerts();
        loadActiveEmergencies();
    }, [activeCityName, activeState]);

    // Encerramento Manual de Emergência
    const handleConcludeEmergency = async (msgId: string) => {
        setConcludingId(msgId);
        try {
            const msgRef = doc(db, 'messages', msgId);
            const target = activeEmergencies.find(e => e.id === msgId);
            const cleanTitle = (target?.title || 'Alerta')
                .replace(/🚨\s*ALERTA\s*(DE\s*)?EMERG[ÊE]NCIA:?/gi, '⚠️ Alerta Concluído (Defesa Civil):')
                .replace(/EMERG[ÊE]NCIA/gi, 'Defesa Civil');

            await updateDoc(msgRef, {
                isEmergency: false,
                type: 'info',
                emergencyStatus: 'concluded',
                title: cleanTitle,
                emergencyConcludedAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            toast.success('Alerta de emergência concluído!', {
                description: 'A sirene e o bloqueio de tela foram desativados. A mensagem permanece salva na caixa de notificações dos cidadãos.'
            });

            await loadActiveEmergencies();
        } catch (err) {
            console.error('Falha ao concluir alerta:', err);
            toast.error('Erro ao encerrar emergência.');
        } finally {
            setConcludingId(null);
        }
    };

    // Filtragem em memória
    const filteredAlerts = useMemo(() => {
        return alerts.filter(a => {
            if (filterSource !== 'ALL' && a.source !== filterSource) return false;
            if (filterSeverity !== 'ALL' && a.severity !== filterSeverity) return false;
            if (filterState !== 'ALL' && !a.affectedStates.includes(filterState.toUpperCase())) return false;
            if (searchTerm.trim()) {
                const term = searchTerm.toLowerCase().trim();
                const matchTitle = a.title.toLowerCase().includes(term);
                const matchDesc = a.description.toLowerCase().includes(term);
                const matchCities = a.affectedCities.some(c => c.toLowerCase().includes(term));
                const matchStates = a.affectedStates.some(s => s.toLowerCase().includes(term));
                if (!matchTitle && !matchDesc && !matchCities && !matchStates) return false;
            }
            return true;
        });
    }, [alerts, filterSource, filterSeverity, filterState, searchTerm]);

    const formatDateTime = (dateStr?: string) => {
        if (!dateStr) return 'Não informada';
        try {
            const d = new Date(dateStr);
            return d.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateStr;
        }
    };

    const getSourceBadge = (source: OfficialCivilDefenseAlert['source']) => {
        switch (source) {
            case 'INMET':
                return <Badge className="bg-sky-700 text-white font-bold text-[10px]">INMET (Governo Federal)</Badge>;
            case 'DEFESA_CIVIL_NACIONAL':
                return <Badge className="bg-orange-700 text-white font-bold text-[10px]">Defesa Civil Nacional (CENAD)</Badge>;
            case 'DEFESA_CIVIL_SP':
                return <Badge className="bg-amber-600 text-white font-bold text-[10px]">Defesa Civil Estadual (SP)</Badge>;
            case 'CEMADEN':
                return <Badge className="bg-rose-700 text-white font-bold text-[10px]">CEMADEN (MCTI)</Badge>;
            default:
                return <Badge className="bg-slate-700 text-white font-bold text-[10px]">{source}</Badge>;
        }
    };

    const getSeverityBadge = (severity: OfficialCivilDefenseAlert['severity']) => {
        switch (severity) {
            case 'GRANDE_PERIGO':
                return <Badge className="bg-red-600 text-white text-[10px] font-bold">🔴 GRANDE PERIGO</Badge>;
            case 'PERIGO':
                return <Badge className="bg-orange-600 text-white text-[10px] font-bold">🟠 PERIGO SEVERO</Badge>;
            case 'PERIGO_POTENCIAL':
                return <Badge className="bg-yellow-500 text-slate-950 text-[10px] font-bold">🟡 PERIGO POTENCIAL</Badge>;
            default:
                return <Badge className="bg-blue-600 text-white text-[10px] font-bold">🔵 AVISO INFORMATIVO</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            {/* ─── Bloco de Alertas de Emergência Ativos no Banco (Para Encerramento Rápido) ─── */}
            {activeEmergencies.length > 0 && (
                <Card className="border-red-300 bg-red-50/90 shadow-sm overflow-hidden animate-none">
                    <CardHeader className="pb-2 bg-red-100/60 border-b border-red-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-red-900">
                                <Siren className="w-5 h-5 text-red-600 animate-pulse" />
                                <div>
                                    <CardTitle className="text-sm font-bold">
                                        Alertas Críticos com Bloqueio de Tela Ativos no Celular dos Munícipes ({activeEmergencies.length})
                                    </CardTitle>
                                    <CardDescription className="text-xs text-red-700">
                                        Estes alertas estão ativamente sobrepostos na tela dos cidadãos. Você pode encerrar o estado de emergência manualmente antes do término previsto.
                                    </CardDescription>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={loadActiveEmergencies}
                                className="h-7 text-xs border-red-300 text-red-900 bg-white hover:bg-red-50 gap-1"
                            >
                                <RefreshCw className={`w-3 h-3 ${loadingEmergencies ? 'animate-spin' : ''}`} />
                                Atualizar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-3 space-y-2">
                        {activeEmergencies.map(e => (
                            <div
                                key={e.id}
                                className="bg-white p-3 rounded-lg border border-red-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-red-600 text-white text-[10px]">EMERGÊNCIA ATIVA</Badge>
                                        <span className="text-xs font-bold text-slate-900">{e.title}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-600 line-clamp-1">
                                        ID: <code className="text-slate-500">{e.id}</code> • A mensagem permanece preservada na caixa de notificações do cidadão.
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => handleConcludeEmergency(e.id)}
                                    disabled={concludingId === e.id}
                                    className="bg-red-700 hover:bg-red-800 text-white font-bold text-xs h-8 gap-1.5 whitespace-nowrap shadow-sm"
                                >
                                    <BellOff className="w-3.5 h-3.5" />
                                    {concludingId === e.id ? 'Encerrando...' : 'Encerrar Emergência Agora'}
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* ─── Fila Governamental Oficial (INMET, Defesa Civil, CEMADEN) ─── */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3 border-b border-slate-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shadow-sm">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                                    Fila de Alertas Governamentais & Defesa Civil
                                    <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 font-semibold py-0">
                                        APIs Oficiais
                                    </Badge>
                                    <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-medium py-0">
                                        {isNational ? '🇧🇷 Visão Nacional (Brasil)' : activeCityName ? `📍 ${activeCityName} - ${activeState || 'SP'}` : `📍 ${activeState || 'Brasil'}`}
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs text-slate-500">
                                    {isNational
                                        ? 'Exibindo alertas de todo o território brasileiro emitidos pelo INMET, Defesa Civil Nacional (CENAD) e órgãos estaduais.'
                                        : `Alertas e avisos meteorológicos filtrados para ${activeCityName || activeState || 'a sua jurisdição'}.`}
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={loadOfficialAlerts}
                                disabled={loading}
                                className="text-xs gap-1.5 h-8 font-medium"
                            >
                                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                                Sincronizar APIs
                            </Button>
                        </div>
                    </div>

                    {/* Barra de Filtros e Busca da Fila */}
                    <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                            <Input
                                placeholder="Filtrar município, evento..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 h-8 text-xs bg-slate-50 border-slate-200"
                            />
                        </div>

                        <Select value={filterState} onValueChange={setFilterState}>
                            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Estado (UF)" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Estados (BR)</SelectItem>
                                {availableStates.map(st => (
                                    <SelectItem key={st.uf} value={st.uf}>{st.uf} - {st.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={filterSource} onValueChange={setFilterSource}>
                            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Órgão Emissor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos os Órgãos</SelectItem>
                                <SelectItem value="INMET">INMET (Meteorologia Federal)</SelectItem>
                                <SelectItem value="DEFESA_CIVIL_SP">Defesa Civil Estadual (SP)</SelectItem>
                                <SelectItem value="DEFESA_CIVIL_NACIONAL">Defesa Civil Nacional (CENAD)</SelectItem>
                                <SelectItem value="CEMADEN">CEMADEN (Encostas & Riscos)</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                            <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                                <SelectValue placeholder="Nível de Severidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas as Severidades</SelectItem>
                                <SelectItem value="GRANDE_PERIGO">Grande Perigo (Vermelho)</SelectItem>
                                <SelectItem value="PERIGO">Perigo Severo (Laranja)</SelectItem>
                                <SelectItem value="PERIGO_POTENCIAL">Perigo Potencial (Amarelo)</SelectItem>
                                <SelectItem value="AVISO">Aviso Informativo</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>

                <CardContent className="p-4">
                    {loading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                            <p className="text-xs font-medium">Sincronizando feed oficial com o INMET e centros de monitoramento...</p>
                        </div>
                    ) : filteredAlerts.length === 0 ? (
                        <div className="py-12 text-center space-y-2 border border-dashed rounded-xl p-6 bg-slate-50">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="text-sm font-semibold text-slate-800">Fila Limpa: Nenhum Alerta Encontrado</p>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Não há avisos que correspondam aos filtros de órgão ou município no momento.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAlerts.map(alert => {
                                const isExtreme = alert.severity === 'GRANDE_PERIGO' || alert.severity === 'PERIGO';
                                const isAffectingActiveCity = Boolean(activeCityName) && alert.affectedCities.some(c =>
                                    c.toLowerCase().includes(activeCityName!.toLowerCase()) ||
                                    activeCityName!.toLowerCase().includes(c.toLowerCase())
                                );

                                return (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-xl border transition-all duration-200 ${
                                            isExtreme
                                                ? 'bg-red-50/70 border-red-200 hover:border-red-300'
                                                : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
                                        }`}
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                                            {/* Informações Principais */}
                                            <div className="space-y-2.5 flex-1">
                                                {/* Cabeçalho do Card: Órgão, Severidade e Região Alvo */}
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {getSourceBadge(alert.source)}
                                                    {getSeverityBadge(alert.severity)}

                                                    {isAffectingActiveCity ? (
                                                        <Badge className="bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1">
                                                            <MapPin className="w-3 h-3" /> Impacta {activeCityName}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] text-slate-700 bg-slate-100 border-slate-300 font-medium">
                                                            📍 {alert.affectedStates.join(', ')} {alert.affectedCities.length > 0 ? `• ${alert.affectedCities.slice(0, 3).join(', ')}${alert.affectedCities.length > 3 ? ` (+${alert.affectedCities.length - 3})` : ''}` : ''}
                                                        </Badge>
                                                    )}

                                                    <span className="text-[11px] text-slate-500 font-semibold ml-auto">
                                                        Risco: Nível {alert.riskLevel}/5
                                                    </span>
                                                </div>

                                                {/* Título e Descrição */}
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                                                        <span>{alert.icon}</span>
                                                        {alert.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-700 leading-relaxed mt-1">
                                                        {alert.description}
                                                    </p>
                                                </div>

                                                {/* Datas e Horários Oficiais */}
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600 bg-white/70 p-2.5 rounded-lg border border-slate-200/80">
                                                    <div className="flex items-center gap-1.5">
                                                        <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                                        <span>
                                                            <strong>Emissão:</strong> {formatDateTime(alert.startDate)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5 text-orange-600" />
                                                        <span>
                                                            <strong>Término Previsto:</strong> {formatDateTime(alert.endDate)}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Municípios Alvos */}
                                                <div className="text-[11px] text-slate-600 flex items-start gap-1.5">
                                                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                                                    <div>
                                                        <strong>Municípios & Região Alvo:</strong>{' '}
                                                        <span className="text-slate-700">
                                                            {alert.affectedCities.slice(0, 6).join(', ')}
                                                            {alert.affectedCities.length > 6 ? ` e mais ${alert.affectedCities.length - 6} municípios` : ''}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Instruções Oficiais */}
                                                {alert.instructions && alert.instructions.length > 0 && (
                                                    <div className="p-2.5 bg-white/80 rounded-lg border border-slate-200/80 text-[11px] text-slate-700">
                                                        <p className="font-bold text-slate-900 mb-1">Diretrizes de Prevenção & Autoproteção:</p>
                                                        <ul className="list-disc pl-4 space-y-0.5">
                                                            {alert.instructions.slice(0, 3).map((inst, i) => (
                                                                <li key={i}>{inst}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Ação de Disparo Imediato */}
                                            <div className="lg:w-48 shrink-0 flex flex-col gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-200/80">
                                                <Button
                                                    size="sm"
                                                    onClick={() => onSelectAlertForDispatch(alert)}
                                                    className={`w-full font-bold text-xs h-9 shadow-sm gap-1.5 ${
                                                        isExtreme
                                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                                                    }`}
                                                >
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                    Definir Público & Disparar
                                                </Button>
                                                <p className="text-[10px] text-center text-slate-500 leading-tight">
                                                    Carrega texto, região e expiração com 1 clique no compositor.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};
