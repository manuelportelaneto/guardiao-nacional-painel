import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
    Plus,
    Trash2,
    MapPin,
    Shield,
    Loader2,
    AlertCircle
} from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { locationService } from '../../services/locationService';
import type { IbgeUf, IbgeMunicipio } from '../../services/locationService';
import { inviteUser } from '../../services/userService';
import { toast } from 'sonner';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebaseConfig';

interface InviteUserModalProps {
    open: boolean;
    onClose: () => void;
}

interface UserAccess {
    uf: string;
    cityId: string;
    cityName: string;
    role: string;
    cities: IbgeMunicipio[];
}

const ROLES = [
    { id: 'admin', name: 'Administrador Regional' },
    { id: 'city_admin', name: 'Gestor Municipal' },
    { id: 'presidente', name: 'Presidente' },
    { id: 'governador', name: 'Governador' },
    { id: 'prefeito', name: 'Prefeito' },
    { id: 'servidor', name: 'Servidor Público' },
];

const InviteUserModal: React.FC<InviteUserModalProps> = ({ open, onClose }) => {
    const [email, setEmail] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [acessos, setAcessos] = useState<UserAccess[]>([
        { uf: '', cityId: '', cityName: '', role: 'servidor', cities: [] }
    ]);
    const [states, setStates] = useState<IbgeUf[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            locationService.getStates().then(setStates);
        }
    }, [open]);

    const handleAddAccess = () => {
        setAcessos([...acessos, { uf: '', cityId: '', cityName: '', role: 'servidor', cities: [] }]);
    };

    const handleRemoveAccess = (index: number) => {
        if (acessos.length === 1) return;
        setAcessos(acessos.filter((_, i) => i !== index));
    };

    const updateAccess = async (index: number, field: keyof UserAccess, value: string) => {
        const newAcessos = [...acessos];
        (newAcessos[index] as any)[field] = value;

        if (field === 'uf') {
            const cities = await locationService.getCitiesByState(value);
            newAcessos[index].cities = cities;
            newAcessos[index].cityId = '';
            newAcessos[index].cityName = '';
        }

        if (field === 'cityId') {
            const city = newAcessos[index].cities.find(c => c.id.toString() === value);
            newAcessos[index].cityName = city?.nome || '';
        }

        setAcessos(newAcessos);
    };

    const handleInvite = async () => {
        if (!email) {
            toast.error("O e-mail é obrigatório.");
            return;
        }

        // Validate if city is selected for each access
        const invalid = acessos.some(a => !a.cityId || !a.role);
        if (invalid) {
            toast.error("Selecione a cidade e o cargo para todos os campos.");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Call Backend to create user and profile
            const payload = acessos.map(a => ({
                cityId: a.cityId,
                cityName: a.cityName,
                role: a.role
            }));

            await inviteUser(email, displayName, payload);

            // 2. Trigger Password Reset Email
            // We do this from frontend via Firebase Auth so it uses the localized template of the project
            await sendPasswordResetEmail(auth, email);

            toast.success("Convite enviado com sucesso!");
            onClose();
            // Reset state
            setEmail('');
            setDisplayName('');
            setAcessos([{ uf: '', cityId: '', cityName: '', role: 'servidor', cities: [] }]);
        } catch (error: any) {
            console.error("Error inviting:", error);
            toast.error("Erro ao convidar: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Convidar Novo Administrador</DialogTitle>
                    <DialogDescription>
                        Envie um convite para um novo membro da equipe. Ele receberá um e-mail para definir sua senha.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail Corporativo</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="exemplo@cidade.gov.br"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo (Opcional)</Label>
                            <Input
                                id="name"
                                placeholder="João da Silva"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                Vínculos e Cargos
                            </Label>
                            <Button variant="outline" size="sm" onClick={handleAddAccess} className="h-8 gap-1">
                                <Plus className="w-3 h-3" /> Add Cidade
                            </Button>
                        </div>

                        {acessos.map((acesso, index) => (
                            <div key={index} className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3 relative group">
                                {acessos.length > 1 && (
                                    <button
                                        onClick={() => handleRemoveAccess(index)}
                                        className="absolute -top-2 -right-2 bg-white border border-red-100 text-red-500 rounded-full p-1 shadow-sm hover:bg-red-50"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Estado (UF)</Label>
                                        <Select value={acesso.uf} onValueChange={(v) => updateAccess(index, 'uf', v)}>
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="UF" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {states.map(s => (
                                                    <SelectItem key={s.id} value={s.sigla}>{s.sigla}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Cidade</Label>
                                        <Select
                                            value={acesso.cityId}
                                            onValueChange={(v) => updateAccess(index, 'cityId', v)}
                                            disabled={!acesso.uf}
                                        >
                                            <SelectTrigger className="h-9">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {acesso.cities.map(c => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>{c.nome}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs">Cargo nesta Cidade</Label>
                                    <Select value={acesso.role} onValueChange={(v) => updateAccess(index, 'role', v)}>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Cargo..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(r => (
                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-blue-50 p-3 rounded-lg flex gap-3 items-start border border-blue-100">
                        <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            O usuário poderá gerenciar mais de uma cidade, mas terá apenas <strong>um cargo específico por cidade</strong>.
                            O acesso ao painel principal será definido pelo cargo de maior hierarquia.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>Cancelar</Button>
                    <Button onClick={handleInvite} disabled={isLoading} className="gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                        Convidar agora
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default InviteUserModal;
