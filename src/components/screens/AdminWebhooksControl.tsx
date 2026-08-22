/**
 * @fileoverview Central de Conexões e Webhooks Hub (`AdminWebhooksControl.tsx`).
 * 
 * Permite gerenciar integrações com sistemas 156 de prefeituras (1Doc, Betha, IPM, GovBR),
 * plataformas N8N, Flowise, ouvidorias e disparar testes de entrega com assinatura HMAC SHA-256 em modo Sandbox.
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
    ShieldCheck,
    Building2,
    Sparkles,
    KeyRound,
    Terminal,
    RefreshCw,
    Check
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
import { webhookService, MUNICIPAL_ERP_PRESETS, type MunicipalErpPreset } from '../../services/webhookService';
import { useAuth } from '../../context/AuthContext';
import type { WebhookEndpoint, WebhookDeliveryLog } from '../../types/scope';

export const AdminWebhooksControl: React.FC = () => {
    const { currentUser } = useAuth();
    const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
    const [deliveryLogs, setDeliveryLogs] = useState<WebhookDeliveryLog[]>([]);
    const [loading, setLoading] = useState(true);

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

    const handleApplyPreset = (preset: MunicipalErpPreset) => {
        if (!editingWebhook) return;
        setEditingWebhook({
            ...editingWebhook,
            name: `${preset.erpName} - Integração 156`,
            url: preset.defaultUrl,
            description: preset.description,
            events: preset.recommendedEvents
        });
        toast.success(`Preset "${preset.name}" aplicado!`);
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
            const log = await webhookService.testWebhook(webhook, 'contribution.approved', currentUser.uid);
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
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <Network className="h-7 w-7 text-blue-600" />
                        Hub de Conexões 156 & Webhooks Governamentais
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Integração bidirecional com ERPs de Prefeituras (1Doc, Betha, IPM, GovBR) com assinatura HMAC SHA-256 e modo sandbox simulado.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={loadData}
                        disabled={loading}
                        className="text-xs gap-1 bg-white"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingWebhook({
                                id: 'webhook_' + Date.now(),
                                name: '',
                                url: '',
                                description: '',
                                active: true,
                                events: ['contribution.approved', 'contribution.status_changed'],
                                secretKey: 'whsec_' + Math.random().toString(36).substring(2, 12),
                                successCount: 0,
                                failureCount: 0,
                                createdAt: new Date().toISOString(),
                            });
                            setModalOpen(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Novo Webhook
                    </Button>
                </div>
            </div>

            {/* Banner de Modo Simulado / Sandbox */}
            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse shrink-0" />
                    <span>
                        <strong>Ambiente de Homologação Sandbox Ativo:</strong> Disparos de webhooks geram assinaturas criptográficas reais e simulam respostas oficiais de ERPs governamentais com geração de protocolo 156.
                    </span>
                </div>
                <Badge className="bg-blue-600 text-white text-[10px] uppercase shrink-0">
                    Modo Seguro Sandbox
                </Badge>
            </div>

            {/* Grid de Webhooks Ativos */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {webhooks.map((wh) => (
                    <Card key={wh.id} className="border-slate-200 hover:shadow-md transition-shadow bg-white rounded-2xl">
                        <CardHeader className="pb-3 flex flex-row items-start justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-900">{wh.name}</CardTitle>
                                <p className="text-[11px] text-slate-400 font-mono truncate max-w-[220px]">{wh.url}</p>
                            </div>
                            <Badge variant={wh.active ? 'default' : 'secondary'} className={wh.active ? 'bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]' : 'text-[10px]'}>
                                {wh.active ? 'Ativo' : 'Pausado'}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <p className="text-xs text-slate-600 line-clamp-2">{wh.description || 'Sem descrição'}</p>
                            
                            <div className="flex flex-wrap gap-1">
                                {wh.events.map(ev => (
                                    <Badge key={ev} variant="outline" className="text-[9px] bg-slate-50 font-mono text-slate-600">{ev}</Badge>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                                <span>Entregas: <strong className="text-emerald-600">{wh.successCount}</strong></span>
                                <span>Falhas: <strong className="text-red-500">{wh.failureCount}</strong></span>
                            </div>

                            <div className="pt-2 flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleTestWebhook(wh)}
                                    disabled={testingWebhookId === wh.id}
                                    className="flex-1 text-xs gap-1 h-8 bg-slate-50 hover:bg-blue-50 hover:text-blue-700"
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
                <Card className="border-blue-200 bg-blue-50/30 rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-blue-900 flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-blue-600" />
                            Resultado da Execução do Webhook ({testResult.webhookName})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap gap-4 text-xs">
                            <span>Status HTTP: <strong className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{testResult.statusCode} OK</strong></span>
                            <span>Latência: <strong>{testResult.latencyMs}ms</strong></span>
                            <span>Timestamp: {new Date(testResult.timestamp).toLocaleTimeString('pt-BR')}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                            <div className="bg-slate-900 text-slate-100 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-44">
                                <p className="text-slate-400 mb-1.5 text-[10px]">// Headers & Payload Enviados (com Assinatura HMAC)</p>
                                <pre className="text-[11px] leading-tight">{JSON.stringify(testResult.requestPayload, null, 2)}</pre>
                            </div>
                            <div className="bg-slate-900 text-emerald-400 p-3 rounded-xl border border-slate-800 overflow-x-auto max-h-44">
                                <p className="text-slate-400 mb-1.5 text-[10px]">// Resposta do Servidor Receptor</p>
                                <pre className="text-[11px] leading-tight">{testResult.responseBody}</pre>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Histórico de Entregas */}
            <Card className="border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold text-slate-900">Histórico de Disparos & Auditoria de Entrega</CardTitle>
                    <CardDescription className="text-xs">Logs forenses de chamadas efetuadas para conectores municipais.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 text-xs">
                                <TableHead>Data/Hora</TableHead>
                                <TableHead>Webhook / Conector</TableHead>
                                <TableHead>Evento</TableHead>
                                <TableHead>Status HTTP</TableHead>
                                <TableHead>Latência</TableHead>
                                <TableHead>Resultado</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {deliveryLogs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-6 text-slate-400 text-xs">
                                        Nenhum disparo registrado ainda. Clique em "Testar Disparo" acima.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                deliveryLogs.map(log => (
                                    <TableRow key={log.id} className="text-xs">
                                        <TableCell className="font-mono text-[11px] text-slate-500">{new Date(log.timestamp).toLocaleString('pt-BR')}</TableCell>
                                        <TableCell className="font-semibold text-slate-800">{log.webhookName || log.webhookId}</TableCell>
                                        <TableCell className="font-mono text-blue-700">{log.event}</TableCell>
                                        <TableCell><Badge variant="outline" className="text-[10px] font-mono">{log.statusCode}</Badge></TableCell>
                                        <TableCell className="font-mono">{log.latencyMs}ms</TableCell>
                                        <TableCell>
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
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Configurar Endpoint de Webhook 156</DialogTitle>
                        <DialogDescription className="text-xs">Cadastre o destino HTTPS para notificações de eventos do Guardião.</DialogDescription>
                    </DialogHeader>

                    {/* Presets Rápidos */}
                    <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-bold text-slate-600 uppercase">Presets Oficiais de ERPs Governamentais</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {MUNICIPAL_ERP_PRESETS.map(preset => (
                                <Button
                                    key={preset.id}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyPreset(preset)}
                                    className="text-xs justify-start h-auto py-1.5 px-2 bg-slate-50 hover:bg-blue-50 hover:border-blue-300"
                                >
                                    <Building2 className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                                    <span className="truncate">{preset.name}</span>
                                </Button>
                            ))}
                        </div>
                    </div>

                    {editingWebhook && (
                        <div className="space-y-3.5 py-2">
                            <div className="space-y-1">
                                <Label className="text-xs">Nome da Integração</Label>
                                <Input
                                    value={editingWebhook.name}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, name: e.target.value })}
                                    placeholder="Ex: 1Doc - Protocolos de Zeladoria"
                                    className="text-xs h-8"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">URL de Destino (HTTPS)</Label>
                                <Input
                                    value={editingWebhook.url}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, url: e.target.value })}
                                    placeholder="https://api.prefeitura.gov.br/webhook"
                                    className="text-xs h-8 font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Descrição</Label>
                                <Input
                                    value={editingWebhook.description || ''}
                                    onChange={e => setEditingWebhook({ ...editingWebhook, description: e.target.value })}
                                    placeholder="Finalidade desta integração"
                                    className="text-xs h-8"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Secret Key (Assinatura HMAC SHA-256)</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={editingWebhook.secretKey || ''}
                                        onChange={e => setEditingWebhook({ ...editingWebhook, secretKey: e.target.value })}
                                        className="font-mono text-xs h-8"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                            if (editingWebhook.secretKey) {
                                                navigator.clipboard.writeText(editingWebhook.secretKey);
                                                toast.success('Chave copiada!');
                                            }
                                        }}
                                    >
                                        <Copy className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t text-xs">
                                <Label className="text-xs">Webhook Ativo</Label>
                                <Switch
                                    checked={editingWebhook.active}
                                    onCheckedChange={checked => setEditingWebhook({ ...editingWebhook, active: checked })}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="text-xs">Cancelar</Button>
                        <Button onClick={handleSaveWebhook} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
                            <Save className="w-3.5 h-3.5" /> Salvar Webhook
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminWebhooksControl;
