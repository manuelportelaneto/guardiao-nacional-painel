import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { ShieldAlert, Terminal, MapPin, Search, Calendar, Database, Shield } from 'lucide-react';
import { Button } from '../ui/button';

interface SecurityLog {
    id: string;
    type: 'app_check_failure' | 'nsfw_upload' | 'injection_attempt' | 'spam_flood' | 'other';
    ipAddress: string;
    userAgent: string;
    details: string;
    severity: 'high' | 'critical' | 'medium';
    createdAt: any;
    userId?: string; // Optional if logged in
}

const AdminSecurityLogs: React.FC = () => {
    const [logs, setLogs] = useState<SecurityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // We simulate reading from 'security_logs' collection which should be populated by Cloud Functions/App Check Enforcements
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
            setLogs(fetchedLogs);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching security logs:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

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
                return <span className="bg-rose-100 text-rose-700 px-2 py-1 rounded text-xs font-bold font-mono border border-rose-300">CRITICAL</span>;
            case 'high':
                return <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold font-mono border border-orange-300">HIGH</span>;
            default:
                return <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold font-mono border border-yellow-300">MEDIUM</span>;
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                        Firewall & Ameaças
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Log de intrusões, falhas de autenticidade (App Check) e metadados de atacantes. Dados ISENTOS de LGPD para fins judiciais.
                    </p>
                </div>
                <Button variant="outline" className="gap-2 shrink-0 bg-black text-white hover:bg-gray-800">
                    <Terminal className="w-4 h-4" />
                    Exportar Tabela (JSON)
                </Button>
            </div>

            {/* Terminal View */}
            <div className="bg-[#0D1117] border border-gray-800 rounded-xl overflow-hidden shadow-2xl font-mono text-sm">
                <div className="bg-[#161B22] px-4 py-2 border-b border-gray-800 flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <span className="text-gray-400 text-xs ml-2 flex items-center gap-1">
                        <Database className="w-3 h-3" /> system/security_logs
                    </span>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800/50 text-gray-400 bg-[#161B22]/50 uppercase text-xs tracking-wider">
                                <th className="py-3 px-4 font-semibold">TImestamp</th>
                                <th className="py-3 px-4 font-semibold">Threat Level</th>
                                <th className="py-3 px-4 font-semibold">Signature / Type</th>
                                <th className="py-3 px-4 font-semibold">IP Address (Origin)</th>
                                <th className="py-3 px-4 font-semibold">Payload / Identifiers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30 text-gray-300">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-500">
                                        <div className="animate-pulse flex flex-col items-center gap-2">
                                            <Shield className="w-6 h-6 mb-2" />
                                            Analisando pacotes da rede...
                                        </div>
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-green-500/70 border-t-0">
                                        Nenhuma ameaça na camada de transporte detectada ativamente.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="py-3 px-4 whitespace-nowrap text-xs text-gray-400 flex items-center gap-2">
                                            <Calendar className="w-3 h-3 text-gray-600" />
                                            {formatDate(log.createdAt)}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {getSeverityBadge(log.severity)}
                                        </td>
                                        <td className="py-3 px-4 text-emerald-400 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]" title={getTypeLabel(log.type)}>
                                            {getTypeLabel(log.type)}
                                        </td>
                                        <td className="py-3 px-4 text-sky-400 font-bold whitespace-nowrap flex items-center gap-1.5">
                                            <MapPin className="w-3 h-3 text-sky-700" /> {log.ipAddress || 'Unknown / VPN'}
                                        </td>
                                        <td className="py-3 px-4 text-xs text-gray-500 break-words max-w-sm">
                                            {log.userAgent && <div className="truncate text-gray-400 mb-1" title={log.userAgent}>{log.userAgent}</div>}
                                            <span className="text-rose-400/80">{log.details}</span>
                                            {log.userId && <div className="text-emerald-400/70 mt-1 flex items-center gap-1"><Search className="w-3 h-3" /> Tracker UID: {log.userId}</div>}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Dummy Filler Info if Empty */}
            {logs.length === 0 && !loading && (
                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-lg text-sm text-blue-800 flex items-start gap-3">
                    <Shield className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                        <strong>Monitoramento Ativo.</strong> O Firebase App Check e o Filtro Vision estão patrulhando em segundo plano. Interceptações de pacotes não-assinados (DDOS ou Scrapers) e envios multimídia indevidos preencherão esta malha em tempo real.
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSecurityLogs;
