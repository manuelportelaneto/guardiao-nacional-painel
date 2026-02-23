import React, { useState } from 'react';
import {
    collection, query, where, getDocs, orderBy, Timestamp
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer
} from 'recharts';
import {
    FileText, Download, Calendar, RefreshCw, TrendingUp, CheckCircle, XCircle, Clock
} from 'lucide-react';

interface ReportData {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    byCategory: Record<string, number>;
    byStatus: Record<string, number>;
    byDay: { date: string; count: number }[];
}

const PRESETS = [
    { label: 'Últimos 7 dias', days: 7 },
    { label: 'Últimos 30 dias', days: 30 },
    { label: 'Este mês', key: 'this_month' },
    { label: 'Mês passado', key: 'last_month' },
    { label: 'Este ano', key: 'this_year' },
    { label: 'Personalizado', key: 'custom' },
];

const getPresetRange = (preset: string): { from: Date; to: Date } => {
    const now = new Date();
    if (preset === 'this_month') {
        return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now };
    }
    if (preset === 'last_month') {
        const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        return { from: firstOfLastMonth, to: lastOfLastMonth };
    }
    if (preset === 'this_year') {
        return { from: new Date(now.getFullYear(), 0, 1), to: now };
    }
    const days = parseInt(preset) || 30;
    const from = new Date();
    from.setDate(from.getDate() - days);
    return { from, to: now };
};

const ReportsScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [preset, setPreset] = useState('30');
    const [customFrom, setCustomFrom] = useState('');
    const [customTo, setCustomTo] = useState('');
    const [cityFilter, setCityFilter] = useState('');
    const [reportData, setReportData] = useState<ReportData | null>(null);

    const generateReport = async () => {
        setLoading(true);
        try {
            let from: Date, to: Date;
            if (preset === 'custom') {
                if (!customFrom || !customTo) {
                    toast.error('Selecione um período personalizado.');
                    return;
                }
                from = new Date(customFrom);
                to = new Date(customTo);
                to.setHours(23, 59, 59);
            } else {
                ({ from, to } = getPresetRange(preset));
            }

            let q = query(
                collection(db, 'contributions'),
                where('createdAt', '>=', Timestamp.fromDate(from)),
                where('createdAt', '<=', Timestamp.fromDate(to)),
                orderBy('createdAt', 'asc')
            );

            if (cityFilter.trim()) {
                q = query(
                    collection(db, 'contributions'),
                    where('city', '==', cityFilter.trim()),
                    where('createdAt', '>=', Timestamp.fromDate(from)),
                    where('createdAt', '<=', Timestamp.fromDate(to)),
                    orderBy('createdAt', 'asc')
                );
            }

            const snapshot = await getDocs(q);

            const data: ReportData = {
                total: snapshot.size,
                approved: 0,
                rejected: 0,
                pending: 0,
                byCategory: {},
                byStatus: {},
                byDay: [],
            };

            const dayMap: Record<string, number> = {};

            snapshot.docs.forEach(doc => {
                const d = doc.data();
                const status = d.status || 'Em Análise';

                if (status === 'Aprovado' || status === 'Resolvido') data.approved++;
                else if (status === 'Rejeitado' || status === 'Arquivado') data.rejected++;
                else data.pending++;

                data.byStatus[status] = (data.byStatus[status] || 0) + 1;

                const cat = d.category || 'Outros';
                data.byCategory[cat] = (data.byCategory[cat] || 0) + 1;

                const dateKey = d.createdAt?.toDate ? d.createdAt.toDate().toLocaleDateString('pt-BR') : '?';
                dayMap[dateKey] = (dayMap[dateKey] || 0) + 1;
            });

            data.byDay = Object.entries(dayMap).map(([date, count]) => ({ date, count }));
            setReportData(data);
            toast.success(`Relatório gerado! ${data.total} registros.`);
        } catch (err: any) {
            console.error(err);
            toast.error('Erro ao gerar relatório: ' + (err.message || ''));
        } finally {
            setLoading(false);
        }
    };

    const exportCSV = () => {
        if (!reportData) return;

        const rows = [
            ['Métrica', 'Valor'],
            ['Total', reportData.total],
            ['Aprovados/Resolvidos', reportData.approved],
            ['Rejeitados/Arquivados', reportData.rejected],
            ['Em Análise', reportData.pending],
            [],
            ['Categoria', 'Quantidade'],
            ...Object.entries(reportData.byCategory).map(([k, v]) => [k, v]),
            [],
            ['Data', 'Registros'],
            ...reportData.byDay.map(d => [d.date, d.count]),
        ];

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `guardiao_relatorio_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('CSV exportado com sucesso!');
    };

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Relatórios e Análises</h1>
                <p className="text-muted-foreground">Gere relatórios customizados e exporte os dados para análise externa.</p>
            </div>

            {/* Filters Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Período e Filtros</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Período</Label>
                        <Select value={preset} onValueChange={setPreset}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {PRESETS.map(p => (
                                    <SelectItem key={p.key || String(p.days)} value={p.key || String(p.days)}>
                                        {p.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {preset === 'custom' && (
                        <>
                            <div className="space-y-2">
                                <Label>De</Label>
                                <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Até</Label>
                                <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} />
                            </div>
                        </>
                    )}

                    <div className="space-y-2">
                        <Label>Filtrar por Cidade (opcional)</Label>
                        <Input placeholder="Ex: Mauá" value={cityFilter} onChange={e => setCityFilter(e.target.value)} />
                    </div>

                    <div className="flex items-end gap-2">
                        <Button onClick={generateReport} disabled={loading} className="w-full">
                            {loading ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <TrendingUp className="w-4 h-4 mr-2" />}
                            Gerar Relatório
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <>
                    {/* Summary Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <FileText className="w-6 h-6 mx-auto mb-1 text-blue-500" />
                                <p className="text-3xl font-bold">{reportData.total}</p>
                                <p className="text-sm text-muted-foreground">Total</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <CheckCircle className="w-6 h-6 mx-auto mb-1 text-green-500" />
                                <p className="text-3xl font-bold text-green-600">{reportData.approved}</p>
                                <p className="text-sm text-muted-foreground">Aprovados</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <Clock className="w-6 h-6 mx-auto mb-1 text-yellow-500" />
                                <p className="text-3xl font-bold text-yellow-600">{reportData.pending}</p>
                                <p className="text-sm text-muted-foreground">Pendentes</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <XCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
                                <p className="text-3xl font-bold text-red-600">{reportData.rejected}</p>
                                <p className="text-sm text-muted-foreground">Rejeitados</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Chart: Daily Volume */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Volume Diário de Contribuições</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px] overflow-hidden">
                            <ResponsiveContainer width="100%" height={350} minWidth={0}>
                                <BarChart data={reportData.byDay}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Chart: By Category */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Contribuições por Categoria</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={220} minWidth={0} minHeight={0}>
                                <BarChart layout="vertical" data={Object.entries(reportData.byCategory).map(([name, value]) => ({ name, value }))}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" allowDecimals={false} />
                                    <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* Export Actions */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Exportar Dados</CardTitle>
                            <CardDescription>Exporte o relatório para análise em ferramentas externas como PowerBI, Excel, ou Tableau.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex gap-3">
                            <Button variant="outline" onClick={exportCSV}>
                                <Download className="w-4 h-4 mr-2" /> Exportar CSV / Excel
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
};

export default ReportsScreen;
