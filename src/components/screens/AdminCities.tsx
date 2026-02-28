import React, { useState, useEffect } from 'react';
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
    CircleAlert,
    RefreshCw
} from 'lucide-react';
import { db, functions } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import CityDetailsModal from '../modals/CityDetailsModal';

interface GeoLevel {
    type: 'country' | 'region' | 'state' | 'city';
    name: string;
    id?: string;
    regionId?: string;
    stateId?: string;
}

import { useNavigate } from 'react-router-dom';

const AdminCities: React.FC = () => {
    const navigate = useNavigate();
    // Hierarchical navigation state
    const [currentLevel, setCurrentLevel] = useState<GeoLevel>({ type: 'country', name: 'Brasil', id: 'br' });
    const [breadcrumb, setBreadcrumb] = useState<GeoLevel[]>([{ type: 'country', name: 'Brasil', id: 'br' }]);

    // Dynamic Data Cache
    const [regions, setRegions] = useState<any[]>([]);
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);

    // Modal State
    const [selectedCity] = useState<any>(null); // Kept layout but unused
    // const [isCityModalOpen, setIsCityModalOpen] = useState(false); // Removed modal
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);

    // City Level Data
    const [loadingData, setLoadingData] = useState(false);

    // Sync State
    const [syncing, setSyncing] = useState(false);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const syncFn = httpsCallable(functions, 'recalculateCityCounts');
            const res = await syncFn();
            const data = res.data as any;
            if (data.success) {
                toast.success(`Sincronização concluída! ${data.updated} cidades atualizadas.`);
                // Refresh list
                const current = currentLevel;
                if (current.type === 'country') fetchRegions();
                else if (current.type === 'region' && current.id) fetchStates(current.id);
                else if (current.type === 'state' && current.id) fetchCities(current.regionId!, current.id);
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao sincronizar contadores.");
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (currentLevel.type === 'country') {
            fetchRegions();
        } else if (currentLevel.type === 'region') {
            fetchStates(currentLevel.id!);
        } else if (currentLevel.type === 'state') {
            fetchCities(currentLevel.regionId!, currentLevel.id!);
        }
    }, [currentLevel]);

    // Navigation Helpers
    const navigateTo = (level: GeoLevel) => {
        setBreadcrumb(prev => [...prev, level]);
        setCurrentLevel(level);
    };

    const goBack = () => {
        setBreadcrumb(prev => {
            const newBreadcrumb = prev.slice(0, -1);
            setCurrentLevel(newBreadcrumb[newBreadcrumb.length - 1]);
            return newBreadcrumb;
        });
    };

    // Data Fetching Helpers
    const fetchRegions = async () => {
        setLoadingData(true);
        try {
            // Fetch from territories/br/regions
            const regionsRef = collection(db, 'territories', 'br', 'regions');
            const snapshot = await getDocs(regionsRef);
            if (!snapshot.empty) {
                setRegions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
                console.warn('No regions found in territories/br/regions');
                setRegions([]);
            }
        } catch (error) {
            console.error("Error fetching regions:", error);
            toast.error("Erro ao carregar regiões");
        } finally {
            setLoadingData(false);
        }
    };

    const fetchStates = async (regionId: string) => {
        setLoadingData(true);
        try {
            // Fetch states from territories/br/regions/{regionId}/states
            const statesRef = collection(db, 'territories', 'br', 'regions', regionId, 'states');
            const snapshot = await getDocs(statesRef);

            if (!snapshot.empty) {
                setStates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
                console.warn("No states found in DB for region", regionId);
                setStates([]);
            }
        } catch (error) {
            console.error("Error fetching states:", error);
            toast.error("Erro ao carregar estados");
        } finally {
            setLoadingData(false);
        }
    };

    const fetchCities = async (regionId: string, stateId: string) => {
        setLoadingData(true);
        try {
            // Fetch cities from territories/br/regions/{regionId}/states/{stateId}/cities
            const citiesRef = collection(db, 'territories', 'br', 'regions', regionId, 'states', stateId, 'cities');
            const snapshot = await getDocs(citiesRef);

            if (!snapshot.empty) {
                setCities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            } else {
                setCities([]);
            }
        } catch (error) {
            console.error("Error fetching cities:", error);
            toast.error("Erro ao carregar cidades");
        } finally {
            setLoadingData(false);
        }
    };

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
                                <div className="flex flex-col gap-1 mt-2">
                                    <span className="text-xs text-gray-400">Região administrativa</span>
                                    {region.statesCount !== undefined && (
                                        <Badge variant="secondary" className="w-fit text-xs mt-1">
                                            {region.statesCount} estados
                                        </Badge>
                                    )}
                                </div>
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
                                <div className="flex flex-col gap-1 mt-2">
                                    <span className="text-xs text-gray-500">
                                        {state.citiesCount || 0} municípios
                                    </span>
                                    {state.totalContributions > 0 && (
                                        <Badge variant="outline" className="w-fit text-xs border-green-200 text-green-700">
                                            {state.totalContributions} ocorrências
                                        </Badge>
                                    )}
                                </div>
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
                        <CircleAlert className="w-4 h-4" />
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
                                        // Cache city for DetailsPage
                                        sessionStorage.setItem(`city_${city.id}`, JSON.stringify(city));
                                        navigate(`/admin/cities/${city.id}`);
                                    }}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-700 block">{city.name}</span>
                                                <div className="flex gap-1 mt-1">
                                                    <Badge variant="secondary" className="text-[10px] px-1 h-5">
                                                        {city.totalContributions || 0} total
                                                    </Badge>
                                                    <Badge className="bg-blue-600 text-[10px] px-1 h-5">
                                                        {city.approvedContributions || 0} ok
                                                    </Badge>
                                                </div>
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
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleSync} disabled={syncing} size="sm">
                        {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Sincronizar
                    </Button>
                    <Badge variant="secondary" className="gap-1">
                        <Database className="w-3 h-3" />
                        Modo Dinâmico
                    </Badge>
                </div>
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
