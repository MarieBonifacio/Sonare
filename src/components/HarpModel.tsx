import React from 'react';
import { Note } from 'musicxml-interfaces';

interface HarpModelProps {
  notes: Note[];
  activeNoteIndex: number | null;
}

const mapPitchToString = (pitch: {
  step: string;
  octave: number;
  alter: number;
}): number => {
  const notesOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const stepIndex = notesOrder.indexOf(pitch.step);
  if (stepIndex === -1) return -1;
  const stringIndex = stepIndex + pitch.octave * 7 + pitch.alter;
  return stringIndex < 0 || stringIndex >= 37 ? -1 : stringIndex;
};

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndex,
}) => {
  // Déduire la corde active depuis la note active
  const activeString =
    activeNoteIndex !== null && notes[activeNoteIndex]?.pitch
      ? mapPitchToString({
          step: notes[activeNoteIndex].pitch!.step,
          octave: notes[activeNoteIndex].pitch!.octave,
          alter: notes[activeNoteIndex].pitch!.alter ?? 0,
        })
      : null;

  return (
    <group>
      {Array.from({ length: 37 }, (_, index) => {
        const zPosition = index * 0.5 - (37 * 0.5) / 2;
        const stringLength = 1 + index * 0.5;
        return (
          <mesh key={index} position={[0, 0, zPosition]}>
            <cylinderGeometry args={[0.1, 0.1, stringLength]} />
            <meshStandardMaterial
              color={
                activeString === index
                  ? 'yellow'
                  : `hsl(${index * 10}, 100%, 50%)`
              }
            />
          </mesh>
        );
      })}
    </group>
  );
};

export default HarpStringModel;
