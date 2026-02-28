import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Send, Target, Smartphone, Mail, Bell, MessageSquare, Users } from 'lucide-react';
import { Switch } from '../ui/switch';
import { StandardLocationFilter } from '../common/StandardLocationFilter';
import type { LocationFilterState } from '../common/StandardLocationFilter';

const MessageComposer: React.FC = () => {
    const [loading, setLoading] = useState(false);

    // Content State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);

    // Channels State
    const [channels, setChannels] = useState({
        push: true,
        internal: true,
        email: false,
        sms: false
    });

    // Targeting State
    const [isTargetAll, setIsTargetAll] = useState(true);
    const [locationFilter, setLocationFilter] = useState<LocationFilterState>({});
    const [targetUserIds, setTargetUserIds] = useState(''); // Comma-separated user IDs
    const [targetAudience, setTargetAudience] = useState({
        minAge: '',
        maxAge: '',
        gender: 'all',
        engagement: 'all' // all, active_30d, inactive, top_contributors
    });

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Título e mensagem são obrigatórios');
            return;
        }

        const selectedChannels = Object.entries(channels)
            .filter(([_, enabled]) => enabled)
            .map(([channel]) => channel);

        if (selectedChannels.length === 0) {
            toast.error('Selecione pelo menos um canal de envio');
            return;
        }

        setLoading(true);
        try {
            // Mock reach calculation based on filters
            // In production, this would be a server-side count
            const estimatedReach = isTargetAll ? 15420 : Math.floor(Math.random() * 2000) + 50;

            const messageData = {
                // Root-level fields for App NotificationsScreen compatibility
                title,
                body,
                segment: isTargetAll ? 'all' : 'targeted',

                // Detailed structure for admin panel and future features
                content: {
                    title,
                    body,
                    imageUrl,
                },
                tag: isEmergency ? 'Emergência' : 'Geral',
                type: isEmergency ? 'emergency' : 'info',
                channels: selectedChannels,
                filters: {
                    isTargetAll,
                    location: locationFilter,
                    demographics: targetAudience,
                    targetUserIds: targetUserIds ? targetUserIds.split(',').map(id => id.trim()).filter(Boolean) : []
                },
                status: 'queued',
                stats: {
                    sent: 0,
                    totalTarget: estimatedReach,
                    viewed: 0,
                    clicked: 0,
                    failed: 0
                },
                createdAt: serverTimestamp(),
                createdBy: 'admin' // Should be current user ID
            };

            await addDoc(collection(db, 'messages'), messageData);

            toast.success(`Mensagem enviada para a fila! Alcance estimado: ${estimatedReach}`);

            // Reset Form
            setTitle('');
            setBody('');
            setImageUrl('');
            setIsEmergency(false);
            setIsTargetAll(true);
            setLocationFilter({});
            setTargetUserIds('');
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar mensagem');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nova Mensagem</CardTitle>
                <CardDescription>Envie notificações, e-mails ou alertas para os cidadãos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* 1. Canais de Envio */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Canais de Envio</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className={`border p-3 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.push ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}`}
                            onClick={() => setChannels(c => ({ ...c, push: !c.push }))}>
                            <Checkbox checked={channels.push} />
                            <Smartphone className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">Push</span>
                        </div>
                        <div className={`border p-3 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.internal ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'}`}
                            onClick={() => setChannels(c => ({ ...c, internal: !c.internal }))}>
                            <Checkbox checked={channels.internal} />
                            <Bell className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium">Interna (App)</span>
                        </div>
                        <div className={`border p-3 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.email ? 'bg-orange-50 border-orange-200' : 'hover:bg-gray-50'}`}
                            onClick={() => setChannels(c => ({ ...c, email: !c.email }))}>
                            <Checkbox checked={channels.email} />
                            <Mail className="w-4 h-4 text-orange-500" />
                            <span className="text-sm font-medium">Email</span>
                        </div>
                        <div className={`border p-3 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.sms ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}
                            onClick={() => setChannels(c => ({ ...c, sms: !c.sms }))}>
                            <Checkbox checked={channels.sms} />
                            <MessageSquare className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium">SMS</span>
                        </div>
                    </div>
                </div>

                {/* 2. Conteúdo */}
                <div className="space-y-4 border-t pt-4">
                    <Label className="text-base font-semibold">Conteúdo da Mensagem</Label>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            placeholder="Ex: Alerta de Tempestade ou Novidades na Cidade"
                            value={title}
                            className={isEmergency ? "border-red-400 focus-visible:ring-red-500" : ""}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="body">Mensagem</Label>
                        <Textarea
                            id="body"
                            placeholder="Digite o conteúdo aqui..."
                            className={`min-h-[120px] ${isEmergency ? "border-red-400 focus-visible:ring-red-500" : ""}`}
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                        <div className="text-xs text-muted-foreground flex justify-between">
                            <span className="flex items-center gap-2">
                                <Switch
                                    id="emergency-mode"
                                    checked={isEmergency}
                                    onCheckedChange={setIsEmergency}
                                />
                                <Label htmlFor="emergency-mode" className={`font-semibold cursor-pointer ${isEmergency ? 'text-red-600' : 'text-slate-600'}`}>
                                    🚨 Marcar como Alerta de Emergência
                                </Label>
                            </span>
                            <span>{body.length} caracteres</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="image">URL da Imagem (Opcional)</Label>
                        <Input
                            id="image"
                            placeholder="https://exemplo.com/imagem.jpg"
                            value={imageUrl}
                            onChange={e => setImageUrl(e.target.value)}
                        />
                    </div>
                </div>

                {/* 3. Segmentação */}
                <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Target className="w-4 h-4" /> Segmentação de Público
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Enviar para todos?</span>
                            <Checkbox
                                checked={isTargetAll}
                                onCheckedChange={(c) => setIsTargetAll(c as boolean)}
                            />
                        </div>
                    </div>

                    {!isTargetAll && (
                        <div className="bg-gray-50 p-4 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Localização</Label>
                                <StandardLocationFilter
                                    value={locationFilter}
                                    onChange={setLocationFilter}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> IDs de Usuários Específicos
                                </Label>
                                <Textarea
                                    placeholder="Cole os IDs separados por vírgula. Ex: abc123, xyz789, user456"
                                    value={targetUserIds}
                                    onChange={(e) => setTargetUserIds(e.target.value)}
                                    className="min-h-[60px] text-xs font-mono"
                                />
                                <p className="text-xs text-gray-400">Deixe em branco para usar filtros de localização/perfil.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Perfil</Label>
                                    <Select
                                        value={targetAudience.engagement}
                                        onValueChange={(v) => setTargetAudience(prev => ({ ...prev, engagement: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Engajamento" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Perfis</SelectItem>
                                            <SelectItem value="active_30d">Ativos (30 dias)</SelectItem>
                                            <SelectItem value="top_contributors">Top Contribuidores</SelectItem>
                                            <SelectItem value="inactive">Inativos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Gênero</Label>
                                    <Select
                                        value={targetAudience.gender}
                                        onValueChange={(v) => setTargetAudience(prev => ({ ...prev, gender: v }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Gênero" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos</SelectItem>
                                            <SelectItem value="male">Masculino</SelectItem>
                                            <SelectItem value="female">Feminino</SelectItem>
                                            <SelectItem value="other">Outros</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <Button
                    className={`w-full ${isEmergency ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'} text-white`}
                    size="lg"
                    onClick={handleSend}
                    disabled={loading}
                >
                    {loading ? (
                        'Enviando...'
                    ) : (
                        <span className="flex items-center gap-2">
                            <Send className="w-4 h-4" /> Enviar Mensagem
                        </span>
                    )}
                </Button>

            </CardContent>
        </Card>
    );
};

export default MessageComposer;
