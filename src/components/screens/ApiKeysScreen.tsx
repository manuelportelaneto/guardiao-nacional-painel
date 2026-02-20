import React, { useState, useEffect } from 'react';
import {
    collection, addDoc, getDocs, updateDoc, doc, serverTimestamp, query, orderBy
} from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Key, Plus, Trash2, Copy, CheckCircle, XCircle } from 'lucide-react';

interface ApiKey {
    id: string;
    label: string;
    key: string;
    cityId: string;
    scope: string;
    revoked: boolean;
    createdAt: any;
}

const ApiKeysScreen: React.FC = () => {
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(false);
    const [newLabel, setNewLabel] = useState('');
    const [newCityId, setNewCityId] = useState('');
    const [newScope, setNewScope] = useState('city');

    const loadKeys = async () => {
        const snap = await getDocs(query(collection(db, 'api_keys'), orderBy('createdAt', 'desc')));
        setKeys(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiKey)));
    };

    useEffect(() => { loadKeys(); }, []);

    const generateKey = () => {
        // Secure random token: 32 bytes hex
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const createKey = async () => {
        if (!newLabel.trim() || !newCityId.trim()) {
            toast.error('Preencha o nome e a cidade.');
            return;
        }
        setLoading(true);
        try {
            const key = generateKey();
            await addDoc(collection(db, 'api_keys'), {
                label: newLabel.trim(),
                cityId: newCityId.trim(),
                scope: newScope,
                key,
                revoked: false,
                createdAt: serverTimestamp(),
            });
            toast.success('Chave criada! Copie-a agora — ela não será exibida novamente.');
            setNewLabel('');
            setNewCityId('');
            await loadKeys();
        } catch (err) {
            console.error(err);
            toast.error('Erro ao criar chave.');
        } finally {
            setLoading(false);
        }
    };

    const revokeKey = async (id: string) => {
        if (!confirm('Revogar esta chave? Todos os sistemas usando-a perderão acesso imediatamente.')) return;
        try {
            await updateDoc(doc(db, 'api_keys', id), { revoked: true });
            toast.success('Chave revogada.');
            await loadKeys();
        } catch {
            toast.error('Erro ao revogar chave.');
        }
    };

    const copyKey = (key: string) => {
        navigator.clipboard.writeText(key);
        toast.success('Chave copiada para a área de transferência!');
    };

    return (
        <div className="p-6 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Key className="w-6 h-6" /> Gerenciamento de Chaves de API
                </h1>
                <p className="text-muted-foreground">
                    Crie e gerencie tokens de acesso para integração com ferramentas externas como PowerBI, Excel e Sistemas 156.
                </p>
            </div>

            {/* How to Use */}
            <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
                <CardContent className="pt-4 space-y-1 text-sm text-blue-900 dark:text-blue-200">
                    <p className="font-semibold">Como usar a API:</p>
                    <code className="block bg-white/70 dark:bg-black/30 rounded p-2 text-xs">
                        GET https://southamerica-east1-[project-id].cloudfunctions.net/publicApiV1/contributions<br />
                        <span className="text-blue-600">Authorization: Bearer {'<sua-chave>'}</span>
                    </code>
                    <p>Parâmetros opcionais: <code>city</code>, <code>state</code>, <code>status</code>, <code>from</code>, <code>to</code>, <code>limit</code>, <code>page</code></p>
                </CardContent>
            </Card>

            {/* Create Key */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nova Chave de API</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                        <Label>Nome / Rótulo</Label>
                        <Input placeholder="Ex: PowerBI Mauá" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>ID da Cidade</Label>
                        <Input placeholder="Ex: maua-sp" value={newCityId} onChange={e => setNewCityId(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label>Escopo</Label>
                        <select
                            className="w-full border rounded-md h-10 px-3 text-sm bg-background"
                            value={newScope}
                            onChange={e => setNewScope(e.target.value)}
                        >
                            <option value="city">Cidade</option>
                            <option value="state">Estado</option>
                            <option value="national">Nacional (SysAdmin)</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button onClick={createKey} disabled={loading} className="w-full">
                            <Plus className="w-4 h-4 mr-2" /> Gerar Chave
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Key List */}
            <Card>
                <CardHeader>
                    <CardTitle>Chaves Existentes</CardTitle>
                    <CardDescription>{keys.length} chave(s) registrada(s)</CardDescription>
                </CardHeader>
                <CardContent className="divide-y">
                    {keys.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">Nenhuma chave criada ainda.</p>
                    )}
                    {keys.map(k => (
                        <div key={k.id} className={`py-3 flex items-center justify-between gap-4 ${k.revoked ? 'opacity-50' : ''}`}>
                            <div className="space-y-0.5 flex-1">
                                <div className="flex items-center gap-2">
                                    {k.revoked
                                        ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                                        : <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                    <span className="font-medium text-sm">{k.label}</span>
                                    <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">{k.scope}</span>
                                    <span className="text-xs text-muted-foreground">({k.cityId})</span>
                                </div>
                                <code className="text-xs text-muted-foreground font-mono">{k.key.substring(0, 20)}…</code>
                            </div>
                            <div className="flex gap-2">
                                {!k.revoked && (
                                    <>
                                        <Button variant="outline" size="sm" onClick={() => copyKey(k.key)}>
                                            <Copy className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={() => revokeKey(k.id)}>
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </>
                                )}
                                {k.revoked && <span className="text-xs text-red-500 font-medium">Revogada</span>}
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default ApiKeysScreen;
