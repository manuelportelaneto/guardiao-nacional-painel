
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { MapContainer, useMap, useMapEvents, Marker, Popup, CircleMarker, Circle, Tooltip as MapTooltip, Polyline } from 'react-leaflet';
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
    ShieldAlert, CircleDot, Globe, Mountain, Waves, Send, CheckCircle2, Trash2,
    Navigation, X, Filter, ShieldCheck, Car
} from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { predictiveEngine } from '../../services/predictiveEngine';
import { geocodingService, type GeocodingResult } from '../../services/geocodingService';
import { civilDefenseService } from '../../services/civilDefenseService';
import type { PredictiveRiskAssessment, PendingRiskAlert } from '../../types/intelligence';
import type { OfficialCivilDefenseAlert, CriticalFloodPoint, GeologicalRiskArea, TrafficIncident, TrafficFlowSegment, RiskLayerToggles } from '../../types/civilDefense';
import { useAuth } from '../../context/AuthContext';
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

import { useScope } from '../../context/ScopeContext';

// ─── Tile Layers Multimodais (Google Earth / Esri Satélite, Relevo e Hidrografia) ───
export type MapLayerType = 'vector_light' | 'vector_dark' | 'satellite' | 'terrain' | 'hydrography';

const TILE_MAP: Record<MapLayerType, { url: string; attribution: string; maxZoom?: number }> = {
    vector_light: {
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://carto.com/">CartoDB</a> & <a href="https://www.openstreetmap.org/">OSM</a>'
    },
    vector_dark: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB & OpenStreetMap'
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: '&copy; Esri, Maxar, Earthstar Geographics (Satélite HD)',
        maxZoom: 19
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution: '&copy; OpenTopoMap (Relevo Topográfico & Curvas de Nível)',
        maxZoom: 17
    },
    hydrography: {
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        attribution: '&copy; CartoDB Voyager (Hidrografia & Águas Urbanas)'
    }
};

// ─── Sub-Components ─────────────────────────────────────────────────────────
const MapScopeController: React.FC<{ scope: any }> = ({ scope }) => {
    const map = useMap();
    useEffect(() => {
        if ((scope.level === 'MUNICIPAL' || scope.level === 'DEPARTMENT') && (scope.cityId || scope.cityName)) {
            const cityCoords: Record<string, { lat: number; lng: number; zoom: number }> = {
                'sao-paulo': { lat: -23.5505, lng: -46.6333, zoom: 12 },
                'santo-andre': { lat: -23.6536, lng: -46.5339, zoom: 13 },
                'sao-bernardo': { lat: -23.6914, lng: -46.5646, zoom: 13 },
                'sao-caetano': { lat: -23.6229, lng: -46.5550, zoom: 14 },
                'diadema': { lat: -23.6865, lng: -46.6234, zoom: 13 },
                'maua': { lat: -23.6666, lng: -46.5322, zoom: 13 },
                'ribeirao-pires': { lat: -23.7141, lng: -46.4137, zoom: 13 },
                'rio-grande-da-serra': { lat: -23.7436, lng: -46.3888, zoom: 14 },
            };
            const target = (scope.cityId && cityCoords[scope.cityId.toLowerCase()]) || { lat: -23.6666, lng: -46.5322, zoom: 13 };
            map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
        } else if (scope.level === 'STATE' && scope.state) {
            const stateCoords: Record<string, { lat: number; lng: number; zoom: number }> = {
                'SP': { lat: -23.5505, lng: -46.6333, zoom: 7 },
                'RJ': { lat: -22.9068, lng: -43.1729, zoom: 8 },
                'MG': { lat: -19.9167, lng: -43.9345, zoom: 7 },
                'PR': { lat: -25.4290, lng: -49.2671, zoom: 7 },
                'BA': { lat: -12.9777, lng: -38.5016, zoom: 6 },
                'DF': { lat: -15.7975, lng: -47.8919, zoom: 10 },
            };
            const target = stateCoords[scope.state.toUpperCase()] || { lat: -14.2350, lng: -51.9253, zoom: 5 };
            map.flyTo([target.lat, target.lng], target.zoom, { duration: 1.2 });
        } else if (scope.level === 'NATIONAL') {
            map.flyTo([-14.2350, -51.9253], 4, { duration: 1.2 });
        }
    }, [scope, map]);
    return null;
};

const MapNavigationController: React.FC<{ targetLocation: { lat: number; lng: number; zoom: number } | null }> = ({ targetLocation }) => {
    const map = useMap();
    useEffect(() => {
        if (targetLocation) {
            map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom, { duration: 1.4 });
        }
    }, [targetLocation, map]);
    return null;
};

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

const TileSwitcher = ({ layerType }: { layerType: MapLayerType }) => {
    const map = useMap();
    const layerRef = useRef<L.TileLayer | null>(null);
    useEffect(() => {
        if (layerRef.current) map.removeLayer(layerRef.current);
        const config = TILE_MAP[layerType] || TILE_MAP.vector_light;
        layerRef.current = L.tileLayer(config.url, {
            attribution: config.attribution,
            maxZoom: config.maxZoom || 18
        }).addTo(map);
    }, [layerType, map]);
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
    const { scope, availableStates, availableCities, setJurisdiction, isNational, resetToNational } = useScope();
    const { currentUser } = useAuth();
    const [viewMode, setViewMode] = useState<'heatmap' | 'clusters' | 'regions' | 'contributions' | 'weather'>('clusters');
    const [weatherLayer, setWeatherLayer] = useState<'radar' | 'wind' | 'temp'>('radar');
    const [mapLayerType, setMapLayerType] = useState<MapLayerType>('vector_light');
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: -23.6666, lng: -46.5322 });
    const [heatmapPoints, setHeatmapPoints] = useState<HeatmapPoint[]>([]);
    const [clusterData, setClusterData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentBounds, setCurrentBounds] = useState<MapBounds | undefined>(undefined);
    const boundsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showPanel, setShowPanel] = useState(true);

    // Estados de Inteligência Preditiva e Alertas
    const [pendingAlerts, setPendingAlerts] = useState<PendingRiskAlert[]>([]);
    const [assessments, setAssessments] = useState<PredictiveRiskAssessment[]>([]);
    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);

    const [isDark, setIsDark] = useState(false);
    const [colorBy, setColorBy] = useState<'risk' | 'category'>('risk');
    const [timelineMonth, setTimelineMonth] = useState(11);
    const [isPlaying, setIsPlaying] = useState(false);
    const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; zoom: number } | null>(null);
    const [searchPin, setSearchPin] = useState<{ lat: number; lng: number; title: string; subtitle: string; cep?: string } | null>(null);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [searchSuggestions, setSearchSuggestions] = useState<GeocodingResult[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Executa a busca e navegação para o local encontrado
    const handleExecuteSearch = async (queryText?: string) => {
        const queryToSearch = (queryText !== undefined ? queryText : searchQuery).trim();
        if (!queryToSearch) return;

        setIsSearchingLocation(true);
        setShowSuggestions(false);
        try {
            const results = await geocodingService.searchAddress(queryToSearch);
            if (results && results.length > 0) {
                const top = results[0];
                const zoomLevel = top.type === 'cep' || top.type === 'address' ? 16 : 13;
                setTargetLocation({ lat: top.latitude, lng: top.longitude, zoom: zoomLevel });
                setSearchPin({
                    lat: top.latitude,
                    lng: top.longitude,
                    title: top.title,
                    subtitle: top.subtitle,
                    cep: top.cep
                });
                setSearchSuggestions([]);
                toast.success(`📍 Localizado: ${top.title}`);
            } else {
                toast.error('Endereço ou CEP não localizado. Verifique os dados digitados.');
            }
        } catch (error) {
            toast.error('Erro ao buscar localização.');
            console.error(error);
        } finally {
            setIsSearchingLocation(false);
        }
    };

    const handleSelectSuggestion = (result: GeocodingResult) => {
        setSearchQuery(result.title);
        setShowSuggestions(false);
        const zoomLevel = result.type === 'cep' || result.type === 'address' ? 16 : 13;
        setTargetLocation({ lat: result.latitude, lng: result.longitude, zoom: zoomLevel });
        setSearchPin({
            lat: result.latitude,
            lng: result.longitude,
            title: result.title,
            subtitle: result.subtitle,
            cep: result.cep
        });
        toast.success(`📍 Navegando para ${result.title}`);
    };

    const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

        if (value.trim().length >= 3 || geocodingService.isCep(value)) {
            searchDebounceRef.current = setTimeout(async () => {
                const list = await geocodingService.searchAddress(value);
                setSearchSuggestions(list);
                setShowSuggestions(list.length > 0);
            }, 400);
        } else {
            setSearchSuggestions([]);
            setShowSuggestions(false);
        }
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setSearchPin(null);
        setSearchSuggestions([]);
        setShowSuggestions(false);
    };

    const [riskLayers, setRiskLayers] = useState<RiskLayerToggles>({
        officialAlerts: true,
        criticalFloods: true,
        geologicalSlopes: true,
        liveTraffic: true
    });
    const [officialAlerts, setOfficialAlerts] = useState<OfficialCivilDefenseAlert[]>([]);
    const [criticalFloodPoints, setCriticalFloodPoints] = useState<CriticalFloodPoint[]>([]);
    const [geologicalRiskAreas, setGeologicalRiskAreas] = useState<GeologicalRiskArea[]>([]);
    const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
    const [trafficFlowSegments, setTrafficFlowSegments] = useState<TrafficFlowSegment[]>([]);

    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [expandedSection, setExpandedSection] = useState<string>('risk');

    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [categorySearchQuery, setCategorySearchQuery] = useState('');

    const [filters, setFilters] = useState<IntelligenceFilters>({
        status: 'all',
        startDate: new Date(new Date().setDate(new Date().getDate() - 365)),
        endDate: new Date()
    });

    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
        from: filters.startDate, to: filters.endDate
    });

    useEffect(() => {
        setFilters(prev => ({
            ...prev,
            startDate: dateRange.from,
            endDate: dateRange.to,
            categories: selectedCategories.length > 0 ? selectedCategories : undefined,
            category: undefined
        }));
    }, [dateRange, selectedCategories]);

    // ─── Data Loading & Predictive Engine ───────────────────────────────
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

            // Carrega alertas pendentes de aprovação
            const alerts = await predictiveEngine.getPendingAlerts(scope.cityId);
            setPendingAlerts(alerts);

            // Carrega dados oficiais da Defesa Civil, INMET, Alagamentos e Trânsito
            civilDefenseService.getAlertsForScope(scope.state, scope.cityName).then(setOfficialAlerts);
            setCriticalFloodPoints(civilDefenseService.getCriticalFloodPoints(scope.cityId));
            setGeologicalRiskAreas(civilDefenseService.getGeologicalRiskAreas(scope.cityId));
            setTrafficIncidents(civilDefenseService.getLiveTrafficIncidents(scope.cityId));
            setTrafficFlowSegments(civilDefenseService.getTrafficFlowSegments(scope.cityId));
        } catch (error) {
            toast.error('Erro ao carregar dados do mapa.');
            console.error(error);
        } finally { setLoading(false); }
    }, [filters, viewMode, scope.cityId, scope.state, scope.cityName]);

    const handleBoundsChange = useCallback((bounds: MapBounds) => {
        setCurrentBounds(bounds);
        if (boundsDebounceRef.current) clearTimeout(boundsDebounceRef.current);
        boundsDebounceRef.current = setTimeout(() => loadData(bounds), 700);
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        setMapCenter({ lat: centerLat, lng: centerLng });
        fetchWeather(centerLat, centerLng).then(setWeather);

        // Executa avaliação preditiva em segundo plano
        predictiveEngine.evaluateCityRisk(
            scope.cityId || 'sao-paulo',
            scope.cityName || 'São Paulo',
            scope.state || 'SP',
            centerLat,
            centerLng
        ).then(ass => {
            setAssessments(ass);
            predictiveEngine.getPendingAlerts(scope.cityId).then(setPendingAlerts);
        });
    }, [loadData, scope.cityId, scope.cityName, scope.state]);

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

    const categoryFilteredData = useMemo(() => {
        if (selectedCategories.length === 0 || selectedCategories.length === ALL_CATEGORIES.length) {
            return searchFilteredData;
        }
        return searchFilteredData.filter(p => {
            const rawCat = p.category || '';
            const transCat = translateCategory(rawCat);
            return selectedCategories.includes(rawCat) || selectedCategories.includes(transCat);
        });
    }, [searchFilteredData, selectedCategories]);

    // ─── Computed Data ──────────────────────────────────────────────────
    const displayData = categoryFilteredData;
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
        <div className="flex flex-col gap-2 w-full h-full min-h-0 flex-1">

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

                {/* Filtro Granular Federativo: Estado (UF) */}
                <Select
                    value={scope.state || 'all'}
                    onValueChange={(val) => {
                        if (val === 'all') {
                            resetToNational();
                        } else {
                            setJurisdiction('STATE', val);
                        }
                    }}
                >
                    <SelectTrigger className="h-7 text-xs w-[100px] bg-slate-50 border-slate-300 font-medium">
                        <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">🇧🇷 Brasil</SelectItem>
                        {availableStates.map(st => (
                            <SelectItem key={st.uf} value={st.uf}>
                                {st.uf} - {st.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Filtro Granular Federativo: Município */}
                <Select
                    value={scope.cityId || 'all'}
                    onValueChange={(val) => {
                        if (val === 'all') {
                            if (scope.state) setJurisdiction('STATE', scope.state);
                            else resetToNational();
                        } else {
                            const cityObj = availableCities.find(c => c.id === val);
                            if (cityObj) {
                                setJurisdiction('MUNICIPAL', cityObj.state, cityObj.id, cityObj.name);
                            }
                        }
                    }}
                >
                    <SelectTrigger className="h-7 text-xs w-[145px] bg-slate-50 border-slate-300 font-medium">
                        <SelectValue placeholder="Município" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos municípios</SelectItem>
                        {availableCities
                            .filter(c => !scope.state || c.state === scope.state)
                            .map(c => (
                                <SelectItem key={c.id} value={c.id}>
                                    {c.name} ({c.state})
                                </SelectItem>
                            ))}
                    </SelectContent>
                </Select>

                <div className="h-5 w-px bg-gray-200" />

                {/* Cor dos marcadores */}
                {viewMode === 'clusters' && (
                    <button onClick={() => setColorBy(colorBy === 'risk' ? 'category' : 'risk')}
                        className="px-2.5 py-1 text-xs font-medium rounded-lg border bg-white hover:bg-gray-50 transition-all">
                        {colorBy === 'risk' ? '🔴 Risco' : '🏷️ Categoria'}
                    </button>
                )}

                {/* Filtro Multi-Seleção de Categorias com Checkbox e z-[9999] */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs font-normal bg-white border-slate-300 justify-between gap-1.5 min-w-[140px] max-w-[190px]"
                        >
                            <span className="flex items-center gap-1.5 truncate">
                                <Filter className="w-3 h-3 text-slate-500 shrink-0" />
                                <span className="truncate">
                                    {selectedCategories.length === 0 || selectedCategories.length === ALL_CATEGORIES.length
                                        ? 'Todas categorias'
                                        : selectedCategories.length === 1
                                        ? ALL_CATEGORIES.find(c => c.id === selectedCategories[0])?.name || selectedCategories[0]
                                        : `${selectedCategories.length} categorias`}
                                </span>
                            </span>
                            {selectedCategories.length > 1 && selectedCategories.length < ALL_CATEGORIES.length ? (
                                <Badge className="bg-blue-600 text-white text-[9px] px-1 py-0 h-4 shrink-0">
                                    {selectedCategories.length}
                                </Badge>
                            ) : (
                                <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 opacity-70" />
                            )}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2 bg-white border border-slate-200 shadow-2xl rounded-xl z-[9999]" align="start">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <span className="text-xs font-bold text-slate-800">Filtrar Categorias</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategories(ALL_CATEGORIES.map(c => c.id))}
                                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
                                    >
                                        Todas
                                    </button>
                                    <span className="text-slate-300">|</span>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedCategories([])}
                                        className="text-[10px] text-slate-500 hover:text-slate-700"
                                    >
                                        Limpar
                                    </button>
                                </div>
                            </div>

                            {/* Busca interna rápida de categorias */}
                            <div className="relative">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                <Input
                                    placeholder="Procurar categoria..."
                                    value={categorySearchQuery}
                                    onChange={(e) => setCategorySearchQuery(e.target.value)}
                                    className="h-6 pl-6 text-[11px] bg-slate-50 border-slate-200"
                                />
                            </div>

                            {/* Lista com scroll e checkboxes */}
                            <div className="max-h-52 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                                {ALL_CATEGORIES
                                    .filter(cat => cat.name.toLowerCase().includes(categorySearchQuery.toLowerCase()))
                                    .map((cat) => {
                                        const isSelected = selectedCategories.length === 0 || selectedCategories.includes(cat.id);
                                        return (
                                            <label
                                                key={cat.id}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 cursor-pointer transition-colors text-xs select-none"
                                            >
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={(checked) => {
                                                        if (checked) {
                                                            if (selectedCategories.length === 0) {
                                                                // Estava em "todas", agora mantém todas menos as que desmarcar futuramente
                                                                setSelectedCategories([cat.id]);
                                                            } else {
                                                                setSelectedCategories(prev => [...prev, cat.id]);
                                                            }
                                                        } else {
                                                            if (selectedCategories.length === 0) {
                                                                // Desmarcou uma a partir de "todas"
                                                                setSelectedCategories(ALL_CATEGORIES.map(c => c.id).filter(id => id !== cat.id));
                                                            } else {
                                                                setSelectedCategories(prev => prev.filter(id => id !== cat.id));
                                                            }
                                                        }
                                                    }}
                                                />
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: cat.color }} />
                                                <span className="text-slate-700 truncate font-medium flex-1">{cat.name}</span>
                                            </label>
                                        );
                                    })}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

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

                {/* Busca Inteligente por Endereço, CEP e Cidade */}
                <div className="relative">
                    <div className="flex items-center">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                                placeholder="Buscar CEP, rua, cidade..."
                                value={searchQuery}
                                onChange={handleSearchInputChange}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleExecuteSearch();
                                    }
                                }}
                                className="pl-8 pr-7 h-7 text-xs w-[170px] lg:w-[210px] bg-slate-50 border-slate-300 focus:bg-white transition-all font-medium"
                            />
                            {searchQuery && (
                                <button
                                    onClick={handleClearSearch}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    title="Limpar busca"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => handleExecuteSearch()}
                            disabled={isSearchingLocation || !searchQuery.trim()}
                            className="h-7 px-2 ml-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                            title="Navegar no mapa para o endereço ou CEP"
                        >
                            {isSearchingLocation ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            ) : (
                                <Navigation className="w-3 h-3 text-blue-600" />
                            )}
                        </Button>
                    </div>

                    {/* Dropdown de Sugestões de Localização */}
                    {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-8 left-0 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-[9999] overflow-hidden">
                            <div className="p-1.5 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Sugestões Encontradas
                            </div>
                            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                                {searchSuggestions.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSelectSuggestion(item)}
                                        className="w-full text-left p-2 hover:bg-blue-50 transition-colors flex items-start gap-2 group"
                                    >
                                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-700">
                                                {item.title}
                                            </p>
                                            <p className="text-[10px] text-slate-500 truncate">
                                                {item.subtitle}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
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

                {/* Seletor de Camadas Cartográficas Multimodais */}
                <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button
                        onClick={() => setMapLayerType('vector_light')}
                        className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
                            mapLayerType === 'vector_light' ? 'bg-white text-slate-900 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Mapa Vetorial Padrão"
                    >
                        <MapIcon className="w-3 h-3" /> <span className="hidden xl:inline">Vetor</span>
                    </button>
                    <button
                        onClick={() => setMapLayerType('satellite')}
                        className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
                            mapLayerType === 'satellite' ? 'bg-white text-blue-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Visão por Satélite HD (Google Earth / Esri World Imagery)"
                    >
                        <Globe className="w-3 h-3 text-blue-600" /> <span className="hidden xl:inline">Satélite HD</span>
                    </button>
                    <button
                        onClick={() => setMapLayerType('terrain')}
                        className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
                            mapLayerType === 'terrain' ? 'bg-white text-emerald-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Relevo Topográfico & Curvas de Nível"
                    >
                        <Mountain className="w-3 h-3 text-emerald-600" /> <span className="hidden xl:inline">Relevo</span>
                    </button>
                    <button
                        onClick={() => setMapLayerType('hydrography')}
                        className={`px-2 py-1 text-xs font-medium rounded flex items-center gap-1 transition-all ${
                            mapLayerType === 'hydrography' ? 'bg-white text-cyan-700 shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-900'
                        }`}
                        title="Bacias Hidrográficas & Águas Urbanas"
                    >
                        <Waves className="w-3 h-3 text-cyan-600" /> <span className="hidden xl:inline">Águas</span>
                    </button>
                </div>

                {/* Seletor Multi-Camadas: Defesa Civil, Alagamentos, Encostas e Tráfego */}
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className={`h-7 text-xs font-medium justify-between gap-1.5 border-slate-300 ${
                                riskLayers.officialAlerts || riskLayers.criticalFloods || riskLayers.liveTraffic
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 font-semibold'
                                    : 'bg-white text-slate-700'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Riscos & Tráfego</span>
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400 opacity-70" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-72 p-2.5 bg-white border border-slate-200 shadow-2xl rounded-xl z-[9999]" align="end">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                                <div className="flex items-center gap-1.5">
                                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                                    <span className="text-xs font-bold text-slate-800">Camadas de Risco & Mobilidade</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                {/* 1. Alertas Oficiais Defesa Civil & INMET */}
                                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={riskLayers.officialAlerts}
                                            onCheckedChange={(checked) => setRiskLayers(prev => ({ ...prev, officialAlerts: !!checked }))}
                                        />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                                <span>⚠️</span> Alertas Oficiais (INMET / Defesa Civil)
                                            </p>
                                            <p className="text-[10px] text-slate-500">Tempestades, vendavais e ciclones</p>
                                        </div>
                                    </div>
                                    {officialAlerts.length > 0 && (
                                        <Badge className="bg-red-500 text-white text-[9px] px-1 py-0 h-4">
                                            {officialAlerts.length}
                                        </Badge>
                                    )}
                                </label>

                                {/* 2. Pontos Críticos de Alagamento (ABC Paulista & SP) */}
                                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={riskLayers.criticalFloods}
                                            onCheckedChange={(checked) => setRiskLayers(prev => ({ ...prev, criticalFloods: !!checked }))}
                                        />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                                <span>🌊</span> Pontos de Alagamento (ABC & SP)
                                            </p>
                                            <p className="text-[10px] text-slate-500">Rios Tamanduateí, Meninos, Couros</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-blue-600 text-white text-[9px] px-1 py-0 h-4">
                                        {criticalFloodPoints.length}
                                    </Badge>
                                </label>

                                {/* 3. Áreas de Risco Geológico / Encostas */}
                                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={riskLayers.geologicalSlopes}
                                            onCheckedChange={(checked) => setRiskLayers(prev => ({ ...prev, geologicalSlopes: !!checked }))}
                                        />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                                <span>⛰️</span> Áreas de Encosta & Deslizamento
                                            </p>
                                            <p className="text-[10px] text-slate-500">Saturação do solo e taludes</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-amber-600 text-white text-[9px] px-1 py-0 h-4">
                                        {geologicalRiskAreas.length}
                                    </Badge>
                                </label>

                                {/* 4. Tráfego e Trânsito em Tempo Real */}
                                <label className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={riskLayers.liveTraffic}
                                            onCheckedChange={(checked) => setRiskLayers(prev => ({ ...prev, liveTraffic: !!checked }))}
                                        />
                                        <div>
                                            <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                                                <span>🚗</span> Tráfego & Trânsito em Tempo Real
                                            </p>
                                            <p className="text-[10px] text-slate-500">Lentidão, bloqueios e vias interditadas</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
                                        Ao Vivo
                                    </Badge>
                                </label>
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                <div className="ml-auto flex items-center gap-1.5">
                    {/* Botão de Alertas Preditivos IA */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAlertModalOpen(true)}
                        className={`h-7 text-xs gap-1.5 font-bold transition-all ${
                            pendingAlerts.length > 0
                                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse hover:bg-red-100'
                                : 'bg-slate-50 text-slate-700 border-slate-300'
                        }`}
                        title="Alertas Preditivos Gerados pela IA pendentes de aprovação"
                    >
                        <ShieldAlert className={`w-3.5 h-3.5 ${pendingAlerts.length > 0 ? 'text-red-600' : 'text-slate-500'}`} />
                        <span>Alertas IA</span>
                        {pendingAlerts.length > 0 && (
                            <Badge className="bg-red-600 text-white text-[9px] px-1 py-0 h-4">
                                {pendingAlerts.length}
                            </Badge>
                        )}
                    </Button>

                    {!isNational && (
                        <div className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 px-2 py-0.5 rounded-lg text-xs font-semibold">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            <span>{scope.cityName || scope.state}</span>
                            <button
                                onClick={resetToNational}
                                className="ml-1 text-[10px] text-blue-500 hover:text-blue-700 underline"
                                title="Voltar ao Brasil"
                            >
                                Brasil
                            </button>
                        </div>
                    )}
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

            {/* ─── Banner de Modo de Risco Ativo (Defesa Civil / INMET) ─────── */}
            {riskLayers.officialAlerts && officialAlerts.length > 0 && (
                <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white rounded-xl p-2.5 shadow-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center shrink-0 text-lg">
                            ⚠️
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <Badge className="bg-white text-red-700 font-black text-[9px] px-1.5 py-0 h-4">
                                    MODO DE RISCO ATIVO
                                </Badge>
                                <span className="text-[11px] font-semibold text-white/90">
                                    {officialAlerts[0].source} • {officialAlerts[0].severity.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-xs font-bold truncate mt-0.5">
                                {officialAlerts[0].title}: {officialAlerts[0].description}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button
                            size="sm"
                            onClick={() => setIsAlertModalOpen(true)}
                            className="h-7 text-xs bg-white text-red-700 font-bold hover:bg-red-50 shadow-sm"
                        >
                            <ShieldAlert className="w-3.5 h-3.5 mr-1 text-red-600" />
                            Avaliar Alerta Preditivo
                        </Button>
                    </div>
                </div>
            )}

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

                        {/* IA Preditiva */}
                        <SectionHeader id="predictive" title="IA Preditiva" icon={ShieldAlert} count={assessments.length} />
                        {expandedSection === 'predictive' && (
                            <div className="space-y-1">
                                {assessments.length === 0 ? (
                                    <p className="text-[10px] text-gray-500 p-2 text-center">Monitoramento preventivo ativo sem risco iminente.</p>
                                ) : (
                                    assessments.slice(0, 3).map(a => (
                                        <div key={a.id} className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[11px] font-bold text-slate-800 truncate">{a.title}</span>
                                                <Badge className="text-[8px] px-1 py-0 bg-blue-600 text-white">{a.riskProbability}%</Badge>
                                            </div>
                                            <p className="text-[9px] text-slate-600 mt-0.5 line-clamp-2">{a.suggestedAction}</p>
                                        </div>
                                    ))
                                )}
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
                                <MapScopeController scope={scope} />
                                <MapNavigationController targetLocation={targetLocation} />
                                <TileSwitcher layerType={mapLayerType} />
                                <BoundsTracker onBoundsChange={handleBoundsChange} />

                                {/* Marcador do Local Pesquisado (CEP / Endereço / Cidade) */}
                                {searchPin && (
                                    <Marker
                                        position={[searchPin.lat, searchPin.lng]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: `
                                                <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                                                    <div style="position:absolute;width:44px;height:44px;border-radius:50%;background:rgba(37,99,235,0.35);animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
                                                    <div style="background:#2563eb;color:white;width:34px;height:34px;border-radius:50%;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;font-size:16px;position:relative;z-index:2;">📍</div>
                                                </div>
                                            `,
                                            iconSize: [34, 34],
                                            iconAnchor: [17, 17]
                                        })}
                                    >
                                        <Popup autoPan>
                                            <div className="p-2 min-w-[220px]">
                                                <Badge className="bg-blue-600 text-white mb-1 text-[10px]">Local Pesquisado</Badge>
                                                <h4 className="font-bold text-sm text-slate-900 leading-tight">{searchPin.title}</h4>
                                                <p className="text-xs text-slate-600 mt-1">{searchPin.subtitle}</p>
                                                {searchPin.cep && (
                                                    <p className="text-[11px] font-mono font-bold text-blue-700 mt-1.5 bg-blue-50 p-1 rounded">
                                                        CEP: {searchPin.cep}
                                                    </p>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}

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

                                {/* ─── Camada de Alertas Oficiais da Defesa Civil / INMET ─── */}
                                {riskLayers.officialAlerts && officialAlerts.map(alert => (
                                    <React.Fragment key={alert.id}>
                                        <Circle
                                            center={[mapCenter.lat, mapCenter.lng]}
                                            radius={8000}
                                            pathOptions={{
                                                fillColor: alert.severity === 'GRANDE_PERIGO' ? '#ef4444' : '#f97316',
                                                color: alert.severity === 'GRANDE_PERIGO' ? '#b91c1c' : '#ea580c',
                                                weight: 2,
                                                fillOpacity: 0.18,
                                                dashArray: '6, 6'
                                            }}
                                        />
                                        <Marker
                                            position={[mapCenter.lat, mapCenter.lng]}
                                            icon={L.divIcon({
                                                className: '',
                                                html: `
                                                    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
                                                        <div style="position:absolute;width:40px;height:40px;border-radius:50%;background:${alert.severity === 'GRANDE_PERIGO' ? 'rgba(239,68,68,0.4)' : 'rgba(249,115,22,0.4)'};animation:ping 1.2s cubic-bezier(0,0,0.2,1) infinite;"></div>
                                                        <div style="background:${alert.severity === 'GRANDE_PERIGO' ? '#ef4444' : '#f97316'};color:white;width:32px;height:32px;border-radius:50%;border:2px solid white;box-shadow:0 4px 10px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;position:relative;z-index:2;">${alert.icon}</div>
                                                    </div>
                                                `,
                                                iconSize: [32, 32],
                                                iconAnchor: [16, 16]
                                            })}
                                        >
                                            <Popup>
                                                <div className="p-2 min-w-[260px] max-w-[320px]">
                                                    <div className="flex items-center justify-between gap-1 mb-1">
                                                        <Badge className={`${alert.severity === 'GRANDE_PERIGO' ? 'bg-red-600' : 'bg-orange-600'} text-white text-[10px]`}>
                                                            {alert.source} • {alert.severity.replace('_', ' ')}
                                                        </Badge>
                                                        <span className="text-[10px] text-slate-500 font-mono">Oficial</span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-slate-900 leading-tight">{alert.title}</h4>
                                                    <p className="text-xs text-slate-600 mt-1 leading-snug">{alert.description}</p>
                                                    
                                                    <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
                                                        <p className="text-[11px] font-bold text-slate-800">Recomendações da Defesa Civil:</p>
                                                        <ul className="text-[10px] text-slate-600 list-disc pl-4 space-y-0.5">
                                                            {alert.instructions.slice(0, 3).map((inst, i) => (
                                                                <li key={i}>{inst}</li>
                                                            ))}
                                                        </ul>
                                                    </div>

                                                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                                                        <span className="text-[9px] text-slate-400">Até {new Date(alert.endDate).toLocaleDateString('pt-BR')}</span>
                                                        <Button
                                                            size="sm"
                                                            className="h-6 text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold"
                                                            onClick={() => {
                                                                predictiveEngine.evaluateCityRisk(scope.cityId || 'sao-paulo', scope.cityName || 'São Paulo', scope.state || 'SP', mapCenter.lat, mapCenter.lng);
                                                                setIsAlertModalOpen(true);
                                                            }}
                                                        >
                                                            Ver na Fila de Alertas
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Popup>
                                        </Marker>
                                    </React.Fragment>
                                ))}

                                {/* ─── Camada de Pontos Críticos de Alagamento (ABC Paulista & SP) ─── */}
                                {riskLayers.criticalFloods && criticalFloodPoints.map(flood => (
                                    <Marker
                                        key={flood.id}
                                        position={[flood.latitude, flood.longitude]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: `
                                                <div style="background:${flood.currentStatus === 'EMERGENCIA' || flood.currentStatus === 'INTRANSITAVEL' ? '#ef4444' : flood.currentStatus === 'ATENCAO' ? '#f59e0b' : '#3b82f6'};color:white;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;">
                                                    🌊
                                                </div>
                                            `,
                                            iconSize: [28, 28],
                                            iconAnchor: [14, 14]
                                        })}
                                    >
                                        <Popup>
                                            <div className="p-1.5 min-w-[230px]">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <Badge className={`${
                                                        flood.currentStatus === 'NORMAL' ? 'bg-blue-600' : flood.currentStatus === 'ATENCAO' ? 'bg-amber-600' : 'bg-red-600'
                                                    } text-white text-[9px]`}>
                                                        Status: {flood.currentStatus}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 font-semibold">{flood.cityName}</span>
                                                </div>
                                                <h4 className="font-bold text-xs text-slate-900">{flood.name}</h4>
                                                <p className="text-[10px] text-slate-600 mt-0.5">{flood.referenceStreet}</p>
                                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 grid grid-cols-2 gap-1 text-[10px]">
                                                    <div className="bg-slate-50 p-1 rounded">
                                                        <span className="text-slate-400 block text-[9px]">Bacia / Rio</span>
                                                        <strong className="text-slate-800 truncate block">{flood.riverOrBasin}</strong>
                                                    </div>
                                                    <div className="bg-slate-50 p-1 rounded">
                                                        <span className="text-slate-400 block text-[9px]">Cota Crítica</span>
                                                        <strong className="text-slate-800">{flood.criticalWaterLevelCm} cm</strong>
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-slate-500 mt-1">Histórico: {flood.historicFloodCount} alagamentos registrados</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}

                                {/* ─── Camada de Áreas de Risco Geológico / Encostas ─── */}
                                {riskLayers.geologicalSlopes && geologicalRiskAreas.map(geo => (
                                    <Marker
                                        key={geo.id}
                                        position={[geo.latitude, geo.longitude]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: `
                                                <div style="background:${geo.vulnerabilityLevel === 'MUITO_ALTA' ? '#dc2626' : '#d97706'};color:white;width:28px;height:28px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:13px;">
                                                    ⛰️
                                                </div>
                                            `,
                                            iconSize: [28, 28],
                                            iconAnchor: [14, 14]
                                        })}
                                    >
                                        <Popup>
                                            <div className="p-1.5 min-w-[230px]">
                                                <div className="flex items-center justify-between gap-1 mb-1">
                                                    <Badge className="bg-amber-600 text-white text-[9px]">
                                                        Risco: {geo.vulnerabilityLevel}
                                                    </Badge>
                                                    <span className="text-[10px] text-slate-500 font-semibold">{geo.cityName}</span>
                                                </div>
                                                <h4 className="font-bold text-xs text-slate-900">{geo.name}</h4>
                                                <p className="text-[10px] text-slate-600 mt-0.5">{geo.threatDescription}</p>
                                                <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px]">
                                                    <span>Saturação do Solo:</span>
                                                    <strong className="text-amber-700 font-bold">{geo.soilSaturationPercent}%</strong>
                                                </div>
                                                <p className="text-[9px] text-slate-400 mt-0.5">Monitoramento: {geo.monitoredBy}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}

                                {/* ─── Camada de Ruas com Cores de Tráfego / Fluxo Contínuo (Estilo Waze) ─── */}
                                {riskLayers.liveTraffic && trafficFlowSegments.map(segment => {
                                    const flowColor = segment.flowLevel === 'PARADO'
                                        ? '#991b1b' // Vinho escuro (trânsito parado)
                                        : (segment.flowLevel === 'INTENSO'
                                            ? '#ef4444' // Vermelho (congestionamento)
                                            : (segment.flowLevel === 'MODERADO'
                                                ? '#eab308' // Amarelo (lentidão)
                                                : '#22c55e')); // Verde (fluxo livre)

                                    const flowLabel = segment.flowLevel === 'PARADO'
                                        ? 'Trânsito Parado'
                                        : (segment.flowLevel === 'INTENSO'
                                            ? 'Tráfego Intenso / Lento'
                                            : (segment.flowLevel === 'MODERADO'
                                                ? 'Tráfego Moderado'
                                                : 'Fluxo Livre'));

                                    return (
                                        <React.Fragment key={segment.id}>
                                            {/* Linha de contraste escuro externa */}
                                            <Polyline
                                                positions={segment.coordinates}
                                                pathOptions={{
                                                    color: '#0f172a',
                                                    weight: 8,
                                                    opacity: 0.6,
                                                    lineCap: 'round',
                                                    lineJoin: 'round'
                                                }}
                                            />
                                            {/* Linha de fluxo colorida estilo Waze */}
                                            <Polyline
                                                positions={segment.coordinates}
                                                pathOptions={{
                                                    color: flowColor,
                                                    weight: 5,
                                                    opacity: 0.95,
                                                    lineCap: 'round',
                                                    lineJoin: 'round'
                                                }}
                                            >
                                                <Popup>
                                                    <div className="p-1 min-w-[200px]">
                                                        <div className="flex items-center gap-1.5 mb-1">
                                                            <span
                                                                className="w-2.5 h-2.5 rounded-full inline-block"
                                                                style={{ backgroundColor: flowColor }}
                                                            />
                                                            <span className="font-bold text-xs text-slate-900">{segment.roadName}</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-700">
                                                            Status: <strong style={{ color: flowColor }}>{flowLabel}</strong>
                                                        </div>
                                                        <div className="text-[11px] text-slate-600">
                                                            Velocidade Média: <strong>{segment.speedKmh} km/h</strong> (Via: {segment.freeFlowSpeedKmh} km/h)
                                                        </div>
                                                        {segment.delayMinutes && segment.delayMinutes > 0 ? (
                                                            <div className="text-[10px] text-red-600 font-bold mt-1">
                                                                ⏱️ Atraso estimado: +{segment.delayMinutes} min
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                                                                ✅ Sem retenções no trecho
                                                            </div>
                                                        )}
                                                    </div>
                                                </Popup>
                                            </Polyline>
                                        </React.Fragment>
                                    );
                                })}

                                {/* ─── Camada de Tráfego / Incidentes e Obras ─── */}
                                {riskLayers.liveTraffic && trafficIncidents.map(traffic => (
                                    <Marker
                                        key={traffic.id}
                                        position={[traffic.latitude, traffic.longitude]}
                                        icon={L.divIcon({
                                            className: '',
                                            html: `
                                                <div style="background:${traffic.severity === 'GRAVE' ? '#ef4444' : '#f59e0b'};color:white;width:26px;height:26px;border-radius:6px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;">
                                                    🚗
                                                </div>
                                            `,
                                            iconSize: [26, 26],
                                            iconAnchor: [13, 13]
                                        })}
                                    >
                                        <Popup>
                                            <div className="p-1.5 min-w-[210px]">
                                                <Badge className="bg-slate-800 text-white text-[9px] mb-1">
                                                    Incidente: +{traffic.delayMinutes} min de atraso
                                                </Badge>
                                                <h4 className="font-bold text-xs text-slate-900">{traffic.title}</h4>
                                                <p className="text-[10px] text-slate-600 mt-0.5">{traffic.description}</p>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>

                            {/* Legenda de Fluxo Viário Estilo Waze */}
                            {riskLayers.liveTraffic && (
                                <div className="absolute bottom-4 left-4 bg-slate-950/90 backdrop-blur text-white px-3 py-2 rounded-xl border border-slate-800 shadow-xl text-xs z-[400] space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-[11px] text-slate-200">
                                        <Car className="w-3.5 h-3.5 text-blue-400" /> Fluxo Viário (Estilo Waze)
                                    </div>
                                    <div className="flex items-center gap-2.5 text-[10px]">
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-sm" /> Livre</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-sm" /> Moderado</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block shadow-sm" /> Intenso</span>
                                        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-900 inline-block shadow-sm" /> Parado</span>
                                    </div>
                                </div>
                            )}

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

            {/* ─── MODAL DE ALERTAS PREDITIVOS IA (APROVAÇÃO DO SYSADMIN) ─── */}
            <Dialog open={isAlertModalOpen} onOpenChange={setIsAlertModalOpen}>
                <DialogContent className="max-w-3xl z-[9999] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6">
                    <DialogHeader>
                        <div className="flex items-center justify-between gap-2">
                            <DialogTitle className="flex items-center gap-2 text-slate-900 text-lg font-black">
                                <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
                                Centro de Gestão de Riscos & Alertas Preditivos IA
                            </DialogTitle>
                            <Badge className="bg-blue-600 text-white text-[10px] px-2 py-0.5">
                                Human-in-the-Loop
                            </Badge>
                        </div>
                        <DialogDescription className="text-xs text-slate-500">
                            Monitoramento em tempo real cruzando dados meteorológicos, alertas do INMET/Defesa Civil e ocorrências da malha urbana. Nenhum alerta público é emitido sem sua autorização expressa.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1 scrollbar-thin">
                        {/* 1. Alertas Oficiais Vigentes (INMET / Defesa Civil) */}
                        {officialAlerts.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <span>🏛️</span> Alertas Oficiais Vigentes (INMET / Defesa Civil)
                                    </h4>
                                    <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                                        {officialAlerts.length} ativo(s)
                                    </Badge>
                                </div>

                                {officialAlerts.map(alert => (
                                    <div key={alert.id} className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={alert.severity === 'GRANDE_PERIGO' ? 'bg-red-600 text-white text-[10px]' : 'bg-orange-500 text-white text-[10px]'}>
                                                        {alert.source} • {alert.severity.replace('_', ' ')}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-slate-900">{alert.affectedStates.join(', ')}</span>
                                                </div>
                                                <h5 className="font-bold text-sm text-slate-900 mt-1">{alert.title}</h5>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-700 leading-relaxed">{alert.description}</p>
                                        <div className="bg-white/80 p-2 rounded-lg border border-amber-100 text-[11px] text-slate-600 space-y-1">
                                            <strong>Recomendações Oficiais:</strong>
                                            <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                                                {alert.instructions.slice(0, 2).map((inst, i) => (
                                                    <li key={i}>{inst}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 2. Fila de Alertas Propostos para Envio aos Cidadãos */}
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <span>📢</span> Fila de Alertas para Aprovação do SysAdmin
                                </h4>
                                <Badge className="bg-red-100 text-red-800 border border-red-300 text-[10px]">
                                    {pendingAlerts.length} pendente(s)
                                </Badge>
                            </div>

                            {pendingAlerts.length === 0 ? (
                                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200">
                                    <CheckCircle2 className="w-7 h-7 text-emerald-600 mx-auto mb-1.5" />
                                    <p className="font-semibold text-xs text-slate-800">Fila Limpa: Nenhum Despacho de Emergência Pendente</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                        Quando o motor preditivo ou o INMET detectarem risco crítico, uma notificação será enfileirada aqui para seu despacho.
                                    </p>
                                </div>
                            ) : (
                                pendingAlerts.map(alert => (
                                    <div key={alert.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <Badge className={alert.severity === 'CRITICO' ? 'bg-red-600 text-white text-[10px]' : 'bg-amber-500 text-white text-[10px]'}>
                                                        Risco {alert.severity}
                                                    </Badge>
                                                    <span className="text-xs font-bold text-slate-900">{alert.cityName} ({alert.state})</span>
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-900 mt-1">{alert.title}</h4>
                                            </div>
                                        </div>

                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            {alert.message}
                                        </p>

                                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                                            <span><strong>Bairros Afetados:</strong> {alert.targetNeighborhoods?.join(', ')}</span>
                                            <span>•</span>
                                            <span><strong>Público Estimado:</strong> ~{alert.estimatedPopulation} cidadãos</span>
                                        </div>

                                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={async () => {
                                                    if (!currentUser) return;
                                                    await predictiveEngine.rejectAlert(alert.id, 'Descartado pelo SysAdmin', currentUser.uid);
                                                    toast.info('Alerta preditivo descartado.');
                                                    const updated = await predictiveEngine.getPendingAlerts(scope.cityId);
                                                    setPendingAlerts(updated);
                                                }}
                                                className="text-xs gap-1 text-slate-600 hover:text-red-600"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Descartar
                                            </Button>

                                            <Button
                                                size="sm"
                                                onClick={async () => {
                                                    if (!currentUser) return;
                                                    await predictiveEngine.approveAlert(alert.id, currentUser.uid);
                                                    toast.success(`Alerta aprovado e despachado para os cidadãos de ${alert.cityName}!`);
                                                    const updated = await predictiveEngine.getPendingAlerts(scope.cityId);
                                                    setPendingAlerts(updated);
                                                }}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1 font-bold shadow-sm"
                                            >
                                                <Send className="w-3.5 h-3.5" /> Aprovar & Despachar aos Cidadãos
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAlertModalOpen(false)}>
                            Fechar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default IntelligenceMap;

