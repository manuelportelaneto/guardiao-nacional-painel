import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import {
    MapPin,
    Calendar,
    Star,
    History,
    Building2,
    Users,
    FileText
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import ContributionDetailModal from '../screens/ContributionDetailModal';

interface CityDetailsModalProps {
    city: any | null; // City object from territories
    open: boolean;
    onClose: () => void;
}

const CityDetailsModal: React.FC<CityDetailsModalProps> = ({ city, open, onClose }) => {
    const [contributions, setContributions] = useState<any[]>([]);
    const [loadingContribs, setLoadingContribs] = useState(false);

    // Detail Modal State
    const [selectedContribution, setSelectedContribution] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    useEffect(() => {
        if (city && open) {
            fetchCityContributions();
        }
    }, [city, open]);

    const fetchCityContributions = async () => {
        setLoadingContribs(true);
        try {
            // Now we can query strictly by 'city' field thanks to migration
            const q = query(
                collection(db, 'contributions'),
                where('city', '==', city.name),
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

    if (!city) return null;

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        return date.toDate ? date.toDate().toLocaleDateString('pt-BR') : new Date(date).toLocaleDateString('pt-BR');
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
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
                                    {city.totalContributions || contributions.length || 0} Registros
                                </Badge>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b bg-white">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                            <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4 text-gray-600 data-[state=active]:text-blue-600">
                                <FileText className="w-4 h-4 mr-2" />
                                Contribuições e Ocorrências
                            </TabsTrigger>
                            <TabsTrigger value="info" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4 text-gray-600 data-[state=active]:text-blue-600">
                                <MapPin className="w-4 h-4 mr-2" />
                                Dados do Município
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
                                                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-md border border-blue-100"><Star className="w-3 h-3" /> {contrib.category}</span>
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
                                <CardHeader>
                                    <CardTitle>Detalhes Geográficos</CardTitle>
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
                                        <p className="text-sm text-gray-500">Última Atualização</p>
                                        <p className="font-medium">{city.updatedAt ? formatDate(city.updatedAt) : 'N/A'}</p>
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
