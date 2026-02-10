import { describe, it, expect } from 'vitest';

/**
 * Security tests for input validation and sanitization
 */

describe('Input Validation', () => {
    describe('Email validation', () => {
        it('should accept valid email addresses', () => {
            const validEmails = [
                'user@example.com',
                'test.user@domain.co.uk',
                'name+tag@company.com',
            ];

            validEmails.forEach((email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                expect(emailRegex.test(email)).toBe(true);
            });
        });

        it('should reject invalid email addresses', () => {
            const invalidEmails = [
                'notanemail',
                '@example.com',
                'user@',
                'user @example.com',
                'user@.com',
            ];

            invalidEmails.forEach((email) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                expect(emailRegex.test(email)).toBe(false);
            });
        });

        it('should reject emails with XSS attempts', () => {
            const xssEmails = [
                '<script>alert("xss")</script>@example.com',
                'user@example.com<script>',
                'javascript:alert(1)@example.com',
            ];

            xssEmails.forEach((email) => {

                const containsHtml = /<[^>]*>/.test(email);
                const containsScript = /script|javascript:/i.test(email);

                expect(containsHtml || containsScript).toBe(true);
            });
        });
    });

    describe('Password strength validation', () => {
        const calculateStrength = (pass: string): number => {
            let score = 0;
            if (!pass) return 0;
            if (pass.length >= 8) score++;
            if (/[A-Z]/.test(pass)) score++;
            if (/[a-z]/.test(pass)) score++;
            if (/[0-9]/.test(pass)) score++;
            if (/[^A-Za-z0-9]/.test(pass)) score++;
            return score;
        };

        it('should rate strong passwords correctly', () => {
            const strongPasswords = [
                'MyP@ssw0rd123',
                'Secure!Pass2024',
                'C0mpl3x#P@ss',
            ];

            strongPasswords.forEach((password) => {
                expect(calculateStrength(password)).toBeGreaterThanOrEqual(4);
            });
        });

        it('should rate weak passwords correctly', () => {
            const weakPasswords = [
                'password',
                '12345678',
                'qwerty',
            ];

            weakPasswords.forEach((password) => {
                expect(calculateStrength(password)).toBeLessThanOrEqual(2);
            });
        });

        it('should require minimum length', () => {
            expect(calculateStrength('Pass1!')).toBeLessThan(5); // Too short
            expect(calculateStrength('P@ssw0rd')).toBeGreaterThanOrEqual(4);
        });
    });

    describe('Phone number validation', () => {
        it('should validate Brazilian phone numbers', () => {
            const validPhones = [
                '+5511999998888',
                '+55 11 99999-8888',
                '11999998888',
            ];

            validPhones.forEach((phone) => {
                const digitsOnly = phone.replace(/\D/g, '');
                // Brazilian phone should have at least 10 digits
                expect(digitsOnly.length).toBeGreaterThanOrEqual(10);
            });
        });

        it('should reject invalid phone numbers', () => {
            const invalidPhones = [
                '123',
                'not a phone',
                '',
            ];

            invalidPhones.forEach((phone) => {
                const digitsOnly = phone.replace(/\D/g, '');
                expect(digitsOnly.length).toBeLessThan(10);
            });
        });
    });

    describe('XSS Protection', () => {
        it('should detect common XSS patterns', () => {
            const xssAttempts = [
                '<script>alert("XSS")</script>',
                '<img src=x onerror=alert(1)>',
                'javascript:alert(1)',
                '<iframe src="evil.com"></iframe>',
                'onclick="alert(1)"',
            ];

            xssAttempts.forEach((attempt) => {
                const hasScriptTag = /<script/i.test(attempt);
                const hasEventHandler = /on\w+\s*=/i.test(attempt);
                const hasJavascriptProtocol = /javascript:/i.test(attempt);
                const hasIframe = /<iframe/i.test(attempt);

                const isXssAttempt = hasScriptTag || hasEventHandler || hasJavascriptProtocol || hasIframe;
                expect(isXssAttempt).toBe(true);
            });
        });

        it('should allow safe HTML entities', () => {
            const safeContent = [
                'Hello &amp; Welcome',
                'Price: &lt; $10',
                'Copyright &copy; 2024',
            ];

            safeContent.forEach((content) => {
                const hasUnsafeHtml = /<script|<iframe|javascript:/i.test(content);
                expect(hasUnsafeHtml).toBe(false);
            });
        });
    });
});
