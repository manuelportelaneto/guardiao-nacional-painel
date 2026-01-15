import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat'; // Import side-effects
import { intelligenceService, type HeatmapPoint, type IntelligenceFilters } from '../../services/intelligenceService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Filter } from 'lucide-react';

// Corrections for Leaflet default marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Type extension for leaflet.heat
declare module 'leaflet' {
    export function heatLayer(latlngs: Array<[number, number, number]>, options?: any): any;
}

const HeatmapLayer = ({ points }: { points: HeatmapPoint[] }) => {
    const map = useMap();

    useEffect(() => {
        if (!points.length) return;

        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]);

        const heat = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: {
                0.4: 'blue',
                0.6: 'cyan',
                0.7: 'lime',
                0.8: 'yellow',
                1.0: 'red'
            }
        });

        heat.addTo(map);

        return () => {
            map.removeLayer(heat);
        };
    }, [points, map]);

    return null;
};

const IntelligenceMap: React.FC = () => {
    const [points, setPoints] = useState<HeatmapPoint[]>([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState<IntelligenceFilters>({
        status: 'all', // Show accepted/analyzing by default (handled in service)
        category: 'all'
    });

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await intelligenceService.getHeatmapPoints(filters);
            setPoints(data);
            if (data.length === 0) {
                toast.info("Nenhum dado encontrado para os filtros selecionados.");
            } else {
                toast.success(`${data.length} ocorrências carregadas.`);
            }
        } catch (error) {
            toast.error("Erro ao carregar mapa de calor.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inteligência Territorial</h1>
                    <p className="text-muted-foreground mr-12">Mapas de calor e análise geoespacial de ocorrências.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        Atualizar
                    </Button>
                </div>
            </div>

            <Card className="bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-800 relative z-50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg flex items-center gap-2 text-gray-900 dark:text-white">
                            <Filter className="w-5 h-5 text-blue-500" /> Filtros
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            value={filters.category}
                            onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}
                        >
                            <SelectTrigger className="text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">Todas as Categorias</SelectItem>
                                <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                                <SelectItem value="Segurança">Segurança</SelectItem>
                                <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                                <SelectItem value="Saúde">Saúde</SelectItem>
                                <SelectItem value="Transporte">Transporte</SelectItem>
                                <SelectItem value="Serviços Públicos">Serviços Públicos</SelectItem>
                                <SelectItem value="Lazer">Lazer</SelectItem>
                                <SelectItem value="Acessibilidade">Acessibilidade</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select
                            value={filters.status}
                            onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}
                        >
                            <SelectTrigger className="text-gray-900 dark:text-gray-100">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent className="z-[9999]">
                                <SelectItem value="all">Todos (Ativos)</SelectItem>
                                <SelectItem value="pending">Em Análise</SelectItem>
                                <SelectItem value="approved">Aprovados</SelectItem>
                                <SelectItem value="resolved">Resolvidos</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card className="h-[600px] overflow-hidden border-gray-200 dark:border-slate-800 relative z-0">
                <MapContainer center={[-14.2350, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <HeatmapLayer points={points} />
                </MapContainer>
            </Card>
        </div>
    );
};

export default IntelligenceMap;
