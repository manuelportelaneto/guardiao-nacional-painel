import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, doc, updateDoc, orderBy, where } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import {
    Building2,
    CheckCircle2,
    XCircle,
    Plus,
    Settings2,
    Loader2,
    ChevronRight,
    Globe,
    MapPin,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface City {
    id: string;
    name: string;
    uf: string;
    region?: string;
    country?: string;
    status: 'active' | 'inactive' | 'pending';
    adminEmail?: string;
    population?: number;
    updatedAt?: Date;
}

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
    const [cities, setCities] = useState<City[]>([]);
    const [loading, setLoading] = useState(true);

    // Hierarchical navigation state
    const [currentLevel, setCurrentLevel] = useState<GeoLevel>({ type: 'country', name: 'Brasil' });
    const [breadcrumb, setBreadcrumb] = useState<GeoLevel[]>([{ type: 'country', name: 'Brasil' }]);

    useEffect(() => {
        if (currentLevel.type === 'city' || currentLevel.type === 'state') {
            fetchCities();
        }
    }, [currentLevel]);

    const fetchCities = async () => {
        setLoading(true);
        try {
            let q;
            if (currentLevel.type === 'state') {
                q = query(collection(db, 'cities'), where('uf', '==', currentLevel.name), orderBy('name'));
            } else {
                q = query(collection(db, 'cities'), orderBy('name'));
            }
            const querySnapshot = await getDocs(q);
            const citiesData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as City[];
            setCities(citiesData);
        } catch (error) {
            console.error("Error fetching cities:", error);
            toast.error("Erro ao carregar cidades");
        } finally {
            setLoading(false);
        }
    };

    const toggleCityStatus = async (city: City) => {
        const newStatus = city.status === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'cities', city.id), {
                status: newStatus,
                updatedAt: new Date()
            });
            toast.success(`Cidade ${newStatus === 'active' ? 'ativada' : 'desativada'}`);
            setCities(cities.map(c => c.id === city.id ? { ...c, status: newStatus } : c));
        } catch {
            toast.error("Erro ao atualizar status da cidade");
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
            if (loading) {
                return (
                    <div className="flex items-center justify-center py-20 text-gray-500">
                        <Loader2 className="animate-spin w-6 h-6 mr-2" />
                        Carregando cidades...
                    </div>
                );
            }

            if (cities.length === 0) {
                return (
                    <div className="text-center py-20 text-gray-500">
                        <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>Nenhuma cidade cadastrada em {currentLevel.name}.</p>
                        <p className="text-sm mt-2">As cidades são criadas automaticamente quando uma contribuição é registrada.</p>
                    </div>
                );
            }

            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {cities.map(city => (
                        <Card key={city.id} className={`overflow-hidden ${city.status === 'inactive' ? 'opacity-60' : ''}`}>
                            <div className={`h-1.5 w-full ${city.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                            <Building2 className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg">{city.name}</CardTitle>
                                            <span className="text-xs text-gray-500 font-mono">{city.uf}</span>
                                        </div>
                                    </div>
                                    <Badge variant={city.status === 'active' ? 'secondary' : 'outline'}>
                                        {city.status === 'active' ? 'Ativa' : 'Inativa'}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <p className="text-sm text-gray-600">
                                    <strong>Responsável:</strong> {city.adminEmail || 'Não atribuído'}
                                </p>
                                <div className="flex gap-2 pt-2 border-t">
                                    <Button variant="ghost" size="sm" className="flex-1 gap-1">
                                        <Settings2 className="w-4 h-4" />
                                        Configurar
                                    </Button>
                                    <Button
                                        variant={city.status === 'active' ? 'destructive' : 'default'}
                                        size="sm"
                                        className="flex-1 gap-1"
                                        onClick={() => toggleCityStatus(city)}
                                    >
                                        {city.status === 'active' ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                        {city.status === 'active' ? 'Desativar' : 'Ativar'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
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
                    <h2 className="text-3xl font-bold text-gray-900 font-outfit">Gestão Geográfica</h2>
                    <p className="text-gray-500">Navegue pela hierarquia Brasil &gt; Região &gt; Estado &gt; Cidade.</p>
                </div>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Nova Cidade
                </Button>
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
