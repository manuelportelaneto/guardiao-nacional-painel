
import React, { useEffect, useState } from 'react';
import { getLatestIntelReport, getV2DailyReport, getActiveTargets } from '../../services/intelService';
import type { IntelReport, IntelTarget } from '../../services/intelService';
import IntelGraph from '../intel/IntelGraph';
import { IntelSkeleton } from '../intel/IntelSkeleton';
import { Target, ShieldAlert, TrendingUp, Users, Flame, ChevronDown } from 'lucide-react';


import ProfileModal from '../intel/ProfileModal';
import { getProfile } from '../../services/intelService';

const WarRoom: React.FC = () => {
    const [intelReport, setIntelReport] = useState<IntelReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [targets, setTargets] = useState<IntelTarget[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);

    // Profile Modal State
    const [selectedProfile, setSelectedProfile] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(false);

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
            setLoading(false);
        };

        init();
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

    const riskColor = intelReport.risk_score > 70 ? 'text-red-500' : 'text-yellow-500';
    const graphData = intelReport.report_json?.risk?.knowledge_graph;
    const sentiment = intelReport.report_json?.sentiment; // V2 might have { sentiments: [], avgSentiment } structure, check adaptor logic
    // V2 Adapter fix: V2 dashboard_json has { risks, sentiments, avgSentiment, maxRisk } top level usually, 
    // but our adaptor passed dashboard_json directly. We might need to ensure structure matches UI expectation.
    // For MVP, assuming dashboard_json structure aligns or is flexible. 
    // Actually, V2 Generator produces { risks, sentiments, avgSentiment, maxRisk }.
    // UI expects report_json.sentiment to be an object { temperature, ... } OR report_json to be { sentiment: {...} }
    // We should patch this in the adaptor logic above or update UI. 
    // Let's assume V1 structure for now to keep diff small.

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
            <header className="mb-8 flex justify-between items-center border-b border-gray-700 pb-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <ShieldAlert className="w-8 h-8 text-blue-500" /> Sala de Guerra
                        {targets.length > 0 && (
                            <div className="relative inline-block ml-4 group">
                                <select
                                    className="appearance-none bg-gray-800 text-lg font-medium py-1 px-3 pr-8 rounded border border-gray-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                                    value={selectedTargetId || ""}
                                    onChange={(e) => setSelectedTargetId(e.target.value)}
                                >
                                    {targets.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                            </div>
                        )}
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">Sistema de Inteligência Integrado • Última atualização: {new Date(intelReport.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <div className="text-sm uppercase tracking-widest text-gray-500">Nível de Risco Político</div>
                    <div className={`text-4xl font-black ${riskColor}`}>{intelReport.risk_score}/100</div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Main Graph Area */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🕸️ Rede de Conexões (Ao Vivo)</h2>
                        {graphData ? (
                            <IntelGraph
                                data={graphData}
                                onNodeClick={handleNodeClick}
                                cooldownTicks={100}
                                onEngineStop={() => { }} // User can zoom manually, or we add ref logic later
                            />
                        ) : <p>Grafo indisponível.</p>}
                    </div>

                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-3">🔮 Projeção de Cenários (IA)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg">
                                <strong className="text-green-400 block mb-2">Melhor Caso</strong>
                                <p className="text-sm text-gray-300">{intelReport.report_json.risk.scenarios?.best_case || 'N/A'}</p>
                            </div>
                            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
                                <strong className="text-red-400 block mb-2">Pior Caso</strong>
                                <p className="text-sm text-gray-300">{intelReport.report_json.risk.scenarios?.worst_case || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Strategic Pitch Card */}
                    {intelReport.report_json?.strategic_pitch && (
                        <div className="bg-gradient-to-r from-emerald-900/40 to-teal-900/40 p-6 rounded-xl border border-emerald-700/50 relative overflow-hidden">
                            <h3 className="text-lg font-bold mb-3 flex items-center gap-2 text-emerald-400">
                                <Target className="w-5 h-5" /> Solução Estratégica (Guardião Nacional)
                            </h3>
                            <p className="text-gray-200 text-lg leading-relaxed font-light italic">
                                "{intelReport.report_json.strategic_pitch}"
                            </p>
                        </div>
                    )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                    {/* Alerts */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-yellow-500">
                            <ShieldAlert className="w-5 h-5" /> Alertas Críticos
                        </h3>
                        <ul className="space-y-3">
                            {intelReport.report_json.risk?.critical_alerts?.map((alert: string, idx: number) => (
                                <li key={idx} className="bg-yellow-900/20 p-3 rounded border-l-4 border-yellow-500 text-sm">
                                    {alert}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Opportunity */}
                    <div className="bg-gradient-to-br from-blue-900 to-indigo-900 p-6 rounded-xl border border-blue-700 shadow-lg">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white">
                            <TrendingUp className="w-5 h-5" /> Oportunidade Alpha
                        </h3>
                        <div className="text-xl font-bold text-yellow-300 mb-2">{intelReport.top_opportunity_title}</div>
                        <p className="text-sm text-blue-100 italic">"{intelReport.top_opportunity_reasoning}"</p>
                    </div>

                    {/* Risk Summary */}
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                        <h3 className="text-sm uppercase text-gray-400 font-bold mb-2">Resumo Executivo</h3>
                        <p className="text-sm text-gray-300 leading-relaxed">
                            {intelReport.risk_summary}
                        </p>
                    </div>

                    {/* Social Thermometer Widget */}
                    {sentiment && (
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-500">
                                <Flame className="w-5 h-5" /> Termômetro Social
                            </h3>

                            <div className="flex items-end gap-3 mb-4">
                                <div className="text-4xl font-black text-white">
                                    {sentiment.temperature}°C
                                </div>
                                <div className="text-sm text-gray-400 mb-2">
                                    {sentiment.dominant_emotion}
                                </div>
                            </div>

                            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                                <div
                                    className={`h-2.5 rounded-full ${sentiment.temperature > 80 ? 'bg-red-600' : sentiment.temperature > 50 ? 'bg-orange-500' : 'bg-blue-500'}`}
                                    style={{ width: `${sentiment.temperature}%` }}
                                ></div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-sm text-gray-300 italic">"{sentiment.summary}"</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {sentiment.trending_topics.map((tag: string, i: number) => (
                                        <span key={i} className="text-xs bg-gray-900 border border-gray-600 px-2 py-1 rounded text-gray-400">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
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
