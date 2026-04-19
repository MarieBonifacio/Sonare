import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import ScoreLoader from './ScoreLoader';

describe('ScoreLoader', () => {
  it('affiche le texte initial de chargement', () => {
    render(<ScoreLoader onLoad={vi.fn()} lang='fr' />);
    expect(screen.getByText('Charger une partition')).toBeInTheDocument();
  });

  it("l'input accepte les formats .musicxml, .xml et .mxl", () => {
    render(<ScoreLoader onLoad={vi.fn()} lang='fr' />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input.accept).toBe('.musicxml,.xml,.mxl');
  });

  it("l'input est masqué visuellement", () => {
    render(<ScoreLoader onLoad={vi.fn()} lang='fr' />);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toHaveStyle({ display: 'none' });
  });

  it("n'affiche pas de message d'erreur au départ", () => {
    render(<ScoreLoader onLoad={vi.fn()} lang='fr' />);
    expect(document.querySelector('.score-loader__erreur')).toBeNull();
  });
});
