import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuscadorView } from '../views/BuscadorView';
import { useUIStore } from '../stores/useUIStore';

// Mock de matchMedia y scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('BuscadorView Component', () => {
  beforeEach(() => {
    useUIStore.setState({
      tablaActual: 'alumnos',
      modoVista: 'table',
      terminoBusqueda: '',
      filtrosActuales: {},
    });
  });

  it('renderiza la vista del buscador con input de búsqueda', () => {
    renderWithQueryClient(<BuscadorView />);

    const input = screen.getByPlaceholderText(/buscar por/i);
    expect(input).toBeInTheDocument();
  });

  it('actualiza el término de búsqueda en useUIStore al tipear', () => {
    renderWithQueryClient(<BuscadorView />);

    const input = screen.getByPlaceholderText(/buscar por/i);
    fireEvent.change(input, { target: { value: 'González' } });

    expect(useUIStore.getState().terminoBusqueda).toBe('González');
  });

  it('el botón de limpiar filtros restablece el término de búsqueda', () => {
    useUIStore.setState({ terminoBusqueda: 'Consulta previa' });

    renderWithQueryClient(<BuscadorView />);

    const clearButton = screen.getByLabelText(/limpiar búsqueda/i);
    fireEvent.click(clearButton);

    expect(useUIStore.getState().terminoBusqueda).toBe('');
  });
});
