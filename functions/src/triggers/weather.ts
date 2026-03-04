import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize Firebase Admin if not already initialized
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();

// Targeted Cities Coordinates (SP Capital and ABC Region)
const TARGET_CITIES = [
    { name: 'São Paulo', lat: -23.5505, lng: -46.6333 },
    { name: 'Santo André', lat: -23.6666, lng: -46.5322 },
    { name: 'São Bernardo do Campo', lat: -23.6938, lng: -46.5644 },
    { name: 'São Caetano do Sul', lat: -23.6226, lng: -46.5511 },
    { name: 'Diadema', lat: -23.6865, lng: -46.6234 },
    { name: 'Mauá', lat: -23.6678, lng: -46.4614 },
    { name: 'Ribeirão Pires', lat: -23.7141, lng: -46.4136 },
    { name: 'Rio Grande da Serra', lat: -23.7436, lng: -46.3986 }
];

/**
 * CRON JOB: checkWeatherAlerts
 * Runs every 6 hours to check for severe weather conditions using Open-Meteo (Free API)
 */
export const checkWeatherAlerts = functions.pubsub.schedule('0 */6 * * *')
    .timeZone('America/Sao_Paulo')
    .onRun(async (context) => {
        console.log('Starting Weather Alert Check for SP and ABC Region...');

        const BATCH_SIZE = 500; // Limit for writing messages

        for (const city of TARGET_CITIES) {
            try {
                // Fetch weather forecast from Open-Meteo (Free, No Auth Required)
                // Requesting hourly precipitation and weathercode for the next 12 hours
                const response = await axios.get(`https://api.open-meteo.com/v1/forecast`, {
                    params: {
                        latitude: city.lat,
                        longitude: city.lng,
                        hourly: 'precipitation,weathercode',
                        timezone: 'America/Sao_Paulo',
                        forecast_days: 1
                    }
                });

                const hourly = response.data.hourly;
                if (!hourly || !hourly.precipitation) continue;

                // Check the next 6 hours for heavy rain (> 5mm/h) or severe weather codes
                let severeWeatherDetected = false;
                let maxPrecipitation = 0;
                let alertTime = '';

                for (let i = 0; i < 6; i++) {
                    const precipitation = hourly.precipitation[i];
                    const code = hourly.weathercode[i];

                    // Codes: 63 (Heavy Rain), 65 (Very Heavy Rain), 95 (Thunderstorm), 97 (Heavy Thunderstorm)
                    if (precipitation > 5 || [63, 65, 95, 97].includes(code)) {
                        severeWeatherDetected = true;
                        if (precipitation > maxPrecipitation) {
                            maxPrecipitation = precipitation;
                            alertTime = new Date(hourly.time[i]).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                        }
                    }
                }

                if (severeWeatherDetected) {
                    console.log(`[ALERT] Severe weather forecasted for ${city.name} around ${alertTime} (Precip: ${maxPrecipitation}mm)`);

                    // 1. Create a broadcast message in Firestore targeting this specific city
                    const messageRef = db.collection('messages').doc();

                    const messageData = {
                        title: `⛈️ Alerta Climático: ${city.name}`,
                        body: `Previsão de chuva forte (vol. >${maxPrecipitation}mm) por volta das ${alertTime}. Cuidado com alagamentos e reporte incidentes no app!`,
                        segment: 'custom', // Use custom segment to specify location
                        filters: {
                            isTargetAll: false,
                            location: {
                                city: city.name,
                                state: 'SP'
                            },
                            demographics: {
                                minAge: 0,
                                maxAge: 120,
                                gender: 'all'
                            }
                        },
                        channels: ['push', 'internal'],
                        priority: 'high',
                        status: 'sent',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        createdBy: 'system_weather_cron',
                        stats: {
                            sent: 0,
                            viewed: 0,
                            clicked: 0,
                            totalTarget: 0
                        },
                        isEmergencyAlert: true // This triggers the siren sound we implemented!
                    };

                    await messageRef.set(messageData);

                    // 2. Dispatch the actual Push Notifications via FCM (Fan-out pattern)
                    // Note: In a production scale, this dispatch logic should be delegated to another worker function
                    // listening to onCreate on 'messages' collection to handle batching and avoid timeout.
                    // For the blueprint, we show the concept:

                    /*
                    const usersSnapshot = await db.collection('users')
                       .where('city', '==', city.name)
                       .where('fcmToken', '!=', null)
                       .get();
                    
                    // Dispatch logic here using admin.messaging().sendMulticast()
                    */
                } else {
                    console.log(`[OK] No severe weather forecasted for ${city.name}.`);
                }

            } catch (error) {
                console.error(`Error checking weather for ${city.name}:`, error);
            }
        }

        return null;
    });
