import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ShieldAlert, Terminal, Clock, CheckCircle, Smartphone } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CrashReport {
    id: string;
    hash: string;
    message: string;
    stack: string;
    componentStack: string;
    timestamp: any;
    userAgent: string;
    url: string;
    status: 'Novo' | 'Em Análise' | 'Resolvido';
    source?: string;
}

const AdminCrashReports: React.FC = () => {
    const [reports, setReports] = useState<CrashReport[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            setLoading(true);
            let data: CrashReport[] = [];
            try {
                const q = query(collection(db, 'crash_reports'), orderBy('timestamp', 'desc'));
                const querySnapshot = await getDocs(q);
                data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as CrashReport[];
            } catch (queryErr) {
                console.warn('Fallback query para crash_reports sem índice:', queryErr);
                const rawSnapshot = await getDocs(collection(db, 'crash_reports'));
                data = rawSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as CrashReport[];
                data.sort((a, b) => {
                    const tA = a.timestamp?.seconds || 0;
                    const tB = b.timestamp?.seconds || 0;
                    return tB - tA;
                });
            }
            setReports(data);
        } catch (error) {
            console.error('Error fetching crash reports:', error);
            setReports([]);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: CrashReport['status']) => {
        try {
            await updateDoc(doc(db, 'crash_reports', id), {
                status: newStatus
            });
            toast.success('Status atualizado!');
            setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        } catch (error) {
            console.error('Erro ao atualizar:', error);
            toast.error('Não foi possível atualizar o alerta.');
        }
    };

    if (loading) return <div className="p-8 text-center animate-pulse">Buscando crash logs...</div>;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <ShieldAlert className="h-8 w-8 text-red-500" />
                        Crash Reports / Fails
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Acompanhe quebras fatais do aplicativo reportadas ativamente pelos usuários (Error Boundaries).
                    </p>
                </div>
                <Button onClick={fetchReports} variant="outline" className="gap-2">
                    Atualizar Logs
                </Button>
            </div>

            {reports.length === 0 ? (
                <Card className="bg-slate-50 border-dashed">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                        <CheckCircle className="h-16 w-16 text-green-400 mb-4" />
                        <h3 className="text-xl font-bold text-slate-700">Sistema Estável</h3>
                        <p>Nenhum crash reportado pelo Error Boundary nas bases de dados.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {reports.map((report) => (
                        <Card key={report.id} className="border-red-100 shadow-sm overflow-hidden flex flex-col">
                            <CardHeader className="bg-red-50/50 border-b border-red-100 pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <Badge variant={report.status === 'Resolvido' ? 'default' : report.status === 'Em Análise' ? 'secondary' : 'destructive'}>
                                            {report.status}
                                        </Badge>
                                        <CardTitle className="text-lg text-red-900 font-mono">
                                            {report.hash}
                                        </CardTitle>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {report.timestamp ? format(report.timestamp.toDate(), "dd/MM/yyyy HH:mm") : 'Desconhecido'}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                                        <Terminal className="h-4 w-4" /> Mensagem do Erro
                                    </h4>
                                    <div className="bg-slate-900 text-red-400 p-3 rounded text-sm font-mono overflow-auto max-h-32">
                                        {report.message || 'Sem mensagem descritiva'}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="bg-slate-50 p-2 rounded border">
                                        <strong className="text-slate-500 block mb-1">Rota / Origem</strong>
                                        <span className="break-all">{report.url}</span>
                                        <Badge className="ml-2 mt-1" variant="outline">{report.source || 'guardiao-nacional'}</Badge>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded border">
                                        <strong className="block text-slate-500 mb-1 flex items-center gap-1">
                                            <Smartphone className="h-3 w-3" /> Dispositivo (User Agent)
                                        </strong>
                                        <span className="text-slate-600 line-clamp-2" title={report.userAgent}>{report.userAgent}</span>
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold text-slate-900 mb-1">Component Stack Trace</h4>
                                    <div className="bg-slate-100/50 border text-slate-600 p-3 rounded text-xs font-mono overflow-auto max-h-32 whitespace-pre-wrap">
                                        {report.componentStack || report.stack || 'Sem Stack Trace de componentes React disponível.'}
                                    </div>
                                </div>

                                {report.status !== 'Resolvido' && (
                                    <div className="flex gap-2 pt-2 border-t border-dashed">
                                        <Button size="sm" variant="secondary" onClick={() => handleUpdateStatus(report.id, 'Em Análise')}>
                                            Marcar como "Em Análise"
                                        </Button>
                                        <Button size="sm" onClick={() => handleUpdateStatus(report.id, 'Resolvido')}>
                                            Marcar como Resolvido
                                        </Button>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminCrashReports;
