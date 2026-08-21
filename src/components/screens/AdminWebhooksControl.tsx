/**
 * @fileoverview Central de Conexões e Webhooks Hub (`AdminWebhooksControl.tsx`).
 * 
 * Permite gerenciar integrações no-code com sistemas 156 de prefeituras,
 * plataformas N8N, Flowise, ouvidorias e disparar testes de entrega com assinatura HMAC.
 */

import React, { useState, useEffect } from 'react';
import {
    Network,
    Plus,
    Save,
    Trash2,
    Play,
    CheckCircle2,
    XCircle,
    Copy,
    ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { toast } from 'sonner';
import { webhookService } from '../../services/webhookService';
import { useAuth } from '../../context/AuthContext';
import type { WebhookEndpoint, WebhookDeliveryLog } from '../../types/scope';

export const AdminWebhooksControl: React.FC = () => {
    const { currentUser } = useAuth();
    const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
    const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>([]);
    const [, setLoading] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingWebhook, setEditingWebhook] = useState<WebhookEndpoint | null>(null);
    const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<WebhookDeliveryLog | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [whs, logs] = await Promise.all([
                webhookService.getWebhooks(),
                webhookService.getDeliveryLogs(),
            ]);
            setWebhooks(whs);
            setDeliveryLogs(logs);
        } catch (error) {
            toast.error('Erro ao carregar webhooks.');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveWebhook = async () => {
        if (!editingWebhook || !currentUser) return;
        try {
            await webhookService.saveWebhook(editingWebhook, currentUser.uid);
            toast.success(`Webhook "${editingWebhook.name}" salvo com sucesso!`);
            setModalOpen(false);
            setEditingWebhook(null);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar webhook.');
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!currentUser) return;
        try {
            await webhookService.deleteWebhook(id, currentUser.uid);
            toast.success('Webhook excluído.');
            loadData();
        } catch (error) {
            toast.error('Erro ao excluir webhook.');
        }
    };

    const handleTestWebhook = async (webhook: WebhookEndpoint) => {
        if (!currentUser) return;
        setTestingWebhookId(webhook.id);
        try {
            const log = await webhookService.testWebhook(webhook, 'contribution.created', currentUser.uid);
            setTestResult(log);
            toast.success(`Disparo de teste concluído com status ${log.statusCode} (${log.latencyMs}ms)!`);
            loadData();
        } catch (error) {
            toast.error('Erro ao testar webhook.');
        } finally {
            setTestingWebhookId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Network className="h-8 w-8 text-blue-600" />
                        Hub de Conexões, Integrações & Webhooks
                    </h1>
                    <p className="text-slate-500">
                        Integre o Guardião Nacional aos sistemas das Prefeituras (156 / Ouvidorias), N8N, Flowise e webhooks externos.
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingWebhook({
                            id: 'webhook_' + Date.now(),
                            name: '',
                            url: '',
                            description: '',
                            active: true,
                            events: ['contribution.created', 'contribution.status_changed'],
                            secretKey: 'whsec_' + Math.random().toString(36).substring(2, 12),
                            successCount: 0,
                            failureCount: 0,
                            createdAt: new Date().toISOString(),
                        });
                        setModalOpen(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                    <Plus className="w-4 h-4" /> Novo Webhook
                </Button>
            </div>

            {/* Grid de Webhooks Ativos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {webhooks.map((wh) => (
                    <Card key={wh.id} className="border-slate-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold text-slate-900">{wh.name}</CardTitle>
                                <p className="text-xs text-slate-400 truncate max-w-[200px]">{wh.url}</p>
                            </div>
                            <Badge variant={wh.active ? 'default' : 'secondary'} className={wh.active ? 'bg-green-100 text-green-800' : ''}>
                                {wh.active ? 'Ativo' : 'Pausado'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-slate-600 line-clamp-2">{wh.description || 'Sem descrição'}</p>
                            
                            <div className="flex flex-wrap gap-1">
                                {wh.events.map(ev => (
                                    <Badge key={ev} variant="outline" className="text-[10px] bg-slate-50">{ev}</Badge>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Sucessos: <strong className="text-emerald-600">{wh.successCount}</strong></span>
                                <span>Falhas: <strong className="text-red-500">{wh.failureCount}</strong></span>
                            </div>

                            <div className="pt-2 flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTestWebhook(wh)}
                                    disabled={testingWebhookId === wh.id}
                                    className="flex-1 text-xs gap-1 h-8"
                                >
                                    <Play className={`w-3.5 h-3.5 ${testingWebhookId === wh.id ? 'animate-spin' : ''}`} />
                                    Testar Disparo
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2.5 text-xs"
                                    onClick={() => {
                                        setEditingWebhook(wh);
                                        setModalOpen(true);
                                    }}
                                >
                                    Editar
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteWebhook(wh.id)}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Resultado do Teste Recente */}
            {testResult && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            Resultado do Disparo de Teste (Simulador)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex gap-4 text-xs">
                            <span>Status Code: <strong className="text-emerald-600">{testResult.statusCode} OK</strong></span>
                            <span>Latência: <strong>{testResult.latencyMs}ms</strong></span>
                            <span>Timestamp: {new Date(testResult.timestamp).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                            <div className="bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32">
                                <p className="text-slate-400 mb-1">// Payload Enviado (JSON)</p>
                                <pre>{testResult.payloadPreview}</pre>
                            </div>
                            <div className="bg-white p-2 rounded border border-slate-200 overflow-x-auto max-h-32">
                                <p className="text-slate-400 mb-1">// Resposta do Servidor Receptor</p>
                                <pre>{testResult.responsePreview}</pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Histórico de Entregas */}
            <Card className="border-slate-200">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-900">Histórico Recente de Disparos</CardTitle>
                    <CardDescription>Logs de requisições enviadas para sistemas de terceiros.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Status Code</TableHead>
                                <TableHead>Latência</TableHead>
                                <TableHead>Resultado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deliveryLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-6 text-slate-400">
                                        Nenhum disparo registrado ainda. Clique em "Testar Disparo" acima.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                deliveryLogs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell className="text-xs">{new Date(log.timestamp).toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="text-xs font-mono font-medium">{log.event}</TableCell>
                                        <TableCell className="text-xs"><Badge variant="outline">{log.statusCode}</Badge></TableCell>
                                        <TableCell className="text-xs">{log.latencyMs}ms</TableCell>
                                        <TableCell className="text-xs">
                                            {log.success ? (
                                                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Entregue
                                                </span>
                                            ) : (
                                                <span className="text-red-500 font-semibold flex items-center gap-1">
                                                    <XCircle className="w-3.5 h-3.5" /> Falha
                                                </span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Modal de Criação / Edição de Webhook */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Configurar Endpoint de Webhook</DialogTitle>
                        <DialogDescription>Cadastre o destino HTTPS para notificações de eventos do Guardião.</DialogDescription>
                    </DialogHeader>

                    {editingWebhook && (
                        <div className="space-y-4 py-2">
                            <div>
                                <Label>Nome da Integração</Label>
                                <Input
                                    value={editingWebhook.name}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                                    placeholder="Ex: ERP Betha - Ouvidoria"
                                />
                            </div>

                            <div>
                                <Label>URL de Destino (HTTPS)</Label>
                                <Input
                                    value={editingWebhook.url}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                                    placeholder="https://api.prefeitura.gov.br/webhook"
                                />
                            </div>

                            <div>
                                <Label>Descrição</Label>
                                <Input
                                    value={editingWebhook.description || ''}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, description: e.target.value })}
                                    placeholder="Finalidade desta integração"
                                />
                            </div>

                            <div>
                                <Label>Secret Key (Assinatura HMAC SHA-256)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editingWebhook.secretKey || ''}
                                        onChange={e => setEditingWebhook({ ...editingWebhook, secretKey: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            if (editingWebhook.secretKey) {
                                                navigator.clipboard.writeText(editingWebhook.secretKey);
                                                toast.success('Chave copiada!');
                                            }
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t">
                                <Label>Webhook Ativo</Label>
                                <Switch
                                    checked={editingWebhook.active}
                                    onCheckedChange={checked => setEditingWebhook({ ...editingWebhook, active: checked })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveWebhook} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                            <Save className="w-4 h-4" /> Salvar Webhook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminWebhooksControl;
