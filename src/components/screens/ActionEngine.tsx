
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { CheckCircle, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { automationService } from '../../services/automationService';
import type { AutomationLog } from '../../types/automation';

const ActionEngine: React.FC = () => {
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await automationService.getLogs();
            setLogs(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '-';
        if (timestamp.toDate) return timestamp.toDate().toLocaleString('pt-BR');
        return new Date(timestamp).toLocaleString('pt-BR');
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-outfit">Integrações & Logs</h1>
                    <p className="text-muted-foreground">
                        Monitoramento de execuções do Motor de Ações e Webhooks.
                    </p>
                </div>
                <Button variant="outline" onClick={fetchLogs} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                </Button>
            </div>

            <Tabs defaultValue="logs" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="logs">Logs de Execução</TabsTrigger>
                    <TabsTrigger value="webhooks">Webhooks Inbound</TabsTrigger>
                </TabsList>

                <TabsContent value="logs" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Execuções</CardTitle>
                            <CardDescription>Últimas 50 execuções de regras.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {logs.length === 0 && !loading && (
                                    <p className="text-center text-gray-500 py-8">Nenhum log encontrado.</p>
                                )}
                                {logs.map(log => (
                                    <div key={log.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                        <div className="flex items-start gap-3">
                                            {log.status === 'success' ? (
                                                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                                            ) : log.status === 'failure' ? (
                                                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                                            )}
                                            <div>
                                                <p className="font-medium text-sm">{log.ruleName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Trigger: {log.triggerEvent} | Entity: {log.entityId}
                                                </p>
                                                {log.executedActions.map((action, idx) => (
                                                    <div key={idx} className="text-xs text-gray-500 mt-1">
                                                        ↳ {action.type}: {action.status} {action.error ? `(${action.error})` : ''}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-medium">{formatTime(log.createdAt)}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase">{log.status}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="webhooks" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Webhooks de Entrada</CardTitle>
                            <CardDescription>URLs para receber dados de sistemas externos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-slate-900 text-slate-300 rounded-lg font-mono text-xs break-all relative group">
                                https://us-central1-guardiao-nacional.cloudfunctions.net/webhook/generic
                                <Button variant="ghost" size="sm" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                    navigator.clipboard.writeText('https://us-central1-guardiao-nacional.cloudfunctions.net/webhook/generic');
                                    toast.success("Copiado!");
                                }}>
                                    Copiar
                                </Button>
                            </div>
                            <div className="text-sm text-muted-foreground">
                                <p>Formatos suportados: JSON via POST.</p>
                                <p>Autenticação: Bearer Token (Configurar em Segredos).</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default ActionEngine;
