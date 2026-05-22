/**
 * @fileoverview Serviço de APIs Externas Gratuitas para o Mapa de Inteligência (`src/services/externalDataService.ts`).
 *
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Agrega dados de contexto ambiental e geográfico de APIs públicas e gratuitas, enriquecendo
 * o Mapa de Inteligência do painel com informações sobre clima, qualidade do ar e enchentes.
 * Todas as APIs utilizadas são 100% gratuitas e não requerem chave de API (API key-free).
 *
 * 🌐 APIs INTEGRADAS:
 * 1. 🌦️ **Open-Meteo** (open-meteo.com):
 *    Fornece dados meteorológicos em tempo real: temperatura, código de clima, umidade,
 *    vento e precipitação. Os códigos WMO (World Meteorological Organization) são
 *    traduzidos para labels em PT-BR via o mapa `WEATHER_CODES`.
 *
 * 2. 💨 **Open-Meteo Air Quality API**:
 *    Fornece Índice de Qualidade do Ar (AQI) europeu para o município monitorado.
 *    Útil para correlacionar denúncias de meio ambiente com dados reais de poluição.
 *
 * 3. 🌊 **Brasil API — Flood Alerts** (brasilapi.com.br):
 *    Consulta alertas de enchentes e alagamentos por município (IBGE code).
 *    Enriquece o mapa com contexto de risco climático em tempo real.
 *
 * ⚠️ NOTA DE CONFIABILIDADE:
 * APIs externas gratuitas podem ter instabilidade ou limites de taxa (rate limits).
 * Todas as funções tratam falhas silenciosamente (try/catch com return null),
 * garantindo que falhas externas não travem o carregamento do painel.
 */

// ─── Open-Meteo (Weather) ────────────────────────────────────────────────────
export interface WeatherData {
    temperature: number;
    weatherCode: number;
    weatherLabel: string;
    weatherIcon: string;
    humidity: number;
    windSpeed: number;
    precipitation: number;
    isDay: boolean;
}

const WEATHER_CODES: Record<number, { label: string; icon: string }> = {
    0: { label: 'Céu limpo', icon: '☀️' },
    1: { label: 'Predominante limpo', icon: '🌤️' },
    2: { label: 'Parcialmente nublado', icon: '⛅' },
    3: { label: 'Nublado', icon: '☁️' },
    45: { label: 'Nevoeiro', icon: '🌫️' },
    48: { label: 'Nevoeiro com geada', icon: '🌫️' },
    51: { label: 'Garoa leve', icon: '🌦️' },
    53: { label: 'Garoa moderada', icon: '🌦️' },
    55: { label: 'Garoa forte', icon: '🌧️' },
    61: { label: 'Chuva leve', icon: '🌦️' },
    63: { label: 'Chuva moderada', icon: '🌧️' },
    65: { label: 'Chuva forte', icon: '🌧️' },
    71: { label: 'Neve leve', icon: '🌨️' },
    73: { label: 'Neve moderada', icon: '🌨️' },
    75: { label: 'Neve forte', icon: '❄️' },
    80: { label: 'Pancada de chuva leve', icon: '🌦️' },
    81: { label: 'Pancada de chuva mod.', icon: '🌧️' },
    82: { label: 'Pancada de chuva forte', icon: '⛈️' },
    95: { label: 'Tempestade', icon: '⛈️' },
    96: { label: 'Tempestade com granizo leve', icon: '⛈️' },
    99: { label: 'Tempestade com granizo forte', icon: '⛈️' },
};

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData | null> {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,is_day&timezone=America/Sao_Paulo`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = await res.json();
        const current = data.current;
        const code = current.weather_code || 0;
        const weatherInfo = WEATHER_CODES[code] || { label: 'Desconhecido', icon: '🌡️' };
        return {
            temperature: current.temperature_2m,
            weatherCode: code,
            weatherLabel: weatherInfo.label,
            weatherIcon: weatherInfo.icon,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            precipitation: current.precipitation,
            isDay: current.is_day === 1,
        };
    } catch {
        return null;
    }
}

// ─── IBGE Malhas (GeoJSON) ───────────────────────────────────────────────────

const geoJsonCache = new Map<string, any>();

export async function fetchMunicipalityGeoJSON(ufCode: number): Promise<any | null> {
    const key = `uf-${ufCode}`;
    if (geoJsonCache.has(key)) return geoJsonCache.get(key);
    try {
        const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${ufCode}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`;
        const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!res.ok) return null;
        const data = await res.json();
        geoJsonCache.set(key, data);
        return data;
    } catch {
        return null;
    }
}

export async function fetchStateGeoJSON(): Promise<any | null> {
    const key = 'br-states';
    if (geoJsonCache.has(key)) return geoJsonCache.get(key);
    try {
        const url = 'https://servicodados.ibge.gov.br/api/v3/malhas/paises/BR?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=UF';
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) return null;
        const data = await res.json();
        geoJsonCache.set(key, data);
        return data;
    } catch {
        return null;
    }
}

// ─── IBGE Demographic Indicators ────────────────────────────────────────────

export interface CityDemographics {
    ibgeId: number;
    name: string;
    population: number;
    area: number;
    density: number;
}

const demographicsCache = new Map<number, CityDemographics[]>();

export async function fetchMunicipalitiesList(ufCode: number): Promise<CityDemographics[]> {
    if (demographicsCache.has(ufCode)) return demographicsCache.get(ufCode)!;
    try {
        const url = `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${ufCode}/municipios`;
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) return [];
        const data = await res.json();
        const muns = data.map((m: any) => ({
            ibgeId: m.id,
            name: m.nome,
            population: 0,
            area: 0,
            density: 0,
        }));
        demographicsCache.set(ufCode, muns);
        return muns;
    } catch {
        return [];
    }
}

// ─── UF Code Mapping ────────────────────────────────────────────────────────

export const UF_CODES: Record<string, number> = {
    'AC': 12, 'AL': 27, 'AP': 16, 'AM': 13, 'BA': 29, 'CE': 23, 'DF': 53,
    'ES': 32, 'GO': 52, 'MA': 21, 'MT': 51, 'MS': 50, 'MG': 31, 'PA': 15,
    'PB': 25, 'PR': 41, 'PE': 26, 'PI': 22, 'RJ': 33, 'RN': 24, 'RS': 43,
    'RO': 11, 'RR': 14, 'SC': 42, 'SP': 35, 'SE': 28, 'TO': 17,
};
