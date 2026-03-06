
import { supabase } from './supabase';

export interface IntelReport {
    id: number;
    created_at: string;
    risk_score: number;
    risk_summary: string;
    top_opportunity_title: string;

    top_opportunity_reasoning: string;
    report_json: {
        strategic_pitch?: string;
        risk: {
            score: number;
            summary: string;
            critical_alerts: string[];
            scenarios: { best_case: string; worst_case: string; };
            knowledge_graph: {
                entities: any[];
                relations: any[];
            }
        };
        opp: {
            best_opportunity: string;
            reasoning: string;
        };
        sentiment?: {
            temperature: number;
            dominant_emotion: string;
            trending_topics: string[];
            summary: string;
        };
    };
}

export const getLatestIntelReport = async (): Promise<IntelReport | null> => {
    const { data, error } = await supabase
        .from('intel_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        console.error('Error fetching intel report:', error);
        return null;
    }

    return data;
};

export const getProfile = async (name: string) => {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('name', name)
        .single();

    if (error) {
        console.warn('Profile not found:', name);
        return null;
    }
    return data;
};
// ... V1 Methods ...

// --- V2 API ---

export interface IntelTarget {
    id: string;
    name: string;
    type: string;
    active: boolean;
}

export interface IntelReportV2 {
    id: string;
    report_date: string;
    risk_score: number;
    narrative_summary: string;
    content_html: string;
    dashboard_json: any;
}

export const getActiveTargets = async (): Promise<IntelTarget[]> => {
    const { data, error } = await supabase
        .from('intel_targets')
        .select('*')
        .eq('active', true);

    if (error || !data || data.length === 0) {
        console.warn('Error fetching targets or empty list. Using Fallback.', error);
        // Fallback to ensure UI works even if RLS blocks 'intel_targets'
        return [
            { id: '85c3fc1d-ea65-475f-a45f-7efead82b5c4', name: 'Mauá (Sistema V2)', type: 'CITY', active: true },
            { id: 'b57964d1-24ee-4a34-a2c9-896ecd826fcc', name: 'Marcelo Oliveira', type: 'VIP', active: true }
        ];
    }
    return data;
}

export const getV2DailyReport = async (targetId?: string): Promise<IntelReportV2 | null> => {
    let query = supabase
        .from('intel_reports_daily')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(1);

    if (targetId) {
        query = query.eq('target_id', targetId);
    }

    const { data, error } = await query.single();
    if (error) return null;
    return data;
};

export const getV2Analysis = async (targetId: string, dimension: string, limit = 10) => {
    const { data, error } = await supabase
        .from('intel_analysis')
        .select('*')
        .eq('target_id', targetId)
        .eq('dimension', dimension)
        .order('analyzed_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data || [];
}

export const getV2Signals = async (limit = 20) => {
    const { data, error } = await supabase
        .from('war_room_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) return [];
    return data.map((a: any) => ({
        id: a.id,
        timestamp: new Date(a.created_at).toLocaleTimeString('pt-BR'),
        type: a.actor_type === 'OSINT' ? 'OSINT' : (a.actor_type === 'SIGINT' ? 'SIGINT' : 'HUMINT'),
        content: a.action_title,
        importance: a.impact_level || 'MEDIUM'
    }));
}
