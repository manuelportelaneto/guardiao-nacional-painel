/**
 * @fileoverview Central de Gestão de Servidores Públicos & Gestores Governamentais (`AdminGovernmentStaff.tsx`).
 * 
 * Exclusiva para servidores, prefeitos e secretários municipais (isolada da base de cidadãos).
 * Permite convidar por e-mail, atribuir cargos, secretarias e permissões granulares em conformidade com a LGPD.
 */

import React, { useState, useEffect } from 'react';
import {
    Briefcase,
    Building2,
    Plus,
    Search,
    Mail,
    CheckCircle2,
    Clock,
    Lock,
    Send
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import { governmentService } from '../../services/governmentService';
import type { GovernmentOfficial, OfficialRole, OfficialPermissions } from '../../types/government';

export const AdminGovernmentStaff: React.FC = () => {
    const { currentUser } = useAuth();
    const { scope, availableCities, dataMasking, setDataMasking } = useScope();

    const [officials, setOfficials] = useState<GovernmentOfficial[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCity, setSelectedCity] = useState<string>(scope.cityId || 'all');
    const [selectedRole, setSelectedRole] = useState<string>('all');

    // Modal de Convite
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const [inviting, setInviting] = useState(false);
    const [inviteForm, setInviteForm] = useState<{
        name: string;
        email: string;
        registrationNumber: string;
        role: OfficialRole;
        officialTitle: string;
        state: string;
        cityId: string;
        departmentName: string;
        permissions: OfficialPermissions;
    }>({
        name: '',
        email: '',
        registrationNumber: '',
        role: 'secretario',
        officialTitle: 'Secretário Municipal',
        state: scope.state || 'SP',
        cityId: scope.cityId || 'sao-paulo',
        departmentName: 'Secretaria de Obras & Serviços',
        permissions: {
            canModerate: true,
            canDispatchTeams: true,
            canExportReports: true,
            canManageDepartment: true,
            canInviteStaff: false,
            canViewPII: false,
        }
    });

    const loadOfficials = async () => {
        setLoading(true);
        try {
            const data = await governmentService.getOfficials({
                cityId: selectedCity !== 'all' ? selectedCity : undefined,
            });
            setOfficials(data);
        } catch (error) {
            toast.error('Erro ao carregar servidores públicos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOfficials();
    }, [selectedCity]);

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteForm.name || !inviteForm.email || !currentUser) {
            toast.error('Preencha nome e e-mail institucional.');
            return;
        }

        const cityObj = availableCities.find(c => c.id === inviteForm.cityId);
        const cityName = cityObj ? cityObj.name : inviteForm.cityId;

        setInviting(true);
        try {
            await governmentService.createAndSendInvite({
                name: inviteForm.name,
                email: inviteForm.email,
                registrationNumber: inviteForm.registrationNumber,
                role: inviteForm.role,
                officialTitle: inviteForm.officialTitle,
                state: inviteForm.state,
                cityId: inviteForm.cityId,
                cityName,
                departmentName: inviteForm.departmentName,
                permissions: inviteForm.permissions,
                createdByUid: currentUser.uid,
            }, currentUser.uid);

            toast.success(`Convite institucional enviado com sucesso para ${inviteForm.email}!`);
            setIsInviteModalOpen(false);
            setInviteForm({
                name: '',
                email: '',
                registrationNumber: '',
                role: 'secretario',
                officialTitle: 'Secretário Municipal',
                state: 'SP',
                cityId: 'sao-paulo',
                departmentName: 'Secretaria de Obras & Serviços',
                permissions: {
                    canModerate: true,
                    canDispatchTeams: true,
                    canExportReports: true,
                    canManageDepartment: true,
                    canInviteStaff: false,
                    canViewPII: false,
                }
            });
            loadOfficials();
        } catch (error) {
            toast.error('Erro ao enviar convite institucional.');
        } finally {
            setInviting(false);
        }
    };

    const handleToggleStatus = async (official: GovernmentOfficial) => {
        if (!currentUser) return;
        const newStatus = official.status === 'ATIVO' ? 'SUSPENSO' : 'ATIVO';
        try {
            await governmentService.updateOfficialStatus(official.id, newStatus, currentUser.uid);
            toast.success(`Servidor ${official.name} marcado como ${newStatus}.`);
            loadOfficials();
        } catch (err) {
            toast.error('Erro ao atualizar status do servidor.');
        }
    };

    const filteredOfficials = officials.filter(off => {
        const matchesSearch =
            off.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            off.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (off.registrationNumber && off.registrationNumber.includes(searchTerm));
        const matchesRole = selectedRole === 'all' || off.role === selectedRole;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                        Quadro de Servidores Públicos & Gestores
                    </h1>
                    <p className="text-slate-500">
                        Base institucional exclusiva para prefeitos, secretários e operadores (segregada da base de cidadãos).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        onClick={() => setIsInviteModalOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm font-semibold"
                    >
                        <Plus className="w-4 h-4" /> Convidar Servidor Público
                    </Button>
                </div>
            </div>

            {/* Filtros e Controle de Privacidade */}
            <Card className="border-slate-200 shadow-sm">
                <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3 flex-1">
                        {/* Busca */}
                        <div className="relative min-w-[220px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Buscar por nome, e-mail ou matrícula..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        {/* Filtro Cidade */}
                        <Select value={selectedCity} onValueChange={setSelectedCity}>
                            <SelectTrigger className="h-9 text-xs w-[180px]">
                                <SelectValue placeholder="Município" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Cidades</SelectItem>
                                {availableCities.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name} ({c.state})</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* Filtro Cargo */}
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger className="h-9 text-xs w-[160px]">
                                <SelectValue placeholder="Cargo / Nível" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Cargos</SelectItem>
                                <SelectItem value="prefeito">Prefeito / Chefe Gabinete</SelectItem>
                                <SelectItem value="secretario">Secretário Municipal</SelectItem>
                                <SelectItem value="diretor">Diretor de Departamento</SelectItem>
                                <SelectItem value="operador_triagem">Operador de Triagem</SelectItem>
                                <SelectItem value="auditor">Auditor / Ouvidor</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center gap-2 border-l border-slate-200 pl-4">
                        <Label className="text-xs text-slate-600 font-medium">Mascaramento LGPD:</Label>
                        <Switch checked={dataMasking} onCheckedChange={setDataMasking} />
                    </div>
                </CardContent>
            </Card>

            {/* Tabela de Servidores */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold text-slate-900 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-slate-700" />
                            Servidores Governamentais Cadastrados
                        </span>
                        <Badge variant="outline" className="text-xs font-normal">
                            {filteredOfficials.length} registros
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead>Servidor / Matrícula</TableHead>
                                <TableHead>Cargo Oficial</TableHead>
                                <TableHead>Município / UF</TableHead>
                                <TableHead>Secretaria Vinculada</TableHead>
                                <TableHead>Permissões</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                                        Carregando quadro de servidores...
                                    </TableCell>
                                </TableRow>
                            ) : filteredOfficials.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Briefcase className="w-8 h-8 text-slate-400" />
                                            <p className="font-medium text-slate-700">Nenhum servidor público encontrado.</p>
                                            <p className="text-xs text-slate-400">Clique em "Convidar Servidor Público" para enviar o primeiro convite institucional.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOfficials.map((off) => (
                                    <TableRow key={off.id} className="hover:bg-slate-50/80 transition-colors">
                                        <TableCell>
                                            <div className="font-semibold text-slate-900">{off.name}</div>
                                            <div className="text-xs text-slate-500 flex items-center gap-1">
                                                <Mail className="w-3 h-3" /> {off.email}
                                            </div>
                                            {off.registrationNumber && (
                                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    Matrícula: {off.registrationNumber}
                                                </div>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className="bg-blue-50 text-blue-800 border-blue-200">
                                                {off.officialTitle || off.role}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <div className="text-xs font-medium text-slate-800">{off.cityName}</div>
                                            <div className="text-[10px] text-slate-400 font-bold">{off.state}</div>
                                        </TableCell>

                                        <TableCell className="text-xs text-slate-600">
                                            {off.departmentName || 'Gabinete do Prefeito'}
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {off.permissions?.canModerate && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200" title="Pode moderar demandas">
                                                        Moderar
                                                    </span>
                                                )}
                                                {off.permissions?.canExportReports && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200" title="Pode emitir dossiês">
                                                        Relatórios
                                                    </span>
                                                )}
                                                {off.permissions?.canViewPII && (
                                                    <span className="text-[10px] bg-red-50 text-red-700 px-1.5 py-0.5 rounded border border-red-200" title="Acesso a dados sensíveis LGPD">
                                                        PII
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {off.status === 'ATIVO' ? (
                                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 gap-1">
                                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Ativo
                                                </Badge>
                                            ) : off.status === 'PENDENTE_CONVITE' ? (
                                                <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
                                                    <Clock className="w-3 h-3 text-amber-600" /> Convite Pendente
                                                </Badge>
                                            ) : (
                                                <Badge variant="destructive" className="gap-1">
                                                    <Lock className="w-3 h-3" /> Suspenso
                                                </Badge>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                {off.status === 'PENDENTE_CONVITE' && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                const invToken = off.id.startsWith('off_') ? off.id.replace('off_', '') : off.id;
                                                                const link = `${window.location.origin}/activate-official?token=${invToken}&email=${encodeURIComponent(off.email)}`;
                                                                navigator.clipboard.writeText(link);
                                                                toast.success('Link de ativação copiado para a área de transferência!');
                                                            }}
                                                            className="text-xs h-7 gap-1 text-blue-700 bg-blue-50/60 hover:bg-blue-100 border-blue-200 font-medium"
                                                            title="Copiar link seguro para envio via WhatsApp ou mensagem direta"
                                                        >
                                                            Copiar Link
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={async () => {
                                                                if (!currentUser) return;
                                                                const invToken = off.id.startsWith('off_') ? off.id.replace('off_', '') : off.id;
                                                                try {
                                                                    await governmentService.resendInviteEmail(invToken, currentUser.uid);
                                                                    toast.success(`E-mail de convite reenviado para ${off.email}!`);
                                                                } catch (e: any) {
                                                                    toast.error(e.message || 'Erro ao reenviar e-mail.');
                                                                }
                                                            }}
                                                            className="text-xs h-7 gap-1 text-slate-600 hover:text-slate-900 border-slate-200"
                                                            title="Reenviar e-mail oficial de ativação"
                                                        >
                                                            Reenviar
                                                        </Button>
                                                    </>
                                                )}
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleToggleStatus(off)}
                                                    className={`text-xs h-7 ${off.status === 'ATIVO' ? 'hover:text-amber-600' : 'hover:text-emerald-600'}`}
                                                >
                                                    {off.status === 'ATIVO' ? 'Suspender' : off.status === 'SUSPENSO' ? 'Reativar' : 'Cancelar'}
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ─── MODAL DE CONVITE DE SERVIDOR PÚBLICO ───────────────────────────── */}
            <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-slate-900">
                            <Send className="w-5 h-5 text-blue-600" />
                            Convidar Servidor Público / Gestor
                        </DialogTitle>
                        <DialogDescription>
                            Gera um link institucional seguro e dispara e-mail de ativação de conta.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSendInvite} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="name">Nome Completo *</Label>
                                <Input
                                    id="name"
                                    required
                                    placeholder="Ex: Dra. Juliana Silveira"
                                    value={inviteForm.name}
                                    onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label htmlFor="email">E-mail Institucional *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    required
                                    placeholder="Ex: juliana.silveira@prefeitura.sp.gov.br"
                                    value={inviteForm.email}
                                    onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <Label htmlFor="regNumber">Matrícula Funcional</Label>
                                <Input
                                    id="regNumber"
                                    placeholder="Ex: 84920-1"
                                    value={inviteForm.registrationNumber}
                                    onChange={e => setInviteForm({ ...inviteForm, registrationNumber: e.target.value })}
                                />
                            </div>

                            <div>
                                <Label>Cargo Hierárquico</Label>
                                <Select
                                    value={inviteForm.role}
                                    onValueChange={(val: OfficialRole) => {
                                        let defaultTitle = 'Servidor Público';
                                        if (val === 'prefeito') defaultTitle = 'Prefeito Municipal';
                                        if (val === 'secretario') defaultTitle = 'Secretário Municipal';
                                        if (val === 'diretor') defaultTitle = 'Diretor de Departamento';
                                        if (val === 'operador_triagem') defaultTitle = 'Operador de Triagem';
                                        if (val === 'auditor') defaultTitle = 'Auditor / Ouvidoria';
                                        setInviteForm({ ...inviteForm, role: val, officialTitle: defaultTitle });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="prefeito">Prefeito / Chefe de Gabinete</SelectItem>
                                        <SelectItem value="secretario">Secretário Municipal</SelectItem>
                                        <SelectItem value="diretor">Diretor de Departamento</SelectItem>
                                        <SelectItem value="operador_triagem">Operador de Triagem</SelectItem>
                                        <SelectItem value="auditor">Auditor / Ouvidoria</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="title">Título do Cargo</Label>
                                <Input
                                    id="title"
                                    value={inviteForm.officialTitle}
                                    onChange={e => setInviteForm({ ...inviteForm, officialTitle: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label>Município Alvo</Label>
                                <Select
                                    value={inviteForm.cityId}
                                    onValueChange={(val) => {
                                        const c = availableCities.find(x => x.id === val);
                                        setInviteForm({
                                            ...inviteForm,
                                            cityId: val,
                                            state: c ? c.state : 'SP'
                                        });
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableCities.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.state})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="depName">Secretaria / Órgão</Label>
                                <Input
                                    id="depName"
                                    value={inviteForm.departmentName}
                                    onChange={e => setInviteForm({ ...inviteForm, departmentName: e.target.value })}
                                    placeholder="Ex: Secretaria de Obras"
                                />
                            </div>
                        </div>

                        {/* Permissões Granulares */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                Permissões de Acesso (RBAC & LGPD)
                            </h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inviteForm.permissions.canModerate}
                                        onChange={e => setInviteForm({
                                            ...inviteForm,
                                            permissions: { ...inviteForm.permissions, canModerate: e.target.checked }
                                        })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Moderar Demandas & Triagem</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inviteForm.permissions.canExportReports}
                                        onChange={e => setInviteForm({
                                            ...inviteForm,
                                            permissions: { ...inviteForm.permissions, canExportReports: e.target.checked }
                                        })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Exportar Dossiês em PDF</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inviteForm.permissions.canDispatchTeams}
                                        onChange={e => setInviteForm({
                                            ...inviteForm,
                                            permissions: { ...inviteForm.permissions, canDispatchTeams: e.target.checked }
                                        })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span>Despachar Equipes de Campo</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inviteForm.permissions.canViewPII}
                                        onChange={e => setInviteForm({
                                            ...inviteForm,
                                            permissions: { ...inviteForm.permissions, canViewPII: e.target.checked }
                                        })}
                                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-amber-800 font-medium">Visualizar PII Cidadão (LGPD)</span>
                                </label>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsInviteModalOpen(false)}>
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={inviting}
                                className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
                            >
                                <Send className="w-4 h-4" />
                                {inviting ? 'Enviando Convite...' : 'Enviar Convite Institucional'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminGovernmentStaff;
