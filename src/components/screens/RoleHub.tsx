import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import {
    Shield,
    MapPin,
    Building2,
    Flame,
    Landmark,
    Globe,
    Map,
    ArrowRight
} from 'lucide-react';
import CommandLayout from '../layout/CommandLayout';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const RoleHub: React.FC = () => {
    const { userData } = useAuth();
    const { setJurisdiction, resetToNational } = useScope();
    const navigate = useNavigate();

    return (
        <CommandLayout>
            <div className="space-y-4 md:space-y-5">
                {/* Banner de Boas-Vindas do Hub Central */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-3.5">
                        <img src="/logo.png" alt="Guardião Nacional" className="w-12 h-12 md:w-13 md:h-13 object-contain drop-shadow-md" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl md:text-2xl font-bold text-slate-900 font-outfit">
                                    Guardião Nacional <span className="text-blue-600">· Hub Central</span>
                                </h1>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                    {(userData as any)?.officialTitle || 'SysAdmin Global'}
                                </Badge>
                            </div>
                            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                                Selecione o nível federativo ou a jurisdição desejada para abrir seu respectivo painel operacional.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/admin/jurisdictions')}
                            className="text-xs gap-1.5 border-slate-300 font-medium h-8 md:h-9"
                        >
                            <Landmark className="w-3.5 h-3.5 text-indigo-600" />
                            Gestão de Jurisdições
                        </Button>
                    </div>
                </div>

                {/* Grade de Módulos e Painéis Federativos (Otimizado para a 1ª dobra) */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* 1. PAINEL NACIONAL */}
                    <div
                        onClick={() => {
                            resetToNational();
                            navigate('/admin/dashboard');
                        }}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Globe size={96} className="text-blue-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Globe size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Painel Nacional</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Visão consolidada de todas as 27 Unidades Federativas, métricas globais do Brasil e gestão sistêmica de infraestrutura.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Acessar Painel Brasil <ArrowRight size={13} />
                        </div>
                    </div>

                    {/* 2. PAINEL ESTADUAL */}
                    <div
                        onClick={() => {
                            setJurisdiction('STATE', 'SP');
                            navigate('/admin/dashboard');
                        }}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MapPin size={96} className="text-emerald-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <MapPin size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Painéis Estaduais</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Governança executiva regional e estadual. Monitoramento agregado de demandas municipais e alocação de recursos federados.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Acessar Painel Estadual <ArrowRight size={13} />
                        </div>
                    </div>

                    {/* 3. PAINEL DE JURISDIÇÕES MUNICIPAIS */}
                    <div
                        onClick={() => navigate('/admin/jurisdictions')}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building2 size={96} className="text-indigo-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Painéis dos Municípios</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Acesso direto e emulação da visão restrita de prefeituras, secretarias municipais e autarquias locais ativas.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Explorar Cidades Ativas <ArrowRight size={13} />
                        </div>
                    </div>

                    {/* 4. WAR ROOM & GESTÃO DE CRISE */}
                    <div
                        onClick={() => navigate('/admin/war-room')}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-red-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Flame size={96} className="text-red-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <Flame size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Sala de Situação & War Room</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Monitoramento crítico em tempo real para Defesa Civil, alagamentos, desastres climáticos e gestão de incidentes de risco.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Abrir War Room <ArrowRight size={13} />
                        </div>
                    </div>

                    {/* 5. MAPA DE INTELIGÊNCIA */}
                    <div
                        onClick={() => navigate('/admin/intelligence')}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-sky-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Map size={96} className="text-sky-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                <Map size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Mapa de Inteligência</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Análise geoespacial com clusters, mapas de calor por risco, camadas meteorológicas e filtros federativos granulares.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-sky-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Ver Mapa Interativo <ArrowRight size={13} />
                        </div>
                    </div>

                    {/* 6. MODERAÇÃO & TRIAGEM COM IA */}
                    <div
                        onClick={() => navigate('/admin/moderation')}
                        className="bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-amber-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Shield size={96} className="text-amber-600" />
                        </div>
                        <div>
                            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Shield size={20} />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 mb-1">Fila de Moderação Cívica</h2>
                            <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                                Triagem e deferimento de relatos com IA (Gemini), tags estruturadas e fila prioritária de alertas para o SysAdmin.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:gap-2 transition-all pt-1">
                            Acessar Moderação <ArrowRight size={13} />
                        </div>
                    </div>

                </div>
            </div>
        </CommandLayout>
    );
};

export default RoleHub;
