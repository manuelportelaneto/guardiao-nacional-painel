import React, { useState, useMemo, useEffect } from 'react';
import { collection, addDoc, getDocs, query, serverTimestamp, Timestamp } from 'firebase/firestore';
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import {
    Send, Smartphone, Bell, Mail, MessageSquare, Users, Target, ClipboardList,
    ScrollText, Plus, Trash2, ShieldAlert, Sparkles, Building2, MapPin, CheckCircle2,
    X, AlertTriangle, Eye, Layers, Wifi, BatteryCharging, Radio, Siren,
    CloudRain, Wind, TestTube2, RefreshCw, ExternalLink, Check, Clock,
    Volume2, VolumeX
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
import { civilDefenseService } from '../../services/civilDefenseService';
import type { OfficialCivilDefenseAlert } from '../../types/civilDefense';
import { notificationService } from '../../services/notificationService';
import { CivilDefenseAlertQueue } from './communication/CivilDefenseAlertQueue';

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

    // Controle de Abas Principais (Composição vs Fila de Alertas Oficiais)
    const [activeMainTab, setActiveMainTab] = useState<'compose' | 'queue'>('compose');

    // Template Selecionado
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

    // Content State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageLink, setImageLink] = useState('');
    // Modalidade de Prioridade de Entrega:
    // - 'siren_and_overlay': Toca sirene estridente e destaca na tela
    // - 'overlay_only': Somente destaque na tela (sem sirene sonora)
    // - 'standard': Envio padrão (sem sirene e sem destaque de tela)
    const [priorityMode, setPriorityMode] = useState<'siren_and_overlay' | 'overlay_only' | 'standard'>('standard');
    const isEmergency = priorityMode !== 'standard';
    const setIsEmergency = (val: boolean) => {
        setPriorityMode(val ? 'siren_and_overlay' : 'standard');
    };
    const [categoryTag, setCategoryTag] = useState<string>('Geral');

    // Vigência do Alerta de Emergência na Tela (Expiração Automática no Backend)
    const [emergencyDurationHours, setEmergencyDurationHours] = useState<number>(2);
    const [officialAlertReference, setOfficialAlertReference] = useState<OfficialCivilDefenseAlert | null>(null);

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

    // Métricas Reais de Munícipes (Firestore)
    const [realTotalUsers, setRealTotalUsers] = useState<number>(0);
    const [realCityUsers, setRealCityUsers] = useState<number>(0);

    // Alertas Oficiais da Defesa Civil / INMET
    const [officialAlerts, setOfficialAlerts] = useState<OfficialCivilDefenseAlert[]>([]);
    const [isLoadingAlerts, setIsLoadingAlerts] = useState(false);
    const [showAlertsModal, setShowAlertsModal] = useState(false);

    // Modo de Homologação / Teste de Campanhas
    const [isTestMode, setIsTestMode] = useState(false);
    const [testEmail, setTestEmail] = useState('manuelportela@guardiaonacional.com');

    // Preview Mockup State (push vs inapp)
    const [previewTab, setPreviewTab] = useState<'push' | 'feed'>('push');

    // Identificação de Bairros da Cidade Atual do Escopo
    const activeCityId = scope.cityId || 'santo-andre';
    const activeCityName = scope.cityName || 'Santo André';
    const cityNeighborhoodData = useMemo(() => {
        return getCityNeighborhoods(activeCityId) || getCityNeighborhoods(activeCityName);
    }, [activeCityId, activeCityName]);

    // Carrega contagem real de munícipes cadastrados
    useEffect(() => {
        const loadRealAudienceMetrics = async () => {
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                const docs = usersSnap.docs.map(d => d.data());
                const total = docs.length;
                setRealTotalUsers(total);

                if (activeCityName || activeCityId) {
                    const normCity = activeCityName.toLowerCase().trim();
                    const cityMatches = docs.filter(u => {
                        const uCity = (u.cityName || u.city || '').toLowerCase().trim();
                        const uCityId = (u.cityId || '').toLowerCase().trim();
                        return uCityId === activeCityId.toLowerCase() || uCity.includes(normCity) || normCity.includes(uCity);
                    });
                    setRealCityUsers(cityMatches.length > 0 ? cityMatches.length : total);
                }
            } catch (err) {
                console.warn('Erro ao carregar contagem real de munícipes:', err);
            }
        };
        loadRealAudienceMetrics();
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

    // Consulta Alertas Oficiais da Defesa Civil / INMET via API Governamental
    const handleOpenCivilDefenseAlerts = async () => {
        setIsLoadingAlerts(true);
        setShowAlertsModal(true);
        try {
            const alerts = await civilDefenseService.getAlertsForScope(scope.state || 'SP', activeCityName);
            setOfficialAlerts(alerts);
        } catch (err) {
            console.warn('Falha ao buscar alertas oficiais:', err);
            toast.error('Não foi possível sincronizar alertas do INMET/Defesa Civil no momento.');
        } finally {
            setIsLoadingAlerts(false);
        }
    };

    // Aplica Alerta Governamental Selecionado (Importação Rápida ou Fila)
    const handleSelectAlertForDispatch = (alert: OfficialCivilDefenseAlert) => {
        setActiveMainTab('compose');
        setOfficialAlertReference(alert);
        setTitle(`🚨 ALERTA DEFESA CIVIL: ${alert.title}`);
        const instructionsHtml = alert.instructions && alert.instructions.length > 0
            ? `<ul>${alert.instructions.map(i => `<li>${i}</li>`).join('')}</ul>`
            : '<p>Mantenha-se em local seguro e siga as diretrizes dos agentes de proteção e defesa civil.</p>';

        setBody(`
            <p><strong>Aviso Oficial (${alert.source}):</strong></p>
            <p>${alert.description}</p>
            <p><strong>Instruções de Segurança e Prevenção:</strong></p>
            ${instructionsHtml}
            <p style="margin-top: 12px; color: #b91c1c; font-weight: bold;">
                Em situações de emergência, desabamento ou alagamento, contate a Defesa Civil (199) ou o Corpo de Bombeiros (193).
            </p>
        `);

        const isGrandePerigo = alert.severity === 'GRANDE_PERIGO';
        setPriorityMode(isGrandePerigo ? 'siren_and_overlay' : 'overlay_only');
        setCategoryTag('Defesa Civil');
        setMessageType('info');

        // Calcula vigência estimada com base na data de término do alerta meteorológico
        if (alert.endDate) {
            const diffHours = Math.max(Math.round((new Date(alert.endDate).getTime() - Date.now()) / (3600 * 1000)), 1);
            setEmergencyDurationHours(Math.min(Math.max(diffHours, 1), 24));
        } else {
            setEmergencyDurationHours(2);
        }

        setChannels({
            push: true,
            internal: true,
            email: true,
            sms: alert.severity === 'GRANDE_PERIGO'
        });

        setShowAlertsModal(false);
        toast.success(`Alerta de ${alert.source} Carregado na Composição!`, {
            description: `Prioridade definida como "${isGrandePerigo ? 'Sirene e Destaque' : 'Somente Destaque (Sem Sirene)'}". Vigência: ${emergencyDurationHours}h.`
        });
    };

    const handleApplyOfficialAlert = (alert: OfficialCivilDefenseAlert) => {
        handleSelectAlertForDispatch(alert);
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

    // Estimativa Real de Munícipes Atingidos baseada na contagem do Firestore
    const estimatedAudienceCount = useMemo(() => {
        if (manualListExclusive) {
            const emailCount = manualEmailList ? manualEmailList.split(/[\s,;]+/).filter(Boolean).length : 0;
            const smsCount = manualSmsList ? manualSmsList.split(/[\s,;]+/).filter(Boolean).length : 0;
            return Math.max(emailCount + smsCount, 1);
        }

        const baseMunicipal = realCityUsers > 0 ? realCityUsers : (realTotalUsers > 0 ? realTotalUsers : 25);
        const totalNeighborhoods = cityNeighborhoodData?.neighborhoods?.length || 20;

        if (isTargetAll) {
            return baseMunicipal;
        }

        if (selectedNeighborhoods.length > 0) {
            const fraction = Math.min(selectedNeighborhoods.length / totalNeighborhoods, 1);
            return Math.max(Math.round(fraction * baseMunicipal), selectedNeighborhoods.length);
        }

        return Math.min(baseMunicipal, 15);
    }, [isTargetAll, selectedNeighborhoods.length, realCityUsers, realTotalUsers, manualListExclusive, manualEmailList, manualSmsList, cityNeighborhoodData]);

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
                tag: isEmergency ? (priorityMode === 'siren_and_overlay' ? 'Emergência' : 'Alerta Prioritário') : categoryTag,
                categoryTag,
                type: messageType === 'poll' ? 'poll' : messageType === 'petition' ? 'petition' : (isEmergency ? 'emergency' : 'info'),
                channels: selectedChannels,
                isEmergency,
                hasSiren: priorityMode === 'siren_and_overlay',
                soundEnabled: priorityMode === 'siren_and_overlay',
                isSilentEmergency: priorityMode === 'overlay_only',
                priorityMode,
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

            // Vigência e Expiração Automática da Emergência no Backend
            if (isEmergency) {
                const expireDate = new Date(Date.now() + emergencyDurationHours * 60 * 60 * 1000);
                messageData.expiresAt = Timestamp.fromDate(expireDate);
                messageData.emergencyExpiresAt = Timestamp.fromDate(expireDate);
                messageData.emergencyDurationHours = emergencyDurationHours;
                if (officialAlertReference) {
                    messageData.officialSource = officialAlertReference.source;
                    messageData.officialAlertId = officialAlertReference.id;
                    messageData.officialSeverity = officialAlertReference.severity;
                }
            }

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

            // ─── Disparo em Modo de Teste / Homologação ───
            if (isTestMode) {
                // Envia e-mail de homologação diretamente para o administrador responsável
                await notificationService.sendEmail({
                    to: [testEmail || 'manuelportela@guardiaonacional.com'],
                    subject: `[HOMOLOGAÇÃO / TESTE] ${title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 2px dashed #f59e0b; border-radius: 12px; background: #fffbeb;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <img src="https://guardiao-painel-admin.web.app/logo.png" alt="Guardião Nacional" style="height: 48px; object-fit: contain;" />
                                <h3 style="color: #b45309; margin: 10px 0 2px 0;">AMBIENTE DE HOMOLOGAÇÃO & SIMULAÇÃO</h3>
                                <p style="color: #78350f; font-size: 12px; margin: 0;">Disparo de Teste de Campanha e Mensageria Oficial</p>
                            </div>
                            <div style="background: #ffffff; padding: 18px; border-radius: 8px; border: 1px solid #fde68a; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                                <h2 style="color: #0f172a; margin-top: 0; font-size: 18px;">${title}</h2>
                                <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                                    ${body}
                                </div>
                                ${imageUrl ? `<div style="margin-top: 15px;"><img src="${imageUrl}" alt="Anexo" style="max-width: 100%; border-radius: 6px;" /></div>` : ''}
                            </div>
                            <div style="margin-top: 18px; font-size: 11px; color: #92400e; border-top: 1px solid #fde68a; padding-top: 12px;">
                                <p style="margin: 0 0 6px 0;"><strong>📋 Parâmetros da Simulação de Entrega:</strong></p>
                                <ul style="margin: 0; padding-left: 18px; line-height: 1.5;">
                                    <li>Município Alvo: ${activeCityName} (${scope.state || 'SP'})</li>
                                    <li>Canais Selecionados: ${selectedChannels.join(', ').toUpperCase()}</li>
                                    <li>Estimativa de Munícipes: ~${estimatedAudienceCount.toLocaleString('pt-BR')} cidadãos</li>
                                    <li>Gravidade: ${isEmergency ? '🚨 EMERGÊNCIA MUNICIPAL' : 'Comunicado Informativo Padrão'}</li>
                                </ul>
                                <p style="margin: 10px 0 0 0; font-style: italic; color: #78350f;">
                                    * Este disparo foi emitido exclusivamente em ambiente de teste para conferência do gestor. Nenhum cidadão da base pública recebeu esta mensagem.
                                </p>
                            </div>
                        </div>
                    `
                });

                // Registra simulação no histórico com status controlado
                await addDoc(collection(db, 'messages'), {
                    ...messageData,
                    status: 'simulated_test',
                    isSimulation: true,
                    testRecipient: testEmail || 'manuelportela@guardiaonacional.com',
                    createdAt: serverTimestamp()
                });

                toast.success('Disparo de Homologação Realizado!', {
                    description: `Validação de teste despachada para ${testEmail}. Nenhum munícipe real foi impactado.`
                });
                return;
            }

            // ─── Disparo Real em Produção ───
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
            setPriorityMode('standard');
            setOfficialAlertReference(null);
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
        <div className="space-y-6">
            {/* ─── Barra Superior de Abas da Central de Mensageria ─── */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveMainTab('compose')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeMainTab === 'compose'
                                ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <MessageSquare className="w-4 h-4" />
                        Compositor de Mensagens & Alertas
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveMainTab('queue')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            activeMainTab === 'queue'
                                ? 'bg-orange-600 text-white shadow-sm ring-2 ring-orange-300'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        Fila de Alertas Governamentais & Defesa Civil
                        <Badge className="bg-white/20 text-white text-[10px] ml-1 py-0">APIs Oficiais</Badge>
                    </button>
                </div>

                <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 font-semibold px-2.5 py-1">
                        📍 {activeCityName} - {scope.state || 'SP'}
                    </Badge>
                </div>
            </div>

            {/* ─── Renderização da Fila de Alertas Governamentais ─── */}
            {activeMainTab === 'queue' ? (
                <CivilDefenseAlertQueue onSelectAlertForDispatch={handleSelectAlertForDispatch} />
            ) : (
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

                                {/* ─── Integração Oficial: Alertas Governamentais em Tempo Real (INMET & Defesa Civil) ─── */}
                                <div className="p-3.5 bg-gradient-to-r from-blue-50 via-slate-50 to-amber-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                                            <CloudRain className="w-5 h-5 animate-pulse" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-bold text-slate-900">Alertas Oficiais em Tempo Real</span>
                                                <Badge className="bg-blue-700 hover:bg-blue-700 text-white text-[9px] px-1.5 py-0 uppercase tracking-wide">
                                                    API Oficial Governo (INMET)
                                                </Badge>
                                            </div>
                                            <p className="text-[11px] text-slate-600">
                                                Importe dados meteorológicos e avisos da Defesa Civil para proteção de áreas de risco e prevenção de desastres.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => setActiveMainTab('queue')}
                                            className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold whitespace-nowrap gap-1.5 shadow-sm"
                                        >
                                            <ShieldAlert className="w-3.5 h-3.5" />
                                            Ver Fila Oficial
                                        </Button>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={handleOpenCivilDefenseAlerts}
                                            disabled={isLoadingAlerts}
                                            className="w-full sm:w-auto text-xs font-semibold whitespace-nowrap gap-1.5"
                                        >
                                            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAlerts ? 'animate-spin' : ''}`} />
                                            Sincronizar
                                        </Button>
                                    </div>
                                </div>

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

                            {/* Prioridade de Entrega / Modo de Alerta */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-slate-700">Prioridade de Entrega</Label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                    {/* Opção 1: Sirene + Destaque */}
                                    <button
                                        type="button"
                                        onClick={() => setPriorityMode('siren_and_overlay')}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                            priorityMode === 'siren_and_overlay'
                                                ? 'bg-red-50 border-red-400 ring-2 ring-red-400/50 shadow-sm'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Siren className={`w-4 h-4 ${priorityMode === 'siren_and_overlay' ? 'text-red-600 animate-pulse' : 'text-slate-500'}`} />
                                                <span className="text-xs font-bold text-slate-900">Sirene e Destaque</span>
                                            </div>
                                            <Badge className="bg-red-600 text-white text-[9px] px-1 py-0 font-bold">SIRENE</Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Alarme sonoro contínuo + tela de emergência. Para catástrofes e risco iminente.
                                        </p>
                                    </button>

                                    {/* Opção 2: Somente Destaque na Tela */}
                                    <button
                                        type="button"
                                        onClick={() => setPriorityMode('overlay_only')}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                            priorityMode === 'overlay_only'
                                                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/50 shadow-sm'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <VolumeX className={`w-4 h-4 ${priorityMode === 'overlay_only' ? 'text-amber-600' : 'text-slate-500'}`} />
                                                <span className="text-xs font-bold text-slate-900">Somente Destaque</span>
                                            </div>
                                            <Badge className="bg-amber-500 text-white text-[9px] px-1 py-0 font-bold">SEM SOM</Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Destaca na tela do munícipe sem emitir a sirene. Não assusta as pessoas.
                                        </p>
                                    </button>

                                    {/* Opção 3: Envio Padrão */}
                                    <button
                                        type="button"
                                        onClick={() => setPriorityMode('standard')}
                                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                                            priorityMode === 'standard'
                                                ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/50 shadow-sm'
                                                : 'bg-white border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <Bell className={`w-4 h-4 ${priorityMode === 'standard' ? 'text-blue-600' : 'text-slate-500'}`} />
                                                <span className="text-xs font-bold text-slate-900">Envio Padrão</span>
                                            </div>
                                            <Badge className="bg-slate-200 text-slate-700 text-[9px] px-1 py-0 font-bold">REGULAR</Badge>
                                        </div>
                                        <p className="text-[10px] text-slate-500 leading-tight">
                                            Notificação push convencional e publicação no feed e caixa de entrada.
                                        </p>
                                    </button>
                                </div>

                                {isEmergency && (
                                    <div className={`p-3 rounded-xl space-y-2 text-xs border ${
                                        priorityMode === 'siren_and_overlay'
                                            ? 'bg-red-50/90 border-red-200 text-red-950'
                                            : 'bg-amber-50/90 border-amber-200 text-amber-950'
                                    }`}>
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold flex items-center gap-1.5">
                                                <Clock className={`w-3.5 h-3.5 ${priorityMode === 'siren_and_overlay' ? 'text-red-600' : 'text-amber-600'}`} />
                                                {priorityMode === 'siren_and_overlay'
                                                    ? 'Vigência da Sirene no Celular dos Munícipes'
                                                    : 'Vigência do Destaque de Tela no Celular dos Munícipes'}
                                            </span>
                                            <Badge className={`text-[9px] ${
                                                priorityMode === 'siren_and_overlay'
                                                    ? 'bg-red-200 text-red-900 border-red-300'
                                                    : 'bg-amber-200 text-amber-900 border-amber-300'
                                            }`}>
                                                Auto-Expiração no Backend
                                            </Badge>
                                        </div>
                                        <p className={`text-[11px] leading-tight ${priorityMode === 'siren_and_overlay' ? 'text-red-800' : 'text-amber-800'}`}>
                                            Após este período, {priorityMode === 'siren_and_overlay' ? 'a sirene e o bloqueio de tela' : 'o destaque de tela'} são desativados automaticamente, mantendo a mensagem salva na caixa de notificações dos cidadãos.
                                        </p>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                                            {[
                                                { label: '1 hora (Rápido)', val: 1 },
                                                { label: '2 horas (Padrão)', val: 2 },
                                                { label: '4 horas (Intenso)', val: 4 },
                                                { label: '12 horas (Severo)', val: 12 }
                                            ].map(opt => (
                                                <button
                                                    key={opt.val}
                                                    type="button"
                                                    onClick={() => setEmergencyDurationHours(opt.val)}
                                                    className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                                                        emergencyDurationHours === opt.val
                                                            ? (priorityMode === 'siren_and_overlay'
                                                                ? 'bg-red-600 text-white border-red-700 shadow-sm'
                                                                : 'bg-amber-600 text-white border-amber-700 shadow-sm')
                                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
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

                        {/* ─── Controle de Ambiente: Homologação / Modo de Teste ─── */}
                        <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                                        <TestTube2 className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                                            Ambiente de Teste & Validação
                                            {isTestMode && <Badge className="bg-amber-600 text-white text-[9px] px-1.5 py-0">HOMOLOGAÇÃO ATIVA</Badge>}
                                        </span>
                                        <p className="text-[11px] text-amber-800">
                                            Valide layout, links e entrega técnica sem disparar mensagens aos munícipes reais.
                                        </p>
                                    </div>
                                </div>
                                <Switch
                                    id="testModeSwitch"
                                    checked={isTestMode}
                                    onCheckedChange={setIsTestMode}
                                />
                            </div>

                            {isTestMode && (
                                <div className="pt-2 border-t border-amber-200/80 flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs">
                                    <Label htmlFor="testEmailInput" className="text-[11px] text-amber-900 font-bold whitespace-nowrap">
                                        E-mail para Validação de Teste:
                                    </Label>
                                    <Input
                                        id="testEmailInput"
                                        type="email"
                                        value={testEmail}
                                        onChange={(e) => setTestEmail(e.target.value)}
                                        className="h-8 text-xs bg-white border-amber-300 text-amber-950 focus:border-amber-500 font-medium"
                                        placeholder="manuelportela@guardiaonacional.com"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Botão de Disparo */}
                        <Button
                            className={`w-full text-base font-bold shadow-md py-6 transition-all ${
                                isTestMode
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300'
                                    : priorityMode === 'siren_and_overlay'
                                        ? 'bg-red-600 hover:bg-red-700 text-white animate-none ring-2 ring-red-300'
                                        : priorityMode === 'overlay_only'
                                            ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-300'
                                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                            size="lg"
                            onClick={handleSend}
                            disabled={loading}
                        >
                            {loading ? (
                                'Processando envio...'
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    {isTestMode ? (
                                        <>
                                            <TestTube2 className="w-5 h-5" />
                                            🔬 DISPARAR TESTE DE HOMOLOGAÇÃO (Validação Segura)
                                        </>
                                    ) : priorityMode === 'siren_and_overlay' ? (
                                        <>
                                            <Siren className="w-5 h-5 animate-pulse" />
                                            🚨 DISPARAR ALERTA COM SIRENE E DESTAQUE
                                        </>
                                    ) : priorityMode === 'overlay_only' ? (
                                        <>
                                            <VolumeX className="w-5 h-5" />
                                            📱 DISPARAR SOMENTE DESTAQUE NA TELA (SEM SIRENE)
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5" />
                                            Publicar e Disparar Comunicado
                                        </>
                                    )}
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
                                        priorityMode === 'siren_and_overlay'
                                            ? 'bg-red-950/80 border-red-500 text-white ring-2 ring-red-500/50 animate-pulse'
                                            : priorityMode === 'overlay_only'
                                                ? 'bg-amber-950/80 border-amber-500 text-white ring-2 ring-amber-500/40'
                                                : 'bg-slate-900/90 border-slate-700 text-white'
                                    }`}>
                                        <div className="flex items-center justify-between mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                <div className={`w-4 h-4 rounded flex items-center justify-center overflow-hidden ${
                                                    priorityMode === 'siren_and_overlay'
                                                        ? 'bg-red-600'
                                                        : priorityMode === 'overlay_only'
                                                            ? 'bg-amber-600'
                                                            : 'bg-slate-800'
                                                }`}>
                                                    <img src="/logo.png" alt="Guardião" className="w-full h-full object-contain" />
                                                </div>
                                                <span className="text-[10px] font-bold tracking-wide uppercase text-slate-300">
                                                    GUARDIÃO • {activeCityName.toUpperCase()}
                                                </span>
                                            </div>
                                            <span className="text-[9px] text-slate-400">agora</span>
                                        </div>

                                        <h5 className={`font-bold text-xs leading-snug mb-1 ${
                                            priorityMode === 'siren_and_overlay'
                                                ? 'text-red-300'
                                                : priorityMode === 'overlay_only'
                                                    ? 'text-amber-200'
                                                    : 'text-white'
                                        }`}>
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
                                            {priorityMode === 'siren_and_overlay' ? (
                                                <span className="text-red-400 font-bold flex items-center gap-0.5">
                                                    <Siren className="w-3 h-3 animate-pulse" /> SIRENE ATIVA
                                                </span>
                                            ) : priorityMode === 'overlay_only' ? (
                                                <span className="text-amber-400 font-bold flex items-center gap-0.5">
                                                    <VolumeX className="w-3 h-3" /> DESTAQUE VISUAL
                                                </span>
                                            ) : null}
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
                                            <div className="w-7 h-7 rounded-full bg-blue-950 border border-blue-800 flex items-center justify-center overflow-hidden p-0.5">
                                                <img src="/logo.png" alt="Prefeitura" className="w-full h-full object-contain" />
                                            </div>
                                            <div className="flex-1 leading-tight">
                                                <div className="text-[11px] font-bold text-white flex items-center gap-1">
                                                    Prefeitura de {activeCityName}
                                                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                                                </div>
                                                <div className="text-[9px] text-slate-400">Canal Oficial de Transparência</div>
                                            </div>
                                            <Badge className={`text-[9px] px-1.5 py-0 ${
                                                priorityMode === 'siren_and_overlay'
                                                    ? 'bg-red-600 text-white'
                                                    : priorityMode === 'overlay_only'
                                                        ? 'bg-amber-600 text-white'
                                                        : 'bg-blue-600 text-white'
                                            }`}>
                                                {priorityMode === 'siren_and_overlay' ? 'Emergência' : priorityMode === 'overlay_only' ? 'Alerta' : categoryTag}
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
            )}

            {/* Modal de Alertas Oficiais da Defesa Civil / INMET */}
            <Dialog open={showAlertsModal} onOpenChange={setShowAlertsModal}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-slate-900">
                                    Alertas Oficiais Governamentais (INMET & Defesa Civil)
                                </DialogTitle>
                                <DialogDescription className="text-xs text-slate-500">
                                    Dados em tempo real para prevenção de desastres e incidentes em {activeCityName} ({scope.state || 'SP'}).
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {isLoadingAlerts ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
                            <RefreshCw className="w-8 h-8 animate-spin text-orange-500" />
                            <p className="text-xs font-medium">Sincronizando com as APIs oficiais do INMET e Defesa Civil...</p>
                        </div>
                    ) : officialAlerts.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed rounded-xl p-6 bg-slate-50">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <p className="text-sm font-semibold text-slate-800">Nenhum Alerta Crítico Vigente</p>
                            <p className="text-xs text-slate-500 max-w-md mx-auto">
                                Não há avisos meteorológicos de perigo emitidos pelo INMET ou Defesa Civil para {activeCityName} no momento.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 py-2">
                            {officialAlerts.map(alert => {
                                const isExtreme = alert.severity === 'GRANDE_PERIGO' || alert.severity === 'PERIGO';
                                return (
                                    <div
                                        key={alert.id}
                                        className={`p-4 rounded-xl border transition-all ${
                                            isExtreme 
                                                ? 'bg-red-50/70 border-red-200' 
                                                : 'bg-amber-50/70 border-amber-200'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge className={`text-[10px] font-bold ${
                                                    isExtreme ? 'bg-red-600 text-white' : 'bg-amber-600 text-white'
                                                }`}>
                                                    {alert.source} • {alert.severity.replace('_', ' ')}
                                                </Badge>
                                                <span className="text-[11px] text-slate-500 font-medium">
                                                    Nível de Risco: {alert.riskLevel}/5
                                                </span>
                                            </div>
                                            <Button
                                                size="sm"
                                                className="h-8 text-xs font-bold gap-1 bg-slate-900 hover:bg-slate-800 text-white"
                                                onClick={() => handleApplyOfficialAlert(alert)}
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                Aplicar no Comunicado
                                            </Button>
                                        </div>

                                        <h4 className="text-sm font-bold text-slate-900 mb-1">
                                            {alert.title}
                                        </h4>
                                        <p className="text-xs text-slate-700 leading-relaxed mb-2">
                                            {alert.description}
                                        </p>

                                        {alert.instructions && alert.instructions.length > 0 && (
                                            <div className="p-2.5 bg-white/80 rounded-lg border border-slate-200/80 text-[11px] text-slate-700">
                                                <p className="font-semibold text-slate-900 mb-1">Diretrizes de Segurança:</p>
                                                <ul className="list-disc pl-4 space-y-0.5">
                                                    {alert.instructions.map((inst, i) => (
                                                        <li key={i}>{inst}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            Fonte: APIs Públicas INMET / Defesa Civil Brasil
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAlertsModal(false)}
                            className="text-xs"
                        >
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default MessageComposer;

