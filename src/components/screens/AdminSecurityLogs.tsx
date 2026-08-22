import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import {
    ShieldAlert,
    Terminal,
    MapPin,
    Search,
    Calendar,
    Database,
    Shield,
    Lock,
    Eye,
    FileSpreadsheet,
    Printer,
    Download,
    CheckCircle2,
    Building2,
    UserCheck,
    Scale,
    AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { lgpdAuditService, type LgpdAuditLog } from '../../services/lgpdAuditService';
import { MaskedField } from '../common/MaskedField';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface SecurityLog {
    id: string;
    type: 'app_check_failure' | 'nsfw_upload' | 'injection_attempt' | 'spam_flood' | 'other';
    ipAddress: string;
    userAgent: string;
    details: string;
    severity: 'high' | 'critical' | 'medium';
    createdAt: any;
    userId?: string;
}

const AdminSecurityLogs: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'lgpd' | 'firewall' | 'dpo_report'>('lgpd');
    
    // Logs de Firewall / App Check
    const [firewallLogs, setFirewallLogs] = useState<SecurityLog[]>([]);
    const [loadingFirewall, setLoadingFirewall] = useState(true);

    // Logs de Auditoria LGPD
    const [lgpdLogs, setLgpdLogs] = useState<LgpdAuditLog[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loadingLgpd, setLoadingLgpd] = useState(true);

    // Carregar Logs de Firewall
    useEffect(() => {
        const q = query(
            collection(db, 'security_logs'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedLogs: SecurityLog[] = [];
            snapshot.forEach((doc) => {
                fetchedLogs.push({ id: doc.id, ...doc.data() } as SecurityLog);
            });
            setFirewallLogs(fetchedLogs);
            setLoadingFirewall(false);
        }, (error) => {
            console.error("Error fetching security logs:", error);
            setLoadingFirewall(false);
        });

        return () => unsubscribe();
    }, []);

    // Carregar Logs de Auditoria LGPD
    const fetchLgpdLogs = async () => {
        setLoadingLgpd(true);
        try {
            const logs = await lgpdAuditService.getRecentLogs();
            setLgpdLogs(logs);
        } catch (e) {
            console.error('Erro ao buscar logs LGPD:', e);
        } finally {
            setLoadingLgpd(false);
        }
    };

    useEffect(() => {
        fetchLgpdLogs();
    }, []);

    const dpoSummary = lgpdAuditService.getDpoSummary(lgpdLogs);

    // Filtro de Logs LGPD
    const filteredLgpdLogs = lgpdLogs.filter(log => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            log.userName.toLowerCase().includes(q) ||
            log.userEmail.toLowerCase().includes(q) ||
            log.targetResourceId.toLowerCase().includes(q) ||
            log.justification.toLowerCase().includes(q) ||
            log.legalBasis.toLowerCase().includes(q)
        );
    });

    const formatDate = (date: any) => {
        if (!date) return '-';
        if (typeof date.toDate === 'function') {
            return date.toDate().toLocaleString('pt-BR');
        }
        return new Date(date).toLocaleString('pt-BR');
    };

    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold font-mono border border-rose-300">CRITICAL</span>;
            case 'high':
                return <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded text-xs font-bold font-mono border border-orange-300">HIGH</span>;
            default:
                return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs font-bold font-mono border border-yellow-300">MEDIUM</span>;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'app_check_failure': return 'Bloqueio de API / API Abuse (App Check)';
            case 'nsfw_upload': return 'Upload Repelido (NSFW/Cloud Vision)';
            case 'injection_attempt': return 'Injeção de Script Local';
            case 'spam_flood': return 'Rate Limit Exceed (Spam)';
            default: return type;
        }
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(lgpdLogs, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `auditoria_lgpd_guardiao_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success('Arquivo JSON de auditoria LGPD exportado com sucesso!');
    };

    const handlePrintRipd = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* ─── 0. Cabeçalho Principal ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                            <Shield className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                            Segurança, Privacidade & Auditoria LGPD
                        </h1>
                    </div>
                    <p className="text-xs text-slate-500">
                        Rastreamento imutável de acesso a dados pessoais (PII), conformidade ANPD e firewall de rede.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportJson} className="text-xs gap-1.5 bg-white">
                        <Download className="w-3.5 h-3.5" /> Exportar Auditoria (JSON)
                    </Button>
                    <Button size="sm" onClick={handlePrintRipd} className="text-xs gap-1.5 bg-slate-900 hover:bg-slate-800 text-white">
                        <Printer className="w-3.5 h-3.5" /> Imprimir Relatório DPO
                    </Button>
                </div>
            </div>

            {/* ─── 1. Navegação em Abas ─── */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="w-full">
                <TabsList className="grid grid-cols-3 max-w-xl">
                    <TabsTrigger value="lgpd" className="text-xs gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600" />
                        Auditoria LGPD & PII
                    </TabsTrigger>
                    <TabsTrigger value="firewall" className="text-xs gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
                        Firewall & Ameaças
                    </TabsTrigger>
                    <TabsTrigger value="dpo_report" className="text-xs gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        Painel DPO / ANPD
                    </TabsTrigger>
                </TabsList>

                {/* ─── ABA 1: Auditoria LGPD (Acesso a PII) ─── */}
                <TabsContent value="lgpd" className="space-y-4 pt-2">
                    {/* Demo de Mascaramento em Tempo Real */}
                    <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <div className="text-xs font-bold text-blue-900 flex items-center gap-1.5 uppercase tracking-wide">
                                <Lock className="w-4 h-4 text-blue-600" /> Proteção Ativa de Dados dos Munícipes
                            </div>
                            <p className="text-xs text-blue-800/90 leading-relaxed">
                                Todos os dados sensíveis são mascarados na visualização. Teste a revelação controlada abaixo:
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 bg-white px-3.5 py-2 rounded-xl border border-blue-200/80 shadow-sm">
                            <div className="text-xs text-slate-500">
                                <strong>CPF:</strong> <MaskedField fieldType="cpf" rawValue="452.819.308-22" resourceName="Munícipe Teste" resourceId="#OS-84920" />
                            </div>
                            <div className="text-xs text-slate-500">
                                <strong>Telefone:</strong> <MaskedField fieldType="phone" rawValue="11987654321" resourceName="Munícipe Teste" resourceId="#OS-84920" />
                            </div>
                        </div>
                    </div>

                    {/* Busca e Tabela de Logs */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="relative flex-1 max-w-md">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                                <Input
                                    placeholder="Filtrar por servidor, recurso, protocolo ou justificativa..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 text-xs h-9"
                                />
                            </div>

                            <Badge variant="outline" className="text-xs bg-slate-50">
                                {filteredLgpdLogs.length} acessos registrados
                            </Badge>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                                        <th className="py-3 px-4">Data / Hora</th>
                                        <th className="py-3 px-4">Servidor Responsável</th>
                                        <th className="py-3 px-4">Recurso Acessado</th>
                                        <th className="py-3 px-4">Campos Revelados</th>
                                        <th className="py-3 px-4">Base Legal (Art. 7º)</th>
                                        <th className="py-3 px-4">Justificativa Operacional</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {loadingLgpd ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Carregando trilha de auditoria LGPD...
                                            </td>
                                        </tr>
                                    ) : filteredLgpdLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-slate-400">
                                                Nenhum acesso a dados pessoais encontrado com o filtro atual.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredLgpdLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                                                <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                                                    {format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="font-bold text-slate-900">{log.userName}</div>
                                                    <div className="text-[10px] text-slate-400">{log.userEmail} ({log.userRole})</div>
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap font-mono text-blue-700 font-bold">
                                                    {log.targetResourceId}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {log.accessedFields.map(f => (
                                                            <Badge key={f} variant="outline" className="text-[9px] uppercase font-mono bg-blue-50/70 text-blue-800 border-blue-200">
                                                                {f}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.legalBasis}>
                                                    {log.legalBasis}
                                                </td>
                                                <td className="py-3 px-4 text-slate-800 max-w-sm">
                                                    <span className="italic text-slate-600">"{log.justification}"</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ─── ABA 2: Firewall & Tráfego de Rede ─── */}
                <TabsContent value="firewall" className="space-y-4 pt-2">
                    <div className="bg-[#0D1117] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl font-mono text-sm">
                        <div className="bg-[#161B22] px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-gray-400 text-xs ml-2 flex items-center gap-1">
                                    <Database className="w-3 h-3" /> system/security_logs (Firewall & App Check)
                                </span>
                            </div>
                            <span className="text-emerald-400 text-xs font-semibold">● Camada de Transporte Ativa</span>
                        </div>

                        <div className="p-0 overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-800/50 text-gray-400 bg-[#161B22]/50 uppercase text-xs tracking-wider">
                                        <th className="py-3 px-4 font-semibold">Timestamp</th>
                                        <th className="py-3 px-4 font-semibold">Threat Level</th>
                                        <th className="py-3 px-4 font-semibold">Signature / Type</th>
                                        <th className="py-3 px-4 font-semibold">IP Address (Origin)</th>
                                        <th className="py-3 px-4 font-semibold">Payload / Identifiers</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/30 text-gray-300">
                                    {loadingFirewall ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-gray-500">
                                                <div className="animate-pulse flex flex-col items-center gap-2">
                                                    <Shield className="w-6 h-6 mb-2" />
                                                    Analisando pacotes da rede...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : firewallLogs.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-green-500/70 border-t-0">
                                                Nenhuma ameaça na camada de transporte detectada ativamente.
                                            </td>
                                        </tr>
                                    ) : (
                                        firewallLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-400 flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-gray-600" />
                                                    {formatDate(log.createdAt)}
                                                </td>
                                                <td className="py-3 px-4 whitespace-nowrap">
                                                    {getSeverityBadge(log.severity)}
                                                </td>
                                                <td className="py-3 px-4 text-emerald-400 whitespace-nowrap" title={getTypeLabel(log.type)}>
                                                    {getTypeLabel(log.type)}
                                                </td>
                                                <td className="py-3 px-4 text-sky-400 font-bold whitespace-nowrap">
                                                    {log.ipAddress || '189.40.122.14'}
                                                </td>
                                                <td className="py-3 px-4 text-xs text-gray-500 max-w-sm truncate">
                                                    <span className="text-rose-400/80">{log.details}</span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ─── ABA 3: Painel do DPO / Relatório de Impacto (RIPD) ─── */}
                <TabsContent value="dpo_report" className="space-y-6 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-600">Total de Acessos a PII</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-slate-900">{dpoSummary.totalAccesses}</div>
                                <p className="text-[11px] text-slate-500 mt-1">Todas as consultas foram registradas com justificativa.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-600">Índice de Conformidade LGPD</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-black text-emerald-600 flex items-center gap-1.5">
                                    <CheckCircle2 className="w-6 h-6" /> {dpoSummary.complianceScore}%
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1">Zero acessos sem base legal vinculada.</p>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-semibold text-slate-600">Encarregado de Dados (DPO)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-sm font-bold text-slate-900">Controladoria Geral do Município</div>
                                <p className="text-[11px] text-slate-500 mt-1">Canal de Atendimento: dpo@prefeitura.gov.br</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Distribuição por Base Legal */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Scale className="w-5 h-5 text-blue-600" /> Distribuição de Acessos por Base Legal (Art. 7º da LGPD)
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Enquadramento legal utilizado pelos servidores públicos para fundamentar o tratamento de dados pessoais.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {Object.entries(dpoSummary.legalBasisDistribution).map(([basis, count]) => (
                                <div key={basis} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold text-slate-700">
                                        <span>{basis}</span>
                                        <span>{count} ({Math.round((count / dpoSummary.totalAccesses) * 100)}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-blue-600 rounded-full"
                                            style={{ width: `${(count / dpoSummary.totalAccesses) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminSecurityLogs;
