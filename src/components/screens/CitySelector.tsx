import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { MapPin, Loader2, ArrowLeft, TriangleAlert } from 'lucide-react';
import { Button } from '../ui/button';

interface City {
    id: string;
    name: string;
    state: string;
}

const CitySelector: React.FC = () => {
    const { currentUser, userData } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userCities, setUserCities] = useState<City[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserCities = async () => {
            if (!currentUser || !userData) return;

            try {
                // 1. Check if user has a single cityId (direct assignment → auto-redirect)
                if (userData.cityId) {
                    navigate(`/city/${userData.cityId}/dashboard`, { replace: true });
                    return;
                }

                // 2. Check assignedMunicipalities for multi-city access
                let cityIds = userData.assignedMunicipalities || [];

                if (cityIds.length === 0) {
                    // Fallback: re-fetch Firestore user doc directly
                    const userDocRef = doc(db, 'users', currentUser.uid);
                    const userDoc = await getDoc(userDocRef);
                    const docData = userDoc.data();

                    if (docData?.cityId) {
                        navigate(`/city/${docData.cityId}/dashboard`, { replace: true });
                        return;
                    }

                    cityIds = docData?.assignedMunicipalities || [];

                    if (cityIds.length === 0) {
                        setError('Nenhum município foi atribuído ao seu usuário. Aguarde a configuração pelo administrador.');
                        setLoading(false);
                        return;
                    }
                }

                // 3. Auto-redirect if only one city
                if (cityIds.length === 1) {
                    navigate(`/city/${cityIds[0]}/dashboard`, { replace: true });
                    return;
                }

                // 4. Fetch city details from Firestore /cities collection
                const citiesData: City[] = [];
                for (const cityId of cityIds) {
                    try {
                        const cityDoc = await getDoc(doc(db, 'cities', cityId));
                        if (cityDoc.exists()) {
                            const data = cityDoc.data();
                            citiesData.push({
                                id: cityId,
                                name: data.name || data.nome || cityId,
                                state: data.state || data.estado || data.uf || '',
                            });
                        } else {
                            citiesData.push({ id: cityId, name: cityId, state: '' });
                        }
                    } catch {
                        citiesData.push({ id: cityId, name: cityId, state: '' });
                    }
                }

                setUserCities(citiesData);
            } catch (err) {
                console.error('Error fetching cities:', err);
                setError('Erro ao carregar municípios. Tente novamente.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserCities();
    }, [currentUser, userData, navigate]);

    const handleCitySelect = (cityId: string) => {
        navigate(`/city/${cityId}/dashboard`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <Loader2 className="animate-spin text-orange-600" size={48} />
                <p className="text-gray-500 font-medium">Carregando municípios...</p>
            </div>
        );
    }

    // Error state: no cities assigned
    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full text-center space-y-4">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                        <TriangleAlert className="text-amber-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Nenhum Município Atribuído</h2>
                    <p className="text-gray-500 text-sm">{error}</p>
                    <Button variant="outline" onClick={() => navigate('/hub')} className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar ao Hub
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="max-w-5xl mx-auto mb-10">
                <Button
                    variant="ghost"
                    onClick={() => navigate('/hub')}
                    className="mb-4"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Selecione um Município</h1>
                <p className="text-gray-500">Escolha qual município você deseja gerenciar</p>
            </header>

            <main className="max-w-5xl mx-auto grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {userCities.map((city) => (
                    <div
                        key={city.id}
                        onClick={() => handleCitySelect(city.id)}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group"
                    >
                        <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors">
                            <MapPin size={28} className="text-orange-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{city.name}</h2>
                        <p className="text-gray-400 text-sm mb-6">{city.state}</p>
                        <span className="text-orange-600 font-medium group-hover:underline">Acessar Painel &rarr;</span>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default CitySelector;
