import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HoldingRow from '../HoldingRow';
import type { Holding } from '../types';

const mockHolding: Holding = {
  id: '1',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  sector: '情報技術',
  quantity: 100,
  cost: 15000,
  price: 175.5,
  change: 2.5,
  changePct: 1.45,
  currency: 'USD',
  marketValue: 17550,
  pl: 2550,
  plPct: 17.0,
  weight: 0.25,
};

describe('HoldingRow', () => {
  it('renders holding information', () => {
    render(<HoldingRow holding={mockHolding} />);
    
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('applies mobile-responsive grid classes', () => {
    const { container } = render(<HoldingRow holding={mockHolding} />);
    const gridElement = container.querySelector('[role="group"]');
    
    expect(gridElement).toHaveClass('grid-cols-[auto_1fr_auto]');
    expect(gridElement).toHaveClass('md:grid-cols-[auto_1fr_auto_auto_auto_auto_auto_auto]');
  });

  it('shows mobile labels on small screens', () => {
    const { container } = render(<HoldingRow holding={mockHolding} />);
    
    // Check for mobile-only labels (hidden on md+)
    const mobileLabels = container.querySelectorAll('.md\\:hidden');
    expect(mobileLabels.length).toBeGreaterThan(0);
  });

  it('formats prices correctly', () => {
    render(<HoldingRow holding={mockHolding} />);
    
    // USD formatting
    expect(screen.getByText(/\$175\.50/)).toBeInTheDocument();
  });

  it('calls onSelect when clicked', () => {
    const onSelect = vi.fn();
    const { container } = render(<HoldingRow holding={mockHolding} onSelect={onSelect} />);
    
    const button = container.querySelector('[role="button"]') as HTMLElement;
    button?.click();
    
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('handles keyboard navigation', () => {
    const onSelect = vi.fn();
    const { container } = render(<HoldingRow holding={mockHolding} onSelect={onSelect} />);
    
    const button = container.querySelector('[role="button"]');
    button?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  it('renders without onSelect as group', () => {
    const { container } = render(<HoldingRow holding={mockHolding} />);
    
    expect(container.querySelector('[role="group"]')).toBeInTheDocument();
    expect(container.querySelector('[role="button"]')).not.toBeInTheDocument();
  });

  it('displays weight percentage correctly', () => {
    render(<HoldingRow holding={mockHolding} />);
    
    expect(screen.getByText('25%')).toBeInTheDocument();
  });

  it('hides market value on mobile', () => {
    const { container } = render(<HoldingRow holding={mockHolding} />);
    
    // Market value should have 'hidden md:block' class
    const marketValueElements = Array.from(container.querySelectorAll('.hidden.md\\:block'));
    expect(marketValueElements.length).toBeGreaterThan(0);
  });

  it('renders JPY currency correctly', () => {
    const jpyHolding: Holding = {
      ...mockHolding,
      ticker: '7203',
      name: 'トヨタ自動車',
      price: 2950,
      cost: 295000,
      marketValue: 295000,
      pl: 0,
      plPct: 0,
      currency: 'JPY',
      change: 10,
      changePct: 0.34,
    };
    
    render(<HoldingRow holding={jpyHolding} />);

    expect(screen.getAllByText(/¥2,950/).length).toBeGreaterThanOrEqual(1);
  });
});
