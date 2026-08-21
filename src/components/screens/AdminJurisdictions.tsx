/**
 * @fileoverview Governança Federativa, Jurisdições e Multi-Tenancy (`AdminJurisdictions.tsx`).
 * 
 * Permite gerenciar a árvore federativa de Estados, Municípios Assinantes,
 * criar Secretarias Municipais do Zero e emular a visão de qualquer cliente em um clique.
 */

import React, { useState, useEffect } from 'react';
import {
    Landmark,
    Building2,
    Shield,
    Eye,
    RotateCcw,
    RefreshCw,
    Plus,
    Trash2,
    Send,
    CheckCircle2,
    Briefcase
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import { governmentService } from '../../services/governmentService';
import type { GovernmentDepartment, ContractType } from '../../types/government';

export const AdminJurisdictions: React.FC = () => {
    const { currentUser } = useAuth();
    const { scope, availableCities, availableStates, setJurisdiction, resetToNational, isEmulating, dataMasking, setDataMasking, scanForNewJurisdictions } = useScope();
    const [scanning, setScanning] = useState(false);

    // Lista de Secretarias do Município Selecionado
    const [selectedMunicipalityForDeps, setSelectedMunicipalityForDeps] = useState<string>('sao-paulo');
    const [departments, setDepartments] = useState<GovernmentDepartment[]>([]);
    const [loadingDeps, setLoadingDeps] = useState(false);

    // ─── ESTADO DO WIZARD DE ONBOARDING ───────────────────────────────────────
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState<1 | 2 | 3>(1);
    const [savingOnboarding, setSavingOnboarding] = useState(false);

    // Form: Dados do Município
    const [newCityName, setNewCityName] = useState('');
    const [newCityState, setNewCityState] = useState('SP');
    const [newCityPopulation, setNewCityPopulation] = useState('250000');
    const [newCityContract, setNewCityContract] = useState<ContractType>('CONVENIADA');
    const [newCityCoatOfArms, setNewCityCoatOfArms] = useState('');

    // Form: Secretarias Criadas do Zero
    const [newDepartments, setNewDepartments] = useState<{
        name: string;
        code: string;
        responsibleName: string;
        responsibleEmail: string;
        defaultSlaHours: number;
    }[]>([
        { name: 'Secretaria Municipal de Obras e Serviços Públicos', code: 'SMOSP', responsibleName: '', responsibleEmail: '', defaultSlaHours: 48 },
        { name: 'Secretaria de Mobilidade Urbana e Trânsito', code: 'SMUT', responsibleName: '', responsibleEmail: '', defaultSlaHours: 24 },
    ]);

    // Form: Primeiro Gestor / Prefeito
    const [mayorName, setMayorName] = useState('');
    const [mayorEmail, setMayorEmail] = useState('');

    const loadMunicipalitiesAndDeps = async () => {
        try {
            await governmentService.getMunicipalities();
            loadDepartments(selectedMunicipalityForDeps);
        } catch (e) {
            console.warn('Erro ao carregar dados:', e);
        }
    };

    const loadDepartments = async (cityId: string) => {
        setLoadingDeps(true);
        try {
            const deps = await governmentService.getDepartmentsByCity(cityId);
            setDepartments(deps);
        } catch (e) {
            toast.error('Erro ao carregar secretarias.');
        } finally {
            setLoadingDeps(false);
        }
    };

    useEffect(() => {
        loadMunicipalitiesAndDeps();
    }, []);

    useEffect(() => {
        if (selectedMunicipalityForDeps) {
            loadDepartments(selectedMunicipalityForDeps);
        }
    }, [selectedMunicipalityForDeps]);

    // Adicionar secretaria na lista temporária
    const handleAddDepartmentRow = () => {
        setNewDepartments(prev => [
            ...prev,
            { name: '', code: '', responsibleName: '', responsibleEmail: '', defaultSlaHours: 48 }
        ]);
    };

    const handleRemoveDepartmentRow = (index: number) => {
        setNewDepartments(prev => prev.filter((_, i) => i !== index));
    };

    const handleDepartmentChange = (index: number, field: string, value: any) => {
        setNewDepartments(prev => {
            const updated = [...prev];
            (updated[index] as any)[field] = value;
            return updated;
        });
    };

    // Submissão do Onboarding
    const handleFinishOnboarding = async () => {
        if (!newCityName || !currentUser) {
            toast.error('Preencha o nome do município.');
            return;
        }

        const validDepartments = newDepartments.filter(d => d.name.trim().length > 0);
        if (validDepartments.length === 0) {
            toast.error('Adicione ao menos uma secretaria municipal.');
            return;
        }

        setSavingOnboarding(true);
        try {
            const citySlug = newCityName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');

            await governmentService.createMunicipalityWithDepartments(
                {
                    id: citySlug,
                    name: newCityName,
                    state: newCityState,
                    population: parseInt(newCityPopulation, 10) || 0,
                    contractType: newCityContract,
                    coatOfArmsUrl: newCityCoatOfArms || undefined,
                },
                validDepartments.map(d => ({
                    name: d.name,
                    slug: d.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-'),
                    code: d.code,
                    responsibleName: d.responsibleName,
                    responsibleEmail: d.responsibleEmail,
                    categoriesManaged: ['zeladoria_geral'],
                    defaultSlaHours: d.defaultSlaHours,
                    active: true,
                })),
                currentUser.uid
            );

            // Se informado o e-mail do prefeito/gestor, dispara o convite institucional
            if (mayorEmail && mayorName) {
                await governmentService.createAndSendInvite({
                    name: mayorName,
                    email: mayorEmail,
                    role: 'prefeito',
                    officialTitle: `Prefeito de ${newCityName}`,
                    state: newCityState,
                    cityId: citySlug,
                    cityName: newCityName,
                    permissions: {
                        canModerate: true,
                        canDispatchTeams: true,
                        canExportReports: true,
                        canManageDepartment: true,
                        canInviteStaff: true,
                        canViewPII: true,
                    },
                    createdByUid: currentUser.uid
                }, currentUser.uid);
            }

            toast.success(`Município ${newCityName} conveniado com sucesso! ${validDepartments.length} secretarias configuradas.`);
            setIsOnboardingOpen(false);
            setOnboardingStep(1);
            setNewCityName('');
            setMayorEmail('');
            setMayorName('');
            loadMunicipalitiesAndDeps();
            scanForNewJurisdictions(true);
        } catch (error) {
            toast.error('Erro ao cadastrar município.');
        } finally {
            setSavingOnboarding(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Landmark className="h-8 w-8 text-blue-600" />
                        Governança Federativa & Jurisdições
                    </h1>
                    <p className="text-slate-500">
                        Gestão da árvore de entidades (Brasil ➔ Estados ➔ Municípios ➔ Secretarias) e controle de permissões por jurisdição.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        onClick={() => setIsOnboardingOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold shadow-sm"
                    >
                        <Plus className="w-4 h-4" /> Cadastrar Novo Município
                    </Button>

                    <Button
                        onClick={async () => {
                            setScanning(true);
                            try {
                                const res = await scanForNewJurisdictions(true);
                                toast.success(`Varredura concluída! ${res.newCount > 0 ? `${res.newCount} novos municípios detectados no banco!` : 'Todos os municípios com contribuições estão mapeados.'} (${res.totalCities} ativos)`);
                            } catch (e) {
                                toast.error('Erro ao verificar novas jurisdições no banco.');
                            } finally {
                                setScanning(false);
                            }
                        }}
                        disabled={scanning}
                        variant="outline"
                        className="gap-2 border-slate-300"
                    >
                        <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
                        {scanning ? 'Escaneando Banco...' : 'Escanear Novas Jurisdições'}
                    </Button>

                    {isEmulating && (
                        <Button
                            onClick={() => {
                                resetToNational();
                                toast.success('Retornado à visão SysAdmin Nacional.');
                            }}
                            variant="destructive"
                            className="gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Sair da Emulação (Voltar ao Brasil)
                        </Button>
                    )}
                </div>
            </div>

            {/* Banner de Escopo Ativo */}
            <Card className={`border ${isEmulating ? 'border-amber-300 bg-amber-50/40' : 'border-blue-200 bg-blue-50/30'}`}>
                <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${isEmulating ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-900">
                                Escopo Atual: <span className="font-bold text-blue-700">{scope.level}</span>
                                {scope.cityName && ` (${scope.cityName} - ${scope.state})`}
                                {scope.state && !scope.cityName && ` (Estado: ${scope.state})`}
                            </h4>
                            <p className="text-xs text-slate-500">
                                {isEmulating
                                    ? 'Você está visualizando o painel exatamente como o Gestor desta Jurisdição enxerga.'
                                    : 'Acesso Mestre Global irrestrito a todas as unidades federativas.'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600 font-medium">Mascaramento LGPD:</span>
                            <Switch checked={dataMasking} onCheckedChange={setDataMasking} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Lista de Municípios Cadastrados e Ações de Emulação */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-700" />
                            Municípios e Prefeituras Integradas
                        </span>
                        <Badge variant="outline" className="text-xs">
                            {availableCities.length} municípios monitorados
                        </Badge>
                    </CardTitle>
                    <CardDescription>
                        Clique em "Emular Visão" para acessar instantaneamente a visão restrita do Prefeito ou Secretários daquele município.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Município</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead>Status Contrato</TableHead>
                                <TableHead>Secretarias</TableHead>
                                <TableHead className="text-right">Ação de Controle</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {availableCities.map((city) => (
                                <TableRow
                                    key={city.id}
                                    className={`cursor-pointer transition-colors ${selectedMunicipalityForDeps === city.id ? 'bg-blue-50/50' : 'hover:bg-slate-50/80'}`}
                                    onClick={() => setSelectedMunicipalityForDeps(city.id)}
                                >
                                    <TableCell className="font-semibold flex items-center gap-2 text-slate-900">
                                        <Building2 className="w-4 h-4 text-blue-600" />
                                        {city.name}
                                    </TableCell>
                                    <TableCell><Badge variant="outline">{city.state}</Badge></TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                                            {city.status || 'Monitoramento Cívico'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-600">
                                        <span className="font-semibold text-blue-600">Ver Secretarias &rarr;</span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setJurisdiction('MUNICIPAL', city.state, city.id, city.name);
                                                toast.success(`Emulando visão de ${city.name}!`);
                                            }}
                                            className="text-xs gap-1 font-medium bg-white hover:bg-slate-50"
                                        >
                                            <Eye className="w-3.5 h-3.5 text-blue-600" /> Emular Visão
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Governança de Secretarias do Município Selecionado */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-indigo-600" />
                            Secretarias Municipais ({availableCities.find(c => c.id === selectedMunicipalityForDeps)?.name || selectedMunicipalityForDeps})
                        </h3>
                        <p className="text-xs text-slate-500">
                            Estrutura administrativa e triagem direta de ocorrências por departamento.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {loadingDeps ? (
                        <div className="col-span-3 text-center py-6 text-slate-500 text-xs">
                            Carregando secretarias...
                        </div>
                    ) : departments.length === 0 ? (
                        <div className="col-span-3 bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                            Nenhuma secretaria customizada cadastrada ainda para este município.
                        </div>
                    ) : (
                        departments.map((dep) => (
                            <Card key={dep.id} className="border-slate-200 shadow-sm hover:border-indigo-300 transition-all">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-sm font-semibold text-slate-900">
                                            {dep.name}
                                        </CardTitle>
                                        {dep.code && <Badge variant="secondary" className="text-[10px]">{dep.code}</Badge>}
                                    </div>
                                    {dep.responsibleName && (
                                        <CardDescription className="text-xs text-slate-500">
                                            Responsável: {dep.responsibleName}
                                        </CardDescription>
                                    )}
                                </CardHeader>
                                <CardContent className="space-y-2 text-xs text-slate-600">
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span className="text-slate-500">SLA de Resolução:</span>
                                        <span className="font-bold text-blue-700">{dep.defaultSlaHours} horas</span>
                                    </div>
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                        Secretaria Ativa
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* ─── MODAL WIZARD: CADASTRO DE NOVO MUNICÍPIO CONVENIADO (DO ZERO) ─── */}
            <Dialog open={isOnboardingOpen} onOpenChange={setIsOnboardingOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <Building2 className="w-5 h-5 text-emerald-600" />
                            Cadastrar Novo Município Conveniado
                        </DialogTitle>
                        <DialogDescription>
                            Wizard de criação e personalização de estrutura governamental do zero.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Stepper Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 text-xs font-semibold">
                        <span className={`flex items-center gap-1.5 ${onboardingStep === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            1. Dados do Município
                        </span>
                        <span>&rarr;</span>
                        <span className={`flex items-center gap-1.5 ${onboardingStep === 2 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            2. Secretarias do Zero
                        </span>
                        <span>&rarr;</span>
                        <span className={`flex items-center gap-1.5 ${onboardingStep === 3 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            3. Convite do Prefeito/Gestor
                        </span>
                    </div>

                    {/* ETAPA 1: DADOS DO MUNICÍPIO */}
                    {onboardingStep === 1 && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2">
                                    <Label htmlFor="cName">Nome do Município *</Label>
                                    <Input
                                        id="cName"
                                        placeholder="Ex: Campinas"
                                        value={newCityName}
                                        onChange={e => setNewCityName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label>Estado (UF) *</Label>
                                    <Select value={newCityState} onValueChange={setNewCityState}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {availableStates.map(s => (
                                                <SelectItem key={s.uf} value={s.uf}>{s.uf} - {s.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="pop">População Estimada</Label>
                                    <Input
                                        id="pop"
                                        type="number"
                                        placeholder="Ex: 350000"
                                        value={newCityPopulation}
                                        onChange={e => setNewCityPopulation(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label>Modalidade de Convênio</Label>
                                    <Select value={newCityContract} onValueChange={(val: any) => setNewCityContract(val)}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CONVENIADA">Prefeitura Conveniada (Pleno)</SelectItem>
                                            <SelectItem value="PILOTO">Projeto Piloto (30 Dias)</SelectItem>
                                            <SelectItem value="MONITORAMENTO_CIVICO">Monitoramento Cívico Aberto</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="coatUrl">URL do Brasão / Logotipo Oficial</Label>
                                <Input
                                    id="coatUrl"
                                    placeholder="https://prefeitura.sp.gov.br/brasao.png"
                                    value={newCityCoatOfArms}
                                    onChange={e => setNewCityCoatOfArms(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* ETAPA 2: SECRETARIAS CRIADAS DO ZERO */}
                    {onboardingStep === 2 && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold text-slate-800">
                                    Secretarias Municipais Ativas ({newDepartments.length})
                                </Label>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddDepartmentRow}
                                    className="text-xs gap-1"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Adicionar Secretaria
                                </Button>
                            </div>

                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {newDepartments.map((dep, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 relative">
                                        <div className="flex items-center justify-between gap-2">
                                            <Input
                                                placeholder="Nome da Secretaria (Ex: Secretaria de Saúde)"
                                                value={dep.name}
                                                onChange={e => handleDepartmentChange(idx, 'name', e.target.value)}
                                                className="text-xs flex-1"
                                            />
                                            <Input
                                                placeholder="Sigla (SMS)"
                                                value={dep.code}
                                                onChange={e => handleDepartmentChange(idx, 'code', e.target.value)}
                                                className="text-xs w-24"
                                            />
                                            {newDepartments.length > 1 && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleRemoveDepartmentRow(idx)}
                                                    className="h-8 w-8 text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <Input
                                                placeholder="Nome do Secretário(a)"
                                                value={dep.responsibleName}
                                                onChange={e => handleDepartmentChange(idx, 'responsibleName', e.target.value)}
                                                className="text-xs"
                                            />
                                            <Input
                                                placeholder="E-mail Institucional"
                                                value={dep.responsibleEmail}
                                                onChange={e => handleDepartmentChange(idx, 'responsibleEmail', e.target.value)}
                                                className="text-xs"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ETAPA 3: CONVITE DO PREFEITO/GESTOR */}
                    {onboardingStep === 3 && (
                        <div className="space-y-4 py-2">
                            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed">
                                <h4 className="font-bold flex items-center gap-1.5 text-blue-950 mb-1">
                                    <Send className="w-4 h-4" /> Envio de Convite Institucional Automático
                                </h4>
                                O responsável receberá um e-mail com link exclusivo para criação da senha de acesso e posse do painel de <strong>{newCityName} - {newCityState}</strong>.
                            </div>

                            <div className="space-y-3">
                                <div>
                                    <Label htmlFor="mName">Nome Completo do Prefeito ou Gestor Principal</Label>
                                    <Input
                                        id="mName"
                                        placeholder="Ex: Prefeito João Pereira"
                                        value={mayorName}
                                        onChange={e => setMayorName(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="mEmail">E-mail Institucional do Gabinete</Label>
                                    <Input
                                        id="mEmail"
                                        type="email"
                                        placeholder="Ex: gabinete@prefeitura.sp.gov.br"
                                        value={mayorEmail}
                                        onChange={e => setMayorEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between">
                        {onboardingStep > 1 ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOnboardingStep(prev => (prev - 1) as any)}
                            >
                                &larr; Voltar
                            </Button>
                        ) : <div />}

                        {onboardingStep < 3 ? (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (onboardingStep === 1 && !newCityName.trim()) {
                                        toast.error('Informe o nome do município.');
                                        return;
                                    }
                                    setOnboardingStep(prev => (prev + 1) as any);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                            >
                                Avançar &rarr;
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                disabled={savingOnboarding}
                                onClick={handleFinishOnboarding}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {savingOnboarding ? 'Cadastrando Município...' : 'Concluir Convênio'}
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminJurisdictions;
