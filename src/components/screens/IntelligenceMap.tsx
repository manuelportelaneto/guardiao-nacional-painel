
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet.heat';
import { intelligenceService, type HeatmapPoint, type IntelligenceFilters } from '../../services/intelligenceService';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';
import { Loader2, RefreshCw, Filter, Layers, Map as MapIcon, Calendar as CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for categories/severity can be added here
const HighRiskIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);'></div>",
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const MediumRiskIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<div style='background-color: #f97316; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.3);'></div>",
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

// Heatmap Layer Component
const HeatmapLayer = ({ points }: { points: HeatmapPoint[] }) => {
    const map = useMap();

    useEffect(() => {
        if (!points.length) return;
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]);
        const heat = (L as any).heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 17,
            max: 1.0,
            gradient: { 0.4: 'blue', 0.6: 'cyan', 0.7: 'lime', 0.8: 'yellow', 1.0: 'red' }
        });
        heat.addTo(map);
        return () => { map.removeLayer(heat); };
    }, [points, map]);

    return null;
};

const IntelligenceMap: React.FC = () => {
    const [viewMode, setViewMode] = useState<'heatmap' | 'clusters'>('clusters');
    const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
    const [clusterData, setClusterData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Default filters: last 30 days
    const [filters, setFilters] = useState<IntelligenceFilters>({
        status: 'all',
        category: 'all',
        startDate: new Date(new Date().setDate(new Date().getDate() - 30)),
        endDate: new Date()
    });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: filters.startDate,
        to: filters.endDate
    });

    // Update filters when dateRange changes
    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            startDate: dateRange.from,
            endDate: dateRange.to
        }));
    }, [dateRange]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (viewMode === 'heatmap') {
                const data = await intelligenceService.getHeatmapPoints(filters);
                setHeatmapPoints(data);
                toast.success(`${data.length} pontos de calor carregados.`);
            } else {
                const data = await intelligenceService.getMapData(filters);
                setClusterData(data);
                toast.success(`${data.length} ocorrências carregadas.`);
            }
        } catch (error) {
            toast.error("Erro ao carregar dados do mapa.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters, viewMode]);

    return (
        <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm z-30">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setViewMode('clusters')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'clusters' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <MapIcon size={16} /> Clusters
                        </button>
                        <button
                            onClick={() => setViewMode('heatmap')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'heatmap' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                        >
                            <Layers size={16} /> Calor
                        </button>
                    </div>

                    <div className="h-6 w-px bg-gray-200 hidden md:block" />

                    <div className="flex items-center gap-2 flex-1 md:flex-initial overflow-x-auto">
                        <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                            <SelectTrigger className="w-[140px] h-9 text-xs">
                                <SelectValue placeholder="Categoria" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                                <SelectItem value="Segurança">Segurança</SelectItem>
                                <SelectItem value="Saúde">Saúde</SelectItem>
                                <SelectItem value="Trânsito">Trânsito</SelectItem>
                            </SelectContent>
                        </Select>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 text-xs font-normal">
                                    <CalendarIcon className="mr-2 h-3 w-3" />
                                    {dateRange.from ? (
                                        dateRange.to ? (
                                            <>{format(dateRange.from, "dd/MM")} - {format(dateRange.to, "dd/MM")}</>
                                        ) : format(dateRange.from, "dd/MM")
                                    ) : "Data"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={dateRange.from}
                                    selected={dateRange as any}
                                    onSelect={(range: any) => setDateRange(range)}
                                    numberOfMonths={2}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <Button variant="ghost" size="sm" onClick={loadData} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            </div>

            {/* Map Container */}
            <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative z-0">
                <MapContainer center={[-14.2350, -51.9253]} zoom={4} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    />

                    {viewMode === 'heatmap' && <HeatmapLayer points={heatmapPoints} />}

                    {viewMode === 'clusters' && (
                        <MarkerClusterGroup chunkedLoading>
                            {clusterData.map((point) => (
                                <Marker
                                    key={point.id}
                                    position={[point.location.latitude, point.location.longitude]}
                                    icon={point.riskLevel >= 4 ? HighRiskIcon : (point.riskLevel >= 3 ? MediumRiskIcon : DefaultIcon)}
                                >
                                    <Popup>
                                        <div className="p-1 min-w-[200px]">
                                            <h3 className="font-bold text-sm mb-1">{point.category}</h3>
                                            <p className="text-xs text-gray-600 mb-2">{point.description?.substring(0, 100)}...</p>
                                            <div className="flex justify-between items-center">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${point.status === 'Resolvido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                    {point.status}
                                                </span>
                                                <span className="text-[10px] text-gray-400">
                                                    {point.createdAt?.toDate ? format(point.createdAt.toDate(), "dd/MM/yy") : ""}
                                                </span>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    )}
                </MapContainer>

                {/* Legend Overlay */}
                <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-3 rounded-lg border border-gray-200 shadow-lg text-xs z-[400]">
                    <h4 className="font-bold mb-2">Legenda</h4>
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-red-500 border border-white shadow-sm"></div>
                            <span>Alto Risco</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500 border border-white shadow-sm"></div>
                            <span>Médio Risco</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <img src={icon} className="w-3 h-4 opacity-70" alt="marker" />
                            <span>Normal</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IntelligenceMap;
