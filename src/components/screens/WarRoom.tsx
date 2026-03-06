import React, { useEffect, useState } from 'react';
import { getLatestIntelReport, getV2DailyReport, getActiveTargets, getProfile, getV2Signals } from '../../services/intelService';
import type { IntelReport, IntelTarget } from '../../services/intelService';
import IntelGraph from '../intel/IntelGraph';
import { IntelSkeleton } from '../intel/IntelSkeleton';
import { Shield, Radio, Activity, Globe, Map, Target, Terminal, ChevronDown, AlertCircle, Users } from 'lucide-react';
import IntelStream from '../intel/IntelStream';
import ThreatGauge from '../intel/ThreatGauge';
import ProfileModal from '../intel/ProfileModal';

const WarRoom: React.FC = () => {
    const [intelReport, setIntelReport] = useState<IntelReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState<IntelTarget[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // Profile Modal State
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [signals, setSignals] = useState<any[]>([]);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            // 1. Fetch Targets
            const activeTargets = await getActiveTargets();
            setTargets(activeTargets);

            // Default to first target or fallback to V1
            let currentTargetId = selectedTargetId;
            if (!currentTargetId && activeTargets.length > 0) {
                currentTargetId = activeTargets[0].id;
                setSelectedTargetId(currentTargetId);
            }

            // 2. Try V2 Report first
            if (currentTargetId) {
                const v2Report = await getV2DailyReport(currentTargetId);
                if (v2Report) {
                    const d = v2Report.dashboard_json;

                    // TRANSFORM V2 (Arrays) -> V1 (Objects)
                    // 1. Build Knowledge Graph from Risk/Connection items
                    const nodes: any[] = [];
                    const links: any[] = [];

                    // Simple conversion of risk items to graph nodes (Placeholder logic)
                    if (Array.isArray(d.risks)) {
                        d.risks.forEach((r: any) => {
                            if (r.details?.main_entity) {
                                nodes.push({ id: r.details.main_entity, group: 'risk', type: 'PERSON' });
                            }
                        });
                    }

                    // 2. Build Mock Scenarios/Summary since V2 is granular
                    const bestCase = "Estabilidade institucional com monitoramento contínuo.";
                    const worstCase = "Escalada de tensões políticas se pontos críticos não forem tratados.";

                    setIntelReport({
                        id: Number(1), // Mock ID
                        created_at: v2Report.report_date,
                        risk_score: d.maxRisk || 0,
                        risk_summary: v2Report.narrative_summary,
                        top_opportunity_title: "Monitoramento Ativo",
                        top_opportunity_reasoning: "O sistema V2 identificou pontos de atenção nos dados coletados.",
                        report_json: {
                            risk: {
                                score: d.maxRisk || 0,
                                summary: v2Report.narrative_summary,
                                scenarios: { best_case: bestCase, worst_case: worstCase },
                                critical_alerts: d.risks?.map((r: any) => r.summary).slice(0, 3) || [],
                                knowledge_graph: {
                                    entities: nodes.length > 0 ? nodes : [{ id: 'Mauá', type: 'CITY', group: 'central' }],
                                    relations: links
                                }
                            },
                            sentiment: {
                                temperature: d.avgSentiment ? (d.avgSentiment + 10) * 5 : 50, // Map -10..10 to 0..100
                                dominant_emotion: "Mista", // Todo: Infer from details
                                trending_topics: d.sentiments?.map((s: any) => s.summary?.substring(0, 15)).slice(0, 5) || [],
                                summary: "Análise de sentimento baseada em coleta contínua."
                            },
                            strategic_pitch: "Recomendamos manter a vigilância sobre os tópicos de maior engajamento negativo."
                        }
                    } as any);
                    setLoading(false);
                    return;
                }
            }

            // 3. Fallback to V1
            const v1Data = await getLatestIntelReport();
            setIntelReport(v1Data);
            // 4. Fetch Operational Signals
            const operationalSignals = await getV2Signals(15);
            setSignals(operationalSignals);

            setLoading(false);
        };

        const interval = setInterval(async () => {
            const freshSignals = await getV2Signals(15);
            setSignals(freshSignals);
        }, 30000); // Pulse every 30s

        init();
        return () => clearInterval(interval);
    }, [selectedTargetId]); // Re-run when target changes

    const handleNodeClick = async (node: any) => {
        if (node.type !== 'PERSON') return;

        setIsModalOpen(true);
        setLoadingProfile(true);
        setSelectedProfile(null); // Reset

        const profile = await getProfile(node.id);
        setSelectedProfile(profile ? profile : { name: node.id, role: node.role, last_scraped_at: new Date().toISOString(), bio_json: {} });
        setLoadingProfile(false);
    };

    // Skeleton Loading State
    if (!intelReport && loading) {
        return (
            <div className="p-6 bg-[#1a1b26] min-h-screen text-gray-100 font-sans">
                {/* Header Skeleton */}
                <div className="flex justify-between items-center mb-8">
                    <div className="space-y-2">
                        <IntelSkeleton className="h-8 w-64" />
                        <IntelSkeleton className="h-4 w-48" />
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-6 h-[80vh]">
                    {/* Left Panel - Risk Skeleton */}
                    <div className="col-span-3 space-y-6">
                        <IntelSkeleton className="h-64" />
                        <IntelSkeleton className="h-48" />
                    </div>

                    {/* Center - Graph Skeleton */}
                    <div className="col-span-6 flex flex-col gap-6">
                        <div className="bg-gray-900/50 border border-gray-800 rounded-2xl h-full flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-900/20 pointer-events-none" />
                            <div className="text-gray-500 animate-pulse flex flex-col items-center">
                                <Users className="w-12 h-12 mb-4 opacity-50" />
                                <span className="text-sm font-mono tracking-widest uppercase">Estabelecendo Uplink...</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Feed Skeleton */}
                    <div className="col-span-3 space-y-4">
                        <IntelSkeleton className="h-32" />
                        <IntelSkeleton className="h-32" />
                        <IntelSkeleton className="h-32" />
                    </div>
                </div>
            </div>
        );
    }

    if (!intelReport && !loading) return <div className="p-10 text-white">❌ Sem dados de inteligência para os filtros selecionados.</div>;

    // Safety check if intelReport is null but loading is false (should be caught above)
    if (!intelReport) return null;

    const graphData = intelReport.report_json?.risk?.knowledge_graph;
    const sentiment = intelReport.report_json?.sentiment;

    const getThreatLevel = (score: number) => {
        if (score > 80) return { label: 'CRITICAL', color: 'text-red-500' };
        if (score > 50) return { label: 'HIGH', color: 'text-orange-500' };
        if (score > 25) return { label: 'MODERATE', color: 'text-yellow-500' };
        return { label: 'LOW', color: 'text-blue-500' };
    };

    const threat = getThreatLevel(intelReport.risk_score);

    return (
        <div className="min-h-screen bg-[#0d1117] text-gray-300 p-4 font-mono selection:bg-emerald-500/30">
            {/* TOP BAR - High Density Telemetry */}
            <header className="flex items-center justify-between border-b border-gray-800 pb-3 mb-6">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-2 border border-emerald-500/20 rounded">
                        <Shield className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-[0.3em] uppercase text-gray-400">Strategic Intelligence Command Center</h1>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                            <span className="flex items-center gap-1"><Radio className="w-3 h-3 text-emerald-500" /> LINK: ESTABLISHED</span>
                            <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-blue-500" /> STATUS: OPERATIONAL</span>
                            <span className="hidden sm:inline opacity-50">• {new Date().toISOString()} •</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="text-right">
                        <div className="text-[9px] text-gray-500 uppercase tracking-tighter">Current Threat Level</div>
                        <div className={`text-xl font-black ${threat.color}`}>{threat.label} // {intelReport.risk_score}</div>
                    </div>
                    {targets.length > 0 && (
                        <div className="relative">
                            <select
                                className="appearance-none bg-[#161b22] border border-gray-800 text-[11px] py-2 pl-3 pr-8 rounded focus:outline-none focus:border-emerald-500/50 cursor-pointer text-emerald-500 font-bold"
                                value={selectedTargetId || ""}
                                onChange={(e) => setSelectedTargetId(e.target.value)}
                            >
                                {targets.map(t => (
                                    <option key={t.id} value={t.id}>{t.name.toUpperCase()}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-600 pointer-events-none" />
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-12 gap-4">
                {/* LEFT PANEL - Strategic Telemetry */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                        <ThreatGauge value={intelReport.risk_score} label="POL / RISK" subLabel="Threatcon" />
                        <ThreatGauge value={sentiment?.temperature || 50} label="SOC / SENT" subLabel="Thermometer" />
                    </div>

                    <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                            <Terminal className="w-4 h-4 text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Institutional Briefing</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                            {intelReport.risk_summary}
                        </p>
                    </div>

                    <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                            <Map className="w-4 h-4 text-blue-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Operational Zones</span>
                        </div>
                        <div className="space-y-2">
                            {sentiment?.trending_topics?.slice(0, 5).map((topic: string, i: number) => (
                                <div key={i} className="flex justify-between items-center text-[10px]">
                                    <span className="text-gray-500 flex items-center gap-1"><div className="w-1 h-1 bg-blue-500 rounded-full" /> {topic}</span>
                                    <span className="text-blue-500/50">SEC-ALPHA</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* CENTER - Net Analysis & Real-time Flow */}
                <div className="col-span-12 lg:col-span-6 space-y-4">
                    <div className="bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden relative group">
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-[#0d1117]/80 backdrop-blur-sm p-2 border border-gray-800 rounded text-[9px] font-bold text-gray-400">
                            <Globe className="w-3 h-3 text-emerald-500" /> RELATIONSHIP LINK MAPPING [NODE:EXTRACTOR]
                        </div>
                        <div className="h-[450px]">
                            {graphData ? (
                                <IntelGraph
                                    data={graphData}
                                    onNodeClick={handleNodeClick}
                                    cooldownTicks={100}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-700 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:20px_20px]">
                                    Establishing Graph Connection...
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-950/20 to-[#0d1117] border border-emerald-900/30 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2 text-emerald-500">
                            <Target className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-[0.2em]">Strategic Asset Extraction</span>
                        </div>
                        <div className="text-md font-bold text-gray-100 mb-1">{intelReport.top_opportunity_title || 'N/A'}</div>
                        <p className="text-[11px] text-gray-500 italic leading-relaxed">
                            "{intelReport.top_opportunity_reasoning || 'No immediate assets identified.'}"
                        </p>
                    </div>
                </div>

                {/* RIGHT PANEL - Sitrep & Intel Flow */}
                <div className="col-span-12 lg:col-span-3 space-y-4">
                    <div className="h-[300px]">
                        <IntelStream signals={signals} />
                    </div>

                    <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2">
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active SITREP Alerts</span>
                        </div>
                        <div className="space-y-3">
                            {intelReport.report_json.risk?.critical_alerts?.map((alert: string, idx: number) => (
                                <div key={idx} className="bg-orange-950/10 border-l-2 border-orange-500/50 p-2 text-[10px] text-gray-400 leading-tight">
                                    <span className="text-orange-500/70 font-bold block mb-1">EVENT_{idx + 10}</span>
                                    {alert}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-[#161b22] border border-gray-800 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-3 border-b border-gray-800 pb-2 text-blue-500">
                            <Radio className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Projection Matrix</span>
                        </div>
                        <div className="space-y-2">
                            <div className="text-[9px] text-gray-500 mb-1 flex justify-between">
                                <span>OPTIMISTIC PATH</span>
                                <span className="text-emerald-500 font-bold">STABLE</span>
                            </div>
                            <div className="bg-emerald-950/20 p-2 rounded border border-emerald-900/30 text-[9px] text-emerald-400/80 italic">
                                "{intelReport.report_json.risk.scenarios?.best_case?.substring(0, 100) || 'N/A'}..."
                            </div>
                            <div className="text-[9px] text-gray-500 mt-2 mb-1 flex justify-between">
                                <span>ADVERSARIAL PATH</span>
                                <span className="text-red-500 font-bold">VOLATILE</span>
                            </div>
                            <div className="bg-red-950/20 p-2 rounded border border-red-900/30 text-[9px] text-red-400/80 italic">
                                "{intelReport.report_json.risk.scenarios?.worst_case?.substring(0, 100) || 'N/A'}..."
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ProfileModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                profile={selectedProfile}
                loading={loadingProfile}
            />
        </div>
    );
};


export default WarRoom;
