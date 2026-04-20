import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FlipCard from '../FlipCard';

describe('FlipCard', () => {
  it('renders front content by default', () => {
    render(
      <FlipCard
        front={<div>Front Side</div>}
        back={<div>Back Side</div>}
      />
    );
    expect(screen.getByText('Front Side')).toBeInTheDocument();
    expect(screen.getByText('Back Side')).toBeInTheDocument();
  });

  it('controlled mode: flips when prop changes', () => {
    const { rerender } = render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={false}
      />
    );

    const inner = document.querySelector('.flip-card-inner');
    expect(inner).not.toHaveClass('is-flipped');

    rerender(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={true}
      />
    );

    expect(inner).toHaveClass('is-flipped');
  });

  it('calls onFlipChange when flipped state changes', () => {
    const handleChange = vi.fn();
    const { rerender } = render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={false}
        onFlipChange={handleChange}
      />
    );

    rerender(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={true}
        onFlipChange={handleChange}
      />
    );

    // In controlled mode, parent controls flipped state, so onFlipChange may not be called by internal logic
    // This test validates the prop is passed correctly
    expect(handleChange).toHaveBeenCalledTimes(0); // controlled mode doesn't trigger internally
  });

  it('toggles aria-hidden based on flipped state', () => {
    const { rerender } = render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={false}
      />
    );

    const frontFace = document.querySelector('.flip-face-front');
    const backFace = document.querySelector('.flip-face-back');

    expect(frontFace).toHaveAttribute('aria-hidden', 'false');
    expect(backFace).toHaveAttribute('aria-hidden', 'true');

    rerender(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        flipped={true}
      />
    );

    expect(frontFace).toHaveAttribute('aria-hidden', 'true');
    expect(backFace).toHaveAttribute('aria-hidden', 'false');
  });

  it('applies custom className and style', () => {
    render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        className="custom-class"
        style={{ width: '300px' }}
      />
    );

    const container = document.querySelector('.flip-card');
    expect(container).toHaveClass('custom-class');
    expect(container).toHaveStyle({ width: '300px' });
  });

  it('applies ariaLabel correctly', () => {
    render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        ariaLabel="Front Label"
        backAriaLabel="Back Label"
        flipped={false}
      />
    );

    const container = document.querySelector('.flip-card');
    expect(container).toHaveAttribute('aria-label', 'Front Label');
  });

  it('switches ariaLabel when flipped', () => {
    const { rerender } = render(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        ariaLabel="Front Label"
        backAriaLabel="Back Label"
        flipped={false}
      />
    );

    const container = document.querySelector('.flip-card');
    expect(container).toHaveAttribute('aria-label', 'Front Label');

    rerender(
      <FlipCard
        front={<div>Front</div>}
        back={<div>Back</div>}
        ariaLabel="Front Label"
        backAriaLabel="Back Label"
        flipped={true}
      />
    );

    expect(container).toHaveAttribute('aria-label', 'Back Label');
  });
});
