
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

// leaflet.heat requires global L
(window as any).L = L;
import 'leaflet.heat';

import { intelligenceService, type HeatmapPoint, type IntelligenceFilters, type MapBounds } from '../../services/intelligenceService';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
    Loader2, RefreshCw, Layers, Map as MapIcon,
    Calendar as CalendarIcon, TriangleAlert, TrendingUp, MapPin, ChartBarBig
} from 'lucide-react';
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

const createRiskIcon = (color: string, size: number = 14) => L.divIcon({
    className: '',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2]
});

const HighRiskIcon = createRiskIcon('#ef4444', 16);
const MediumRiskIcon = createRiskIcon('#f97316', 13);
const LowRiskIcon = createRiskIcon('#3b82f6', 11);

// Heatmap Layer
const HeatmapLayer = ({ points }: { points: HeatmapPoint[] }) => {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        const heatPoints = points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]);
        const heat = (L as any).heatLayer(heatPoints, {
            radius: 20,
            blur: 15,
            maxZoom: 15,
            max: 0.5, // Lower max makes high density areas pop more easily
            gradient: { 0.2: '#60a5fa', 0.4: '#34d399', 0.6: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' }
        });
        heat.addTo(map);
        return () => { map.removeLayer(heat); };
    }, [points, map]);
    return null;
};

const BoundsTracker = ({ onBoundsChange }: { onBoundsChange: (b: MapBounds) => void }) => {
    useMapEvents({
        moveend: (e) => {
            const b = (e.target as L.Map).getBounds();
            onBoundsChange({ minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() });
        }
    });
    return null;
};

// KPI card used in the sidebar panel
const KpiCard = ({ label, value, color, icon: Icon }: { label: string; value: number | string; color: string; icon: React.ElementType }) => (
    <div className={`rounded-xl p-3 flex items-center gap-3 border ${color}`}>
        <div className="p-2 rounded-lg bg-white/60">
            <Icon className="w-4 h-4" />
        </div>
        <div>
            <p className="text-xl font-bold leading-none">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{label}</p>
        </div>
    </div>
);

const IntelligenceMap: React.FC = () => {
    const [viewMode, setViewMode] = useState<'heatmap' | 'clusters'>('clusters');
    const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
    const [clusterData, setClusterData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentBounds, setCurrentBounds] = useState<MapBounds | undefined>(undefined);
    const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showPanel, setShowPanel] = useState(true);

    const [filters, setFilters] = useState<IntelligenceFilters>({
        status: 'all',
        category: 'all',
        startDate: new Date(new Date().setDate(new Date().getDate() - 365)),
        endDate: new Date()
    });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: filters.startDate,
        to: filters.endDate
    });

    useEffect(() => {
        setFilters(prev => ({ ...prev, startDate: dateRange.from, endDate: dateRange.to }));
    }, [dateRange]);

    const loadData = async (bounds?: MapBounds) => {
        setLoading(true);
        try {
            if (viewMode === 'heatmap') {
                const data = await intelligenceService.getHeatmapPoints(filters, bounds);
                setHeatmapPoints(data);
                if (data.length > 0) toast.success(`${data.length} pontos carregados`);
            } else {
                const data = await intelligenceService.getMapData(filters, bounds);
                setClusterData(data);
                if (data.length > 0) toast.success(`${data.length} ocorrências`);
            }
        } catch (error) {
            toast.error('Erro ao carregar dados do mapa.');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleBoundsChange = (bounds: MapBounds) => {
        setCurrentBounds(bounds);
        if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
        boundsDebounceRef.current = setTimeout(() => loadData(bounds), 700);
    };

    useEffect(() => { loadData(currentBounds); }, [filters, viewMode]);

    // Computed KPIs from cluster data
    const highRisk = clusterData.filter(p => p.riskLevel >= 4).length;
    const mediumRisk = clusterData.filter(p => p.riskLevel === 3).length;
    const lowRisk = clusterData.filter(p => p.riskLevel <= 2).length;
    const resolved = clusterData.filter(p => p.status === 'Resolvido').length;

    // Top categories
    const categoryMap: Record<string, number> = {};
    clusterData.forEach(p => { categoryMap[p.category] = (categoryMap[p.category] || 0) + 1; });
    const topCategories = Object.entries(categoryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

    return (
        <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">

            {/* ─── Toolbar ─────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
                {/* View toggle */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button
                        onClick={() => setViewMode('clusters')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${viewMode === 'clusters' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <MapIcon size={13} /> Clusters
                    </button>
                    <button
                        onClick={() => setViewMode('heatmap')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${viewMode === 'heatmap' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500'}`}
                    >
                        <Layers size={13} /> Mapa de Calor
                    </button>
                </div>

                <div className="h-5 w-px bg-gray-200" />

                {/* Category filter */}
                <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger className="h-8 text-xs w-[130px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Infraestrutura">Infraestrutura</SelectItem>
                        <SelectItem value="Segurança">Segurança</SelectItem>
                        <SelectItem value="Saúde">Saúde</SelectItem>
                        <SelectItem value="Trânsito">Trânsito</SelectItem>
                        <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                    </SelectContent>
                </Select>

                {/* Status filter */}
                <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="h-8 text-xs w-[120px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos status</SelectItem>
                        <SelectItem value="Em Análise">Em Análise</SelectItem>
                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                        <SelectItem value="Resolvido">Resolvido</SelectItem>
                    </SelectContent>
                </Select>

                {/* Date range */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8 text-xs font-normal">
                            <CalendarIcon className="mr-1.5 h-3 w-3" />
                            {dateRange.from ? (
                                dateRange.to
                                    ? `${format(dateRange.from, 'dd/MM')} – ${format(dateRange.to, 'dd/MM')}`
                                    : format(dateRange.from, 'dd/MM/yy')
                            ) : 'Período'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            locale={ptBR}
                            defaultMonth={dateRange.from}
                            selected={dateRange as any}
                            onSelect={(range: any) => setDateRange(range)}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setShowPanel(p => !p)}
                    >
                        <ChartBarBig size={14} className="mr-1" />
                        {showPanel ? 'Ocultar KPIs' : 'KPIs'}
                    </Button>
                    <Button variant="outline" size="sm" className="h-8" onClick={() => loadData(currentBounds)} disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>

            {/* ─── Main Area ───────────────────────────────────────────────────────── */}
            <div className="flex gap-3 flex-1 min-h-0">

                {/* KPI Sidebar */}
                {showPanel && viewMode === 'clusters' && (
                    <div className="w-52 shrink-0 flex flex-col gap-2 overflow-y-auto">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1">Distribuição de Risco</p>
                        <KpiCard label="Alto Risco" value={highRisk} color="bg-red-50 border-red-200 text-red-700" icon={TriangleAlert} />
                        <KpiCard label="Médio Risco" value={mediumRisk} color="bg-orange-50 border-orange-200 text-orange-700" icon={TriangleAlert} />
                        <KpiCard label="Baixo Risco" value={lowRisk} color="bg-blue-50 border-blue-200 text-blue-700" icon={MapPin} />
                        <KpiCard label="Resolvidos" value={resolved} color="bg-green-50 border-green-200 text-green-700" icon={TrendingUp} />

                        {topCategories.length > 0 && (
                            <>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mt-2">Top Categorias</p>
                                {topCategories.map(([cat, count]) => (
                                    <div key={cat} className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex justify-between items-center">
                                        <span className="text-xs font-medium truncate text-gray-700">{cat}</span>
                                        <Badge variant="secondary" className="text-xs ml-1 shrink-0">{count}</Badge>
                                    </div>
                                ))}
                            </>
                        )}

                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider px-1 mt-2">Legenda</p>
                        <Card className="border-gray-200">
                            <CardContent className="p-3 space-y-2">
                                {[
                                    { color: 'bg-red-500', label: 'Alto Risco (≥4)' },
                                    { color: 'bg-orange-500', label: 'Médio Risco (3)' },
                                    { color: 'bg-blue-500', label: 'Baixo Risco (≤2)' },
                                ].map(({ color, label }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${color} border border-white shadow-sm shrink-0`} />
                                        <span className="text-xs text-gray-600">{label}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Map */}
                <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative min-h-0">
                    {loading && (
                        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="text-sm text-gray-500">Carregando dados...</span>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={[-15.7801, -47.9292]}
                        zoom={5}
                        style={{ height: '100%', width: '100%' }}
                        zoomControl={false}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        />
                        <BoundsTracker onBoundsChange={handleBoundsChange} />

                        {viewMode === 'heatmap' && <HeatmapLayer points={heatmapPoints} />}

                        {viewMode === 'clusters' && (
                            <MarkerClusterGroup chunkedLoading>
                                {clusterData.map((point) => (
                                    <Marker
                                        key={point.id}
                                        position={[point.location.latitude, point.location.longitude]}
                                        icon={
                                            point.riskLevel >= 4 ? HighRiskIcon
                                                : point.riskLevel === 3 ? MediumRiskIcon
                                                    : LowRiskIcon
                                        }
                                    >
                                        <Popup>
                                            <div className="p-1 min-w-[200px] max-w-[250px]">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${point.riskLevel >= 4 ? 'bg-red-100 text-red-700'
                                                        : point.riskLevel === 3 ? 'bg-orange-100 text-orange-700'
                                                            : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        Risco {point.riskLevel}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${point.status === 'Resolvido' ? 'bg-green-100 text-green-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                        }`}>
                                                        {point.status}
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-sm mb-1 leading-tight">{point.title || point.category}</h3>
                                                <p className="text-xs text-gray-600 leading-snug">{point.description?.substring(0, 100)}{point.description?.length > 100 ? '…' : ''}</p>
                                                <p className="text-[10px] text-gray-400 mt-2">
                                                    {point.createdAt?.toDate ? format(point.createdAt.toDate(), "dd/MM/yy", { locale: ptBR }) : ''}
                                                </p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MarkerClusterGroup>
                        )}
                    </MapContainer>

                    {/* Heatmap legend overlay */}
                    {viewMode === 'heatmap' && (
                        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-gray-200 shadow-lg text-xs z-[400] space-y-2">
                            <p className="font-bold text-gray-700">Intensidade</p>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-3 rounded-full"
                                    style={{ background: 'linear-gradient(to right, #60a5fa, #34d399, #fbbf24, #f97316, #ef4444)' }}
                                />
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-500">
                                <span>Baixa</span><span>Alta</span>
                            </div>
                        </div>
                    )}

                    {/* Count badge */}
                    {!loading && viewMode === 'clusters' && clusterData.length > 0 && (
                        <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg border border-gray-200 shadow px-3 py-1.5 text-xs font-semibold text-gray-700 z-[400]">
                            {clusterData.length} ocorrências
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntelligenceMap;
