import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';
import UIControls from './UIControls';

const defaultProps = {
  isPlaying: false,
  isLooping: false,
  tempo: 120,
  onPlay: vi.fn(),
  onStop: vi.fn(),
  onLoopToggle: vi.fn(),
  onTempoChange: vi.fn(),
  disabled: false,
  currentNoteIndex: null,
  totalNotes: 0,
};

describe('UIControls', () => {
  it('affiche le bouton Lecture quand la lecture est arrêtée', () => {
    render(<UIControls {...defaultProps} />);
    expect(screen.getByRole('button', { name: /Lecture/ })).toBeInTheDocument();
  });

  it('affiche le bouton Arrêter pendant la lecture', () => {
    render(<UIControls {...defaultProps} isPlaying={true} />);
    expect(screen.getByRole('button', { name: /Arrêter/ })).toBeInTheDocument();
  });

  it('désactive le bouton Lecture quand disabled=true', () => {
    render(<UIControls {...defaultProps} disabled={true} />);
    expect(screen.getByRole('button', { name: /Lecture/ })).toBeDisabled();
  });

  it('appelle onPlay au clic sur Lecture', async () => {
    const onPlay = vi.fn();
    render(<UIControls {...defaultProps} onPlay={onPlay} />);
    await userEvent.click(screen.getByRole('button', { name: /Lecture/ }));
    expect(onPlay).toHaveBeenCalledOnce();
  });

  it('appelle onStop au clic sur Arrêter pendant la lecture', async () => {
    const onStop = vi.fn();
    render(<UIControls {...defaultProps} isPlaying={true} onStop={onStop} />);
    await userEvent.click(screen.getByRole('button', { name: /Arrêter/ }));
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

  it('affiche le bouton Boucle', () => {
    render(<UIControls {...defaultProps} />);
    expect(screen.getByText(/Boucle/)).toBeInTheDocument();
  });

  it('appelle onLoopToggle au clic sur Boucle', async () => {
    const onLoopToggle = vi.fn();
    render(<UIControls {...defaultProps} onLoopToggle={onLoopToggle} />);
    await userEvent.click(screen.getByText(/Boucle/));
    expect(onLoopToggle).toHaveBeenCalledOnce();
  });

  it('ajoute la classe active quand isLooping=true', () => {
    render(<UIControls {...defaultProps} isLooping={true} />);
    expect(screen.getByText(/Boucle/).closest('button')).toHaveClass(
      'btn-loop--active',
    );
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
