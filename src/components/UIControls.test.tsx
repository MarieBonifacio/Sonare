import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import UIControls from './UIControls';

const defaultProps = {
  isPlaying: false,
  tempo: 120,
  onPlay: vi.fn(),
  onStop: vi.fn(),
  onTempoChange: vi.fn(),
  disabled: false,
  currentNoteIndex: null,
  totalNotes: 0,
};

describe('UIControls', () => {
  it('affiche le bouton Lecture quand la lecture est arrêtée', () => {
    render(<UIControls {...defaultProps} />);
    expect(screen.getByRole('button')).toHaveTextContent('Lecture');
  });

  it('affiche le bouton Arrêter pendant la lecture', () => {
    render(<UIControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole('button')).toHaveTextContent('Arrêter');
  });

  it('désactive le bouton quand disabled=true', () => {
    render(<UIControls {...defaultProps} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('appelle onPlay au clic quand arrêtée', async () => {
    const onPlay = vi.fn();
    render(<UIControls {...defaultProps} onPlay={onPlay} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('appelle onStop au clic pendant la lecture', async () => {
    const onStop = vi.fn();
    render(<UIControls {...defaultProps} isPlaying={true} onStop={onStop} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('affiche le tempo courant', () => {
    render(<UIControls {...defaultProps} tempo={90} />);
    expect(screen.getByText(/90 BPM/)).toBeInTheDocument();
  });

  it('désactive le slider pendant la lecture', () => {
    render(<UIControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole('slider')).toBeDisabled();
  });

  it('appelle onTempoChange lors du changement de slider', () => {
    const onTempoChange = vi.fn();
    render(<UIControls {...defaultProps} onTempoChange={onTempoChange} />);
    fireEvent.change(screen.getByRole('slider'), { target: { value: '140' } });
    expect(onTempoChange).toHaveBeenCalledWith(140);
  });

  it("n'affiche pas la barre de progression quand totalNotes=0", () => {
    render(<UIControls {...defaultProps} totalNotes={0} />);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('affiche la barre de progression quand totalNotes > 0', () => {
    render(
      <UIControls {...defaultProps} totalNotes={10} currentNoteIndex={null} />,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('affiche 100% de progression à la dernière note', () => {
    render(
      <UIControls {...defaultProps} totalNotes={10} currentNoteIndex={9} />,
    );
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
