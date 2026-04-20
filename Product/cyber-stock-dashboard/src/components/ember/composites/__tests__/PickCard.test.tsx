import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PickCard from '../PickCard';
import type { StockSummary } from '../types';

// Mock Sparkline component to avoid SVG rendering issues in tests
vi.mock('@/components/ember/charts', () => ({
  Sparkline: () => <div data-testid="sparkline-mock" />,
}));

const mockStock: StockSummary = {
  id: 'AAPL',
  ticker: 'AAPL',
  name: 'Apple Inc.',
  nameJp: 'アップル',
  sector: 'Technology',
  price: 175.5,
  change: 2.3,
  changePct: 1.33,
  currency: 'USD',
  spark: [170, 172, 171, 173, 175.5],
  totalScore: 85,
};

describe('PickCard', () => {
  it('renders stock information correctly', () => {
    render(<PickCard stock={mockStock} />);
    
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('アップル')).toBeInTheDocument();
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0); // Multiple instances (front & back)
    expect(screen.getAllByText('Technology').length).toBeGreaterThan(0); // Multiple instances (front & back)
    const scoreElements = screen.getAllByText('85');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('calls onSelect when card is clicked', () => {
    const handleSelect = vi.fn();
    
    render(<PickCard stock={mockStock} onSelect={handleSelect} />);
    
    const cardButton = screen.getByRole('button', { name: /Apple Inc/i });
    fireEvent.click(cardButton);
    
    expect(handleSelect).toHaveBeenCalledWith('AAPL');
  });

  it('renders reason text when provided', () => {
    const reason = 'Strong fundamentals and growth potential';
    render(<PickCard stock={mockStock} reason={reason} />);
    
    const reasonElements = screen.getAllByText(reason);
    expect(reasonElements.length).toBeGreaterThan(0); // May appear on both sides
  });

  it('flips to audit view when flip button is clicked', () => {
    render(<PickCard stock={mockStock} reason="Good stock" />);
    
    // Initial state: front side visible
    expect(screen.getByRole('button', { name: /監査ビューを表示/i })).toBeInTheDocument();
    
    // Click flip button
    const flipButton = screen.getByRole('button', { name: /監査ビューを表示/i });
    fireEvent.click(flipButton);
    
    // After flip: back side visible
    expect(screen.getByText('監査ビュー / Auditor View')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /運用ビューに戻る/i })).toBeInTheDocument();
  });

  it('does not call onSelect when flip button is clicked', () => {
    const handleSelect = vi.fn();
    
    render(<PickCard stock={mockStock} onSelect={handleSelect} />);
    
    const flipButton = screen.getByRole('button', { name: /監査ビューを表示/i });
    fireEvent.click(flipButton);
    
    // onSelect should not be called (stopPropagation)
    expect(handleSelect).not.toHaveBeenCalled();
  });

  it('flips back to operation view when back flip button is clicked', () => {
    render(<PickCard stock={mockStock} />);
    
    // Flip to audit view
    const flipToAudit = screen.getByRole('button', { name: /監査ビューを表示/i });
    fireEvent.click(flipToAudit);
    
    expect(screen.getByText('監査ビュー / Auditor View')).toBeInTheDocument();
    
    // Flip back to operation view
    const flipToOperation = screen.getByRole('button', { name: /運用ビューに戻る/i });
    fireEvent.click(flipToOperation);
    
    expect(screen.getByRole('button', { name: /監査ビューを表示/i })).toBeInTheDocument();
  });

  it('renders audit view with rationale and score breakdown', () => {
    const reason = 'High momentum and strong earnings';
    
    render(<PickCard stock={mockStock} reason={reason} />);
    
    const flipButton = screen.getByRole('button', { name: /監査ビューを表示/i });
    fireEvent.click(flipButton);
    
    expect(screen.getByText('RATIONALE')).toBeInTheDocument();
    const reasonElements = screen.getAllByText(reason);
    expect(reasonElements.length).toBeGreaterThan(0);
    expect(screen.getByText('SCORE BREAKDOWN')).toBeInTheDocument();
    expect(screen.getByText(/総合スコア:/i)).toBeInTheDocument();
    const scoreElements = screen.getAllByText('85');
    expect(scoreElements.length).toBeGreaterThan(0);
  });

  it('renders default rationale when no reason provided', () => {
    render(<PickCard stock={mockStock} />);
    
    const flipButton = screen.getByRole('button', { name: /監査ビューを表示/i });
    fireEvent.click(flipButton);
    
    expect(screen.getByText(/スコアリングロジックに基づき選定されました/i)).toBeInTheDocument();
  });

  it('applies hover styles via CSS classes', () => {
    render(<PickCard stock={mockStock} />);
    
    const cardButton = screen.getByRole('button', { name: /Apple Inc/i });
    expect(cardButton).toHaveClass('hover:translate-y-[-2px]');
    expect(cardButton).toHaveClass('hover:shadow-[var(--shadow-lg)]');
  });
});
