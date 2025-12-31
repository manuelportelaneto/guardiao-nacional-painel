import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { MapPin, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';

interface City {
    id: string;
    name: string;
    state: string;
}

// For now, hardcoded cities - later this will come from Firestore
const AVAILABLE_CITIES: City[] = [
    { id: 'maua', name: 'Mauá', state: 'SP' },
    { id: 'santo-andre', name: 'Santo André', state: 'SP' },
    { id: 'sao-caetano', name: 'São Caetano do Sul', state: 'SP' },
    { id: 'sao-paulo', name: 'São Paulo', state: 'SP' }
];

const CitySelector: React.FC = () => {
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userCities, setUserCities] = useState<City[]>([]);

    useEffect(() => {
        const fetchUserCities = async () => {
            if (!currentUser) return;

            try {
                // TODO: Fetch from Firestore users/{uid}.cities
                // For now, assume user has access to all cities
                const cities = AVAILABLE_CITIES;
                setUserCities(cities);

                // If user has only 1 city, redirect directly
                if (cities.length === 1) {
                    navigate(`/city/${cities[0].id}/dashboard`);
                }
            } catch (error) {
                console.error('Error fetching cities:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserCities();
    }, [currentUser, navigate]);

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
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{city.name}</h2>
                        <p className="text-gray-500 mb-6">{city.state}</p>
                        <span className="text-orange-600 font-medium group-hover:underline">Acessar Painel &rarr;</span>
                    </div>
                ))}
            </main>
        </div>
    );
};

export default CitySelector;
