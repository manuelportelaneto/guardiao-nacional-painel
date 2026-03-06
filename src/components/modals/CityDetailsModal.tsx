import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
    MapPin,
    Calendar,
    Star,
    History,
    Building2,
    Users,
    FileText,
    RefreshCw,
    Loader2,
    LandPlot,
    Users2,
    Scaling
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, functions } from '../../firebaseConfig'; // Import functions
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import ContributionDetailModal from '../screens/ContributionDetailModal';

interface CityDetailsModalProps {
    city: any | null; // City object from territories
    open: boolean;
    onClose: () => void;
}

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

const CityDetailsModal: React.FC<CityDetailsModalProps> = ({ city, open, onClose }) => {
    const [contributions, setContributions] = useState<any[]>([]);
    const [loadingContribs, setLoadingContribs] = useState(false);

    // Detail Modal State
    const [selectedContribution, setSelectedContribution] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Enrichment State
    const [enriching, setEnriching] = useState(false);
    const [demographics, setDemographics] = useState<any>(null);

    useEffect(() => {
        if (city && open) {
            fetchCityContributions();
            setDemographics(city.demographics || null);
        }
    }, [city, open]);

    const fetchCityContributions = async () => {
        setLoadingContribs(true);
        try {
            const q = query(
                collection(db, 'contributions'),
                where('city', '==', city.name),
                where('status', '==', 'Aprovado'), // Filter ONLY Approved
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setContributions(data);
        } catch (error) {
            console.error("Error loading city contributions:", error);
        } finally {
            setLoadingContribs(false);
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            const enrichFn = httpsCallable(functions, 'enrichCityData');
            const res = await enrichFn({ cityName: city.name, uf: city.uf });
            const data = res.data as any;
            if (data.success) {
                setDemographics(data.demographics);
                toast.success("Dados atualizados com sucesso!");
            }
        } catch (e) {
            console.error(e);
            toast.error("Erro ao buscar dados do IBGE.");
        } finally {
            setEnriching(false);
        }
    };

    if (!city) return null;

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        // Handle Firestore Timestamp or ISO string or Date object
        if (date?.toDate) return date.toDate().toLocaleDateString('pt-BR');
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString('pt-BR');
    };

    // Calculate displayed count (filtered)
    // Use the fetched list length as the source of truth for "Aprovados" inside the modal
    const displayCount = contributions.length;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0" aria-describedby="city-details-desc">
                <DialogHeader className="p-6 pb-2 bg-gradient-to-r from-blue-50 to-white">
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
                            <Building2 className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            {city.name}
                            <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs font-normal text-gray-500 uppercase">{city.uf} - {city.region}</Badge>
                                <Badge className="bg-blue-600">
                                    {displayCount} Aprovados
                                </Badge>
                            </div>
                        </div>
                    </DialogTitle>
                    <DialogDescription id="city-details-desc" className="sr-only">
                        Detalhes e contribuições da cidade de {city.name}, {city.uf}.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-white">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                            <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4 text-gray-600 data-[state=active]:text-blue-600">
                                <FileText className="w-4 h-4 mr-2" />
                                Ocorrências
                            </TabsTrigger>
                            <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4 text-gray-600 data-[state=active]:text-blue-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                Município
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">
                        <TabsContent value="history" className="mt-0">
                            {loadingContribs ? (
                                <div className="text-center py-10 flex flex-col items-center gap-2">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="text-gray-500">Carregando dados da cidade...</span>
                                </div>
                            ) : contributions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
                                    <History className="w-8 h-8 opacity-20" />
                                    <p>Nenhuma contribuição registrada nesta cidade.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {contributions.map(contrib => (
                                        <div
                                            key={contrib.id}
                                            className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                                            onClick={() => {
                                                setSelectedContribution(contrib);
                                                setDetailModalOpen(true);
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors text-lg">{contrib.title}</h4>
                                                    <Badge variant={
                                                        contrib.status === 'Resolvido' || contrib.status === 'Concluído' ? 'secondary' : // success-like
                                                            contrib.status === 'Rejeitado' ? 'destructive' : 'outline'
                                                    } className="capitalize">
                                                        {contrib.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">{contrib.description}</p>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-500 items-center">
                                                    <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"><Calendar className="w-3 h-3" /> {formatDate(contrib.createdAt)}</span>
                                                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100"><Star className="w-3 h-3" /> {translateCategory(contrib.category)}</span>
                                                    {contrib.likes > 0 && (
                                                        <span className="flex items-center gap-1 text-pink-600"><Users className="w-3 h-3" /> {contrib.likes} apoios</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="info" className="mt-0">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Dados Demográficos Governamentais</CardTitle>
                                    <Button size="sm" variant="outline" onClick={handleEnrich} disabled={enriching}>
                                        {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                                        {enriching ? 'Buscando...' : 'Atualizar Dados'}
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    {demographics ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                                <div className="flex items-center gap-2 text-blue-800 mb-1">
                                                    <Users2 className="w-4 h-4" />
                                                    <p className="text-sm font-semibold uppercase">População</p>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{demographics.population?.toLocaleString('pt-BR') || 'N/A'}</p>
                                                <p className="text-xs text-blue-600 mt-1">Fonte: IBGE</p>
                                            </div>

                                            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                <div className="flex items-center gap-2 text-green-800 mb-1">
                                                    <LandPlot className="w-4 h-4" />
                                                    <p className="text-sm font-semibold uppercase">Área Territorial</p>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{demographics.area?.toLocaleString('pt-BR')} km²</p>
                                            </div>

                                            <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                                <div className="flex items-center gap-2 text-emerald-800 mb-1">
                                                    <Scaling className="w-4 h-4" />
                                                    <p className="text-sm font-semibold uppercase">Densidade</p>
                                                </div>
                                                <p className="text-2xl font-bold text-gray-900">{demographics.density} hab/km²</p>
                                            </div>

                                            <div className="col-span-2 md:col-span-3 pt-4 border-t border-gray-100 mt-2">
                                                <p className="text-xs text-gray-500">
                                                    Última atualização dos dados: {demographics.lastUpdated ? formatDate(demographics.lastUpdated) : 'N/A'}
                                                </p>
                                                <p className="text-xs text-gray-400">Código IBGE: {demographics.ibgeId}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-gray-500">
                                            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p>Dados demográficos não disponíveis.</p>
                                            <p className="text-sm">Clique em "Atualizar Dados" para buscar no IBGE.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="mt-6">
                                <CardHeader>
                                    <CardTitle>Detalhes Geográficos do Sistema</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Estado (UF)</p>
                                        <p className="font-medium">{city.uf}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Região</p>
                                        <p className="font-medium">{city.region}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">ID do Sistema</p>
                                        <p className="font-mono text-xs">{city.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Registros Totais</p>
                                        <p className="font-medium">{city.totalContributions || 0}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>

            <ContributionDetailModal
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                contribution={selectedContribution}
            />
        </Dialog>
    );
};

export default CityDetailsModal;
