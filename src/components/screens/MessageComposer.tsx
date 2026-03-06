import React, { useState, useMemo } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Send, Smartphone, Bell, Mail, MessageSquare, Users, Target, ClipboardList, ScrollText, Plus, Trash2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { StandardLocationFilter } from '../common/StandardLocationFilter';
import type { LocationFilterState } from '../common/StandardLocationFilter';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const QUILL_MODULES = {
    toolbar: [
        ['bold', 'italic', 'underline'],
        [{ 'color': ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#10b981', '#ffffff', '#6b7280'] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        ['link'],
        ['clean']
    ],
};

const QUILL_FORMATS = ['bold', 'italic', 'underline', 'color', 'list', 'link'];

const MessageComposer: React.FC = () => {
    const [loading, setLoading] = useState(false);

    // Content State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageLink, setImageLink] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);

    // Message Type: info | poll | petition
    const [messageType, setMessageType] = useState<'info' | 'poll' | 'petition'>('info');

    // Poll State
    const [pollOptions, setPollOptions] = useState<string[]>(['Sim', 'Não']);
    const [pollDays, setPollDays] = useState(7);
    const [showPartialResults, setShowPartialResults] = useState(true);

    // Petition State
    const [petitionUrl, setPetitionUrl] = useState('');
    const [petitionGoal, setPetitionGoal] = useState(500);
    const [petitionPlatform, setPetitionPlatform] = useState<'custom' | 'change' | 'avaaz'>('custom');

    // Channels
    const [channels, setChannels] = useState({
        push: true,
        internal: true,
        email: false,
        sms: false
    });

    // Targeting
    const [isTargetAll, setIsTargetAll] = useState(true);
    const [locationFilter, setLocationFilter] = useState<LocationFilterState>({});
    const [targetUserIds, setTargetUserIds] = useState('');
    const [targetAudience, setTargetAudience] = useState({
        minAge: '',
        maxAge: '',
        gender: 'all',
        engagement: 'all'
    });

    const [manualEmailList, setManualEmailList] = useState('');
    const [manualSmsList, setManualSmsList] = useState('');
    const [manualListExclusive, setManualListExclusive] = useState(false);

    const charCount = useMemo(() => body.replace(/<[^>]*>/g, '').length, [body]);

    const addPollOption = () => {
        if (pollOptions.length < 6) {
            setPollOptions([...pollOptions, '']);
        }
    };

    const removePollOption = (index: number) => {
        if (pollOptions.length > 2) {
            setPollOptions(pollOptions.filter((_, i) => i !== index));
        }
    };

    const updatePollOption = (index: number, value: string) => {
        const updated = [...pollOptions];
        updated[index] = value;
        setPollOptions(updated);
    };

    const getPetitionExternalUrl = () => {
        if (petitionUrl.trim()) return petitionUrl;
        if (petitionPlatform === 'change') return 'https://www.change.org/start-a-petition';
        if (petitionPlatform === 'avaaz') return 'https://secure.avaaz.org/community_petitions/';
        return '';
    };

    const handleSend = async () => {
        if (!title.trim() || !body.trim()) {
            toast.error('Título e mensagem são obrigatórios');
            return;
        }

        // Helper to strip HTML for push/summaries
        const stripHtml = (html: string) => {
            const tmp = document.createElement("DIV");
            tmp.innerHTML = html;
            return tmp.textContent || tmp.innerText || "";
        };

        const plainTextBody = stripHtml(body);

        if (messageType === 'poll') {
            const validOptions = pollOptions.filter(o => o.trim());
            if (validOptions.length < 2) {
                toast.error('A pesquisa precisa de pelo menos 2 opções válidas');
                return;
            }
        }

        if (messageType === 'petition') {
            const url = getPetitionExternalUrl();
            if (!url) {
                toast.error('Insira a URL de destino do abaixo-assinado');
                return;
            }
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
            let estimatedReach = 0;
            if (isTargetAll) {
                // Fetch real user count
                const { getCountFromServer } = await import('firebase/firestore');
                const snapshot = await getCountFromServer(collection(db, 'users'));
                estimatedReach = snapshot.data().count;
            } else {
                estimatedReach = targetUserIds ? targetUserIds.split(',').length : 100;
            }

            const messageData: Record<string, any> = {
                title,
                body,
                plainText: plainTextBody, // Add plain text version for push/previews
                segment: isTargetAll ? 'all' : 'targeted',
                content: { title, body, imageUrl, imageLink },
                imageLink,
                tag: isEmergency ? 'Emergência' : 'Geral',
                type: messageType === 'poll' ? 'poll' : messageType === 'petition' ? 'petition' : (isEmergency ? 'emergency' : 'info'),
                channels: selectedChannels,
                filters: {
                    isTargetAll: manualListExclusive ? false : isTargetAll,
                    manualListExclusive,
                    location: manualListExclusive ? {} : locationFilter,
                    demographics: manualListExclusive ? {} : targetAudience,
                    targetUserIds: manualListExclusive ? [] : (targetUserIds ? targetUserIds.split(',').map(id => id.trim()).filter(Boolean) : []),
                    manualEmailList: manualEmailList ? manualEmailList.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean) : [],
                    manualSmsList: manualSmsList ? manualSmsList.split(/[\s,;]+/).map(s => s.trim().replace(/\D/g, '')).filter(Boolean) : []
                },
                status: 'queued',
                stats: { sent: 0, totalTarget: estimatedReach, viewed: 0, clicked: 0, failed: 0 },
                createdAt: serverTimestamp(),
                createdBy: 'admin'
            };

            // Poll-specific data
            if (messageType === 'poll') {
                const validOptions = pollOptions.filter(o => o.trim());
                const votes: Record<string, number> = {};
                validOptions.forEach(opt => { votes[opt] = 0; });

                messageData.poll = {
                    options: validOptions,
                    expiresAt: Timestamp.fromDate(new Date(Date.now() + pollDays * 24 * 60 * 60 * 1000)),
                    showPartialResults,
                    votes,
                    voters: [],
                    totalVotes: 0,
                    status: 'active'
                };
            }

            // Petition-specific data
            if (messageType === 'petition') {
                messageData.petition = {
                    externalUrl: getPetitionExternalUrl(),
                    platform: petitionPlatform,
                    goal: petitionGoal,
                    supporters: 0,
                    status: 'active'
                };
            }

            await addDoc(collection(db, 'messages'), messageData);

            const typeLabel = messageType === 'poll' ? 'Pesquisa' : messageType === 'petition' ? 'Abaixo-Assinado' : 'Mensagem';
            toast.success(`${typeLabel} enviada! Alcance estimado: ${estimatedReach}`);

            // Reset
            setTitle('');
            setBody('');
            setImageUrl('');
            setImageLink('');
            setIsEmergency(false);
            setMessageType('info');
            setPollOptions(['Sim', 'Não']);
            setPollDays(7);
            setPetitionUrl('');
            setIsTargetAll(true);
            setLocationFilter({});
            setTargetUserIds('');
            setManualEmailList('');
            setManualSmsList('');
            setManualListExclusive(false);
        } catch (error) {
            console.error(error);
            toast.error('Erro ao enviar');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Nova Mensagem</CardTitle>
                <CardDescription>Envie notificações, pesquisas ou abaixo-assinados para os cidadãos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* 0. Tipo de Mensagem */}
                <div className="space-y-3">
                    <Label className="text-base font-semibold">Tipo de Mensagem</Label>
                    <div className="grid grid-cols-3 gap-3">
                        <div
                            className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${messageType === 'info' ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400' : 'hover:bg-gray-50'}`}
                            onClick={() => setMessageType('info')}
                        >
                            <Bell className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium">Mensagem</span>
                        </div>
                        <div
                            className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${messageType === 'poll' ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400' : 'hover:bg-gray-50'}`}
                            onClick={() => setMessageType('poll')}
                        >
                            <ClipboardList className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium">Pesquisa</span>
                        </div>
                        <div
                            className={`border p-3 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${messageType === 'petition' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'hover:bg-gray-50'}`}
                            onClick={() => setMessageType('petition')}
                        >
                            <ScrollText className="w-4 h-4 text-teal-600" />
                            <span className="text-sm font-medium">Abaixo-Assinado</span>
                        </div>
                    </div>
                </div>

                {/* 1. Canais */}
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
                    <Label className="text-base font-semibold">Conteúdo da {messageType === 'poll' ? 'Pesquisa' : messageType === 'petition' ? 'Petição' : 'Mensagem'}</Label>

                    <div className="space-y-2">
                        <Label htmlFor="title">Título</Label>
                        <Input
                            id="title"
                            placeholder={messageType === 'poll' ? 'Ex: Você apoia a construção do novo parque?' : messageType === 'petition' ? 'Ex: Mais médicos para o posto de saúde' : 'Ex: Alerta de Tempestade'}
                            value={title}
                            className={isEmergency ? "border-red-400 focus-visible:ring-red-500" : ""}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Mensagem (Editor Visual)</Label>
                        <div className={`rounded-lg border ${isEmergency ? 'border-red-400' : 'border-input'}`}>
                            <ReactQuill
                                theme="snow"
                                value={body}
                                onChange={setBody}
                                modules={QUILL_MODULES}
                                formats={QUILL_FORMATS}
                                placeholder="Escreva aqui... Use a barra de formatação para negrito, itálico, cores, links e listas."
                                style={{ minHeight: '140px' }}
                            />
                        </div>
                        <div className="text-xs text-muted-foreground flex justify-between">
                            <span className="flex items-center gap-2">
                                {messageType === 'info' && (
                                    <>
                                        <Switch id="emergency-mode" checked={isEmergency} onCheckedChange={setIsEmergency} />
                                        <Label htmlFor="emergency-mode" className={`font-semibold cursor-pointer ${isEmergency ? 'text-red-600' : 'text-slate-600'}`}>
                                            🚨 Alerta de Emergência
                                        </Label>
                                    </>
                                )}
                            </span>
                            <span>{charCount} caracteres</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="image">URL da Imagem (Opcional)</Label>
                            <Input id="image" placeholder="https://exemplo.com/imagem.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="image-link">Link ao clicar na imagem (Opcional)</Label>
                            <Input id="image-link" placeholder="https://cloudmatrix.com.br" value={imageLink} onChange={e => setImageLink(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* 2.5 Poll Options */}
                {messageType === 'poll' && (
                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <ClipboardList className="w-4 h-4" /> Opções de Voto
                        </Label>
                        <div className="space-y-2">
                            {pollOptions.map((opt, i) => (
                                <div key={i} className="flex gap-2 items-center">
                                    <span className="text-xs font-mono text-gray-400 w-6">{i + 1}.</span>
                                    <Input
                                        value={opt}
                                        onChange={(e) => updatePollOption(i, e.target.value)}
                                        placeholder={`Opção ${i + 1}`}
                                        className="flex-1"
                                    />
                                    {pollOptions.length > 2 && (
                                        <Button variant="ghost" size="icon" onClick={() => removePollOption(i)} className="text-red-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 6 && (
                                <Button variant="outline" size="sm" onClick={addPollOption} className="mt-2">
                                    <Plus className="w-3 h-3 mr-1" /> Adicionar Opção
                                </Button>
                            )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Encerrar em (dias)</Label>
                                <Input type="number" min={1} max={30} value={pollDays} onChange={e => setPollDays(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-gray-500">Resultados Parciais?</Label>
                                <div className="flex items-center gap-2 pt-1">
                                    <Switch checked={showPartialResults} onCheckedChange={setShowPartialResults} />
                                    <span className="text-sm">{showPartialResults ? 'Visíveis ao cidadão' : 'Ocultos até o fim'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2.6 Petition Setup */}
                {messageType === 'petition' && (
                    <div className="space-y-4 border-t pt-4">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <ScrollText className="w-4 h-4" /> Configuração do Abaixo-Assinado
                        </Label>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500">Plataforma de Destino</Label>
                            <div className="grid grid-cols-3 gap-2">
                                <div
                                    className={`border p-3 rounded-lg text-center cursor-pointer transition-colors text-sm ${petitionPlatform === 'custom' ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-400' : 'hover:bg-gray-50'}`}
                                    onClick={() => setPetitionPlatform('custom')}
                                >
                                    🔗 URL Própria
                                </div>
                                <div
                                    className={`border p-3 rounded-lg text-center cursor-pointer transition-colors text-sm ${petitionPlatform === 'change' ? 'bg-red-50 border-red-300 ring-1 ring-red-400' : 'hover:bg-gray-50'}`}
                                    onClick={() => setPetitionPlatform('change')}
                                >
                                    ✊ Change.org
                                </div>
                                <div
                                    className={`border p-3 rounded-lg text-center cursor-pointer transition-colors text-sm ${petitionPlatform === 'avaaz' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'hover:bg-gray-50'}`}
                                    onClick={() => setPetitionPlatform('avaaz')}
                                >
                                    🌍 Avaaz
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Link do Abaixo-Assinado (Change.org, Avaaz ou Próprio)</Label>
                            <Input
                                placeholder={petitionPlatform === 'change' ? 'Ex: https://www.change.org/p/sua-causa' : petitionPlatform === 'avaaz' ? 'Ex: https://secure.avaaz.org/community_petitions/p/sua-causa' : 'https://sua-pagina.com/abaixo-assinado'}
                                value={petitionUrl}
                                onChange={e => setPetitionUrl(e.target.value)}
                            />
                            <p className="text-[10px] text-muted-foreground italic">
                                * Se você já criou o abaixo-assinado, cole o link acima. Se ainda não criou, clique no botão da plataforma desejada abaixo e cole o link aqui depois.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-semibold uppercase text-gray-500">Meta de Apoiadores</Label>
                            <Input type="number" min={10} value={petitionGoal} onChange={e => setPetitionGoal(Number(e.target.value))} />
                        </div>
                    </div>
                )}

                {/* 3. Segmentação */}
                <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold flex items-center gap-2">
                            <Target className="w-4 h-4" /> Segmentação de Público
                        </Label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-500">Enviar para todos (APP)?</span>
                            <Checkbox
                                checked={isTargetAll}
                                onCheckedChange={(c) => setIsTargetAll(c as boolean)}
                            />
                        </div>
                    </div>

                    {/* Manual External Lists - Always Visible */}
                    <div className={`p-4 rounded-lg border space-y-4 ${manualListExclusive ? 'bg-amber-50/40 border-amber-200' : 'bg-blue-50/30 border-blue-100'}`}>
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold uppercase text-gray-600">Listas Externas (Email / SMS)</Label>
                            <div className="flex items-center gap-2">
                                <span className={`text-[11px] font-medium ${manualListExclusive ? 'text-amber-700' : 'text-gray-400'}`}>Envio exclusivo para listas</span>
                                <Checkbox
                                    checked={manualListExclusive}
                                    onCheckedChange={(c) => setManualListExclusive(c as boolean)}
                                />
                            </div>
                        </div>
                        {manualListExclusive && (
                            <p className="text-[11px] text-amber-700 bg-amber-100 px-3 py-1.5 rounded-md">⚠️ Modo exclusivo: a mensagem será enviada <strong>apenas</strong> para os emails/celulares abaixo. Nenhum usuário do app receberá.</p>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-blue-800 flex items-center gap-1">
                                    <Mail className="w-3 h-3" /> Lista de Emails
                                </Label>
                                <Textarea
                                    placeholder="usuário1@email.com, usuário2@email.com..."
                                    value={manualEmailList}
                                    onChange={(e) => setManualEmailList(e.target.value)}
                                    className="min-h-[60px] text-xs bg-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold uppercase text-green-800 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Lista de Celulares
                                </Label>
                                <Textarea
                                    placeholder="5511999999999, 5511888888888..."
                                    value={manualSmsList}
                                    onChange={(e) => setManualSmsList(e.target.value)}
                                    className="min-h-[60px] text-xs font-mono bg-white"
                                />
                            </div>
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">* Separe por vírgula, ponto-e-vírgula ou espaço. Celulares no formato DDI+DDD+NÚMERO.</p>
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
                                    placeholder="Cole os IDs separados por vírgula. Ex: abc123, xyz789"
                                    value={targetUserIds}
                                    onChange={(e) => setTargetUserIds(e.target.value)}
                                    className="min-h-[60px] text-xs font-mono"
                                />
                            </div>



                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Perfil</Label>
                                    <Select value={targetAudience.engagement} onValueChange={(v) => setTargetAudience(prev => ({ ...prev, engagement: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Engajamento" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">Todos os Perfis</SelectItem>
                                            <SelectItem value="active_30d">Ativos (30 dias)</SelectItem>
                                            <SelectItem value="top_contributors">Top Contribuidores</SelectItem>
                                            <SelectItem value="inactive">Inativos</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Faixa Etária</Label>
                                    <div className="flex gap-2">
                                        <Input type="number" placeholder="Min" value={targetAudience.minAge} onChange={(e) => setTargetAudience(prev => ({ ...prev, minAge: e.target.value }))} className="text-xs" />
                                        <Input type="number" placeholder="Máx" value={targetAudience.maxAge} onChange={(e) => setTargetAudience(prev => ({ ...prev, maxAge: e.target.value }))} className="text-xs" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold uppercase text-gray-500">Gênero</Label>
                                    <Select value={targetAudience.gender} onValueChange={(v) => setTargetAudience(prev => ({ ...prev, gender: v }))}>
                                        <SelectTrigger><SelectValue placeholder="Gênero" /></SelectTrigger>
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
                    className={`w-full ${isEmergency ? 'bg-red-600 hover:bg-red-700' : messageType === 'poll' ? 'bg-indigo-600 hover:bg-indigo-700' : messageType === 'petition' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-900 hover:bg-slate-800'} text-white`}
                    size="lg"
                    onClick={handleSend}
                    disabled={loading}
                >
                    {loading ? (
                        'Enviando...'
                    ) : (
                        <span className="flex items-center gap-2">
                            <Send className="w-4 h-4" />
                            {messageType === 'poll' ? 'Publicar Pesquisa' : messageType === 'petition' ? 'Publicar Abaixo-Assinado' : 'Enviar Mensagem'}
                        </span>
                    )}
                </Button>

            </CardContent>
        </Card>
    );
};

export default MessageComposer;
