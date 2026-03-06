import React, { useState, useRef } from 'react';
import { UploadCloud, FileJson, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebaseConfig';
import { toast } from 'sonner';

export const GraalIngest = () => {
    const [fileStatus, setFileStatus] = useState<'idle' | 'reading' | 'processing' | 'success' | 'error'>('idle');
    const [report, setReport] = useState<{ processed: number; duplicates: number } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileStatus('reading');
        setErrorMessage('');
        setReport(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonContent = event.target?.result as string;
                const payload = JSON.parse(jsonContent);

                if (!payload.signature || !payload.version || payload.version !== '1.0') {
                    throw new Error("Arquivo Graal Inválido. Assinatura ou versão ausente.");
                }

                setFileStatus('processing');

                // Call Cloud Function
                const processGraalFn = httpsCallable(functions, 'processGraal');
                const result = await processGraalFn(payload);
                const data = result.data as any;

                if (data.success) {
                    setReport({
                        processed: data.processedCount,
                        duplicates: data.duplicateCount
                    });
                    setFileStatus('success');
                    toast.success("Graal computado com sucesso!");
                } else {
                    throw new Error("Falha retornada pelo servidor.");
                }

            } catch (err: any) {
                console.error("Erro no processamento do Graal:", err);
                setErrorMessage(err.message || 'Falha ao processar o arquivo.');
                setFileStatus('error');
            }
        };

        reader.onerror = () => {
            setErrorMessage("Erro ao ler o arquivo físico.");
            setFileStatus('error');
        };

        reader.readAsText(file);
    };

    const reset = () => {
        setFileStatus('idle');
        setReport(null);
        setErrorMessage('');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="p-8 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Ingestão de Calamidade (Graal)</h1>
            <p className="text-gray-600 mb-8 max-w-2xl">
                Ferramenta restrita a SysAdmins para carga massiva de contribuições coletadas via emissários/offline.
                Faça o upload do arquivo criptografado <code>.graal</code> ou <code>.json</code> extraído em campo.
            </p>

            <div className="grid md:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center space-y-4">

                    <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-colors ${fileStatus === 'idle' ? 'bg-violet-100 text-violet-600' :
                        fileStatus === 'processing' || fileStatus === 'reading' ? 'bg-amber-100 text-amber-600 animate-pulse' :
                            fileStatus === 'success' ? 'bg-emerald-100 text-emerald-600' :
                                'bg-red-100 text-red-600'
                        }`}>
                        {fileStatus === 'idle' ? <UploadCloud className="w-10 h-10" /> :
                            fileStatus === 'processing' || fileStatus === 'reading' ? <FileJson className="w-10 h-10" /> :
                                fileStatus === 'success' ? <CheckCircle2 className="w-10 h-10" /> :
                                    <XCircle className="w-10 h-10" />}
                    </div>

                    <div>
                        <h2 className="text-xl font-semibold mb-1">
                            {fileStatus === 'idle' ? 'Upload de Pacote' :
                                fileStatus === 'reading' ? 'Lendo Arquivo...' :
                                    fileStatus === 'processing' ? 'Validando Integridade e Injetando...' :
                                        fileStatus === 'success' ? 'Carga Concluída' : 'Falha na Validação'}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {fileStatus === 'idle' ? 'Somente arquivos extraídos nativamente são aceitos.' :
                                fileStatus === 'error' ? errorMessage : ''}
                        </p>
                    </div>

                    {fileStatus === 'idle' || fileStatus === 'error' ? (
                        <>
                            <input
                                type="file"
                                accept=".json,.graal"
                                className="hidden"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                aria-label="Upload de Arquivo Graal"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Selecionar Arquivo
                            </button>
                        </>
                    ) : (
                        fileStatus === 'success' && (
                            <button
                                onClick={reset}
                                className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
                            >
                                Fazer novo Upload
                            </button>
                        )
                    )}
                </div>

                {/* Report Area */}
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-center">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-slate-500" />
                        Relatório da Extração
                    </h3>

                    {!report ? (
                        <div className="text-center py-8 text-slate-400">
                            <FileJson className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Aguardando processamento de um pacote válido...</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                                <span className="text-sm font-medium text-slate-600">Contribuições Inseridas</span>
                                <span className="text-lg font-bold text-emerald-600">+{report.processed}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 shadow-sm opacity-80">
                                <span className="text-sm font-medium text-slate-600">Duplicatas Prevenidas</span>
                                <span className="text-lg font-bold text-amber-500">{report.duplicates}</span>
                            </div>
                            <p className="text-xs text-slate-500 text-center mt-4">
                                Os autores originais receberão notificações informando que seus relatórios offline chegaram ao banco de dados.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
