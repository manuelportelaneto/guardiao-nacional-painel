import React from 'react';
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
    cep?: string;
}

interface StandardLocationFilterProps {
    value: LocationFilterState;
    onChange: (value: LocationFilterState) => void;
}

export const StandardLocationFilter: React.FC<StandardLocationFilterProps> = ({ value, onChange }) => {
    const handleChange = (field: keyof LocationFilterState, val: string) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Region */}
            <div className="space-y-2">
                <Label>Região</Label>
                <Select value={value.region} onValueChange={(v) => handleChange('region', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione Região" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="norte">Norte</SelectItem>
                        <SelectItem value="nordeste">Nordeste</SelectItem>
                        <SelectItem value="centro-oeste">Centro-Oeste</SelectItem>
                        <SelectItem value="sudeste">Sudeste</SelectItem>
                        <SelectItem value="sul">Sul</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* State */}
            <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Select value={value.state} onValueChange={(v) => handleChange('state', v)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione UF" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SP">São Paulo</SelectItem>
                        <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                        <SelectItem value="MG">Minas Gerais</SelectItem>
                        <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                        <SelectItem value="PR">Paraná</SelectItem>
                        {/* Add all UFs */}
                    </SelectContent>
                </Select>
            </div>

            {/* City */}
            <div className="space-y-2">
                <Label>Município</Label>
                <Input
                    placeholder="Digite a cidade..."
                    value={value.city || ''}
                    onChange={(e) => handleChange('city', e.target.value)}
                />
            </div>

            {/* Neighborhood */}
            <div className="space-y-2">
                <Label>Bairro</Label>
                <Input
                    placeholder="Digite o bairro..."
                    value={value.neighborhood || ''}
                    onChange={(e) => handleChange('neighborhood', e.target.value)}
                />
            </div>

            {/* CEP */}
            <div className="space-y-2 md:col-span-2">
                <Label>CEP (Prefixo)</Label>
                <Input
                    placeholder="Ex: 01000..."
                    value={value.cep || ''}
                    onChange={(e) => handleChange('cep', e.target.value)}
                />
            </div>
        </div>
    );
};
