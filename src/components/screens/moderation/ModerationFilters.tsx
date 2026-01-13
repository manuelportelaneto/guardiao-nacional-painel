
import React from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../ui/select';
import { Search, Settings, Filter } from 'lucide-react';
import { Label } from '../../ui/label';
import { StandardLocationFilter } from '../../common/StandardLocationFilter';
import type { LocationFilterState } from '../../common/StandardLocationFilter';

interface ModerationFiltersProps {
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    categoryFilter: string;
    setCategoryFilter: (category: string) => void;
    locationFilter: LocationFilterState;
    setLocationFilter: (location: LocationFilterState) => void;
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    activeTab: string;
}

export const ModerationFilters: React.FC<ModerationFiltersProps> = ({
    searchTerm, setSearchTerm,
    categoryFilter, setCategoryFilter,
    locationFilter, setLocationFilter,
    collapsed, setCollapsed,
    activeTab
}) => {
    return (
        <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-2 cursor-pointer" onClick={() => setCollapsed(!collapsed)}>
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filtros e Busca
                    </h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {collapsed ? <Settings className="h-4 w-4 rotate-45" /> : <Settings className="h-4 w-4" />}
                    </Button>
                </div>

                {!collapsed && (
                    <div className="flex flex-col md:flex-row gap-4 md:items-center animate-in slide-in-from-top-1">
                        <div className="relative flex-1 w-full md:max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar..." className="pl-9 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                                <SelectItem value="security">Segurança</SelectItem>
                                <SelectItem value="transport">Transporte</SelectItem>
                                <SelectItem value="environment">Meio Ambiente</SelectItem>
                                <SelectItem value="services">Serviços</SelectItem>
                                <SelectItem value="leisure">Lazer</SelectItem>
                                <SelectItem value="health">Saúde</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            {/* Standard Location Filter - Visible mostly for lists, but can filter Queue/Approved */}
            {(activeTab === 'approved' || activeTab === 'queue') && (
                <div className="bg-white p-4 rounded-lg shadow-sm w-fit">
                    <Label className="text-xs text-gray-400 mb-2 block">Filtrar por Localização</Label>
                    <StandardLocationFilter
                        value={locationFilter}
                        onChange={setLocationFilter}
                    />
                </div>
            )}
        </div>
    );
};
