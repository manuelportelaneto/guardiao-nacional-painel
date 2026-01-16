import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import {
    History,
    Users,
    RefreshCw,
    Loader2,
    LandPlot,
    Users2,
    Scaling,
    ArrowLeft,
    Search,
    FileDown,
    MapPin,
    CheckSquare,
    Square
} from 'lucide-react';
import {
    collection,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    startAfter,
    collectionGroup
} from 'firebase/firestore';
import { db, functions } from '../../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import ContributionDetailModal from '../screens/ContributionDetailModal';
import { ReportDialog } from '../common/ReportDialog';

const translateCategory = (cat: string) => {
    const map: Record<string, string> = {
        'leisure': 'Lazer',
        'services': 'Serviços',
        'transport': 'Transporte',
        'safety': 'Segurança',
        'infrastructure': 'Infraestrutura',
        'environment': 'Meio Ambiente',
        'education': 'Educação',
        'health': 'Saúde',
        'other': 'Outros'
    };
    return map[cat] || cat;
};

const PAGE_SIZE = 10;

const CityDetailsPage: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>(); // e.g. "maua"
    const navigate = useNavigate();

    // City Data
    const [city, setCity] = useState<any>(null);
    const [loadingCity, setLoadingCity] = useState(true);

    // Contributions State
    const [contributions, setContributions] = useState<any[]>([]);
    const [loadingContribs, setLoadingContribs] = useState(false);
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [hasMore, setHasMore] = useState(false);

    // Filters & Search
    const [filterStatus, setFilterStatus] = useState<string>('Todos'); // Default Todos
    const [searchTerm, setSearchTerm] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Modals
    const [selectedContribution, setSelectedContribution] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);

    // Enrichment
    const [enriching, setEnriching] = useState(false);
    const [demographics, setDemographics] = useState<any>(null);

    // Initial Load - Fetch Fresh City Data
    useEffect(() => {
        const fetchCityFresh = async () => {
            if (!cityId) return;
            try {
                // 1. Try Collection Group Query for Robustness (finds city regardless of region/state)
                // Note: Requires index on 'id'.
                const citiesRef = collectionGroup(db, 'cities');
                const q = query(citiesRef, where('id', '==', cityId), limit(1));
                const snap = await getDocs(q);

                if (!snap.empty) {
                    const doc = snap.docs[0];
                    const cityData: any = { id: doc.id, ...doc.data() };
                    setCity(cityData); // Contains latest counts & demographics
                    setDemographics(cityData.demographics);

                    // Cache for fallback speed
                    sessionStorage.setItem(`city_${cityId}`, JSON.stringify(cityData));
                } else {
                    // Fallback to Session Storage if offline or index missing
                    const stored = sessionStorage.getItem(`city_${cityId}`);
                    if (stored) {
                        const c = JSON.parse(stored);
                        setCity(c);
                        setDemographics(c.demographics);
                        toast.warning("Usando dados em cache. Algumas informações podem estar desatualizadas.");
                    } else {
                        // Keep current if valid or redirect?
                        // If checking directly from URL, redirect.
                        if (!city) {
                            toast.error("Cidade não encontrada.");
                            navigate('/admin/cities');
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching city:", e);
                // Fallback
                const stored = sessionStorage.getItem(`city_${cityId}`);
                if (stored) {
                    setCity(JSON.parse(stored));
                }
            } finally {
                setLoadingCity(false);
            }
        };
        fetchCityFresh();
    }, [cityId, navigate]);

    // Fetch Contributions
    useEffect(() => {
        if (city) {
            fetchContributions(true);

            // Auto-enrich if missing or incomplete, but do not force refresh
            if (!city.demographics || !city.demographics.population) {
                handleEnrich(false);
            }
        }
    }, [city, filterStatus, searchTerm]); // Trigger on filter change. Search might need debounce.

    const fetchContributions = async (reset = false) => {
        if (!city) return;
        setLoadingContribs(true);
        try {
            // Base Query
            let constraints: any[] = [
                where('city', '==', city.name),
                orderBy('createdAt', 'desc'),
                limit(PAGE_SIZE)
            ];

            // Filter Status
            if (filterStatus !== 'Todos') {
                if (filterStatus === 'Pendente') { // UI says Pendente
                    constraints.push(where('status', '==', 'Em análise')); // Query says Em análise
                } else {
                    constraints.push(where('status', '==', filterStatus));
                }
            }

            // Simple Search (Client-side filtering for simplicity if Firestore strict?)
            if (searchTerm) {
                // For now, strict search or no search if term is short
            }

            let q = query(collection(db, 'contributions'), ...constraints);

            if (!reset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (reset) {
                setContributions(data);
            } else {
                setContributions(prev => [...prev, ...data]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar contribuições.");
        } finally {
            setLoadingContribs(false);
        }
    };

    const handleEnrich = async (force = true) => {
        if (!city) return;
        setEnriching(true);
        try {
            const enrichFn = httpsCallable(functions, 'enrichCityData');
            // Pass 'force' parameter to backend
            const res = await enrichFn({ cityName: city.name, uf: city.uf, force });
            const data = res.data as any;
            if (data.success) {
                // Only toast if it was a forced update or purely new data?
                // If it was auto, maybe suppression is better?
                // For now, let's toast only if changes or success.
                // If cached, 'data.cached' is true.

                setDemographics(data.demographics);
                const updated = { ...city, demographics: data.demographics };
                setCity(updated);
                sessionStorage.setItem(`city_${cityId}`, JSON.stringify(updated));

                if (force) {
                    toast.success("Dados atualizados com sucesso!");
                } else if (!data.cached) {
                    toast.success("Dados demográficos carregados.");
                }
            }
        } catch (e) {
            console.error(e);
            if (force) toast.error("Erro ao buscar dados do IBGE.");
        } finally {
            setEnriching(false);
        }
    };

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        if (date?.toDate) return date.toDate().toLocaleDateString('pt-BR');
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('pt-BR');
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === contributions.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(contributions.map(c => c.id)));
        }
    };

    // Generate Report Logic
    const handleGenerateReport = () => {
        if (selectedIds.size === 0) {
            toast.error("Selecione ao menos uma ocorrência ou gere um relatório geral.");
        }
        setReportOpen(true);
    };

    if (loadingCity) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin" /></div>;
    if (!city) return null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-6 pb-20 print:p-0">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin/cities')}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900 font-outfit flex items-center gap-3">
                            {city.name}
                            <Badge variant="outline" className="text-sm font-normal text-gray-500 uppercase">{city.uf} - {city.region}</Badge>
                        </h2>
                        <p className="text-gray-500">Gestão Municipal e Ocorrências</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Counters V6 */}
                    <div className="flex gap-2">
                        <Badge variant="secondary" className="text-lg px-3 py-1 flex gap-2">
                            <Users size={16} />
                            {city.totalContributions || 0} Total
                        </Badge>
                        <Badge className="bg-blue-600 text-lg px-3 py-1 flex gap-2">
                            <CheckSquare size={16} />
                            {city.approvedContributions || 0} Aprovados
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Demographics Card */}
            <Card className="print:hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium">Dados Demográficos</CardTitle>
                    <Button size="sm" variant="outline" onClick={() => handleEnrich(true)} disabled={enriching}>
                        {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Att. Dados
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col justify-center items-center text-center">
                            <Users2 className="w-5 h-5 text-blue-800 mb-2" />
                            <p className="text-sm font-semibold uppercase text-blue-900">População</p>
                            <p className="text-3xl font-bold text-gray-900">{demographics?.population?.toLocaleString('pt-BR') || '0'}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg border border-green-100 flex flex-col justify-center items-center text-center">
                            <LandPlot className="w-5 h-5 text-green-800 mb-2" />
                            <p className="text-sm font-semibold uppercase text-green-900">Área</p>
                            <p className="text-3xl font-bold text-gray-900">{demographics?.area?.toLocaleString('pt-BR') || '0'} km²</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 flex flex-col justify-center items-center text-center">
                            <Scaling className="w-5 h-5 text-purple-800 mb-2" />
                            <p className="text-sm font-semibold uppercase text-purple-900">Densidade</p>
                            <p className="text-3xl font-bold text-gray-900">{demographics?.density || '0'} hab/km²</p>
                        </div>
                    </div>
                    {demographics?.lastUpdated && (
                        <p className="text-xs text-gray-400 mt-2 text-right">
                            Atualizado em: {formatDate(demographics.lastUpdated)}
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* Contributions Section */}
            <div className="space-y-4">
                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 print:hidden">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar (ID, Título...)"
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        {/* Status Filter */}
                        <select
                            className="bg-white border border-gray-200 rounded-md text-sm p-2 h-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="Todos">Todos Status</option>
                            <option value="Aprovado">Aprovados</option>
                            <option value="Pendente">Pendentes</option>
                            <option value="Rejeitado">Rejeitados</option>
                            <option value="Resolvido">Resolvidos</option>
                        </select>
                    </div>

                    <div className="flex gap-2">
                        {/* Always show Report Button */}
                        <Button variant="outline" onClick={handleGenerateReport}>
                            <FileDown className="w-4 h-4 mr-2" />
                            {selectedIds.size > 0 ? `Relatório (${selectedIds.size})` : "Relatório Geral"}
                        </Button>
                    </div>
                </div>

                {/* List */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {/* Header Row */}
                    <div className="flex items-center p-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <div className="w-10 flex justify-center">
                            <button onClick={toggleSelectAll}>
                                {contributions.length > 0 && selectedIds.size === contributions.length ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                            </button>
                        </div>
                        <div className="flex-1">Detalhes da Ocorrência</div>
                        <div className="w-24 text-right hidden md:block">Ações</div>
                    </div>

                    {loadingContribs && contributions.length === 0 ? (
                        <div className="p-10 text-center text-gray-500">Carregando ocorrências...</div>
                    ) : contributions.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 flex flex-col items-center">
                            <History className="w-8 h-8 opacity-20 mb-2" />
                            Nenhuma ocorrência encontrada.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {contributions.map((contrib) => (
                                <div
                                    key={contrib.id}
                                    className={`flex items-start p-4 hover:bg-blue-50/50 transition-colors ${selectedIds.has(contrib.id) ? 'bg-blue-50' : ''}`}
                                >
                                    <div className="w-10 flex justify-center pt-1" onClick={(e) => { e.stopPropagation(); toggleSelection(contrib.id); }}>
                                        {selectedIds.has(contrib.id) ? <CheckSquare className="w-4 h-4 text-blue-600 cursor-pointer" /> : <Square className="w-4 h-4 text-gray-400 cursor-pointer" />}
                                    </div>
                                    <div
                                        className="flex-1 cursor-pointer"
                                        onClick={() => {
                                            setSelectedContribution(contrib);
                                            setDetailModalOpen(true);
                                        }}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-semibold text-gray-900">{contrib.title}</h4>
                                            <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{formatDate(contrib.createdAt)}</span>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2 mb-2">{contrib.description}</p>
                                        <div className="flex gap-2 text-xs flex-wrap">
                                            <Badge variant="outline" className="font-normal border-gray-300">{translateCategory(contrib.category)}</Badge>
                                            <Badge className={
                                                contrib.status === 'Aprovado' ? 'bg-green-100 text-green-800 border-green-200' :
                                                    contrib.status === 'Rejeitado' ? 'bg-red-100 text-red-800 border-red-200' :
                                                        'bg-yellow-100 text-yellow-800 border-yellow-200'
                                            } variant="outline">
                                                {contrib.status}
                                            </Badge>
                                            <span className="flex items-center gap-1 text-gray-500 ml-auto">
                                                <MapPin className="w-3 h-3" /> {contrib.address || "Sem endereço"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {hasMore && (
                        <div className="p-4 border-t border-gray-100 flex justify-center bg-gray-50">
                            <Button variant="ghost" onClick={() => fetchContributions(false)} disabled={loadingContribs}>
                                {loadingContribs ? <Loader2 className="animate-spin w-4 h-4" /> : "Carregar Mais"}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <ContributionDetailModal
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                contribution={selectedContribution}
            />

            <ReportDialog
                open={reportOpen}
                onOpenChange={setReportOpen}
                cityId={city.id}
                cityName={city.name}
            />
        </div>
    );
};

export default CityDetailsPage;
