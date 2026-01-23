
import React from 'react';
import { X, Shield, AlertTriangle, CheckCircle, GraduationCap, Briefcase, Users, Fingerprint } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    profile: any;
    loading: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border-2 border-emerald-900/50 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl relative">

                {/* Header Top Secret */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-900 via-yellow-900 to-red-900 opacity-50"></div>

                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-white p-2"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Fingerprint className="w-16 h-16 text-emerald-500 animate-pulse" />
                            <p className="text-emerald-500 font-mono animate-pulse">ACESSANDO DOSSIÊ CRIPTOGRAFADO...</p>
                        </div>
                    ) : !profile ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <AlertTriangle className="w-16 h-16 text-yellow-500" />
                            <p className="text-gray-400">Dossiê ainda não compilado. Aguarde a próxima varredura de inteligência.</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-in fade-in zoom-in duration-300">
                            {/* Profile Header */}
                            <div className="flex flex-col md:flex-row gap-6 items-start border-b border-gray-800 pb-6">
                                <div className="w-32 h-32 rounded-lg bg-gray-800 flex items-center justify-center border border-gray-700 shadow-inner shrink-0">
                                    <Shield className="w-16 h-16 text-gray-600" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h2 className="text-3xl font-black text-white uppercase tracking-wider">{profile.name}</h2>
                                        <span className="bg-emerald-900/50 text-emerald-400 text-xs px-2 py-1 rounded border border-emerald-800 font-mono">
                                            {profile.role || 'ALVO DE INTERESSE'}
                                        </span>
                                    </div>
                                    <p className="text-gray-400 font-light italic mb-4">
                                        "Informação verificada em {new Date(profile.last_scraped_at).toLocaleDateString()}"
                                    </p>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                                            <div className="text-gray-500 text-xs uppercase mb-1">Ideologia</div>
                                            <div className="text-gray-200 text-sm font-semibold">{profile.bio_json.ideology || 'N/A'}</div>
                                        </div>
                                        <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                                            <div className="text-gray-500 text-xs uppercase mb-1">Nascimento</div>
                                            <div className="text-gray-200 text-sm font-semibold">{profile.bio_json.birth || 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                                <div className="space-y-6">
                                    <section>
                                        <h3 className="flex items-center gap-2 text-blue-400 font-bold mb-3 uppercase text-sm tracking-widest border-b border-blue-900/30 pb-1">
                                            <Briefcase className="w-4 h-4" /> Carreira & Poder
                                        </h3>
                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                                            {profile.bio_json.career}
                                        </p>
                                    </section>

                                    <section>
                                        <h3 className="flex items-center gap-2 text-purple-400 font-bold mb-3 uppercase text-sm tracking-widest border-b border-purple-900/30 pb-1">
                                            <GraduationCap className="w-4 h-4" /> Formação
                                        </h3>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {profile.bio_json.education}
                                        </p>
                                    </section>
                                </div>

                                <div className="space-y-6">
                                    <section>
                                        <h3 className="flex items-center gap-2 text-green-400 font-bold mb-3 uppercase text-sm tracking-widest border-b border-green-900/30 pb-1">
                                            <CheckCircle className="w-4 h-4" /> Pontos Fortes (Histórico)
                                        </h3>
                                        <ul className="space-y-2">
                                            {profile.bio_json.history?.good?.map((item: string, i: number) => (
                                                <li key={i} className="text-gray-300 text-sm flex gap-2">
                                                    <span className="text-green-500 mt-1">●</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>

                                    <section>
                                        <h3 className="flex items-center gap-2 text-red-500 font-bold mb-3 uppercase text-sm tracking-widest border-b border-red-900/30 pb-1">
                                            <AlertTriangle className="w-4 h-4" /> Controvérsias & Riscos
                                        </h3>
                                        <ul className="space-y-2">
                                            {profile.bio_json.history?.bad?.map((item: string, i: number) => (
                                                <li key={i} className="text-gray-300 text-sm flex gap-2">
                                                    <span className="text-red-500 mt-1">●</span> {item}
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                    <section>
                                        <h3 className="flex items-center gap-2 text-yellow-400 font-bold mb-3 uppercase text-sm tracking-widest border-b border-yellow-900/30 pb-1">
                                            <Users className="w-4 h-4" /> Conexões Pessoais
                                        </h3>
                                        <p className="text-gray-300 text-sm leading-relaxed">
                                            {profile.bio_json.family}
                                        </p>
                                    </section>
                                </div>

                            </div>

                            {/* Footer */}
                            <div className="pt-6 border-t border-gray-800 text-center">
                                <p className="text-xs text-gray-600 font-mono tracking-widest">
                                    CONFIDENTIAL // EYES ONLY // INTEL AGENCY V14
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
