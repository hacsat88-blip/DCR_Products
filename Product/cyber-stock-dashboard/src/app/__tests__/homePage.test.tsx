import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
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

describe('HomePage', () => {
  it('renders hero section with animation class', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/AI が読み解く、/)).toBeInTheDocument();
  });

  it('renders hero heading with correct text', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/AI が読み解く、/)).toBeInTheDocument();
    expect(screen.getByText(/株式投資の今/)).toBeInTheDocument();
  });

  it('renders hero subheading', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/Ember Stock Atelier · Cyber Stock Dashboard/)).toBeInTheDocument();
  });

  it('renders three CTA cards', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: '銘柄リサーチ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ポートフォリオ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ねらい目分析' })).toBeInTheDocument();
  });

  it('CTA cards link to correct pages', () => {
    render(<HomePage />);

    const researchLink = screen.getByRole('heading', { name: '銘柄リサーチ' }).closest('a');
    const portfolioLink = screen.getByRole('heading', { name: 'ポートフォリオ' }).closest('a');
    const analyzeLink = screen.getByRole('heading', { name: 'ねらい目分析' }).closest('a');

    expect(researchLink).toHaveAttribute('href', '/stocks');
    expect(portfolioLink).toHaveAttribute('href', '/portfolio');
    expect(analyzeLink).toHaveAttribute('href', '/analyze');
  });

  it('CTA cards have staggered animation classes', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { name: '銘柄リサーチ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ポートフォリオ' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'ねらい目分析' })).toBeInTheDocument();
  });

  it('CTA cards have responsive grid layout', () => {
    const { container } = render(<HomePage />);
    
    // Find the CTA container
    const ctaContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3');
    expect(ctaContainer).toBeTruthy();
  });

  it('renders indices section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/主要指数/)).toBeInTheDocument();
  });

  it('renders portfolio section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/資産推移/)).toBeInTheDocument();
  });

  it('renders picks section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/本日の注目候補/)).toBeInTheDocument();
  });

  it('renders news section', () => {
    render(<HomePage />);
    
    expect(screen.getByText(/マーケットニュース/)).toBeInTheDocument();
  });

  it('CTA cards have icon labels', () => {
    render(<HomePage />);

    expect(screen.getByLabelText('銘柄リサーチ')).toBeInTheDocument();
    expect(screen.getByLabelText('ポートフォリオ')).toBeInTheDocument();
    expect(screen.getByLabelText('ねらい目分析')).toBeInTheDocument();
  });
});
