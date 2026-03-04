import React, { useState, useEffect } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select"
import { Input } from "../ui/input";
import { Label } from "../ui/label";

export interface LocationFilterState {
    region?: string;
    state?: string;
    city?: string;
    neighborhood?: string;
    ceps?: string[];
}

interface StandardLocationFilterProps {
    value: LocationFilterState;
    onChange: (value: LocationFilterState) => void;
}

export const StandardLocationFilter: React.FC<StandardLocationFilterProps> = ({ value, onChange }) => {
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const regions = [
        { name: 'Norte', id: '1' },
        { name: 'Nordeste', id: '2' },
        { name: 'Sudeste', id: '3' },
        { name: 'Sul', id: '4' },
        { name: 'Centro-Oeste', id: '5' }
    ];

    // Fetch States on component mount
    useEffect(() => {
        setLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => {
                setStates(data);
                setLoadingStates(false);
            })
            .catch(e => {
                console.error('Error fetching states', e);
                setLoadingStates(false);
            });
    }, []);

    // Fetch Cities when State changes
    useEffect(() => {
        if (!value.state) {
            setCities([]);
            return;
        }
        setLoadingCities(true);

        // Find state ID or just use sigla if API supports it
        const selectedState = states.find(s => s.sigla === value.state);
        const stateId = selectedState?.id || value.state;

        fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateId}/municipios?orderBy=nome`)
            .then(res => res.json())
            .then(data => {
                setCities(data);
                setLoadingCities(false);
            })
            .catch(e => {
                console.error('Error fetching cities', e);
                setLoadingCities(false);
            });
    }, [value.state, states]);

    const handleFieldChange = (field: keyof LocationFilterState, val: any) => {
        const newState = { ...value, [field]: val };

        // Reset dependent fields only if values actually changed
        if (field === 'state' && val !== value.state) {
            newState.city = '';
            newState.neighborhood = '';
        }

        onChange(newState);
    };

    const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const list = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
        onChange({ ...value, ceps: list });
    };

    return (
        <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Region */}
            <div className="space-y-2">
                <Label>Região do Brasil</Label>
                <Select value={value.region} onValueChange={(v) => handleFieldChange('region', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione Região" />
                    </SelectTrigger>
                    <SelectContent>
                        {regions.map(r => (
                            <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
                <Label>Estado (UF) {loadingStates && '(Caregando...)'}</Label>
                <Select value={value.state} onValueChange={(v) => handleFieldChange('state', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione Estado" />
                    </SelectTrigger>
                    <SelectContent>
                        {states.map(s => (
                            <SelectItem key={s.id} value={s.sigla}>{s.nome} ({s.sigla})</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
                <Label>Município {loadingCities && '(Carregando...)'}</Label>
                <Select
                    value={value.city}
                    onValueChange={(v) => handleFieldChange('city', v)}
                    disabled={!value.state || loadingCities}
                >
                    <SelectTrigger>
                        <SelectValue placeholder={!value.state ? "Selecione estado primeiro" : "Selecione Município"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                        {cities.map(c => (
                            <SelectItem key={c.id} value={c.nome}>{c.nome}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Neighborhood */}
            <div className="space-y-2">
                <Label>Bairro (Opcional)</Label>
                <Input
                    placeholder="Ex: Copacabana, Brooklin..."
                    value={value.neighborhood || ''}
                    onChange={(e) => handleFieldChange('neighborhood', e.target.value)}
                />
            </div>

            {/* CEP */}
            <div className="space-y-2 md:col-span-2">
                <Label>Lista de CEPs (Início do CEP, separado por vírgula)</Label>
                <Input
                    placeholder="Ex: 01000, 20000, 31000..."
                    value={value.ceps?.join(', ') || ''}
                    onChange={handleCepChange}
                />
            </div>
        </div>
    );
};
