
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { locationService } from '../../services/locationService';
import type { IbgeUf, IbgeMunicipio } from '../../services/locationService';
import type { UserManagement } from '../../services/userService';
import { Loader2, ShieldAlert, MapPin, Building, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface PromoteUserModalProps {
    user: UserManagement | null;
    open: boolean;
    onClose: () => void;
    onPromote: (userId: string, data: Partial<UserManagement>) => Promise<void>;
}

// Map the friendly names to internal roles
// Internal Roles: 'super_admin' | 'admin' | 'city_admin' | 'user'
// Professional Roles: 'servidor' | 'empresa' | 'cidadao'
// The user wants specific titles: Presidente, Governador, Prefeito, Secretário, Servidor.
// We will map these to the existing schema + extended checks or new fields if needed.
// For now, let's assume:
// Presidente -> super_admin (National)
// Governador -> admin (State scope)
// Prefeito -> city_admin (City scope - multiple?)
// Secretário -> city_admin (City scope + specific permission?)
// Servidor -> user (with professionalRole='servidor' + city scope)

// To support this robustness, we might need to store 'scope' in the user doc.
// For this implementation, we will pass the 'scope' data back to be saved.

const ROLES = [
    { value: 'presidente', label: 'Presidente (Nacional)', internal: 'super_admin' },
    { value: 'governador', label: 'Governador (Estadual)', internal: 'admin' },
    { value: 'prefeito', label: 'Prefeito (Municipal)', internal: 'city_admin' },
    { value: 'secretario', label: 'Secretário (Municipal)', internal: 'city_admin' }, // Distinguish via professionalRole/Title
    { value: 'servidor', label: 'Servidor Público', internal: 'user' }, // professionalRole = 'servidor'
];

export const PromoteUserModal: React.FC<PromoteUserModalProps> = ({ user, open, onClose, onPromote }) => {
    const [selectedRole, setSelectedRole] = useState<string>('');
    const [selectedState, setSelectedState] = useState<string>('');
    const [selectedCities, setSelectedCities] = useState<string[]>([]);

    // Data
    const [states, setStates] = useState<IbgeUf[]>([]);
    const [cities, setCities] = useState<IbgeMunicipio[]>([]);
    const [loadingData, setLoadingData] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            locationService.getStates().then(setStates);
            // Reset form
            setSelectedRole('');
            setSelectedState('');
            setSelectedCities([]);
        }
    }, [open]);

    // Fetch cities when state changes
    useEffect(() => {
        if (selectedState) {
            setLoadingData(true);
            locationService.getCitiesByState(selectedState).then(data => {
                setCities(data);
                setLoadingData(false);
            });
        } else {
            setCities([]);
        }
    }, [selectedState]);

    const handleCityToggle = (cityName: string) => {
        setSelectedCities(prev =>
            prev.includes(cityName)
                ? prev.filter(c => c !== cityName)
                : [...prev, cityName]
        );
    };

    const handleConfirm = async () => {
        if (!user) return;
        if (!selectedRole) {
            toast.error("Selecione um cargo.");
            return;
        }

        const roleConfig = ROLES.find(r => r.value === selectedRole);
        if (!roleConfig) return;

        // Validation based on Role
        if (selectedRole === 'governador' && !selectedState) {
            toast.error("Selecione o Estado para o Governador.");
            return;
        }
        if (['prefeito', 'secretario', 'servidor'].includes(selectedRole) && (!selectedState || selectedCities.length === 0)) {
            toast.error("Selecione o Estado e pelo menos uma Cidade.");
            return;
        }

        setSubmitting(true);
        try {
            // Construct the update payload
            const updateData: any = {
                role: roleConfig.internal,
                professionalRole: selectedRole === 'servidor' ? 'servidor' : 'cidadao', // Default to cidadao unless server? Or maybe 'cidadao' is wrong for mayor.
                // Actually, let's use a new field 'officialTitle' or just reuse professionalRole for 'politico'?
                // Let's stick to existing schema as much as possible, maybe stick 'officialTitle' in metadata.
                // We will store scope in a 'scope' object
                scope: {
                    type: selectedRole === 'presidente' ? 'national' :
                        selectedRole === 'governador' ? 'state' : 'city',
                    state: selectedState, // UF Sigla
                    cities: selectedCities // List of city names
                },
                // Store the friendly title for display
                officialTitle: roleConfig.label
            };

            // Specific adjustments
            if (selectedRole === 'prefeito') updateData.professionalRole = 'servidor'; // Or 'politico' if schema supported
            if (selectedRole === 'secretario') updateData.professionalRole = 'servidor';

            await onPromote(user.id, updateData);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error("Erro ao promover usuário.");
        } finally {
            setSubmitting(false);
        }
    };

    const isCityScope = ['prefeito', 'secretario', 'servidor'].includes(selectedRole);
    const isStateScope = selectedRole === 'governador';

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-blue-600" />
                        Promover Usuário
                    </DialogTitle>
                    <DialogDescription>
                        Defina o novo cargo e abrangência para <strong>{user?.displayName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Role Selection */}
                    <div className="space-y-2">
                        <Label>Selecione o Cargo</Label>
                        <Select value={selectedRole} onValueChange={setSelectedRole}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                {ROLES.map(role => (
                                    <SelectItem key={role.value} value={role.value}>
                                        <div className="flex items-center gap-2">
                                            {role.value === 'presidente' ? <Trophy className="w-4 h-4 text-yellow-500" /> :
                                                role.value === 'governador' ? <MapPin className="w-4 h-4 text-blue-500" /> :
                                                    <Building className="w-4 h-4 text-gray-500" />}
                                            {role.label}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Geographic Scope */}
                    {(isStateScope || isCityScope) && (
                        <div className="space-y-4 border-t pt-4">
                            <div className="space-y-2">
                                <Label>Estado (UF)</Label>
                                <Select value={selectedState} onValueChange={setSelectedState}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o Estado..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {states.map(uf => (
                                            <SelectItem key={uf.id} value={uf.sigla}>
                                                {uf.nome} ({uf.sigla})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* City Selection (Multi-select) */}
                            {isCityScope && selectedState && (
                                <div className="space-y-2">
                                    <Label>Municípios de Atuação ({selectedCities.length} selecionados)</Label>
                                    <div className="border rounded-md p-2 h-48">
                                        {loadingData ? (
                                            <div className="flex items-center justify-center h-full text-gray-400">
                                                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Carregando cidades...
                                            </div>
                                        ) : (
                                            <ScrollArea className="h-full pr-4">
                                                <div className="space-y-1">
                                                    {cities.map(city => (
                                                        <div key={city.id} className="flex items-center space-x-2 py-1 px-1 hover:bg-gray-50 rounded">
                                                            <Checkbox
                                                                id={`city-${city.id}`}
                                                                checked={selectedCities.includes(city.nome)}
                                                                onCheckedChange={() => handleCityToggle(city.nome)}
                                                            />
                                                            <label
                                                                htmlFor={`city-${city.id}`}
                                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer w-full"
                                                            >
                                                                {city.nome}
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500">Selecione uma ou mais cidades onde este usuário terá permissões.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={submitting}>Cancelar</Button>
                    <Button onClick={handleConfirm} disabled={submitting} className="bg-blue-600 hover:bg-blue-700">
                        {submitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...
                            </>
                        ) : (
                            'Confirmar Promoção'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
