/**
 * @fileoverview Central de Dossiês Executivos e Relatórios Oficiais (`AdminExecutiveReports.tsx`).
 * 
 * Permite gerar e agendar Dossiês em PDF diagramados e planilhas XLSX para Prefeituras,
 * Governos Estaduais e Auditorias de Transparência, com filtragem customizada por datas e escopos federativos.
 */

import React, { useState } from 'react';
import {
    FileText,
    Sparkles,
    Building2,
    Printer,
    FileSpreadsheet,
    Globe,
    Mail,
    RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { useScope } from '../../context/ScopeContext';
import { pdfReportService, type ReportMetricsData } from '../../services/pdfReportService';
import { governmentService } from '../../services/governmentService';

export const AdminExecutiveReports: React.FC = () => {
    const { scope, availableCities, availableStates, setJurisdiction, resetToNational } = useScope();
    const [period, setPeriod] = useState('30_days');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [recipientEmail, setRecipientEmail] = useState('gabinete.prefeito@municipio.sp.gov.br');
    const [generating, setGenerating] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [coatOfArmsUrl, setCoatOfArmsUrl] = useState<string | undefined>(undefined);
    const [aiSummary, setAiSummary] = useState(
        'Durante o ciclo avaliado, foram consolidadas 284 ocorrências no território. A taxa global de resolução atingiu 87%, com tempo médio de atendimento de 38 horas. A Secretaria de Obras e Serviços Públicos concentrou a maior demanda (44%), com 100% dos incidentes de risco crítico atendidos dentro da janela de SLA de 4 horas.'
    );

    // Carrega o brasão do município selecionado
    React.useEffect(() => {
        const loadCoat = async () => {
            if (scope.cityId) {
                const munList = await governmentService.getMunicipalities();
                const mun = munList.find(m => m.id === scope.cityId);
                if (mun?.coatOfArmsUrl) {
                    setCoatOfArmsUrl(mun.coatOfArmsUrl);
                } else {
                    setCoatOfArmsUrl(undefined);
                }
            } else {
                setCoatOfArmsUrl(undefined);
            }
        };
        loadCoat();
    }, [scope.cityId]);

    // Métricas para geração instantânea
    const [reportMetrics] = useState<ReportMetricsData>({
        total: 284,
        approved: 248,
        resolved: 218,
        pending: 30,
        rejected: 36,
        resolutionRate: 87,
        avgResolutionTimeHours: 38,
        categoryBreakdown: [
            { name: 'Pavimentação & Buracos', count: 124, resolvedCount: 110, avgHours: 42 },
            { name: 'Iluminação Pública', count: 82, resolvedCount: 78, avgHours: 24 },
            { name: 'Focos de Dengue & Vigilância', count: 48, resolvedCount: 42, avgHours: 18 },
            { name: 'Defesa Civil & Risco', count: 18, resolvedCount: 18, avgHours: 3.5 },
            { name: 'Saneamento & Vazamentos', count: 12, resolvedCount: 10, avgHours: 32 },
        ],
        departmentBreakdown: [
            { name: 'Secretaria de Obras e Vias', total: 124, resolved: 110, efficiency: 88 },
            { name: 'Secretaria de Serviços Urbanos', total: 94, resolved: 88, efficiency: 93 },
            { name: 'Secretaria de Saúde (Vigilância)', total: 48, resolved: 42, efficiency: 87 },
            { name: 'Defesa Civil Municipal', total: 18, resolved: 18, efficiency: 100 },
        ],
        neighborhoodBreakdown: [
            { name: 'Centro', count: 88, resolvedCount: 82, criticalCount: 2 },
            { name: 'Vila Assis', count: 64, resolvedCount: 58, criticalCount: 1 },
            { name: 'Jardim Zaira', count: 52, resolvedCount: 44, criticalCount: 4 },
            { name: 'Jardim Guapituba', count: 46, resolvedCount: 42, criticalCount: 3 },
            { name: 'Vila Bocaina', count: 34, resolvedCount: 30, criticalCount: 0 },
        ],
        recentItems: [
            { id: 'OC-10492', title: 'Buraco Crítico na Av. Dom José Gaspar', category: 'Pavimentação', status: 'Resolvido', date: '18/08/2026', neighborhood: 'Vila Assis', priority: 'Alta' },
            { id: 'OC-10493', title: 'Poste com lâmpada apagada há 3 noites', category: 'Iluminação', status: 'Resolvido', date: '17/08/2026', neighborhood: 'Centro', priority: 'Média' },
            { id: 'OC-10494', title: 'Terreno abandonado com água parada', category: 'Dengue', status: 'Em Execução', date: '16/08/2026', neighborhood: 'Jardim Zaira', priority: 'Urgente' },
            { id: 'OC-10495', title: 'Risco de queda de barranco após chuva', category: 'Defesa Civil', status: 'Resolvido', date: '15/08/2026', neighborhood: 'Jardim Guapituba', priority: 'Urgente' },
        ]
    });

    const getPeriodLabel = () => {
        if (period === '7_days') return 'Últimos 7 Dias';
        if (period === '30_days') return 'Últimos 30 Dias';
        if (period === 'year_2026') return 'Ano Vigente (2026)';
        if (period === 'custom') {
            const startFmt = startDate.split('-').reverse().join('/');
            const endFmt = endDate.split('-').reverse().join('/');
            return `De ${startFmt} até ${endFmt}`;
        }
        return 'Período Geral';
    };

    const handleGeneratePDF = async () => {
        setGenerating(true);
        try {
            const periodLabel = getPeriodLabel();
            await pdfReportService.generateExecutivePDF(
                { ...reportMetrics, coatOfArmsUrl },
                scope,
                periodLabel,
                aiSummary,
                coatOfArmsUrl
            );
            toast.success(`Dossiê Institucional gerado com sucesso!`);
        } catch (error) {
            toast.error('Erro ao gerar PDF.');
        } finally {
            setGenerating(false);
        }
    };

    const handleSendEmail = async () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            toast.error('Informe um e-mail válido para envio.');
            return;
        }

        setSendingEmail(true);
        try {
            // Simula despacho seguro de Dossiê Executivo por e-mail com anexo criptografado
            await new Promise(r => setTimeout(r, 1200));
            toast.success(`Dossiê Executivo despachado com sucesso para ${recipientEmail}!`);
        } catch (error) {
            toast.error('Erro ao despachar e-mail.');
        } finally {
            setSendingEmail(false);
        }
    };

    const handleRegenerateSummary = () => {
        const jurisName = scope.cityName || (scope.state ? `Estado de ${scope.state}` : 'Brasil');
        const periodLabel = getPeriodLabel();
        setAiSummary(
            `Síntese Automatizada de Inteligência Territorial para ${jurisName} (${periodLabel}): O território registrou ${reportMetrics.total} demandas cívicas, atingindo taxa de resolutividade de ${reportMetrics.resolutionRate}% com TMA de ${reportMetrics.avgResolutionTimeHours}h. Destaque para o cumprimento integral do SLA de emergências na Defesa Civil e concentração das ações de recapeamento nos bairros Centro e Vila Assis.`
        );
        toast.success('Sumário executivo regenerado com IA!');
    };

    const handleExportExcel = () => {
        try {
            pdfReportService.exportExcelWorkbook(reportMetrics, scope);
            toast.success('Planilha Excel exportada com sucesso!');
        } catch (error) {
            toast.error('Erro ao exportar Excel.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        Gerador de Dossiês Executivos & Relatórios Oficiais
                    </h1>
                    <p className="text-slate-500">
                        Produza relatórios diagramados com brasão oficial e filtragem granular por datas para gabinetes e auditoria.
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Button onClick={handleSendEmail} disabled={sendingEmail} variant="outline" className="gap-1.5 border-slate-300 font-medium text-xs">
                        <Mail className="w-3.5 h-3.5 text-blue-600" /> {sendingEmail ? 'Despachando...' : 'Despachar por E-mail'}
                    </Button>
                    <Button onClick={handleExportExcel} variant="outline" className="gap-1.5 border-slate-300 font-medium text-xs">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Planilha (XLSX)
                    </Button>
                    <Button onClick={handleGeneratePDF} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 font-semibold text-xs shadow-sm">
                        <Printer className="w-3.5 h-3.5" /> {generating ? 'Gerando...' : 'Gerar Dossiê em PDF'}
                    </Button>
                </div>
            </div>

            {/* Painel de Parâmetros e Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Coluna 1: Parâmetros Federativos & Datas */}
                <Card className="border-slate-200 shadow-sm md:col-span-1 space-y-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-blue-600" />
                            Parâmetros Federativos
                        </CardTitle>
                        <CardDescription>Defina o recorte territorial e temporal do relatório.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Escopo Territorial */}
                        <div>
                            <Label className="text-xs">Jurisdição Territorial</Label>
                            <Select
                                value={scope.cityId || (scope.state ? `state_${scope.state}` : 'national')}
                                onValueChange={(val) => {
                                    if (val === 'national') {
                                        resetToNational();
                                    } else if (val.startsWith('state_')) {
                                        setJurisdiction('STATE', val.replace('state_', ''));
                                    } else {
                                        const c = availableCities.find(x => x.id === val);
                                        if (c) setJurisdiction('MUNICIPAL', c.state, c.id, c.name);
                                    }
                                }}
                            >
                                <SelectTrigger className="mt-1 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem value="national">🇧🇷 Brasil (Consolidado Nacional)</SelectItem>
                                    {availableStates.slice(0, 5).map(s => (
                                        <SelectItem key={s.uf} value={`state_${s.uf}`}>Estado de {s.name} ({s.uf})</SelectItem>
                                    ))}
                                    {availableCities.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.state}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Badge do Brasão */}
                            {coatOfArmsUrl && (
                                <div className="mt-2 flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                    <img src={coatOfArmsUrl} alt="Brasão" className="w-6 h-6 object-contain" />
                                    <span className="text-[11px] text-slate-600 font-medium">Brasão Oficial do Município Vinculado</span>
                                </div>
                            )}
                        </div>

                        {/* Filtro de Período Temporal */}
                        <div>
                            <Label className="text-xs">Intervalo de Datas</Label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="mt-1 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-[9999]">
                                    <SelectItem value="7_days">Últimos 7 Dias</SelectItem>
                                    <SelectItem value="30_days">Últimos 30 Dias</SelectItem>
                                    <SelectItem value="year_2026">Ano Vigente (2026)</SelectItem>
                                    <SelectItem value="custom">📅 Período Customizado (Data a Data)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Datas Customizadas */}
                        {period === 'custom' && (
                            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div>
                                    <Label className="text-[10px]">Data Inicial</Label>
                                    <Input
                                        type="date"
                                        value={startDate}
                                        onChange={e => setStartDate(e.target.value)}
                                        className="h-8 text-xs mt-1"
                                    />
                                </div>
                                <div>
                                    <Label className="text-[10px]">Data Final</Label>
                                    <Input
                                        type="date"
                                        value={endDate}
                                        onChange={e => setEndDate(e.target.value)}
                                        className="h-8 text-xs mt-1"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Destinatário */}
                        <div>
                            <Label className="text-xs">Destinatário Oficial (Gabinete / Secretaria)</Label>
                            <Input
                                value={recipientEmail}
                                onChange={e => setRecipientEmail(e.target.value)}
                                className="h-8 text-xs mt-1"
                                placeholder="gabinete.prefeito@municipio.sp.gov.br"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Coluna 2 e 3: Prévia Diagramada do Dossiê */}
                <Card className="border-slate-200 shadow-sm md:col-span-2 space-y-4">
                    <CardHeader>
                        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-500" />
                                Sumário Executivo de Inteligência (IA)
                            </span>
                            <div className="flex items-center gap-2">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={handleRegenerateSummary}
                                    className="h-7 text-xs gap-1 text-indigo-600 hover:text-indigo-700"
                                >
                                    <RefreshCw className="w-3 h-3" /> Regenerar com IA
                                </Button>
                                <Badge variant="outline" className="text-xs">
                                    {getPeriodLabel()}
                                </Badge>
                            </div>
                        </CardTitle>
                        <CardDescription>
                            Texto gerado e posicionado na página inicial do PDF oficial logo abaixo do cabeçalho.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            rows={3}
                            value={aiSummary}
                            onChange={e => setAiSummary(e.target.value)}
                            className="text-xs text-slate-700 leading-relaxed font-mono"
                        />

                        {/* Resumo dos Indicadores do Dossiê */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                <div className="text-[11px] text-slate-500 font-medium">Demandas Totais</div>
                                <div className="text-xl font-bold text-slate-900 mt-1">{reportMetrics.total}</div>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                                <div className="text-[11px] text-emerald-800 font-medium">Taxa de Resolução</div>
                                <div className="text-xl font-bold text-emerald-700 mt-1">{reportMetrics.resolutionRate}%</div>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-xl border border-blue-200">
                                <div className="text-[11px] text-blue-800 font-medium">Tempo Médio SLA</div>
                                <div className="text-xl font-bold text-blue-700 mt-1">{reportMetrics.avgResolutionTimeHours}h</div>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200">
                                <div className="text-[11px] text-amber-800 font-medium">Em Andamento</div>
                                <div className="text-xl font-bold text-amber-700 mt-1">{reportMetrics.pending}</div>
                            </div>
                        </div>

                        {/* Top Bairros com Maior Volume */}
                        {reportMetrics.neighborhoodBreakdown && (
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
                                    <span>📍 Bairros com Maior Concentração de Ocorrências:</span>
                                    <span className="text-[10px] text-slate-500 font-normal">Monitoramento Territorial</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                    {reportMetrics.neighborhoodBreakdown.map((n) => (
                                        <div key={n.name} className="bg-white p-2 rounded-lg border border-slate-200 text-center">
                                            <div className="text-xs font-bold text-slate-800 truncate">{n.name}</div>
                                            <div className="text-[11px] text-slate-500">{n.count} casos</div>
                                            <div className="text-[10px] text-emerald-600 font-semibold">{Math.round((n.resolvedCount / n.count) * 100)}% resolvido</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                Cabeçalho Oficial do Dossiê:
                            </div>
                            <div className="text-slate-400">
                                {scope.level === 'NATIONAL'
                                    ? 'REPÚBLICA FEDERATIVA DO BRASIL - RELATÓRIO NACIONAL CONSOLIDADO'
                                    : (scope.level === 'STATE'
                                        ? `ESTADO DE ${scope.state} - RELATÓRIO EXECUTIVO ESTADUAL`
                                        : `MUNICÍPIO DE ${scope.cityName?.toUpperCase() || 'MUNICIPAL'} - DOSSIÊ DE GESTÃO PÚBLICA`)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ─── Módulo B2B: Intelligence as a Service (IaaS) & ESG ─── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Card 1: Relatório de Risco para Seguradoras & Logística */}
                <Card className="border-slate-200 bg-white rounded-2xl shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                                    <Building2 className="w-4 h-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-900">Intelligence as a Service (IaaS Seguradoras)</CardTitle>
                                    <CardDescription className="text-xs">Índices de vulnerabilidade e sinistros territoriais.</CardDescription>
                                </div>
                            </div>
                            <Badge className="bg-blue-600 text-white text-[10px]">B2B Analytics</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="p-2.5 bg-blue-50/50 rounded-xl border border-blue-100 text-center">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Risco de Alagamento</div>
                                <div className="text-base font-black text-blue-700 mt-0.5">42 / 100</div>
                                <div className="text-[9px] text-slate-400">Bacias monitoradas</div>
                            </div>
                            <div className="p-2.5 bg-amber-50/50 rounded-xl border border-amber-100 text-center">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Danos Asfálticos</div>
                                <div className="text-base font-black text-amber-700 mt-0.5">28 / 100</div>
                                <div className="text-[9px] text-slate-400">Sinistro de frotas</div>
                            </div>
                            <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 text-center">
                                <div className="text-[10px] text-slate-500 font-bold uppercase">Segurança Noturna</div>
                                <div className="text-base font-black text-emerald-700 mt-0.5">18 / 100</div>
                                <div className="text-[9px] text-slate-400">Iluminação pública</div>
                            </div>
                        </div>

                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            Relatório automatizado formatado para precificação de apólices residenciais, frotas corporativas e seguros patrimoniais.
                        </p>
                    </CardContent>
                </Card>

                {/* Card 2: Patrocínios Cívicos ESG & Certificados */}
                <Card className="border-slate-200 bg-white rounded-2xl shadow-sm">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-bold text-slate-900">Patrocínio Cívico & Certificados ESG</CardTitle>
                                    <CardDescription className="text-xs">Adoção de praças e zeladoria por empresas privadas.</CardDescription>
                                </div>
                            </div>
                            <Badge className="bg-emerald-600 text-white text-[10px]">Sustentabilidade</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                        <div className="space-y-2">
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-800">Porto Seguro S.A.</div>
                                    <div className="text-[10px] text-slate-500">Praça Presidente Kennedy • 14.500 munícipes/dia</div>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                                    ESG-SA-2026-99182B
                                </Badge>
                            </div>
                            <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-slate-800">Bradesco Seguros</div>
                                    <div className="text-[10px] text-slate-500">Bacia Córrego dos Couros • 32.000 munícipes/dia</div>
                                </div>
                                <Badge variant="outline" className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border-emerald-200">
                                    ESG-SBC-2026-14029C
                                </Badge>
                            </div>
                        </div>

                        <p className="text-slate-600 text-[11px] leading-relaxed">
                            Certificados com hash criptográfico auditável para prestação de contas no Relatório de Sustentabilidade Corporativa (GRI / ESG).
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminExecutiveReports;
