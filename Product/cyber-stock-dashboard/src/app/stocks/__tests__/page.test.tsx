import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import StocksPage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/stocks',
}));

// Mock TanStack Query
vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: undefined,
    isLoading: false,
    error: null,
  }),
  QueryClient: vi.fn(),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('StocksPage', () => {
  it('renders stocks page', () => {
    render(<StocksPage />);
    
    expect(screen.getByText(/個別銘柄リサーチ/)).toBeInTheDocument();
  });

  it('has responsive research panel grid', () => {
    const { container } = render(<StocksPage />);

    // Watchlist section uses lg:grid-cols-[2fr_1fr] which is rendered unconditionally
    const html = container.innerHTML;
    expect(html).toContain('2fr_1fr');
  });

  it('has watchlist responsive grid', () => {
    const { container } = render(<StocksPage />);

    // Watchlist section uses lg:grid-cols-[2fr_1fr]
    const sections = container.querySelectorAll('section.grid');
    expect(sections.length).toBeGreaterThan(0);
  });

  it('renders research input form', () => {
    render(<StocksPage />);
    
    expect(screen.getByPlaceholderText(/例: 7203 \/ NVDA \/ SPY/)).toBeInTheDocument();
  });

  it('renders watchlist section', () => {
    render(<StocksPage />);
    
    expect(screen.getByText(/クイック参照銘柄/)).toBeInTheDocument();
  });
});
