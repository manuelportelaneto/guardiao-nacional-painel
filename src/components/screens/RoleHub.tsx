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
            <div className="space-y-6">
                {/* Banner de Boas-Vindas do Hub Central */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-4">
                        <img src="/logo.png" alt="Guardião Nacional" className="w-14 h-14 object-contain drop-shadow-md" />
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 font-outfit">
                                    Guardião Nacional <span className="text-blue-600">· Hub Central</span>
                                </h1>
                                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                    {(userData as any)?.officialTitle || 'SysAdmin Global'}
                                </Badge>
                            </div>
                            <p className="text-sm text-slate-500 mt-1">
                                Selecione o nível federativo ou a jurisdição desejada para abrir seu respectivo painel operacional.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate('/admin/jurisdictions')}
                            className="text-xs gap-1.5 border-slate-300 font-medium"
                        >
                            <Landmark className="w-4 h-4 text-indigo-600" />
                            Gestão de Jurisdições
                        </Button>
                    </div>
                </div>

                {/* Grade de Módulos e Painéis Federativos */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                    {/* 1. PAINEL NACIONAL */}
                    <div
                        onClick={() => {
                            resetToNational();
                            navigate('/admin/dashboard');
                        }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Globe size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <Globe size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Painel Nacional</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Visão consolidada de todas as 27 Unidades Federativas, métricas globais do Brasil e gestão sistêmica de infraestrutura.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-blue-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Acessar Painel Brasil <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* 2. PAINEL ESTADUAL */}
                    <div
                        onClick={() => {
                            setJurisdiction('STATE', 'SP');
                            navigate('/admin/dashboard');
                        }}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-emerald-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <MapPin size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                <MapPin size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Painel Estadual (SP)</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Governança executiva estadual. Monitoramento agregado de demandas municipais e alocação de recursos regionais.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Acessar Painel Estadual <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* 3. PAINEL DE JURISDIÇÕES MUNICIPAIS (ABC + SP) */}
                    <div
                        onClick={() => navigate('/admin/jurisdictions')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-indigo-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Building2 size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <Building2 size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Painéis dos Municípios</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Acesso direto e emulação da visão restrita de São Paulo e das 7 cidades do ABC Paulista (Santo André, SBC, Mauá, etc.).
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-indigo-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Explorar Cidades <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* 4. WAR ROOM & GESTÃO DE CRISE */}
                    <div
                        onClick={() => navigate('/admin/war-room')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-red-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Flame size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <Flame size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Sala de Situação & War Room</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Monitoramento crítico em tempo real para Defesa Civil, surtos de ocorrências, alertas climáticos e gerenciamento de incidentes.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-red-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Abrir War Room <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* 5. MAPA DE INTELIGÊNCIA */}
                    <div
                        onClick={() => navigate('/admin/intelligence')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-sky-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Map size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-sky-50 text-sky-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                                <Map size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Mapa de Inteligência</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Análise geoespacial avançada com clusters, mapas de calor por risco, camadas meteorológicas e filtros federativos granulares.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-sky-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Ver Mapa Interativo <ArrowRight size={14} />
                        </div>
                    </div>

                    {/* 6. MODERAÇÃO & TRIAGEM COM IA */}
                    <div
                        onClick={() => navigate('/admin/moderation')}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-lg hover:border-amber-400 transition-all group relative overflow-hidden flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <Shield size={110} />
                        </div>
                        <div>
                            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-lg font-bold text-slate-900 mb-1">Fila de Moderação Cívica</h2>
                            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                                Triagem de denúncias cidadãs com validação assistida por IA (Gemini 2.0 Flash) e controle de deferimento/indeferimento.
                            </p>
                        </div>
                        <div className="text-xs font-semibold text-amber-600 flex items-center gap-1 group-hover:gap-2 transition-all">
                            Acessar Moderação <ArrowRight size={14} />
                        </div>
                    </div>

                </div>
            </div>
        </CommandLayout>
    );
};

export default RoleHub;
