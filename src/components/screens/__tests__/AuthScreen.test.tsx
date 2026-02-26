import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthScreen from '../AuthScreen';

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AuthScreen', () => {
    it('should render login form by default', () => {
        renderWithRouter(<AuthScreen />);

        expect(screen.getByText(/painel administrativo/i)).toBeInTheDocument();
        // Use more specific selector for the submit button
        expect(screen.getByRole('button', { name: /^entrar$/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('should show Google sign-in button', () => {
        renderWithRouter(<AuthScreen />);

        const googleButton = screen.getByRole('button', { name: /entrar com google/i });
        expect(googleButton).toBeInTheDocument();
    });

    it('should show forgot password button', () => {
        renderWithRouter(<AuthScreen />);

        expect(screen.getByRole('button', { name: /esqueceu sua senha/i })).toBeInTheDocument();
    });

    it('should validate email input format', () => {
        renderWithRouter(<AuthScreen />);

        const emailInput = screen.getByLabelText(/e-mail/i) as HTMLInputElement;
        expect(emailInput.type).toBe('email');
    });

    it('should validate password input type', () => {
        renderWithRouter(<AuthScreen />);

        const passwordInput = screen.getByLabelText(/senha/i) as HTMLInputElement;
        expect(passwordInput.type).toBe('password');
    });
});
