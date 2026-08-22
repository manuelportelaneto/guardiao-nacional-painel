import React, { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import {
    Send, Smartphone, Bell, Mail, MessageSquare, Users, Target, ClipboardList,
    ScrollText, Plus, Trash2, ShieldAlert, Sparkles, Building2, MapPin, CheckCircle2,
    X, AlertTriangle, Eye, Layers, Wifi, BatteryCharging, Radio, Siren
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { StandardLocationFilter } from '../common/StandardLocationFilter';
import type { LocationFilterState } from '../common/StandardLocationFilter';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { useScope } from '../../context/ScopeContext';
import { OFFICIAL_COMMUNICATION_TEMPLATES, type OfficialTemplate } from '../../data/officialCommunicationTemplates';
import { getCityNeighborhoods, MUNICIPAL_NEIGHBORHOODS_DB } from '../../data/municipalNeighborhoods';

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
    const { scope } = useScope();
    const [loading, setLoading] = useState(false);

    // Template Selecionado
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Content State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageLink, setImageLink] = useState('');
    const [isEmergency, setIsEmergency] = useState(false);
    const [categoryTag, setCategoryTag] = useState<string>('Geral');

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

    // Targeting & Bairros
    const [isTargetAll, setIsTargetAll] = useState(true);
    const [locationFilter, setLocationFilter] = useState<LocationFilterState>({});
    const [selectedNeighborhoods, setSelectedNeighborhoods] = useState<string[]>([]);
    const [customNeighborhoodInput, setCustomNeighborhoodInput] = useState('');
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

    // Preview Mockup State (push vs inapp)
    const [previewTab, setPreviewTab] = useState<'push' | 'feed'>('push');

    // Identificação de Bairros da Cidade Atual do Escopo
    const activeCityId = scope.cityId || 'santo-andre';
    const activeCityName = scope.cityName || 'Santo André';
    const cityNeighborhoodData = useMemo(() => {
        return getCityNeighborhoods(activeCityId) || getCityNeighborhoods(activeCityName);
    }, [activeCityId, activeCityName]);

    // Aplicação de Template em 1 Clique
    const handleApplyTemplate = (template: OfficialTemplate) => {
        setSelectedTemplateId(template.id);
        setTitle(template.defaultSubject);
        setBody(template.defaultBody);
        setIsEmergency(!!template.isEmergency);
        setCategoryTag(template.badgeText);
        setMessageType('info');
        setChannels(template.defaultChannels);
        toast.success(`Modelo "${template.title}" aplicado!`, {
            description: 'Você pode personalizar os dados antes de disparar.'
        });
    };

    // Alternar Bairro Selecionado
    const toggleNeighborhood = (neighborhood: string) => {
        setSelectedNeighborhoods(prev => 
            prev.includes(neighborhood) 
                ? prev.filter(n => n !== neighborhood)
                : [...prev, neighborhood]
        );
    };

    // Ações Rápidas de Bairros
    const handleSelectAllNeighborhoods = () => {
        if (cityNeighborhoodData?.neighborhoods) {
            setSelectedNeighborhoods(cityNeighborhoodData.neighborhoods);
        }
    };

    const handleSelectBasinNeighborhoods = () => {
        if (cityNeighborhoodData?.criticalBasinNeighborhoods) {
            setSelectedNeighborhoods(cityNeighborhoodData.criticalBasinNeighborhoods);
            toast.info(`Selecionados ${cityNeighborhoodData.criticalBasinNeighborhoods.length} bairros em bacias críticas.`);
        }
    };

    const handleSelectSlopeNeighborhoods = () => {
        if (cityNeighborhoodData?.criticalSlopeNeighborhoods) {
            setSelectedNeighborhoods(cityNeighborhoodData.criticalSlopeNeighborhoods);
            toast.info(`Selecionados ${cityNeighborhoodData.criticalSlopeNeighborhoods.length} bairros de encosta monitorada.`);
        }
    };

    const handleClearNeighborhoods = () => {
        setSelectedNeighborhoods([]);
    };

    const handleAddCustomNeighborhood = (e: React.KeyboardEvent | React.MouseEvent) => {
        if ('key' in e && e.key !== 'Enter') return;
        if (!customNeighborhoodInput.trim()) return;
        const name = customNeighborhoodInput.trim();
        if (!selectedNeighborhoods.includes(name)) {
            setSelectedNeighborhoods(prev => [...prev, name]);
        }
        setCustomNeighborhoodInput('');
    };

    const charCount = useMemo(() => body.replace(/<[^>]*>/g, '').length, [body]);
    const plainTextBody = useMemo(() => {
        const tmp = document.createElement("DIV");
        tmp.innerHTML = body;
        return tmp.textContent || tmp.innerText || "";
    }, [body]);

    // Estimativa de Munícipes Atingidos
    const estimatedAudienceCount = useMemo(() => {
        if (isTargetAll) return 18450; // População estimada com app instalado na base municipal
        if (selectedNeighborhoods.length > 0) {
            return selectedNeighborhoods.length * 1420;
        }
        return 1200;
    }, [isTargetAll, selectedNeighborhoods.length]);

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
            const messageData: Record<string, any> = {
                title,
                body,
                plainText: plainTextBody,
                segment: isTargetAll ? 'all' : 'targeted',
                content: { title, body, imageUrl, imageLink },
                imageLink,
                tag: isEmergency ? 'Emergência' : categoryTag,
                categoryTag,
                type: messageType === 'poll' ? 'poll' : messageType === 'petition' ? 'petition' : (isEmergency ? 'emergency' : 'info'),
                channels: selectedChannels,
                isEmergency,
                jurisdiction: {
                    cityId: activeCityId,
                    cityName: activeCityName,
                    state: scope.state || 'SP'
                },
                targetedNeighborhoods: selectedNeighborhoods,
                filters: {
                    isTargetAll: manualListExclusive ? false : isTargetAll,
                    manualListExclusive,
                    location: manualListExclusive ? {} : { ...locationFilter, neighborhoods: selectedNeighborhoods },
                    demographics: manualListExclusive ? {} : targetAudience,
                    targetUserIds: manualListExclusive ? [] : (targetUserIds ? targetUserIds.split(',').map(id => id.trim()).filter(Boolean) : []),
                    manualEmailList: manualEmailList ? manualEmailList.split(/[\s,;]+/).map(e => e.trim()).filter(Boolean) : [],
                    manualSmsList: manualSmsList ? manualSmsList.split(/[\s,;]+/).map(s => s.trim().replace(/\D/g, '')).filter(Boolean) : []
                },
                status: 'queued',
                stats: { sent: 0, totalTarget: estimatedAudienceCount, viewed: 0, clicked: 0, failed: 0 },
                createdAt: serverTimestamp(),
                createdBy: 'admin_official'
            };

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

            const typeLabel = isEmergency 
                ? '🚨 Alerta de Emergência'
                : (messageType === 'poll' ? 'Pesquisa' : messageType === 'petition' ? 'Abaixo-Assinado' : 'Comunicado Oficial');
            
            toast.success(`${typeLabel} publicado com sucesso!`, {
                description: `Disparo agendado para ~${estimatedAudienceCount.toLocaleString('pt-BR')} cidadãos${selectedNeighborhoods.length > 0 ? ` em ${selectedNeighborhoods.length} bairros` : ''}.`
            });

            // Reset
            setTitle('');
            setBody('');
            setImageUrl('');
            setImageLink('');
            setIsEmergency(false);
            setSelectedTemplateId('');
            setMessageType('info');
            setSelectedNeighborhoods([]);
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
            toast.error('Erro ao enviar comunicado');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Formulário Principal de Composição */}
            <div className="xl:col-span-7 space-y-6">
                <Card className="border-slate-200 shadow-sm">
                    <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl flex items-center gap-2 text-slate-900">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                    Novo Comunicado Oficial & Alerta Municipal
                                </CardTitle>
                                <CardDescription>
                                    Emissão de avisos de utilidade pública, campanhas e alertas da Defesa Civil com segmentação por bairro.
                                </CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-semibold px-2.5 py-1">
                                {activeCityName} - {scope.state || 'SP'}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">

                        {/* ─── 0. Barra de Modelos Prontos em 1 Clique (Presets) ─── */}
                        <div className="space-y-2.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Modelos Rápidos para Prefeituras (1 Clique)
                            </Label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {OFFICIAL_COMMUNICATION_TEMPLATES.map(tpl => {
                                    const isSelected = selectedTemplateId === tpl.id;
                                    return (
                                        <button
                                            key={tpl.id}
                                            type="button"
                                            onClick={() => handleApplyTemplate(tpl)}
                                            className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between h-20 ${
                                                isSelected 
                                                    ? 'bg-blue-50/80 border-blue-500 ring-2 ring-blue-400 text-blue-900 shadow-sm'
                                                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex items-center justify-between w-full">
                                                <span className="text-base">{tpl.icon}</span>
                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                                                    {tpl.badgeText}
                                                </span>
                                            </div>
                                            <span className="font-semibold line-clamp-2 leading-tight text-[11px]">
                                                {tpl.title}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* ─── 1. Tipo de Mensagem & Destaque de Emergência ─── */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700">Formato da Comunicação</Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div
                                        className={`border p-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs font-medium ${
                                            messageType === 'info' ? 'bg-blue-50 border-blue-400 text-blue-900 ring-1 ring-blue-300 font-bold' : 'hover:bg-gray-50 text-slate-600'
                                        }`}
                                        onClick={() => setMessageType('info')}
                                    >
                                        <Bell className="w-3.5 h-3.5 text-blue-500" />
                                        Comunicado
                                    </div>
                                    <div
                                        className={`border p-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs font-medium ${
                                            messageType === 'poll' ? 'bg-indigo-50 border-indigo-400 text-indigo-900 ring-1 ring-indigo-300 font-bold' : 'hover:bg-gray-50 text-slate-600'
                                        }`}
                                        onClick={() => setMessageType('poll')}
                                    >
                                        <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                                        Consulta
                                    </div>
                                    <div
                                        className={`border p-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-xs font-medium ${
                                            messageType === 'petition' ? 'bg-teal-50 border-teal-400 text-teal-900 ring-1 ring-teal-300 font-bold' : 'hover:bg-gray-50 text-slate-600'
                                        }`}
                                        onClick={() => setMessageType('petition')}
                                    >
                                        <ScrollText className="w-3.5 h-3.5 text-teal-600" />
                                        Petição
                                    </div>
                                </div>
                            </div>

                            {/* Alerta Sirene / Defesa Civil */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700">Prioridade de Entrega</Label>
                                <div className={`p-2.5 rounded-lg border transition-all flex items-center justify-between ${
                                    isEmergency ? 'bg-red-50 border-red-300 text-red-900 shadow-sm' : 'bg-slate-50 border-slate-200'
                                }`}>
                                    <div className="flex items-center gap-2">
                                        <Siren className={`w-4 h-4 ${isEmergency ? 'text-red-600 animate-pulse' : 'text-slate-400'}`} />
                                        <div>
                                            <div className="text-xs font-bold flex items-center gap-1">
                                                Alerta de Emergência
                                                {isEmergency && <Badge className="bg-red-600 text-white text-[9px] px-1 py-0">SIRENE</Badge>}
                                            </div>
                                            <p className="text-[10px] text-slate-500">Sobrescreve prioridade no celular</p>
                                        </div>
                                    </div>
                                    <Switch
                                        id="emergency-switch"
                                        checked={isEmergency}
                                        onCheckedChange={setIsEmergency}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ─── 2. Canais de Saída ─── */}
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Canais de Notificação</Label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className={`border p-2.5 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.push ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold' : 'hover:bg-gray-50 text-slate-600'}`}
                                    onClick={() => setChannels(c => ({ ...c, push: !c.push }))}>
                                    <Checkbox checked={channels.push} />
                                    <Smartphone className="w-4 h-4 text-blue-500" />
                                    <span className="text-xs">Push Mobile</span>
                                </div>
                                <div className={`border p-2.5 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.internal ? 'bg-indigo-50 border-indigo-300 text-indigo-900 font-semibold' : 'hover:bg-gray-50 text-slate-600'}`}
                                    onClick={() => setChannels(c => ({ ...c, internal: !c.internal }))}>
                                    <Checkbox checked={channels.internal} />
                                    <Bell className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs">Feed Cívico</span>
                                </div>
                                <div className={`border p-2.5 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.email ? 'bg-orange-50 border-orange-300 text-orange-900 font-semibold' : 'hover:bg-gray-50 text-slate-600'}`}
                                    onClick={() => setChannels(c => ({ ...c, email: !c.email }))}>
                                    <Checkbox checked={channels.email} />
                                    <Mail className="w-4 h-4 text-orange-500" />
                                    <span className="text-xs">E-mail Gabinete</span>
                                </div>
                                <div className={`border p-2.5 rounded-lg flex items-center space-x-2 cursor-pointer transition-colors ${channels.sms ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold' : 'hover:bg-gray-50 text-slate-600'}`}
                                    onClick={() => setChannels(c => ({ ...c, sms: !c.sms }))}>
                                    <Checkbox checked={channels.sms} />
                                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                                    <span className="text-xs">SMS Direto</span>
                                </div>
                            </div>
                        </div>

                        {/* ─── 3. Conteúdo da Mensagem ─── */}
                        <div className="space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-600">Título do Comunicado</Label>
                                <Input
                                    id="title"
                                    placeholder="Ex: Interdição Temporária da Av. dos Estados para Obras"
                                    value={title}
                                    className={`font-semibold ${isEmergency ? "border-red-400 focus-visible:ring-red-500 text-red-900 bg-red-50/20" : ""}`}
                                    onChange={e => setTitle(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">Corpo do Comunicado (Formatação Visual)</Label>
                                <div className={`rounded-xl border overflow-hidden ${isEmergency ? 'border-red-400' : 'border-slate-200'}`}>
                                    <ReactQuill
                                        theme="snow"
                                        value={body}
                                        onChange={setBody}
                                        modules={QUILL_MODULES}
                                        formats={QUILL_FORMATS}
                                        placeholder="Digite as instruções e detalhes oficiais para a população..."
                                        style={{ minHeight: '130px' }}
                                    />
                                </div>
                                <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                                    <span>💡 Use negrito para datas, prazos e números de emergência (199 / 193).</span>
                                    <span className="font-mono">{charCount} caracteres</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="image" className="text-xs font-medium text-slate-700">URL da Imagem / Banner (Opcional)</Label>
                                    <Input 
                                        id="image" 
                                        placeholder="https://exemplo.com/mapa-desvio.jpg" 
                                        value={imageUrl} 
                                        onChange={e => setImageUrl(e.target.value)} 
                                        className="text-xs"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="image-link" className="text-xs font-medium text-slate-700">Link ao Clicar (Site Oficial / Edital)</Label>
                                    <Input 
                                        id="image-link" 
                                        placeholder="https://prefeitura.sp.gov.br/noticias" 
                                        value={imageLink} 
                                        onChange={e => setImageLink(e.target.value)} 
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ─── 4. Segmentação Territorial & Bairros ─── */}
                        <div className="space-y-4 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-sm font-bold flex items-center gap-1.5 text-slate-900">
                                        <MapPin className="w-4 h-4 text-blue-600" /> Segmentação Territorial de Bairros
                                    </Label>
                                    <p className="text-xs text-slate-500">Escolha os bairros específicos ou envie para todo o município.</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="target-all-switch" className="text-xs font-medium text-slate-700 cursor-pointer">
                                        Toda a Cidade
                                    </Label>
                                    <Switch
                                        id="target-all-switch"
                                        checked={isTargetAll}
                                        onCheckedChange={setIsTargetAll}
                                    />
                                </div>
                            </div>

                            {/* Seletor de Bairros quando NÃO for toda a cidade */}
                            {!isTargetAll && (
                                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3.5">
                                    {/* Ações Rápidas */}
                                    <div className="flex flex-wrap items-center gap-1.5">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase mr-1">Atalhos:</span>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleSelectAllNeighborhoods}
                                            className="h-6 text-[10px] px-2 bg-white"
                                        >
                                            Todos ({cityNeighborhoodData?.neighborhoods.length || 0})
                                        </Button>
                                        {cityNeighborhoodData?.criticalBasinNeighborhoods && cityNeighborhoodData.criticalBasinNeighborhoods.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectBasinNeighborhoods}
                                                className="h-6 text-[10px] px-2 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                                            >
                                                🌊 Bacias de Alagamento ({cityNeighborhoodData.criticalBasinNeighborhoods.length})
                                            </Button>
                                        )}
                                        {cityNeighborhoodData?.criticalSlopeNeighborhoods && cityNeighborhoodData.criticalSlopeNeighborhoods.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleSelectSlopeNeighborhoods}
                                                className="h-6 text-[10px] px-2 bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                            >
                                                ⛰️ Encostas ({cityNeighborhoodData.criticalSlopeNeighborhoods.length})
                                            </Button>
                                        )}
                                        {selectedNeighborhoods.length > 0 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleClearNeighborhoods}
                                                className="h-6 text-[10px] px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                Limpar
                                            </Button>
                                        )}
                                    </div>

                                    {/* Lista de Chips de Bairros Cadastrados */}
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold text-slate-700">
                                            Bairros Disponíveis em {activeCityName}:
                                        </Label>
                                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white rounded-lg border border-slate-200">
                                            {cityNeighborhoodData?.neighborhoods.map(neighborhood => {
                                                const isChecked = selectedNeighborhoods.includes(neighborhood);
                                                return (
                                                    <button
                                                        key={neighborhood}
                                                        type="button"
                                                        onClick={() => toggleNeighborhood(neighborhood)}
                                                        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                                                            isChecked
                                                                ? 'bg-blue-600 text-white shadow-sm'
                                                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                                        }`}
                                                    >
                                                        {isChecked && <CheckCircle2 className="w-3 h-3" />}
                                                        {neighborhood}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Input de Bairro Customizado (para cidades sem lista completa) */}
                                    <div className="flex gap-2 items-center pt-1">
                                        <Input
                                            placeholder="Digitar outro bairro e pressionar Enter..."
                                            value={customNeighborhoodInput}
                                            onChange={e => setCustomNeighborhoodInput(e.target.value)}
                                            onKeyDown={handleAddCustomNeighborhood}
                                            className="text-xs h-8 bg-white"
                                        />
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleAddCustomNeighborhood}
                                            className="h-8 text-xs"
                                        >
                                            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                                        </Button>
                                    </div>

                                    {/* Bairros Selecionados */}
                                    {selectedNeighborhoods.length > 0 && (
                                        <div className="pt-2 border-t border-slate-200">
                                            <div className="text-[11px] text-slate-600 font-semibold mb-1">
                                                🎯 {selectedNeighborhoods.length} bairro(s) selecionado(s):
                                            </div>
                                            <div className="flex flex-wrap gap-1">
                                                {selectedNeighborhoods.map(n => (
                                                    <Badge key={n} variant="secondary" className="bg-blue-100 text-blue-900 gap-1 text-[10px] pr-1">
                                                        {n}
                                                        <X 
                                                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                                                            onClick={() => toggleNeighborhood(n)} 
                                                        />
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Botão de Disparo */}
                        <Button
                            className={`w-full text-base font-bold shadow-md py-6 ${
                                isEmergency 
                                    ? 'bg-red-600 hover:bg-red-700 text-white animate-none ring-2 ring-red-300' 
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                            size="lg"
                            onClick={handleSend}
                            disabled={loading}
                        >
                            {loading ? (
                                'Processando disparo...'
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Send className="w-5 h-5" />
                                    {isEmergency ? '🚨 DISPARAR ALERTA DE EMERGÊNCIA' : 'Publicar e Disparar Comunicado'}
                                </span>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Simulador / Mockup do Smartphone em Tempo Real */}
            <div className="xl:col-span-5 space-y-4">
                <Card className="border-slate-200 shadow-sm bg-slate-900 text-white overflow-hidden">
                    <CardHeader className="pb-3 border-b border-slate-800">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-blue-400" />
                                <span className="text-sm font-bold">Simulador Mobile em Tempo Real</span>
                            </div>
                            <div className="flex gap-1 bg-slate-800 p-0.5 rounded-lg text-xs">
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('push')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                        previewTab === 'push' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Push Notification
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPreviewTab('feed')}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                                        previewTab === 'feed' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Feed do Cidadão
                                </button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 flex flex-col items-center justify-center">
                        
                        {/* Moldura do Smartphone */}
                        <div className="w-[300px] h-[540px] bg-slate-950 rounded-[40px] p-3 shadow-2xl border-[4px] border-slate-700 relative flex flex-col overflow-hidden">
                            {/* Dynamic Island / Notch */}
                            <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-end px-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            </div>

                            {/* Status Bar */}
                            <div className="flex justify-between items-center text-[10px] text-slate-400 px-3 mb-3">
                                <span className="font-semibold">09:41</span>
                                <div className="flex items-center gap-1.5">
                                    <Wifi className="w-3 h-3" />
                                    <BatteryCharging className="w-3 h-3 text-emerald-400" />
                                </div>
                            </div>

                            {/* Modo 1: Push Notification na Tela de Bloqueio */}
                            {previewTab === 'push' ? (
                                <div className="flex-1 flex flex-col justify-start pt-6 space-y-4">
                                    <div className="text-center text-slate-400 text-xs">
                                        <div className="text-3xl font-light text-white mb-1">09:41</div>
                                        <div>Quinta-feira, 22 de Agosto</div>
                                    </div>

                                    {/* Card de Push Notificação */}
                                    <div className={`p-3.5 rounded-2xl backdrop-blur-md border shadow-lg transition-all ${
                                        isEmergency
                                            ? 'bg-red-950/80 border-red-500 text-white ring-2 ring-red-500/50 animate-pulse'
                                            : 'bg-slate-900/90 border-slate-700 text-white'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-bold ${isEmergency ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                    🛡️
                                                </div>
                                                <span className="text-[10px] font-bold tracking-wide uppercase text-slate-300">
                                                    GUARDIÃO • {activeCityName.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-slate-400">agora</span>
                                        </div>

                                        <h5 className={`font-bold text-xs leading-snug mb-1 ${isEmergency ? 'text-red-300' : 'text-white'}`}>
                                            {title || 'Título do Comunicado Oficial'}
                                        </h5>

                                        <p className="text-[11px] text-slate-300 line-clamp-3 leading-relaxed">
                                            {plainTextBody || 'As instruções oficiais emitidas pela prefeitura serão exibidas aqui diretamente na tela de bloqueio do cidadão.'}
                                        </p>

                                        {imageUrl && (
                                            <div className="mt-2 rounded-lg overflow-hidden border border-slate-700 h-20 bg-slate-800">
                                                <img src={imageUrl} alt="Anexo" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                                            <span className="text-blue-400 font-semibold flex items-center gap-1">
                                                Toque para ver no mapa →
                                            </span>
                                            {isEmergency && (
                                                <span className="text-red-400 font-bold flex items-center gap-0.5">
                                                    <Siren className="w-3 h-3" /> URGENTE
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Modo 2: Card no Feed Cívico do Aplicativo */
                                <div className="flex-1 flex flex-col overflow-y-auto space-y-3 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
                                    <div className="flex items-center justify-between px-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Feed da Cidade</span>
                                        <Badge variant="outline" className="text-[9px] border-slate-700 text-blue-400 py-0">
                                            {activeCityName}
                                        </Badge>
                                    </div>

                                    {/* Card do Feed */}
                                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center text-xs">
                                                🏛️
                                            </div>
                                            <div className="flex-1 leading-tight">
                                                <div className="text-[11px] font-bold text-white flex items-center gap-1">
                                                    Prefeitura de {activeCityName}
                                                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                                </div>
                                                <div className="text-[9px] text-slate-400">Canal Oficial de Transparência</div>
                                            </div>
                                            <Badge className={`text-[9px] px-1.5 py-0 ${isEmergency ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
                                                {categoryTag}
                                            </Badge>
                                        </div>

                                        <h4 className="text-xs font-bold text-white leading-snug">
                                            {title || 'Título do Comunicado Oficial'}
                                        </h4>

                                        <div 
                                            className="text-[11px] text-slate-300 leading-relaxed max-h-32 overflow-hidden"
                                            dangerouslySetInnerHTML={{ __html: body || '<p>O conteúdo completo formatado aparecerá aqui no feed do cidadão...</p>' }}
                                        />

                                        {imageUrl && (
                                            <div className="rounded-lg overflow-hidden border border-slate-800 h-28 bg-slate-900">
                                                <img src={imageUrl} alt="Banner" className="w-full h-full object-cover" />
                                            </div>
                                        )}

                                        {selectedNeighborhoods.length > 0 && (
                                            <div className="text-[9px] text-blue-300 bg-blue-950/60 px-2 py-1 rounded border border-blue-900 flex items-center gap-1">
                                                <MapPin className="w-2.5 h-2.5" />
                                                Bairros: {selectedNeighborhoods.slice(0, 3).join(', ')}{selectedNeighborhoods.length > 3 ? ` +${selectedNeighborhoods.length - 3}` : ''}
                                            </div>
                                        )}

                                        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                                            <span>👍 142 cidadãos cientes</span>
                                            <span className="text-blue-400 font-semibold">Compartilhar</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Home Indicator */}
                            <div className="w-24 h-1 bg-slate-600 rounded-full mx-auto mt-auto pt-0.5" />
                        </div>

                        {/* Estatística de Alcance Previsto */}
                        <div className="w-full mt-4 bg-slate-800/60 p-3 rounded-xl border border-slate-700 text-center space-y-1">
                            <div className="text-[11px] text-slate-400">Estimativa de Alcance Imediato:</div>
                            <div className="text-lg font-extrabold text-emerald-400 flex items-center justify-center gap-1.5">
                                <Users className="w-4 h-4" /> ~{estimatedAudienceCount.toLocaleString('pt-BR')} munícipes
                            </div>
                            <div className="text-[10px] text-slate-400">
                                {isTargetAll 
                                    ? `Cobertura em 100% da base ativa de ${activeCityName}` 
                                    : `Segmentado em ${selectedNeighborhoods.length} bairro(s) selecionado(s)`}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MessageComposer;

