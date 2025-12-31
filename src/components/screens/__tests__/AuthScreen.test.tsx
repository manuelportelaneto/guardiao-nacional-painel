import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthScreen from '../AuthScreen';

const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('AuthScreen', () => {
    it('should render login form by default', () => {
        renderWithRouter(<AuthScreen />);

        expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument();
        expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('should toggle between login and register modes', () => {
        renderWithRouter(<AuthScreen />);

        // Initially in login mode
        expect(screen.getByRole('heading', { name: /entrar/i })).toBeInTheDocument();

        // Click to switch to register
        const toggleButton = screen.getByRole('button', { name: /criar conta/i });
        fireEvent.click(toggleButton);

        // Now in register mode
        expect(screen.getByRole('heading', { name: /criar conta/i })).toBeInTheDocument();
        expect(screen.getByLabelText('Nome')).toBeInTheDocument();
        expect(screen.getByLabelText('Sobrenome')).toBeInTheDocument();
    });

    it('should show Google sign-in button', () => {
        renderWithRouter(<AuthScreen />);

        const googleButton = screen.getByRole('button', { name: /continuar com google/i });
        expect(googleButton).toBeInTheDocument();
    });

    it('should render login method toggle buttons', () => {
        renderWithRouter(<AuthScreen />);

        expect(screen.getByRole('button', { name: /^email$/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /telefone/i })).toBeInTheDocument();
    });

    it('should show password strength indicator in register mode', () => {
        renderWithRouter(<AuthScreen />);

        // Switch to register mode
        const toggleButton = screen.getByRole('button', { name: /criar conta/i });
        fireEvent.click(toggleButton);

        // Check for password strength label
        expect(screen.getByText(/força da senha/i)).toBeInTheDocument();
    });

    it('should require terms acceptance in register mode', () => {
        renderWithRouter(<AuthScreen />);

        // Switch to register mode
        const toggleButton = screen.getByRole('button', { name: /criar conta/i });
        fireEvent.click(toggleButton);

        // Check for terms checkbox
        const termsCheckbox = screen.getByRole('checkbox', { name: /aceito os/i });
        expect(termsCheckbox).toBeInTheDocument();
        expect(termsCheckbox).not.toBeChecked();
    });

    it('should validate email input format', () => {
        renderWithRouter(<AuthScreen />);

        const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
        expect(emailInput.type).toBe('email');
    });

    it('should validate password input type', () => {
        renderWithRouter(<AuthScreen />);

        const passwordInput = screen.getByLabelText(/^senha$/i) as HTMLInputElement;
        expect(passwordInput.type).toBe('password');
    });
});
