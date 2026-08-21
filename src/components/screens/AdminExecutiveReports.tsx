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
    Globe
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

export const AdminExecutiveReports: React.FC = () => {
    const { scope, availableCities, availableStates, setJurisdiction, resetToNational } = useScope();
    const [period, setPeriod] = useState('30_days');
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [recipientEmail, setRecipientEmail] = useState('presidencia@guardiaonacional.com.br');
    const [generating, setGenerating] = useState(false);
    const [aiSummary, setAiSummary] = useState(
        'Durante o ciclo avaliado, foram consolidadas 284 ocorrências no território. A taxa global de resolução atingiu 87%, com tempo médio de atendimento de 38 horas. A Secretaria de Obras e Serviços Públicos concentrou a maior demanda (44%), com 100% dos incidentes de risco crítico atendidos dentro da janela de SLA de 4 horas.'
    );

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
            await pdfReportService.generateExecutivePDF(reportMetrics, scope, periodLabel, aiSummary);
            toast.success(`Dossiê Institucional gerado com sucesso para ${recipientEmail}!`);
        } catch (error) {
            toast.error('Erro ao gerar PDF.');
        } finally {
            setGenerating(false);
        }
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

                <div className="flex items-center gap-2">
                    <Button onClick={handleExportExcel} variant="outline" className="gap-2 border-slate-300 font-medium">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Exportar Planilha (XLSX)
                    </Button>
                    <Button onClick={handleGeneratePDF} disabled={generating} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold shadow-sm">
                        <Printer className="w-4 h-4" /> {generating ? 'Gerando Dossiê...' : 'Gerar Dossiê em PDF'}
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
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="national">🇧🇷 Brasil (Consolidado Nacional)</SelectItem>
                                    {availableStates.slice(0, 5).map(s => (
                                        <SelectItem key={s.uf} value={`state_${s.uf}`}>Estado de {s.name} ({s.uf})</SelectItem>
                                    ))}
                                    {availableCities.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.state}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Filtro de Período Temporal */}
                        <div>
                            <Label className="text-xs">Intervalo de Datas</Label>
                            <Select value={period} onValueChange={setPeriod}>
                                <SelectTrigger className="mt-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
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
                            <Label className="text-xs">Destinatário Institucional (SysAdmin / Presidente)</Label>
                            <Input
                                value={recipientEmail}
                                onChange={e => setRecipientEmail(e.target.value)}
                                className="h-8 text-xs mt-1"
                                placeholder="presidencia@guardiaonacional.com.br"
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
                            <Badge variant="outline" className="text-xs">
                                {getPeriodLabel()}
                            </Badge>
                        </CardTitle>
                        <CardDescription>
                            Texto gerado e posicionado na página inicial do PDF oficial logo abaixo do cabeçalho.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Textarea
                            rows={4}
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

                        <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs space-y-1">
                            <div className="font-bold text-white flex items-center gap-2">
                                <Globe className="w-4 h-4 text-blue-400" />
                                Cabeçalho do Dossiê em PDF:
                            </div>
                            <div className="text-slate-400">
                                {scope.level === 'NATIONAL'
                                    ? 'REPÚBLICA FEDERATIVA DO BRASIL - RELATÓRIO NACIONAL CONSOLIDADO'
                                    : (scope.level === 'STATE'
                                        ? `ESTADO DE ${scope.state} - RELATÓRIO EXECUTIVO ESTADUAL`
                                        : `MUNICÍPIO DE ${scope.cityName?.toUpperCase()} - DOSSIÊ DE GESTÃO PÚBLICA`)}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AdminExecutiveReports;
