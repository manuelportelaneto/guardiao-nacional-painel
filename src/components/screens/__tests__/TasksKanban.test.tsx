import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TasksKanban from '../TasksKanban';

// Wrapper for components that need Router
const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('TasksKanban', () => {
    it('should render the kanban board', () => {
        renderWithRouter(<TasksKanban />);

        // Check if main heading is present
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    it('should render all kanban columns', () => {
        renderWithRouter(<TasksKanban />);

        // Check for column titles
        expect(screen.getByText('Recebidas')).toBeInTheDocument();
        expect(screen.getByText('Em Andamento')).toBeInTheDocument();
        expect(screen.getByText('Resolvidas')).toBeInTheDocument();
        expect(screen.getByText('Arquivadas')).toBeInTheDocument();
    });

    it('should display mock tasks in received column', () => {
        renderWithRouter(<TasksKanban />);

        // Check for mock tasks
        expect(screen.getByText('Buraco na Rua Principal')).toBeInTheDocument();
        expect(screen.getByText('Iluminação quebrada')).toBeInTheDocument();
    });

    it('should have a new task button', () => {
        renderWithRouter(<TasksKanban />);

        const newTaskButton = screen.getByRole('button', { name: /nova tarefa/i });
        expect(newTaskButton).toBeInTheDocument();
    });

    it('should display task priority correctly', () => {
        renderWithRouter(<TasksKanban />);

        // Check for priority badges - use getAllByText for duplicates
        expect(screen.getByText('Alta')).toBeInTheDocument();
        const mediumPriorities = screen.getAllByText('Média');
        expect(mediumPriorities.length).toBeGreaterThan(0);
    });
});
