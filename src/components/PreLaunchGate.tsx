import React, { useState, useEffect } from 'react';

export const PreLaunchGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        const auth = sessionStorage.getItem('prelaunch_auth');
        if (auth === 'true') {
            setIsAuthenticated(true);
        }
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'nacional2024') {
            sessionStorage.setItem('prelaunch_auth', 'true');
            setIsAuthenticated(true);
        } else {
            setError('Senha incorreta');
        }
    };

    if (isAuthenticated) {
        return <>{children}</>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxWidth: '400px', width: '90%' }}>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', color: '#0f172a', textAlign: 'center' }}>Painel Administrativo</h1>
                <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.5rem', textAlign: 'center' }}>Acesso restrito ao ambiente de homologação. Insira a senha.</p>
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Senha de acesso"
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', backgroundColor: '#fff', color: '#000', boxSizing: 'border-box' }}
                        />
                        {error && <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
                    </div>
                    <button type="submit" style={{ backgroundColor: '#2563eb', color: 'white', padding: '0.75rem', borderRadius: '6px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Acessar</button>
                </form>
            </div>
        </div>
    );
};
