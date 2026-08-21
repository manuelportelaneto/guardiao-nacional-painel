/**
 * @fileoverview Painel de Controle No-Code & CMS Vivo (`AdminNoCodeControl.tsx`).
 * 
 * Permite ao SysAdmin parametrizar todo o comportamento do aplicativo móvel,
 * formulários de ocorrências, feature flags e inteligência artificial sem necessidade de deploy.
 */

import React, { useState, useEffect } from 'react';
import {
    Sliders,
    Layers,
    Flag,
    Megaphone,
    BrainCircuit,
    Plus,
    Save,
    Trash2,
    Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { noCodeService } from '../../services/noCodeService';
import { useAuth } from '../../context/AuthContext';
import type { DynamicCategory, FeatureFlag, DynamicBanner, AIOrchestratorConfig, CustomFormField } from '../../types/scope';

export const AdminNoCodeControl: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('categories');
    const [, setLoading] = useState(true);

    // Estados dos Módulos
    const [categories, setCategories] = useState<DynamicCategory[]>([]);
    const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
    const [banners, setBanners] = useState<DynamicBanner[]>([]);
    const [aiConfig, setAiConfig] = useState<AIOrchestratorConfig | null>(null);

    // Modais e Edições
    const [categoryModalOpen, setCategoryModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<DynamicCategory | null>(null);
    const [bannerModalOpen, setBannerModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<DynamicBanner | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [cats, flags, bans, ai] = await Promise.all([
                noCodeService.getCategories(),
                noCodeService.getFeatureFlags(),
                noCodeService.getBanners(),
                noCodeService.getAIConfig(),
            ]);
            setCategories(cats);
            setFeatureFlags(flags);
            setBanners(bans);
            setAiConfig(ai);
        } catch (error) {
            toast.error('Erro ao carregar configurações do sistema.');
        } finally {
            setLoading(false);
        }
    };

    // ─── Handlers de Categorias ──────────────────────────────────────────────
    const handleSaveCategory = async () => {
        if (!editingCategory || !currentUser) return;
        try {
            await noCodeService.saveCategory(editingCategory, currentUser.uid);
            toast.success('Categoria salva com sucesso!');
            setCategoryModalOpen(false);
            setEditingCategory(null);
            loadData();
        } catch (error) {
            toast.error('Erro ao salvar categoria.');
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Deseja excluir esta categoria?') || !currentUser) return;
        try {
            await noCodeService.deleteCategory(id, currentUser.uid);
            toast.success('Categoria removida.');
            loadData();
        } catch (error) {
            toast.error('Erro ao remover categoria.');
        }
    };

    const handleAddCustomField = () => {
        if (!editingCategory) return;
        const newField: CustomFormField = {
            id: 'field_' + Date.now(),
            label: 'Novo Campo',
            type: 'text',
            required: false,
        };
        setEditingCategory({
            ...editingCategory,
            customFields: [...(editingCategory.customFields || []), newField],
        });
    };

    // ─── Handlers de Feature Flags ───────────────────────────────────────────
    const handleToggleFlag = async (id: string, currentVal: boolean) => {
        if (!currentUser) return;
        try {
            await noCodeService.toggleFeatureFlag(id, !currentVal, currentUser.uid);
            toast.success(`Flag ${!currentVal ? 'ativada' : 'desativada'}.`);
            loadData();
        } catch (error) {
            toast.error('Erro ao atualizar flag.');
        }
    };

    // ─── Handlers de Banners ─────────────────────────────────────────────────
    const handleSaveBanner = async () => {
        if (!editingBanner || !currentUser) return;
        try {
            await noCodeService.saveBanner(editingBanner, currentUser.uid);
            toast.success('Aviso publicado com sucesso!');
            setBannerModalOpen(false);
            loadData();
        } catch (error) {
            toast.error('Erro ao publicar banner.');
        }
    };

    // ─── Handlers de AI Orchestrator ─────────────────────────────────────────
    const handleSaveAIConfig = async () => {
        if (!aiConfig || !currentUser) return;
        try {
            await noCodeService.saveAIConfig(aiConfig, currentUser.uid);
            toast.success('Parâmetros de Inteligência Artificial atualizados!');
        } catch (error) {
            toast.error('Erro ao salvar configurações de IA.');
        }
    };

    return (
        <div className="space-y-6">
            {/* Cabeçalho */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Sliders className="h-8 w-8 text-blue-600" />
                        Gestão de Recursos, Flags & IA
                    </h1>
                    <p className="text-slate-500">
                        Gerencie formulários, taxonomia, feature flags e inteligência artificial do Guardião Nacional em tempo real.
                    </p>
                </div>
            </div>

            {/* Abas Principais */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto">
                    <TabsTrigger value="categories" className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Categorias & SLAs
                    </TabsTrigger>
                    <TabsTrigger value="flags" className="flex items-center gap-2">
                        <Flag className="w-4 h-4" />
                        Feature Flags
                    </TabsTrigger>
                    <TabsTrigger value="banners" className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4" />
                        Banners & Avisos
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" />
                        Orquestrador de IA
                    </TabsTrigger>
                </TabsList>

                {/* ─── ABA 1: CATEGORIAS & SLAs ──────────────────────────────── */}
                <TabsContent value="categories" className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Categorias de Ocorrências</h2>
                            <p className="text-sm text-slate-500">Defina os tipos de chamados, prazos máximos de resolução e campos específicos.</p>
                        </div>
                        <Button
                            onClick={() => {
                                setEditingCategory({
                                    id: 'cat_' + Date.now(),
                                    name: '',
                                    slug: '',
                                    description: '',
                                    icon: 'AlertCircle',
                                    color: '#3b82f6',
                                    slaHours: 48,
                                    priority: 'medium',
                                    active: true,
                                    customFields: [],
                                    createdAt: new Date().toISOString(),
                                    updatedAt: new Date().toISOString(),
                                });
                                setCategoryModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            <Plus className="w-4 h-4" /> Nova Categoria
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((cat) => (
                            <Card key={cat.id} className="hover:shadow-md transition-shadow border-slate-200">
                                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            {cat.name.charAt(0)}
                                        </div>
                                        <div>
                                            <CardTitle className="text-base font-semibold text-slate-900">{cat.name}</CardTitle>
                                            <p className="text-xs text-slate-400 font-mono">SLA: {cat.slaHours}h</p>
                                        </div>
                                    </div>
                                    <Badge variant={cat.active ? 'default' : 'secondary'} className={cat.active ? 'bg-green-100 text-green-800' : ''}>
                                        {cat.active ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-xs text-slate-600 line-clamp-2">{cat.description}</p>
                                    <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
                                        <span>Campos extras: {cat.customFields?.length || 0}</span>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    setEditingCategory(cat);
                                                    setCategoryModalOpen(true);
                                                }}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:bg-red-50"
                                                onClick={() => handleDeleteCategory(cat.id)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 2: FEATURE FLAGS & REMOTE CONFIG ───────────────────── */}
                <TabsContent value="flags" className="space-y-4 pt-4">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Feature Flags & Remote Config</h2>
                        <p className="text-sm text-slate-500">Controle o rollout e ativação de recursos no aplicativo mobile e web em tempo real.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {featureFlags.map((flag) => (
                            <Card key={flag.id} className="border-slate-200">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div>
                                        <CardTitle className="text-base font-semibold text-slate-900">{flag.name}</CardTitle>
                                        <p className="text-xs text-slate-400 font-mono">{flag.key}</p>
                                    </div>
                                    <Switch
                                        checked={flag.enabled}
                                        onCheckedChange={() => handleToggleFlag(flag.id, flag.enabled)}
                                    />
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <p className="text-xs text-slate-600">{flag.description}</p>
                                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                        {flag.targetPlatforms.map(p => (
                                            <Badge key={p} variant="outline" className="text-xs uppercase">{p}</Badge>
                                        ))}
                                        <Badge variant="secondary" className="text-xs">Rollout: {flag.rolloutPercentage}%</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 3: BANNERS & AVISOS ────────────────────────────────── */}
                <TabsContent value="banners" className="space-y-4 pt-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Banners e Alertas de Defesa Civil</h2>
                            <p className="text-sm text-slate-500">Crie avisos e alertas meteorológicos exibidos em destaque no topo do App Mobile.</p>
                        </div>
                        <Button
                            onClick={() => {
                                setEditingBanner({
                                    id: 'banner_' + Date.now(),
                                    title: '',
                                    message: '',
                                    priority: 'info',
                                    active: true,
                                    targetLevel: 'NATIONAL',
                                    createdAt: new Date().toISOString(),
                                });
                                setBannerModalOpen(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                        >
                            <Plus className="w-4 h-4" /> Novo Aviso
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {banners.map((ban) => (
                            <Card key={ban.id} className={`border ${ban.priority === 'emergency' ? 'border-red-300 bg-red-50/40' : 'border-slate-200'}`}>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-semibold text-slate-900">{ban.title}</CardTitle>
                                    <Badge variant={ban.priority === 'emergency' ? 'destructive' : 'default'}>
                                        {ban.priority.toUpperCase()}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-xs text-slate-700">{ban.message}</p>
                                    <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                                        <span>Alvo: {ban.targetLevel}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500"
                                            onClick={async () => {
                                                if (currentUser) {
                                                    await noCodeService.deleteBanner(ban.id, currentUser.uid);
                                                    loadData();
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ─── ABA 4: ORQUESTRADOR DE IA ─────────────────────────────── */}
                <TabsContent value="ai" className="space-y-4 pt-4">
                    {aiConfig && (
                        <Card className="border-slate-200">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-purple-600" />
                                    Parâmetros do Motor de Inteligência Artificial
                                </CardTitle>
                                <CardDescription>
                                    Configure o provedor de IA, sensibilidade da moderação automática e prompts do sistema.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <Label>Provedor LLM</Label>
                                        <Select
                                            value={aiConfig.provider}
                                            onValueChange={(val: any) => setAiConfig({ ...aiConfig, provider: val })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="gemini">Google Gemini (Recomendado)</SelectItem>
                                                <SelectItem value="claude">Anthropic Claude</SelectItem>
                                                <SelectItem value="openai">OpenAI GPT</SelectItem>
                                                <SelectItem value="deepseek">DeepSeek AI</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label>Modelo de IA</Label>
                                        <Input
                                            value={aiConfig.modelName}
                                            onChange={e => setAiConfig({ ...aiConfig, modelName: e.target.value })}
                                            placeholder="ex: gemini-2.5-flash"
                                        />
                                    </div>

                                    <div>
                                        <Label>Limiar de Auto-Aprovação (Risco ≤)</Label>
                                        <Select
                                            value={aiConfig.autoApproveThreshold.toString()}
                                            onValueChange={(val) => setAiConfig({ ...aiConfig, autoApproveThreshold: parseInt(val) })}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="1">1 - Ultra Estrito (Pouca aprovação)</SelectItem>
                                                <SelectItem value="2">2 - Moderado</SelectItem>
                                                <SelectItem value="3">3 - Padrão Equilibrado</SelectItem>
                                                <SelectItem value="4">4 - Permissivo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label>Prompt do Sistema de Moderação</Label>
                                    <Textarea
                                        rows={5}
                                        value={aiConfig.systemPrompt}
                                        onChange={e => setAiConfig({ ...aiConfig, systemPrompt: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div>
                                    <Label>Blacklist Regex de Termos Banidos</Label>
                                    <Input
                                        value={aiConfig.bannedWordsRegex}
                                        onChange={e => setAiConfig({ ...aiConfig, bannedWordsRegex: e.target.value })}
                                        className="font-mono text-xs"
                                    />
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={handleSaveAIConfig} className="bg-purple-600 hover:bg-purple-700 text-white gap-2">
                                        <Save className="w-4 h-4" /> Salvar Configurações de IA
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* ─── MODAL DE EDIÇÃO DE CATEGORIA ─────────────────────────────── */}
            <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Configurar Categoria de Ocorrência</DialogTitle>
                        <DialogDescription>Edite nome, SLA, cor e campos do formulário para os cidadãos.</DialogDescription>
                    </DialogHeader>

                    {editingCategory && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Nome da Categoria</Label>
                                    <Input
                                        value={editingCategory.name}
                                        onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                        placeholder="Ex: Poda de Árvores"
                                    />
                                </div>
                                <div>
                                    <Label>SLA Máximo de Atendimento (Horas)</Label>
                                    <Input
                                        type="number"
                                        value={editingCategory.slaHours}
                                        onChange={e => setEditingCategory({ ...editingCategory, slaHours: parseInt(e.target.value) || 24 })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Cor de Identificação</Label>
                                    <div className="flex gap-2 items-center mt-1">
                                        <input
                                            type="color"
                                            value={editingCategory.color}
                                            onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                            className="h-9 w-12 rounded cursor-pointer border"
                                        />
                                        <Input
                                            value={editingCategory.color}
                                            onChange={e => setEditingCategory({ ...editingCategory, color: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>Prioridade Padrão</Label>
                                    <Select
                                        value={editingCategory.priority}
                                        onValueChange={(val: any) => setEditingCategory({ ...editingCategory, priority: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="low">Baixa</SelectItem>
                                            <SelectItem value="medium">Média</SelectItem>
                                            <SelectItem value="high">Alta</SelectItem>
                                            <SelectItem value="urgent">Urgente</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Descrição das Ocorrências</Label>
                                <Textarea
                                    rows={2}
                                    value={editingCategory.description}
                                    onChange={e => setEditingCategory({ ...editingCategory, description: e.target.value })}
                                />
                            </div>

                            {/* Campos Personalizados */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="flex justify-between items-center">
                                    <Label className="text-sm font-semibold">Campos Extras do Formulário no App</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddCustomField} className="gap-1">
                                        <Plus className="w-3 h-3" /> Campo Extra
                                    </Button>
                                </div>

                                {editingCategory.customFields?.map((field, idx) => (
                                    <div key={field.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded border">
                                        <Input
                                            value={field.label}
                                            onChange={e => {
                                                const updated = [...(editingCategory.customFields || [])];
                                                updated[idx].label = e.target.value;
                                                setEditingCategory({ ...editingCategory, customFields: updated });
                                            }}
                                            placeholder="Rótulo da pergunta"
                                            className="text-xs"
                                        />
                                        <Select
                                            value={field.type}
                                            onValueChange={(val: any) => {
                                                const updated = [...(editingCategory.customFields || [])];
                                                updated[idx].type = val;
                                                setEditingCategory({ ...editingCategory, customFields: updated });
                                            }}
                                        >
                                            <SelectTrigger className="w-32 text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Texto</SelectItem>
                                                <SelectItem value="number">Número</SelectItem>
                                                <SelectItem value="select">Seleção</SelectItem>
                                                <SelectItem value="boolean">Sim/Não</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500"
                                            onClick={() => {
                                                const updated = editingCategory.customFields?.filter((_, i) => i !== idx);
                                                setEditingCategory({ ...editingCategory, customFields: updated });
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCategoryModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveCategory} className="bg-blue-600 hover:bg-blue-700 text-white gap-1">
                            <Save className="w-4 h-4" /> Salvar Categoria
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ─── MODAL DE CRIAÇÃO DE BANNER ───────────────────────────────── */}
            <Dialog open={bannerModalOpen} onOpenChange={setBannerModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Configurar Banner / Alerta Oficial</DialogTitle>
                        <DialogDescription>Defina o aviso ou alerta de defesa civil exibido no aplicativo.</DialogDescription>
                    </DialogHeader>

                    {editingBanner && (
                        <div className="space-y-4 py-2">
                            <div>
                                <Label>Título do Aviso</Label>
                                <Input
                                    value={editingBanner.title}
                                    onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                                    placeholder="Ex: Alerta de Fortes Chuvas nas Próximas 24h"
                                />
                            </div>

                            <div>
                                <Label>Mensagem Completa</Label>
                                <Textarea
                                    rows={3}
                                    value={editingBanner.message}
                                    onChange={e => setEditingBanner({ ...editingBanner, message: e.target.value })}
                                    placeholder="Descreva as orientações para a população..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Prioridade do Alerta</Label>
                                    <Select
                                        value={editingBanner.priority}
                                        onValueChange={(val: any) => setEditingBanner({ ...editingBanner, priority: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="info">Informativo (Azul)</SelectItem>
                                            <SelectItem value="warning">Atenção (Amarelo)</SelectItem>
                                            <SelectItem value="emergency">Emergência / Defesa Civil (Vermelho)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label>Jurisdição Alvo</Label>
                                    <Select
                                        value={editingBanner.targetLevel}
                                        onValueChange={(val: any) => setEditingBanner({ ...editingBanner, targetLevel: val })}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NATIONAL">Nacional (Todo Brasil)</SelectItem>
                                            <SelectItem value="STATE">Estadual</SelectItem>
                                            <SelectItem value="MUNICIPAL">Municipal</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBannerModalOpen(false)}>Cancelar</Button>
                        <Button
                            onClick={handleSaveBanner}
                            className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                            <Save className="w-4 h-4" /> Salvar Aviso
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminNoCodeControl;
