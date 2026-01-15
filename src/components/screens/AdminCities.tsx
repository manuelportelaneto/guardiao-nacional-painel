import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy, where, limit, startAfter } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
    Building2,
    Loader2,
    ChevronRight,
    Globe,
    MapPin,
    ArrowLeft,
    Database,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import ContributionDirectoryCard from './ContributionDirectoryCard';
import CityDetailsModal from '../modals/CityDetailsModal';

interface GeoLevel {
    type: 'country' | 'region' | 'state' | 'city';
    name: string;
    id?: string;
    regionId?: string;
    stateId?: string;
}



const AdminCities: React.FC = () => {
    // Hierarchical navigation state
    const [currentLevel, setCurrentLevel] = useState<GeoLevel>({ type: 'country', name: 'Brasil', id: 'br' });
    const [breadcrumb, setBreadcrumb] = useState<GeoLevel[]>([{ type: 'country', name: 'Brasil', id: 'br' }]);

    // Dynamic Data Cache
    const [regions, setRegions] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    // Modal State
    const [selectedCity, setSelectedCity] = useState<any>(null);
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);

    // City Level Data
    const [cityContributions, setCityContributions] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(false);

    // Pagination & Filters
    const [filters, setFilters] = useState({
        status: 'all',
        category: 'all'
    });
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const LIMIT = 12;

    useEffect(() => {
        if (currentLevel.type === 'country') {
            fetchRegions();
        } else if (currentLevel.type === 'region') {
            fetchStates(currentLevel.id!);
        } else if (currentLevel.type === 'state') {
            fetchCities(currentLevel.regionId!, currentLevel.id!);
        }
        // The 'city' case is now handled by the modal, so no direct navigation here
    }, [currentLevel]);

    // Refresh when filters change (only if in city view - managed by modal now, but keeping for compatibility if needed or removing)
    // Actually, since we moved to Modal, we don't need this effect triggering fetchCityContributions here anymore 
    // unless we still want the 'city' level view as a fallback. 
    // Let's keep the 'city' level view as a "directory" view, and the modal as a detail view?
    // User asked to "reuse modal", likely implying replacing the view. 
    // But the previous code had a full view.
    // Let's remove the broken useEffect for filters for now to fix the syntax.

    // ... code continues ...

    // Fix renderContent types
    const renderContent = () => {
        if (currentLevel.type === 'country') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {regions.map(region => (
                        <Card
                            key={region.id || region.name}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-200 group"
                            onClick={() => navigateTo({ type: 'region', name: region.name, id: region.id })}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Globe className="w-8 h-8 text-blue-500" />
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-lg">{region.name}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">Região administrativa</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (currentLevel.type === 'region') {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {states.map(state => (
                        <Card
                            key={state.id || state.name}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-green-200 group"
                            onClick={() => navigateTo({ type: 'state', name: state.name, id: state.id, regionId: currentLevel.id })}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <MapPin className="w-6 h-6 text-green-500" />
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-xl font-mono">{state.name}</CardTitle>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (currentLevel.type === 'state') {
            return (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-2 text-blue-800 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        <p>Mostrando municípios que possuem registros ativos na plataforma.</p>
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-20 text-gray-500">
                            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Carregando municípios...
                        </div>
                    ) : cities.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Nenhum município encontrado em {currentLevel.name} com contribuições registradas.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {cities.map(city => (
                                <Card
                                    key={city.id || city.name}
                                    className="cursor-pointer hover:shadow-md hover:border-blue-300"
                                    onClick={() => {
                                        setSelectedCity(city);
                                        setIsCityModalOpen(true);
                                    }}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700 block">{city.name}</span>
                                                <span className="text-xs text-gray-500">{city.totalContributions ? `${city.totalContributions} registros` : 'Ver registros'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-gray-400" />
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 font-outfit">Diretório Geográfico</h2>
                    <p className="text-gray-500">Navegue pelas contribuições organizadas hierarquicamente.</p>
                </div>
                <Badge variant="secondary" className="gap-1">
                    <Database className="w-3 h-3" />
                    Modo Dinâmico
                </Badge>
            </div>

            {/* Breadcrumb Navigation */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-2 flex-wrap">
                {breadcrumb.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={goBack} className="mr-2">
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                )}
                {breadcrumb.map((crumb, index) => (
                    <React.Fragment key={`${crumb.type}-${crumb.name}`}>
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                        <Button
                            variant={index === breadcrumb.length - 1 ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() => navigateTo(crumb)}
                            className={index === breadcrumb.length - 1 ? 'font-semibold' : ''}
                        >
                            {crumb.name}
                        </Button>
                    </React.Fragment>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                {renderContent()}
            </div>

            <CityDetailsModal
                city={selectedCity}
                open={isCityModalOpen}
                onClose={() => setIsCityModalOpen(false)}
            />
        </div>
    );
};

export default AdminCities;
