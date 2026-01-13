import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { Badge } from '../ui/badge';
import { Loader2, AlertTriangle, ShieldAlert, Search, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import type { AuditLog } from '../../types/audit';
import type { ErrorLog } from '../../types/errorLog';

const AdminLogs: React.FC = () => {
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
    const [supportTickets, setSupportTickets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('audit');

    useEffect(() => {
        fetchLogs(activeTab);
    }, [activeTab]);

    const fetchLogs = async (type: string) => {
        setLoading(true);
        try {
            let collectionName = 'audit_logs';
            if (type === 'errors') collectionName = 'error_logs';
            if (type === 'tickets') collectionName = 'support_tickets';

            const q = query(
                collection(db, collectionName),
                orderBy('timestamp', 'desc'),
                limit(50)
            );

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (type === 'audit') setAuditLogs(data as AuditLog[]);
            else if (type === 'errors') setErrorLogs(data as ErrorLog[]);
            else setSupportTickets(data);

        } catch (error) {
            console.error("Error fetching logs:", error);
            toast.error("Erro ao carregar logs.");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        return timestamp.toDate ? timestamp.toDate().toLocaleString('pt-BR') : new Date(timestamp).toLocaleString('pt-BR');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Monitoramento do Sistema</h1>
                <p className="text-muted-foreground">Histórico de ações, erros e solicitações de suporte.</p>
            </div>

            <Tabs defaultValue="audit" className="w-full" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="audit" className="gap-2">
                        <ShieldAlert className="w-4 h-4" />
                        Auditoria
                    </TabsTrigger>
                    <TabsTrigger value="errors" className="gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Erros
                    </TabsTrigger>
                    <TabsTrigger value="tickets" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Suporte
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="audit" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Log de Ações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Ação</TableHead>
                                            <TableHead>Autor (ID)</TableHead>
                                            <TableHead>Alvo (ID)</TableHead>
                                            <TableHead>Detalhes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : auditLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                    Nenhum registro encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            auditLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-mono text-xs">{formatDate(log.timestamp)}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{log.action}</Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">{log.actorId}</TableCell>
                                                    <TableCell className="font-mono text-xs">{log.targetId}</TableCell>
                                                    <TableCell className="text-xs max-w-xs truncate">
                                                        {JSON.stringify(log.details)}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="errors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Log de Erros</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Mensagem</TableHead>
                                            <TableHead>Caminho</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Dispositivo</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : errorLogs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                    Nenhum erro registrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            errorLogs.map((log) => (
                                                <TableRow key={log.id}>
                                                    <TableCell className="font-mono text-xs">{formatDate(log.timestamp)}</TableCell>
                                                    <TableCell className="font-medium text-red-600 max-w-sm truncate" title={log.message}>
                                                        {log.message}
                                                    </TableCell>
                                                    <TableCell className="text-xs">{log.path}</TableCell>
                                                    <TableCell className="font-mono text-xs">{log.userId || 'Anon'}</TableCell>
                                                    <TableCell className="text-xs text-gray-500">
                                                        {log.deviceInfo?.screenSize} - {log.deviceInfo?.userAgent?.substring(0, 30)}...
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="tickets" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Tickets de Suporte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Data/Hora</TableHead>
                                            <TableHead>Usuário</TableHead>
                                            <TableHead>Descrição</TableHead>
                                            <TableHead>Imagem</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                                                </TableCell>
                                            </TableRow>
                                        ) : supportTickets.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                                                    Nenhum ticket encontrado.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            supportTickets.map((ticket) => (
                                                <TableRow key={ticket.id}>
                                                    <TableCell className="font-mono text-xs">{formatDate(ticket.timestamp)}</TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        <div>{ticket.userId}</div>
                                                        <div className="text-gray-400">{ticket.contactEmail}</div>
                                                    </TableCell>
                                                    <TableCell className="max-w-sm truncate" title={ticket.description}>
                                                        {ticket.description}
                                                    </TableCell>
                                                    <TableCell>
                                                        {ticket.imageUrl ? (
                                                            <a href={ticket.imageUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                                                                <Search className="h-3 w-3" /> Ver
                                                            </a>
                                                        ) : <span className="text-gray-400">-</span>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={ticket.status === 'open' ? 'secondary' : 'outline'}>{ticket.status}</Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminLogs;
