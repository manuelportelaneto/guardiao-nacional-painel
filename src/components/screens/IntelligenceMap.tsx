
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, useMap, useMapEvents, Marker, Popup, CircleMarker, Tooltip as MapTooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';

// leaflet.heat requires global L
(window as any).L = L;
import 'leaflet.heat';

import { intelligenceService, type HeatmapPoint, type IntelligenceFilters, type MapBounds } from '../../services/intelligenceService';
import { fetchWeather, type WeatherData } from '../../services/externalDataService';
import {
    aggregateCityStats, computeIndices, findOpportunityZones, detectAnomalies,
    translateCategory, getCategoryColor, ALL_CATEGORIES, calculateContributionValue,
    type GuardianIndices, type OpportunityZone, type AnomalyResult, type CityStats
} from '../../services/guardianIndexService';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { toast } from 'sonner';
import {
    Loader2, RefreshCw, Layers, Map as MapIcon,
    Calendar as CalendarIcon, TriangleAlert, TrendingUp, TrendingDown,
    MapPin, ChartBarBig, Moon, Sun, Search,
    Play, Pause, Award, Target, Building2, Lightbulb,
    ThermometerSun, Droplets, Wind, AlertCircle, ChevronDown, ChevronUp,
    ShieldAlert, CircleDot
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Leaflet Icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

// ─── Map Icons ──────────────────────────────────────────────────────────────
const createRiskIcon = (color: string, size: number = 14) => L.divIcon({
    className: '',
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [size, size], iconAnchor: [size / 2, size / 2]
});

const HighRiskIcon = createRiskIcon('#ef4444', 16);
const MediumRiskIcon = createRiskIcon('#f97316', 13);
const LowRiskIcon = createRiskIcon('#3b82f6', 11);

const createCategoryIcon = (category: string) => {
    const color = getCategoryColor(category);
    return L.divIcon({
        className: '',
        html: `<div style="background:${color};width:13px;height:13px;border-radius:3px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);transform:rotate(45deg);"></div>`,
        iconSize: [13, 13], iconAnchor: [6, 6]
    });
};

// ─── Tile Layers ────────────────────────────────────────────────────────────
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

// ─── Sub-Components ─────────────────────────────────────────────────────────
const HeatmapLayer = ({ points }: { points: HeatmapPoint[] }) => {
    const map = useMap();
    useEffect(() => {
        if (!points.length) return;
        const heat = (L as any).heatLayer(
            points.map(p => [p.lat, p.lng, p.intensity] as [number, number, number]),
            {
                radius: 20, blur: 15, maxZoom: 15, max: 0.5,
                gradient: { 0.2: '#60a5fa', 0.4: '#34d399', 0.6: '#fbbf24', 0.8: '#f97316', 1.0: '#ef4444' }
            }
        );
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

const TileSwitcher = ({ isDark }: { isDark: boolean }) => {
    const map = useMap();
    const layerRef = useRef<L.TileLayer | null>(null);
    useEffect(() => {
        if (layerRef.current) map.removeLayer(layerRef.current);
        layerRef.current = L.tileLayer(isDark ? TILE_DARK : TILE_LIGHT, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }).addTo(map);
    }, [isDark, map]);
    return null;
};

// ─── KPI Card ───────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, color, icon: Icon, trend }: {
    label: string; value: number | string; color: string; icon: React.ElementType; trend?: number;
}) => (
    <div className={`rounded-xl p-3 flex items-center gap-3 border ${color}`}>
        <div className="p-2 rounded-lg bg-white/60"><Icon className="w-4 h-4" /></div>
        <div className="flex-1">
            <p className="text-xl font-bold leading-none">{value}</p>
            <p className="text-xs opacity-70 mt-0.5">{label}</p>
        </div>
        {trend !== undefined && trend !== 0 && (
            <div className={`text-xs font-bold flex items-center ${trend > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {trend > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend)}%
            </div>
        )}
    </div>
);

// ─── Index Badge ────────────────────────────────────────────────────────────
const IndexBadge = ({ label, value, sublabel, color }: {
    label: string; value: number | string; sublabel: string; color: string;
}) => (
    <div className={`rounded-xl p-2.5 border ${color}`}>
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{label}</span>
            <span className="text-sm font-black">{value}</span>
        </div>
        <p className="text-[10px] opacity-50 mt-0.5">{sublabel}</p>
    </div>
);

// ─── Value Badge ────────────────────────────────────────────────────────────
const ValueBadge = ({ score, label }: { score: number; label: string }) => {
    const color = score >= 80 ? 'bg-red-100 text-red-700' : score >= 60 ? 'bg-orange-100 text-orange-700'
        : score >= 40 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
    return (
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${color}`}>
            ★ {score} — {label}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const IntelligenceMap: React.FC = () => {
    const [viewMode, setViewMode] = useState<'heatmap' | 'clusters' | 'regions' | 'contributions' | 'weather'>('clusters');
    const [weatherLayer, setWeatherLayer] = useState<'radar' | 'wind' | 'temp'>('radar');
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.6666, lng: -46.5322 });
    const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
    const [clusterData, setClusterData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentBounds, setCurrentBounds] = useState<MapBounds | undefined>(undefined);
    const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showPanel, setShowPanel] = useState(true);

    const [isDark, setIsDark] = useState(false);
    const [colorBy, setColorBy] = useState<'risk' | 'category'>('risk');
    const [timelineMonth, setTimelineMonth] = useState(11);
    const [isPlaying, setIsPlaying] = useState(false);
    const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [expandedSection, setExpandedSection] = useState<string>('risk');

    const [filters, setFilters] = useState<IntelligenceFilters>({
        status: 'all', category: 'all',
        startDate: new Date(new Date().setDate(new Date().getDate() - 365)),
        endDate: new Date()
    });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: filters.startDate, to: filters.endDate
    });

    useEffect(() => {
        setFilters(prev => ({ ...prev, startDate: dateRange.from, endDate: dateRange.to }));
    }, [dateRange]);

    // ─── Data Loading ───────────────────────────────────────────────────
    const loadData = useCallback(async (bounds?: MapBounds) => {
        setLoading(true);
        try {
            if (viewMode === 'heatmap') {
                const data = await intelligenceService.getHeatmapPoints(filters, bounds);
                setHeatmapPoints(data);
            } else {
                const data = await intelligenceService.getMapData(filters, bounds);
                setClusterData(data);
            }
        } catch (error) {
            toast.error('Erro ao carregar dados do mapa.');
            console.error(error);
        } finally { setLoading(false); }
    }, [filters, viewMode]);

    const handleBoundsChange = useCallback((bounds: MapBounds) => {
        setCurrentBounds(bounds);
        if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
        boundsDebounceRef.current = setTimeout(() => loadData(bounds), 700);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        setMapCenter({ lat: centerLat, lng: centerLng });
        fetchWeather(centerLat, centerLng).then(setWeather);
    }, [loadData]);

    useEffect(() => { loadData(currentBounds); }, [filters, viewMode]);

    // ─── Timeline Player ────────────────────────────────────────────────
    useEffect(() => {
        if (isPlaying) {
            playRef.current = setInterval(() => {
                setTimelineMonth(prev => { if (prev >= 11) { setIsPlaying(false); return 11; } return prev + 1; });
            }, 800);
        }
        return () => { if (playRef.current) clearInterval(playRef.current); };
    }, [isPlaying]);

    const timelineFilteredData = useMemo(() => {
        if (timelineMonth === 11) return clusterData;
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - (11 - timelineMonth) + 1, 0);
        return clusterData.filter(p => {
            const d = p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
            return d <= endOfMonth;
        });
    }, [clusterData, timelineMonth]);

    const searchFilteredData = useMemo(() => {
        if (!searchQuery.trim()) return timelineFilteredData;
        const q = searchQuery.toLowerCase();
        return timelineFilteredData.filter(p =>
            (p.neighborhood || '').toLowerCase().includes(q) ||
            (p.cep || '').includes(q) ||
            (p.city || '').toLowerCase().includes(q) ||
            (p.address || '').toLowerCase().includes(q)
        );
    }, [timelineFilteredData, searchQuery]);

    // ─── Computed Data ──────────────────────────────────────────────────
    const displayData = searchFilteredData;
    const highRisk = displayData.filter(p => p.riskLevel >= 4).length;
    const mediumRisk = displayData.filter(p => p.riskLevel === 3).length;
    const lowRisk = displayData.filter(p => p.riskLevel <= 2).length;
    const resolved = displayData.filter(p => p.status === 'Resolvido' || p.status === 'Concluído').length;

    const topCategories = useMemo(() => {
        const catMap: Record<string, number> = {};
        displayData.forEach(p => {
            const translated = translateCategory(p.category || 'Outros');
            catMap[translated] = (catMap[translated] || 0) + 1;
        });
        return Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 10);
    }, [displayData]);

    const cityStats = useMemo(() => aggregateCityStats(displayData), [displayData]);
    const topCities = useMemo(() => [...cityStats].sort((a, b) => b.pending - a.pending).slice(0, 5), [cityStats]);

    const cityResolutionRates = useMemo(() =>
        [...cityStats].filter(s => s.total >= 2)
            .map(s => ({ ...s, rate: s.total > 0 ? (s.resolved / s.total) * 100 : 0 }))
            .sort((a, b) => a.rate - b.rate).slice(0, 5),
        [cityStats]
    );

    const globalIndices = useMemo<GuardianIndices>(() => {
        const totalApproved = displayData.filter(p => ['Aprovado', 'Resolvido', 'Concluído'].includes(p.status)).length;
        const totalSecurity = displayData.filter(p => ['security', 'Segurança'].includes(p.category)).length;
        const totalEnvironment = displayData.filter(p => ['environment', 'Meio Ambiente'].includes(p.category)).length;
        const totalInfra = displayData.filter(p => ['infrastructure', 'Infraestrutura'].includes(p.category)).length;
        return computeIndices({
            city: 'Global', state: '', total: displayData.length,
            approved: totalApproved, resolved, pending: displayData.length - resolved,
            highRisk, infrastructure: totalInfra, security: totalSecurity,
            environment: totalEnvironment, health: 0, avgRisk: 0,
        });
    }, [displayData, resolved, highRisk]);

    const anomalies = useMemo<AnomalyResult[]>(() => detectAnomalies(cityStats), [cityStats]);
    const opportunities = useMemo<OpportunityZone[]>(() => findOpportunityZones(cityStats), [cityStats]);

    const timelineLabel = useMemo(() => {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - (11 - timelineMonth), 1);
        const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return `${months[d.getMonth()]}/${d.getFullYear()}`;
    }, [timelineMonth]);

    // ─── Regional Circles ───────────────────────────────────────────────
    const regionCircles = useMemo<CityStats[]>(() =>
        cityStats.filter(s => s.lat && s.lng && s.total >= 2).sort((a, b) => b.total - a.total).slice(0, 30),
        [cityStats]
    );

    // Toggle sections
    const toggleSection = (id: string) => setExpandedSection(expandedSection === id ? '' : id);
    const SectionHeader = ({ id, title, icon: SIcon, count }: { id: string; title: string; icon: React.ElementType; count?: number }) => (
        <button
            onClick={() => toggleSection(id)}
            className="w-full flex items-center justify-between py-1.5 px-1 text-xs font-bold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
        >
            <span className="flex items-center gap-1.5"><SIcon className="w-3.5 h-3.5" /> {title} {count !== undefined && <Badge variant="secondary" className="text-[9px] px-1 py-0">{count}</Badge>}</span>
            {expandedSection === id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
    );

    return (
        <div className="flex flex-col gap-2 h-[calc(100vh-120px)]">

            {/* ─── Barra de ferramentas ──────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                {/* Modo de visualização */}
                <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    {([
                        { mode: 'clusters' as const, icon: MapIcon, label: 'Clusters', activeColor: 'text-blue-600' },
                        { mode: 'heatmap' as const, icon: Layers, label: 'Calor', activeColor: 'text-red-600' },
                        { mode: 'regions' as const, icon: CircleDot, label: 'Regiões', activeColor: 'text-emerald-600' },
                        { mode: 'contributions' as const, icon: MapPin, label: 'Contribuições', activeColor: 'text-amber-600' },
                        { mode: 'weather' as const, icon: ThermometerSun, label: 'Radar', activeColor: 'text-sky-600' },
                    ] as const).map(({ mode, icon: MIcon, label, activeColor }) => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1 transition-all ${viewMode === mode ? `bg-white ${activeColor} shadow-sm` : 'text-gray-500'
                                }`}>
                            <MIcon size={12} /> {label}
                        </button>
                    ))}
                </div>

                <div className="h-5 w-px bg-gray-200" />

                {/* Cor dos marcadores */}
                {viewMode === 'clusters' && (
                    <button onClick={() => setColorBy(colorBy === 'risk' ? 'category' : 'risk')}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border bg-white hover:bg-gray-50 transition-all">
                        {colorBy === 'risk' ? '🔴 Risco' : '🏷️ Categoria'}
                    </button>
                )}

                {/* Filtro de categoria */}
                <Select value={filters.category} onValueChange={(v) => setFilters(prev => ({ ...prev, category: v }))}>
                    <SelectTrigger className="h-7 text-xs w-[140px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas categorias</SelectItem>
                        {ALL_CATEGORIES.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>
                                <span className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full inline-block" style={{ background: cat.color }} />
                                    {cat.name}
                                </span>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Filtro de status */}
                <Select value={filters.status} onValueChange={(v) => setFilters(prev => ({ ...prev, status: v }))}>
                    <SelectTrigger className="h-7 text-xs w-[110px]">
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Em Análise">Em Análise</SelectItem>
                        <SelectItem value="Aprovado">Aprovado</SelectItem>
                        <SelectItem value="Resolvido">Resolvido</SelectItem>
                    </SelectContent>
                </Select>

                {/* Busca */}
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <Input placeholder="Bairro, CEP..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="pl-7 h-7 text-xs w-[130px]" />
                </div>

                {/* Período */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-7 text-xs font-normal">
                            <CalendarIcon className="mr-1 h-3 w-3" />
                            {dateRange.from ? (dateRange.to
                                ? `${format(dateRange.from, 'dd/MM')} – ${format(dateRange.to, 'dd/MM')}`
                                : format(dateRange.from, 'dd/MM/yy')) : 'Período'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar initialFocus mode="range" locale={ptBR} defaultMonth={dateRange.from}
                            selected={dateRange as any} onSelect={(range: any) => setDateRange(range)} numberOfMonths={2} />
                    </PopoverContent>
                </Popover>

                <div className="ml-auto flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setIsDark(!isDark)}
                        title={isDark ? 'Modo Claro' : 'Modo Escuro'}>
                        {isDark ? <Sun size={14} /> : <Moon size={14} />}
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowPanel(p => !p)}>
                        <ChartBarBig size={13} className="mr-1" />{showPanel ? 'Ocultar' : 'Painel'}
                    </Button>
                    <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => loadData(currentBounds)} disabled={loading}>
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    </Button>
                </div>
            </div>

            {/* ─── Linha do Tempo ─────────────────────────────────────────── */}
            <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm">
                <button onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying) setTimelineMonth(0); }}
                    className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 transition-colors flex-shrink-0">
                    {isPlaying ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
                </button>
                <div className="flex-1">
                    <Slider value={[timelineMonth]} onValueChange={([v]) => setTimelineMonth(v)} max={11} step={1} className="w-full" />
                </div>
                <span className="text-xs font-mono font-bold text-gray-600 w-[70px] text-right">{timelineLabel}</span>
                <Badge variant="secondary" className="text-[10px]">{displayData.length} pts</Badge>
            </div>

            {/* ─── Área Principal ─────────────────────────────────────────── */}
            <div className="flex gap-2 flex-1 min-h-0">

                {/* Painel Lateral */}
                {showPanel && (
                    <div className="w-56 shrink-0 flex flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin">

                        {/* Clima */}
                        {weather && (
                            <div className="rounded-xl p-2.5 bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 mb-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-lg">{weather.weatherIcon}</span>
                                    <span className="text-xl font-black text-sky-800">{weather.temperature}°C</span>
                                </div>
                                <p className="text-[10px] text-sky-600 mt-0.5">{weather.weatherLabel}</p>
                                <div className="flex gap-3 mt-1.5 text-[9px] text-sky-500">
                                    <span className="flex items-center gap-0.5"><Droplets className="w-2.5 h-2.5" /> {weather.humidity}%</span>
                                    <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> {weather.windSpeed} km/h</span>
                                    {weather.precipitation > 0 && <span className="flex items-center gap-0.5"><ThermometerSun className="w-2.5 h-2.5" /> {weather.precipitation}mm</span>}
                                </div>
                            </div>
                        )}

                        {/* Distribuição de Risco */}
                        <SectionHeader id="risk" title="Distribuição de Risco" icon={TriangleAlert} />
                        {expandedSection === 'risk' && (
                            <div className="space-y-1.5">
                                <KpiCard label="Alto Risco" value={highRisk} color="bg-red-50 border-red-200 text-red-700" icon={TriangleAlert} />
                                <KpiCard label="Médio Risco" value={mediumRisk} color="bg-orange-50 border-orange-200 text-orange-700" icon={TriangleAlert} />
                                <KpiCard label="Baixo Risco" value={lowRisk} color="bg-blue-50 border-blue-200 text-blue-700" icon={MapPin} />
                                <KpiCard label="Resolvidos" value={resolved} color="bg-green-50 border-green-200 text-green-700" icon={TrendingUp} />
                            </div>
                        )}

                        {/* Categorias */}
                        <SectionHeader id="categories" title="Categorias" icon={ChartBarBig} count={topCategories.length} />
                        {expandedSection === 'categories' && topCategories.length > 0 && (
                            <div className="space-y-1">
                                {topCategories.map(([cat, count]) => (
                                    <div key={cat} className="bg-white border rounded-lg px-2.5 py-1.5 flex justify-between items-center">
                                        <span className="text-[11px] font-medium truncate text-gray-700 flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full" style={{ background: getCategoryColor(cat) }} />
                                            {cat}
                                        </span>
                                        <Badge variant="secondary" className="text-[10px] px-1">{count}</Badge>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cidades Críticas */}
                        <SectionHeader id="cities" title="Cidades Críticas" icon={Building2} count={topCities.length} />
                        {expandedSection === 'cities' && topCities.length > 0 && (
                            <div className="space-y-1">
                                {topCities.map((city, i) => (
                                    <div key={city.city} className="bg-white border rounded-lg px-2.5 py-1.5">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-semibold text-gray-700 truncate flex-1">
                                                <span className="text-gray-400 mr-1">#{i + 1}</span> {city.city}
                                            </span>
                                            <span className="text-xs font-bold text-red-600">{city.pending}</span>
                                        </div>
                                        <div className="w-full bg-gray-100 h-1 rounded-full mt-1">
                                            <div className="h-1 rounded-full bg-red-400"
                                                style={{ width: `${Math.min(100, (city.pending / (topCities[0]?.pending || 1)) * 100)}%` }} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Taxa de Resolução */}
                        <SectionHeader id="resolution" title="Taxa de Resolução" icon={Target} count={cityResolutionRates.length} />
                        {expandedSection === 'resolution' && cityResolutionRates.length > 0 && (
                            <div className="space-y-1">
                                {cityResolutionRates.map(city => {
                                    const rateColor = city.rate >= 70 ? 'bg-green-400' : city.rate >= 40 ? 'bg-yellow-400' : 'bg-red-400';
                                    return (
                                        <div key={city.city} className="bg-white border rounded-lg px-2.5 py-1.5">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-medium text-gray-700 truncate">{city.city}</span>
                                                <span className={`text-[10px] font-bold ${city.rate >= 70 ? 'text-green-600' : city.rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                    {city.rate.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-100 h-1 rounded-full mt-1">
                                                <div className={`h-1 rounded-full ${rateColor}`} style={{ width: `${city.rate}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Índices Guardião */}
                        <SectionHeader id="indices" title="Índices Guardião" icon={Award} />
                        {expandedSection === 'indices' && (
                            <div className="space-y-1.5">
                                <IndexBadge label="ICA™" value={globalIndices.ica}
                                    sublabel={`Cidadania Ativa • ${globalIndices.icaLabel}`}
                                    color={globalIndices.ica >= 20 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'} />
                                <IndexBadge label="IRM™" value={`${globalIndices.irm}%`}
                                    sublabel={`Responsividade • ${globalIndices.irmLabel}`}
                                    color={globalIndices.irm >= 60 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : globalIndices.irm >= 30 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-red-50 border-red-200 text-red-800'} />
                                <IndexBadge label="SIU™" value={globalIndices.siu}
                                    sublabel={`Infraestrutura • ${globalIndices.siuLabel}`}
                                    color={globalIndices.siu >= 60 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'} />
                            </div>
                        )}

                        {/* Medição de Riscos */}
                        <SectionHeader id="risks" title="Medição de Riscos" icon={ShieldAlert} />
                        {expandedSection === 'risks' && (
                            <div className="space-y-1.5">
                                <IndexBadge label="IRSP" value={`${globalIndices.irsp}%`}
                                    sublabel={`Seg. Pública • ${globalIndices.irspLabel}`}
                                    color={globalIndices.irsp >= 50 ? 'bg-red-50 border-red-200 text-red-800' : globalIndices.irsp >= 20 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} />
                                <IndexBadge label="IRDN" value={`${globalIndices.irdn}%`}
                                    sublabel={`Desastres Naturais • ${globalIndices.irdnLabel}`}
                                    color={globalIndices.irdn >= 40 ? 'bg-red-50 border-red-200 text-red-800' : globalIndices.irdn >= 15 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} />
                                <div className="rounded-lg px-2.5 py-2 bg-slate-50 border border-slate-200 text-[9px] text-slate-500 space-y-0.5">
                                    <p><strong>IRSP</strong> = Ocorrências Segurança + Risco Alto</p>
                                    <p><strong>IRDN</strong> = Meio Ambiente (60%) + Infra (40%)</p>
                                </div>
                            </div>
                        )}

                        {/* Anomalias */}
                        {anomalies.length > 0 && (
                            <>
                                <SectionHeader id="anomalies" title="Anomalias" icon={AlertCircle} count={anomalies.length} />
                                {expandedSection === 'anomalies' && (
                                    <div className="space-y-1">
                                        {anomalies.slice(0, 3).map(a => (
                                            <div key={a.city} className="rounded-lg px-2.5 py-2 bg-red-50 border border-red-200">
                                                <p className="text-[11px] font-bold text-red-700">{a.city}</p>
                                                <p className="text-[9px] text-red-500">{a.count} ocorrências (média: {a.mean}, σ: {a.zScore.toFixed(1)})</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Oportunidades */}
                        <SectionHeader id="opportunities" title="Oportunidades" icon={Lightbulb} count={opportunities.length} />
                        {expandedSection === 'opportunities' && opportunities.length > 0 && (
                            <div className="space-y-1">
                                {opportunities.slice(0, 5).map(opp => (
                                    <div key={opp.city} className="rounded-lg px-2.5 py-2 bg-amber-50 border border-amber-200">
                                        <div className="flex justify-between items-center">
                                            <p className="text-[11px] font-bold text-amber-800">{opp.city}</p>
                                            <Badge className="bg-amber-200 text-amber-900 text-[9px] hover:bg-amber-200">{opp.opportunityScore}x</Badge>
                                        </div>
                                        <p className="text-[9px] text-amber-600">Demanda: {opp.demandScore} | Atendimento: {opp.supplyScore} | {opp.dominantCategory}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Legenda */}
                        <SectionHeader id="legend" title="Legenda" icon={MapIcon} />
                        {expandedSection === 'legend' && (
                            <Card className="border-gray-200">
                                <CardContent className="p-2.5 space-y-1.5">
                                    {viewMode === 'regions' ? (
                                        <>
                                            <p className="text-[10px] font-semibold text-gray-700">Tamanho = Volume de ocorrências</p>
                                            {[
                                                { color: 'bg-red-500', label: 'Resolução < 40%' },
                                                { color: 'bg-yellow-500', label: 'Resolução 40-70%' },
                                                { color: 'bg-green-500', label: 'Resolução > 70%' },
                                            ].map(({ color, label }) => (
                                                <div key={label} className="flex items-center gap-2">
                                                    <div className={`w-3 h-3 rounded-full ${color} border border-white shadow-sm`} />
                                                    <span className="text-[10px] text-gray-600">{label}</span>
                                                </div>
                                            ))}
                                        </>
                                    ) : colorBy === 'risk' ? (
                                        [
                                            { color: 'bg-red-500', label: 'Alto Risco (≥4)' },
                                            { color: 'bg-orange-500', label: 'Médio Risco (3)' },
                                            { color: 'bg-blue-500', label: 'Baixo Risco (≤2)' },
                                        ].map(({ color, label }) => (
                                            <div key={label} className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full ${color} border border-white shadow-sm`} />
                                                <span className="text-[10px] text-gray-600">{label}</span>
                                            </div>
                                        ))
                                    ) : (
                                        ALL_CATEGORIES.map(cat => (
                                            <div key={cat.id} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-sm rotate-45 border border-white shadow-sm" style={{ background: cat.color }} />
                                                <span className="text-[10px] text-gray-600">{cat.name}</span>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                )}

                {/* Mapa / Radar */}
                <div className="flex-1 rounded-xl overflow-hidden border border-gray-200 shadow-inner relative min-h-0">
                    {loading && viewMode !== 'weather' && (
                        <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                <span className="text-sm text-gray-500">Carregando dados...</span>
                            </div>
                        </div>
                    )}

                    {/* ─── Weather Radar Mode ───────────────────────────── */}
                    {viewMode === 'weather' ? (
                        <div className="w-full h-full flex flex-col">
                            {/* Weather layer controls */}
                            <div className="bg-slate-50 border-b border-gray-200 px-3 py-2 flex items-center gap-2 shrink-0 z-10">
                                {([
                                    { id: 'radar' as const, icon: '🌧️', label: 'Chuva', color: 'bg-blue-600 text-white border-blue-600' },
                                    { id: 'wind' as const, icon: '💨', label: 'Ventos', color: 'bg-teal-600 text-white border-teal-600' },
                                    { id: 'temp' as const, icon: '🌡️', label: 'Temperatura', color: 'bg-orange-500 text-white border-orange-500' },
                                ] as const).map(({ id, icon: wIcon, label, color }) => (
                                    <button key={id}
                                        onClick={() => setWeatherLayer(id)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors flex items-center gap-1.5 ${weatherLayer === id ? color : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                                            }`}
                                    >
                                        <span>{wIcon}</span> {label}
                                    </button>
                                ))}
                                <span className="ml-auto text-[10px] text-slate-400">Powered by Windy.com</span>
                            </div>
                            {/* Windy iframe */}
                            <div className="flex-1 relative bg-gray-200">
                                <iframe
                                    key={`${weatherLayer}-${mapCenter.lat.toFixed(2)}-${mapCenter.lng.toFixed(2)}`}
                                    src={`https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=mm&metricTemp=%C2%B0C&metricWind=km%2Fh&zoom=10&marker=true&lang=pt&lat=${mapCenter.lat}&lon=${mapCenter.lng}&overlay=${weatherLayer === 'radar' ? 'rain' : weatherLayer}&detailLat=${mapCenter.lat}&detailLon=${mapCenter.lng}&detail=true`}
                                    frameBorder="0"
                                    className="absolute inset-0 w-full h-full"
                                    style={{ border: 0 }}
                                    title="Radar Meteorológico"
                                    allowFullScreen
                                />
                            </div>
                        </div>
                    ) : (
                        /* ─── Leaflet Map (all other modes) ───────────── */
                        <>
                            <MapContainer center={[-15.7801, -47.9292]} zoom={5} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                                <TileSwitcher isDark={isDark} />
                                <BoundsTracker onBoundsChange={handleBoundsChange} />

                                {viewMode === 'heatmap' && <HeatmapLayer points={heatmapPoints} />}

                                {/* Modo Regiões — Círculos proporcionais */}
                                {viewMode === 'regions' && regionCircles.map(city => {
                                    const rate = city.total > 0 ? (city.resolved / city.total) * 100 : 0;
                                    const fillColor = rate >= 70 ? '#22c55e' : rate >= 40 ? '#eab308' : '#ef4444';
                                    const radius = Math.max(8, Math.min(50, city.total * 3));
                                    return (
                                        <CircleMarker
                                            key={`${city.city}-${city.state}`}
                                            center={[city.lat!, city.lng!]}
                                            radius={radius}
                                            pathOptions={{
                                                fillColor, color: fillColor, weight: 2,
                                                opacity: 0.8, fillOpacity: 0.35,
                                            }}
                                        >
                                            <MapTooltip permanent={radius >= 20} direction="center" className="region-tooltip">
                                                <span className="text-[10px] font-bold">{city.city}</span>
                                            </MapTooltip>
                                            <Popup>
                                                <div className="p-2 min-w-[200px]">
                                                    <h3 className="font-bold text-sm mb-2">{city.city} {city.state && `(${city.state})`}</h3>
                                                    <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                                                        <div className="bg-gray-50 rounded p-1.5">
                                                            <p className="font-bold text-gray-900">{city.total}</p>
                                                            <p className="text-gray-500">Ocorrências</p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded p-1.5">
                                                            <p className={`font-bold ${rate >= 70 ? 'text-green-600' : rate >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>{rate.toFixed(0)}%</p>
                                                            <p className="text-gray-500">Resolução</p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded p-1.5">
                                                            <p className="font-bold text-red-600">{city.highRisk}</p>
                                                            <p className="text-gray-500">Alto Risco</p>
                                                        </div>
                                                        <div className="bg-gray-50 rounded p-1.5">
                                                            <p className="font-bold text-amber-600">{city.pending}</p>
                                                            <p className="text-gray-500">Pendentes</p>
                                                        </div>
                                                    </div>
                                                    {/* Mini indices */}
                                                    <div className="mt-2 pt-2 border-t border-gray-100 space-y-1 text-[9px]">
                                                        {(() => {
                                                            const idx = computeIndices(city);
                                                            return <>
                                                                <div className="flex justify-between"><span>IRSP (Seg. Pública)</span><span className="font-bold">{idx.irsp}% — {idx.irspLabel}</span></div>
                                                                <div className="flex justify-between"><span>IRDN (Desastres)</span><span className="font-bold">{idx.irdn}% — {idx.irdnLabel}</span></div>
                                                                <div className="flex justify-between"><span>IRM (Responsividade)</span><span className="font-bold">{idx.irm}% — {idx.irmLabel}</span></div>
                                                            </>;
                                                        })()}
                                                    </div>
                                                </div>
                                            </Popup>
                                        </CircleMarker>
                                    );
                                })}

                                {/* Modo Clusters */}
                                {viewMode === 'clusters' && (
                                    <MarkerClusterGroup chunkedLoading>
                                        {displayData.map((point) => {
                                            const markerIcon = colorBy === 'risk'
                                                ? (point.riskLevel >= 4 ? HighRiskIcon : point.riskLevel === 3 ? MediumRiskIcon : LowRiskIcon)
                                                : createCategoryIcon(point.category);
                                            const val = calculateContributionValue(point);
                                            return (
                                                <Marker key={point.id}
                                                    position={[point.location?.latitude || point.latitude, point.location?.longitude || point.longitude]}
                                                    icon={markerIcon}>
                                                    <Popup>
                                                        <div className="p-1 min-w-[220px] max-w-[280px]">
                                                            {point.imageUrl && (
                                                                <img src={point.imageUrl} alt="Contribuição"
                                                                    className="w-full h-28 object-cover rounded-lg mb-2" loading="lazy" />
                                                            )}
                                                            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${point.riskLevel >= 4 ? 'bg-red-100 text-red-700'
                                                                    : point.riskLevel === 3 ? 'bg-orange-100 text-orange-700'
                                                                        : 'bg-blue-100 text-blue-700'}`}>
                                                                    Risco {point.riskLevel}
                                                                </span>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${point.status === 'Resolvido' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                                    {point.status}
                                                                </span>
                                                                <ValueBadge score={val.relevancia} label={val.valorLabel} />
                                                            </div>
                                                            <h3 className="font-bold text-sm mb-0.5 leading-tight">{point.title || translateCategory(point.category)}</h3>
                                                            <p className="text-xs text-gray-600 leading-snug">{point.description?.substring(0, 120)}{point.description?.length > 120 ? '…' : ''}</p>

                                                            {/* Valor e impacto */}
                                                            <div className="mt-2 pt-2 border-t border-gray-100">
                                                                <p className="text-[10px] text-gray-600 font-medium">{val.impactoCidadao}</p>
                                                                <p className="text-[9px] text-gray-400 mt-0.5">{val.fatorRisco}</p>
                                                            </div>

                                                            {/* Detalhes */}
                                                            <div className="mt-1.5 pt-1.5 border-t border-gray-100 space-y-0.5">
                                                                <p className="text-[10px] text-gray-500">
                                                                    🏷️ {translateCategory(point.category)}
                                                                </p>
                                                                {point.neighborhood && (
                                                                    <p className="text-[10px] text-gray-500">📍 {point.neighborhood}{point.city ? `, ${point.city}` : ''}</p>
                                                                )}
                                                                {point.supportCount > 0 && (
                                                                    <p className="text-[10px] text-gray-500">👍 {point.supportCount} apoios</p>
                                                                )}
                                                                <p className="text-[10px] text-gray-400">
                                                                    {point.createdAt?.toDate ? format(point.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : ''}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        })}
                                    </MarkerClusterGroup>
                                )}

                                {/* Modo Contribuições — Marcadores individuais por categoria, SEM clustering */}
                                {viewMode === 'contributions' && displayData.map((point) => {
                                    const catIcon = createCategoryIcon(point.category);
                                    const val = calculateContributionValue(point);
                                    return (
                                        <Marker key={`contrib-${point.id}`}
                                            position={[point.location?.latitude || point.latitude, point.location?.longitude || point.longitude]}
                                            icon={catIcon}>
                                            <Popup>
                                                <div className="p-1.5 min-w-[240px] max-w-[300px]">
                                                    {point.imageUrl && (
                                                        <img src={point.imageUrl} alt="Contribuição"
                                                            className="w-full h-32 object-cover rounded-lg mb-2 shadow-sm" loading="lazy" />
                                                    )}
                                                    {/* Category + Status badges */}
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-2">
                                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{
                                                            backgroundColor: `${getCategoryColor(point.category)}18`,
                                                            color: getCategoryColor(point.category),
                                                            border: `1px solid ${getCategoryColor(point.category)}40`
                                                        }}>
                                                            {translateCategory(point.category)}
                                                        </span>
                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${point.status === 'Resolvido' || point.status === 'Concluído'
                                                            ? 'bg-green-100 text-green-700'
                                                            : point.status === 'Aprovado'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-yellow-100 text-yellow-700'
                                                            }`}>
                                                            {point.status}
                                                        </span>
                                                        <ValueBadge score={val.relevancia} label={val.valorLabel} />
                                                    </div>

                                                    {/* Title & Description */}
                                                    <h3 className="font-bold text-sm mb-1 leading-tight">
                                                        {point.title || translateCategory(point.category)}
                                                    </h3>
                                                    {point.description && (
                                                        <p className="text-xs text-gray-600 leading-snug mb-2">
                                                            {point.description.substring(0, 150)}{point.description.length > 150 ? '…' : ''}
                                                        </p>
                                                    )}

                                                    {/* Location & Meta */}
                                                    <div className="pt-2 border-t border-gray-100 space-y-0.5">
                                                        {point.neighborhood && (
                                                            <p className="text-[10px] text-gray-500">📍 {point.neighborhood}{point.city ? `, ${point.city}` : ''}</p>
                                                        )}
                                                        {point.address && (
                                                            <p className="text-[10px] text-gray-400">🗺️ {point.address}</p>
                                                        )}
                                                        {point.supportCount > 0 && (
                                                            <p className="text-[10px] text-gray-500">👍 {point.supportCount} apoios</p>
                                                        )}
                                                        <p className="text-[10px] text-gray-400">
                                                            📅 {point.createdAt?.toDate ? format(point.createdAt.toDate(), "dd/MM/yy HH:mm", { locale: ptBR }) : ''}
                                                        </p>
                                                    </div>

                                                    {/* Impact */}
                                                    <div className="mt-1.5 pt-1.5 border-t border-gray-100">
                                                        <p className="text-[10px] text-gray-600 font-medium">{val.impactoCidadao}</p>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    );
                                })}
                            </MapContainer>

                            {/* Legenda do mapa de calor */}
                            {viewMode === 'heatmap' && (
                                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-gray-200 shadow-lg text-xs z-[400] space-y-2">
                                    <p className="font-bold text-gray-700">Intensidade</p>
                                    <div className="w-24 h-3 rounded-full" style={{ background: 'linear-gradient(to right, #60a5fa, #34d399, #fbbf24, #f97316, #ef4444)' }} />
                                    <div className="flex justify-between text-[10px] text-gray-500"><span>Baixa</span><span>Alta</span></div>
                                </div>
                            )}

                            {/* Legenda do modo contribuições */}
                            {viewMode === 'contributions' && (
                                <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-gray-200 shadow-lg text-xs z-[400] space-y-1.5">
                                    <p className="font-bold text-gray-700 mb-1">Categorias</p>
                                    {ALL_CATEGORIES.slice(0, 8).map(cat => (
                                        <div key={cat.id} className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-sm rotate-45 border border-white shadow-sm" style={{ background: cat.color }} />
                                            <span className="text-[10px] text-gray-600">{cat.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Contador */}
                            {!loading && displayData.length > 0 && (
                                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded-lg border border-gray-200 shadow px-3 py-1.5 text-xs font-semibold text-gray-700 z-[400]">
                                    {displayData.length} ocorrências
                                    {searchQuery && <span className="text-gray-400 ml-1">(filtrado)</span>}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IntelligenceMap;
