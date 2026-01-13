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

interface GeoLevel {
    type: 'country' | 'region' | 'state' | 'city';
    name: string;
}

const REGIONS = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul'];

const STATE_BY_REGION: Record<string, string[]> = {
    'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
    'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
    'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
    'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
    'Sul': ['PR', 'RS', 'SC']
};

const AdminCities: React.FC = () => {
    // Hierarchical navigation state
    const [currentLevel, setCurrentLevel] = useState<GeoLevel>({ type: 'country', name: 'Brasil' });
    const [breadcrumb, setBreadcrumb] = useState<GeoLevel[]>([{ type: 'country', name: 'Brasil' }]);

    // Data Stats
    const [activeCities, setActiveCities] = useState<string[]>([]);

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
        // Initial load to identify active regions/states (Optimization: could be a dedicated stats doc)
        // For now, we might just allow navigation everywhere but show "No data" if empty,
        // OR we can fetch a glimpse of active places.
        // Let's allow standard navigation for now, but fetching city specific data when entering a city is key.
        if (currentLevel.type === 'state') {
            fetchCitiesInState(currentLevel.name);
        }
        if (currentLevel.type === 'city') {
            // Reset pagination when entering a city
            setCityContributions([]);
            setLastVisible(null);
            setHasMore(true);
            fetchCityContributions(currentLevel.name, false, filters);
        }
    }, [currentLevel]);

    // Refresh when filters change (only if in city view)
    useEffect(() => {
        if (currentLevel.type === 'city') {
            setCityContributions([]);
            setLastVisible(null);
            setHasMore(true);
            fetchCityContributions(currentLevel.name, false, filters);
        }
    }, [filters]);

    const fetchCitiesInState = async (stateAbbr: string) => {
        setLoadingData(true);
        try {
            // Find unique cities in this state from contributions
            // Firestore doesn't support "distinct" easily.
            // We fetch contributions with 'uf' == stateAbbr (requires composite index probably or just filtering)
            // Ideally we should have a 'cities' collection or 'stats' collection.
            // Fallback: Query contributions filtering by UF (assuming we save UF in contributions)
            // If contributions don't have UF, we might track by city name only (risk of duplicate names).
            // Let's assume contributions have 'uf' field as per recent updates or we use the 'city' field string.

            // To be safe and fast without reading ALL docs:
            // We can't easily list "Active Cities" without a separate index.
            // PROPOSAL: Display ALL cities? No, too many.
            // PROPOSAL: Query 'cities' collection if we keep it synced?
            // The user wanted "vincule agora mesmo os municípios que já temos registros".
            // So we MUST look at 'contributions'.

            // Let's try to fetch recent contributions in this state and extract unique cities.
            // FIXED: Reverting to 'uf' as apparently legacy records use this field.
            // If we need to support both, we'd need complex queries or client-side filter.
            // For now, assuming 'uf' is the standard field in the DB.
            const q = query(
                collection(db, 'contributions'),
                where('uf', '==', stateAbbr),
                limit(100) // Limit to avoid reading too much. Ideally we need an aggregation.
            );
            const snap = await getDocs(q);
            const cities = new Set<string>();
            snap.docs.forEach(d => {
                const data = d.data();
                if (data.city) cities.add(data.city);
            });
            setActiveCities(Array.from(cities).sort());

        } catch (error) {
            console.error("Error fetching cities:", error);
            // Try fallback: maybe field IS 'uf'? Double check if fails.
            // For now assuming 'state' is correct as per type definition.
            // toast.error("Erro ao buscar cidades ativas");
            setActiveCities([]); // Fail gracefully
        } finally {
            setLoadingData(false);
        }
    };

    const fetchCityContributions = async (cityName: string, isLoadMore = false, currentFilters = filters) => {
        setLoadingData(true);
        try {
            let constraints: any[] = [
                where('city', '==', cityName),
                orderBy('createdAt', 'desc')
            ];

            if (currentFilters.status !== 'all') {
                constraints.push(where('status', '==', currentFilters.status));
            }
            if (currentFilters.category !== 'all') {
                constraints.push(where('category', '==', currentFilters.category));
            }

            let q = query(collection(db, 'contributions'), ...constraints, limit(LIMIT));

            if (isLoadMore && lastVisible) {
                q = query(collection(db, 'contributions'), ...constraints, startAfter(lastVisible), limit(LIMIT));
            }

            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));

            const lastDoc = snap.docs[snap.docs.length - 1];
            setLastVisible(lastDoc);
            setHasMore(snap.docs.length === LIMIT);

            if (isLoadMore) {
                setCityContributions(prev => [...prev, ...data]);
            } else {
                setCityContributions(data);
            }
        } catch (error) {
            console.error("Error fetching city data:", error);
            toast.error("Erro ao carregar contribuições");
        } finally {
            setLoadingData(false);
        }
    };

    const navigateTo = (level: GeoLevel) => {
        setCurrentLevel(level);
        const existingIndex = breadcrumb.findIndex(b => b.type === level.type && b.name === level.name);
        if (existingIndex >= 0) {
            setBreadcrumb(breadcrumb.slice(0, existingIndex + 1));
        } else {
            setBreadcrumb([...breadcrumb, level]);
        }
    };

    const goBack = () => {
        if (breadcrumb.length > 1) {
            const newBreadcrumb = breadcrumb.slice(0, -1);
            setBreadcrumb(newBreadcrumb);
            setCurrentLevel(newBreadcrumb[newBreadcrumb.length - 1]);
        }
    };

    // Extract unique categories from current items for filter (or hardcode common ones)
    // For simplicity, let's hardcode common ones or just generic input.
    const CONTRIBUTORS_STATUS = ['Em Análise', 'Aprovado', 'Rejeitado', 'Resolvido', 'Lixo'];
    const CONTRIBUTORS_CATEGORIES = ['Saúde', 'Educação', 'Infraestrutura', 'Meio Ambiente', 'Segurança', 'Outros'];


    const renderContent = () => {
        if (currentLevel.type === 'country') {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {REGIONS.map(region => (
                        <Card
                            key={region}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-blue-200 group"
                            onClick={() => navigateTo({ type: 'region', name: region })}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Globe className="w-8 h-8 text-blue-500" />
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-lg">{region}</CardTitle>
                                <p className="text-sm text-gray-500 mt-1">{STATE_BY_REGION[region].length} estados</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        if (currentLevel.type === 'region') {
            const states = STATE_BY_REGION[currentLevel.name] || [];
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                    {states.map(state => (
                        <Card
                            key={state}
                            className="cursor-pointer hover:shadow-lg transition-all hover:border-green-200 group"
                            onClick={() => navigateTo({ type: 'state', name: state })}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <MapPin className="w-6 h-6 text-green-500" />
                                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 transition-colors" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <CardTitle className="text-xl font-mono">{state}</CardTitle>
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
                        <p>Mostrando cidades com contribuições recentes registradas neste estado.</p>
                    </div>

                    {loadingData ? (
                        <div className="flex items-center justify-center py-20 text-gray-500">
                            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Carregando cidades...
                        </div>
                    ) : activeCities.length === 0 ? (
                        <div className="text-center py-20 text-gray-500">
                            <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p>Nenhuma cidade com contribuições encontrada recentemente em {currentLevel.name}.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {activeCities.map(city => (
                                <Card
                                    key={city}
                                    className="cursor-pointer hover:shadow-md hover:border-blue-300"
                                    onClick={() => navigateTo({ type: 'city', name: city })}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <span className="font-semibold text-gray-700">{city}</span>
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

        if (currentLevel.type === 'city') {
            return (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-600" />
                                {currentLevel.name}
                            </h3>
                            <Badge variant="outline" className="px-3 py-1">
                                {cityContributions.length > 0 ? `${cityContributions.length}${hasMore ? '+' : ''}` : '0'} Registros
                            </Badge>
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                            <select
                                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={filters.status}
                                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="all">Todos Status</option>
                                {CONTRIBUTORS_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <select
                                className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={filters.category}
                                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                            >
                                <option value="all">Todas Categorias</option>
                                {CONTRIBUTORS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {loadingData && cityContributions.length === 0 ? (
                        <div className="flex items-center justify-center py-20 text-gray-500">
                            <Loader2 className="animate-spin w-6 h-6 mr-2" /> Carregando registros...
                        </div>
                    ) : cityContributions.length === 0 ? (
                        <div className="text-center py-10 text-gray-500">
                            <p>Nenhum registro encontrado com estes filtros.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {cityContributions.map(contrib => (
                                    <ContributionDirectoryCard key={contrib.id} contribution={contrib} />
                                ))}
                            </div>

                            {hasMore && (
                                <div className="flex justify-center pt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchCityContributions(currentLevel.name, true)}
                                        disabled={loadingData}
                                    >
                                        {loadingData ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                        Carregar Mais
                                    </Button>
                                </div>
                            )}
                        </>
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
        </div>
    );
};

export default AdminCities;
