
import { Timestamp } from 'firebase/firestore';

export interface Contribution {
    id: string;
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    userId: string;
    city?: string;
    state?: string;
    createdAt?: Timestamp | Date | any; // Flexibilidade para datas
    isReported?: boolean;
    status: string; // 'Em Análise', 'Aprovado', 'Rejeitado', 'Resolvido', 'Lixo'
    aiAnalysis?: { isSafe: boolean; predictions?: { className: string; probability: number }[] }[];
    ipAddress?: string;
    imagesMetadata?: any[];
    rejectionReason?: string;
    deletionReason?: string;
    authorName?: string;
    riskLevel?: number; // 1-5
    likes?: number;
    shares?: number;
    // Novos campos para Resposta e Avaliação
    reply?: string;
    replyDate?: Timestamp;
    rating?: number; // 1-5
    ratingComment?: string;
    ratingDate?: Timestamp;
}
