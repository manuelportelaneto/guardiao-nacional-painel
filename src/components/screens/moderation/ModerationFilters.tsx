
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
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <Filter className="w-4 h-4" /> Filtros e Busca
                    </h3>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`h-8 gap-2 px-3 ${!collapsed ? 'text-primary bg-primary/10' : ''}`}
                        onClick={() => setCollapsed(!collapsed)}
                    >
                        <Settings className={`h-4 w-4 transition-transform ${!collapsed ? 'rotate-90' : ''}`} />
                        <span className="text-xs">{collapsed ? 'Filtros Avançados' : 'Recolher Filtros'}</span>
                    </Button>
                </div>

                <div className="space-y-4">
                    {/* Basic Search Row */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por título ou ID..."
                                className="pl-9 w-full bg-gray-50/50"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="w-full md:w-[200px] bg-gray-50/50">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Categorias</SelectItem>
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

                    {/* Advanced Filters (Location) */}
                    {!collapsed && (
                        <div className="pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                            {(activeTab === 'approved' || activeTab === 'queue' || activeTab === 'reports') && (
                                <div className="space-y-4">
                                    <Label className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Filtro por Localização</Label>
                                    <StandardLocationFilter
                                        value={locationFilter}
                                        onChange={setLocationFilter}
                                    />
                                    <div className="flex justify-end">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-xs text-gray-500 hover:text-red-500"
                                            onClick={() => setLocationFilter({})}
                                        >
                                            Limpar Localização
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
