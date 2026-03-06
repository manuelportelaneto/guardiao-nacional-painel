
import React, { useEffect, useRef } from 'react';
import { Activity, Radio, Globe } from 'lucide-react';

interface IntelSignal {
    id: string;
    timestamp: string;
    type: 'SIGINT' | 'HUMINT' | 'OSINT' | 'GEOINT';
    content: string;
    importance: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

const IntelStream: React.FC<{ signals?: IntelSignal[] }> = ({ signals = [] }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [signals]);

    const getImportanceColor = (imp: string) => {
        switch (imp) {
            case 'CRITICAL': return 'text-red-500 border-red-900 bg-red-900/10';
            case 'HIGH': return 'text-orange-500 border-orange-900 bg-orange-900/10';
            case 'MEDIUM': return 'text-blue-400 border-blue-900 bg-blue-900/10';
            default: return 'text-gray-400 border-gray-800 bg-gray-800/10';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'SIGINT': return <Radio className="w-3 h-3" />;
            case 'HUMINT': return <Users className="w-3 h-3 text-emerald-400" />;
            case 'GEOINT': return <Globe className="w-3 h-3 text-blue-400" />;
            default: return <Activity className="w-3 h-3 text-gray-400" />;
        }
    };

    // Helper for missing Users import in snippet
    const Users = ({ className }: { className?: string }) => (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    );

    return (
        <div className="flex flex-col h-full bg-[#0d1117] border border-gray-800 rounded-lg overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-3 py-2 bg-gray-900/50 border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold tracking-[0.2em] text-gray-400 uppercase">SYS // INTEL FEED</span>
                </div>
                <div className="flex gap-2">
                    <span className="text-[9px] font-mono text-gray-600">ENCRYPTION: AES-256</span>
                    <span className="text-[9px] font-mono text-emerald-600/70">SECURE</span>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-gray-800"
            >
                {signals.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-700 font-mono text-[10px]">
                        NO DATA INBOUND...
                    </div>
                ) : (
                    signals.map((signal) => (
                        <div key={signal.id} className={`p-2 border rounded font-mono text-[10px] transition-all hover:bg-white/5 ${getImportanceColor(signal.importance)}`}>
                            <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center gap-1 opacity-70">
                                    {getTypeIcon(signal.type)}
                                    <span>{signal.type}</span>
                                </div>
                                <span className="text-[9px] opacity-50">{signal.timestamp}</span>
                            </div>
                            <div className="leading-relaxed">
                                <span className="mr-1 opacity-40">{" >> "}</span>
                                {signal.content}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="px-3 py-1 bg-gray-900/30 border-t border-gray-800 flex justify-between">
                <span className="text-[8px] font-mono text-gray-600 tracking-tighter italic">LATENCY: 42ms</span>
                <span className="text-[8px] font-mono text-gray-600">BUFFER: STABLE</span>
            </div>
        </div>
    );
};

export default IntelStream;
