
import React, { useState, useEffect } from 'react';
import { db, auth, functions } from '../../firebaseConfig';
import { CLOUD_FUNCTIONS } from '../../config';
import { httpsCallable } from 'firebase/functions';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { toast } from 'sonner';
import { Copy, Key, Plus, Trash2, Plug, Webhook } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ApiConsumer {
    id: string;
    name: string;
    prefix: string;
    status: 'active' | 'revoked';
    createdAt: any;
    createdBy: string;
    scopes: string[];
}

interface WebhookData {
    id: string;
    url: string;
    description: string;
    status: 'active' | 'inactive';
    events: string[];
    createdAt: any;
    failures: number;
}

const AdminIntegrations: React.FC = () => {
    const [consumers, setConsumers] = useState<ApiConsumer[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
    // const [loading, setLoading] = useState(true);

    // API Keys State
    const [isCreateKeyOpen, setIsCreateKeyOpen] = useState(false);
    const [newKeyName, setNewKeyName] = useState('');
    const [generatedKey, setGeneratedKey] = useState<string | null>(null);
    const [creatingKey, setCreatingKey] = useState(false);

    // Webhooks State
    const [isCreateWebhookOpen, setIsCreateWebhookOpen] = useState(false);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [newWebhookDesc, setNewWebhookDesc] = useState('');
    const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
    const [creatingWebhook, setCreatingWebhook] = useState(false);


    useEffect(() => {
        const qKeys = query(collection(db, 'api_consumers'), orderBy('createdAt', 'desc'));
        const unsubKeys = onSnapshot(qKeys, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ApiConsumer));
            setConsumers(data);
        });

        const qWebhooks = query(collection(db, 'webhooks'), orderBy('createdAt', 'desc'));
        const unsubWebhooks = onSnapshot(qWebhooks, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WebhookData));
            setWebhooks(data);
            // setLoading(false);
        });

        return () => { unsubKeys(); unsubWebhooks(); };
    }, []);

    // --- API Key Handlers ---

    const handleCreateKey = async () => {
        if (!newKeyName.trim()) return;
        setCreatingKey(true);
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Usuário não autenticado');
            const idToken = await currentUser.getIdToken();

            const response = await fetch(CLOUD_FUNCTIONS.generateApiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ data: { name: newKeyName, scopes: ['reports:read'] } })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const result = await response.json();
            setGeneratedKey(result.data.key);
            toast.success('Chave gerada!');
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
            console.error('API Key Generation Failed:', error);
        } finally {
            setCreatingKey(false);
        }
    };

    const handleRevokeKey = async (id: string, name: string) => {
        if (!confirm(`Revogar chave de "${name}"?`)) return;
        try {
            const currentUser = auth.currentUser;
            if (!currentUser) throw new Error('Usuário não autenticado');
            const idToken = await currentUser.getIdToken();

            const response = await fetch(CLOUD_FUNCTIONS.revokeApiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ data: { id } })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            toast.success('Chave revogada.');
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
            console.error('API Key Revocation Failed:', error);
        }
    };

    // --- Webhook Handlers ---

    const handleCreateWebhook = async () => {
        if (!newWebhookUrl.trim()) return;
        setCreatingWebhook(true);
        try {
            const createWebhook = httpsCallable(functions, 'createWebhook');
            const result = await createWebhook({
                url: newWebhookUrl,
                description: newWebhookDesc,
                events: ['contribution.created', 'contribution.status_changed']
            });
            const data = result.data as { secret: string };
            setGeneratedSecret(data.secret);
            toast.success('Webhook criado!');
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
        } finally {
            setCreatingWebhook(false);
        }
    };

    const handleDeleteWebhook = async (id: string) => {
        if (!confirm(`Excluir webhook?`)) return;
        try {
            const deleteWebhook = httpsCallable(functions, 'deleteWebhook');
            await deleteWebhook({ id });
            toast.success('Webhook excluído.');
        } catch (error: any) {
            toast.error('Erro: ' + error.message);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copiado!');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Integrações & API</h1>
                <p className="text-muted-foreground">Gerencie o acesso externo e notificações do Guardião Nacional.</p>
            </div>

            <Tabs defaultValue="api_keys" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="api_keys" className="flex items-center gap-2"><Key className="h-4 w-4" /> Chaves de API</TabsTrigger>
                    <TabsTrigger value="webhooks" className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhooks</TabsTrigger>
                </TabsList>

                <TabsContent value="api_keys" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isCreateKeyOpen} onOpenChange={(open) => {
                            if (!open) { setGeneratedKey(null); setNewKeyName(''); }
                            setIsCreateKeyOpen(open);
                        }}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Nova Chave</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Nova Chave de API</DialogTitle>
                                    <DialogDescription>Para acesso externo aos dados.</DialogDescription>
                                </DialogHeader>
                                {!generatedKey ? (
                                    <div className="py-4"><label className="text-sm font-medium">Nome</label><Input value={newKeyName} onChange={e => setNewKeyName(e.target.value)} placeholder="Ex: Dashboard Externo" /></div>
                                ) : (
                                    <div className="py-4 bg-green-50 p-4 rounded border border-green-200">
                                        <p className="text-sm text-green-900 font-medium">Chave Gerada:</p>
                                        <div className="flex gap-2 mt-2"><code className="flex-1 bg-white p-2 rounded border text-xs break-all">{generatedKey}</code><Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedKey)}><Copy className="h-4 w-4" /></Button></div>
                                    </div>
                                )}
                                <DialogFooter>
                                    {!generatedKey ? <Button onClick={handleCreateKey} disabled={creatingKey}>Gerar</Button> : <Button onClick={() => setIsCreateKeyOpen(false)}>Concluir</Button>}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Chaves Ativas</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Status</TableHead><TableHead>Nome</TableHead><TableHead>Prefixo</TableHead><TableHead>Criado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {consumers.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">Nenhuma chave.</TableCell></TableRow>}
                                    {consumers.map(c => (
                                        <TableRow key={c.id}>
                                            <TableCell><Badge variant={c.status === 'active' ? 'default' : 'destructive'}>{c.status}</Badge></TableCell>
                                            <TableCell>{c.name}</TableCell>
                                            <TableCell className="font-mono text-xs">{c.prefix}****</TableCell>
                                            <TableCell>{c.createdAt?.toDate ? format(c.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}</TableCell>
                                            <TableCell className="text-right">{c.status === 'active' && <Button variant="ghost" size="sm" onClick={() => handleRevokeKey(c.id, c.name)}><Trash2 className="h-4 w-4 text-red-500" /></Button>}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="webhooks" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isCreateWebhookOpen} onOpenChange={(open) => {
                            if (!open) { setGeneratedSecret(null); setNewWebhookUrl(''); setNewWebhookDesc(''); }
                            setIsCreateWebhookOpen(open);
                        }}>
                            <DialogTrigger asChild>
                                <Button><Plus className="mr-2 h-4 w-4" /> Novo Webhook</Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Registrar Webhook</DialogTitle>
                                    <DialogDescription>Receba notificações em tempo real.</DialogDescription>
                                </DialogHeader>
                                {!generatedSecret ? (
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2"><label className="text-sm font-medium">URL de Destino (POST)</label><Input value={newWebhookUrl} onChange={e => setNewWebhookUrl(e.target.value)} placeholder="https://api.seusistema.com/callback" /></div>
                                        <div className="space-y-2"><label className="text-sm font-medium">Descrição</label><Input value={newWebhookDesc} onChange={e => setNewWebhookDesc(e.target.value)} placeholder="Integração Ocorrências" /></div>
                                    </div>
                                ) : (
                                    <div className="py-4 bg-green-50 p-4 rounded border border-green-200">
                                        <p className="text-sm text-green-900 font-medium">Segredo de Assinatura (HMAC):</p>
                                        <p className="text-xs text-green-700 mb-2">Use este segredo para validar o header <code>X-Guardiao-Signature</code>.</p>
                                        <div className="flex gap-2"><code className="flex-1 bg-white p-2 rounded border text-xs break-all">{generatedSecret}</code><Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedSecret)}><Copy className="h-4 w-4" /></Button></div>
                                    </div>
                                )}
                                <DialogFooter>
                                    {!generatedSecret ? <Button onClick={handleCreateWebhook} disabled={creatingWebhook}>Registrar</Button> : <Button onClick={() => setIsCreateWebhookOpen(false)}>Concluir</Button>}
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Webhooks Registrados</CardTitle><CardDescription>Eventos: contribution.created, contribution.status_changed</CardDescription></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Descrição</TableHead><TableHead>Falhas</TableHead><TableHead>Criado</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {webhooks.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">Nenhum webhook.</TableCell></TableRow>}
                                    {webhooks.map(w => (
                                        <TableRow key={w.id}>
                                            <TableCell className="font-mono text-xs max-w-[200px] truncate" title={w.url}>{w.url}</TableCell>
                                            <TableCell>{w.description}</TableCell>
                                            <TableCell>{w.failures}</TableCell>
                                            <TableCell>{w.createdAt?.toDate ? format(w.createdAt.toDate(), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '-'}</TableCell>
                                            <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => handleDeleteWebhook(w.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader><CardTitle className="text-base flex items-center gap-2 text-blue-800"><Plug className="h-4 w-4" /> Documentação</CardTitle></CardHeader>
                <CardContent className="text-sm text-blue-800/80 space-y-2">
                    <p><strong>API:</strong> Use a chave no header <code>Authorization: Bearer KEY</code>.</p>
                    <p><strong>Webhooks:</strong> Valide a origem usando o header <code>X-Guardiao-Signature</code> (HMAC-SHA256 do payload usando o Segredo).</p>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminIntegrations;
