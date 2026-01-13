import { Timestamp } from 'firebase/firestore';

export interface ErrorLog {
    id?: string;
    code?: string;
    message: string;
    stack?: string;
    userId?: string;
    deviceInfo: {
        userAgent: string;
        screenSize: string;
        language: string;
    };
    path: string;
    timestamp: Timestamp;
}
