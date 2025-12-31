#!/usr/bin/env node

/**
 * Script to validate required environment variables
 */

const requiredEnvVars = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
];

const optionalEnvVars = [
    'VITE_FIREBASE_MEASUREMENT_ID',
];

let hasErrors = false;

console.log('🔍 Validating environment variables...\n');

// Check required variables
requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
        console.error(`❌ Missing required environment variable: ${varName}`);
        hasErrors = true;
    } else {
        console.log(`✅ ${varName}: configured`);
    }
});

// Check optional variables
optionalEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
        console.warn(`⚠️  Optional environment variable not set: ${varName}`);
    } else {
        console.log(`✅ ${varName}: configured`);
    }
});

console.log('');

if (hasErrors) {
    console.error('❌ Environment validation failed!');
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
} else {
    console.log('✅ All required environment variables are configured!');
    process.exit(0);
}
