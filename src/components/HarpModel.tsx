import React, { useEffect, useState } from 'react';

interface HarpModelProps {
  useManualStrings?: boolean;
  notes: any[];
}


const mapPitchToString = (pitch: { step: string; octave: number; alter: number }): number => {
  const notesOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B']; // Ordre des notes
  const stepIndex = notesOrder.indexOf(pitch.step);
  if (stepIndex === -1) return -1; // Note invalide

  // Calculer l'index de la corde en fonction de l'octave et des demi-tons (alter)
  const stringIndex = stepIndex + pitch.octave * 7 + pitch.alter;
  return stringIndex < 0 || stringIndex >= 37 ? -1 : stringIndex; // Valide uniquement si dans les limites
};

const HarpStringModel: React.FC<HarpModelProps> = ({ useManualStrings = true, notes }) => {
  const [activeString, setActiveString] = useState<number | null>(null);

  useEffect(() => {
    if (notes && notes.length > 0) {
      const firstNote = notes[0]; // Exemple : la première note
      const stringIndex = mapPitchToString(firstNote.pitch);
      if (stringIndex !== -1) {
        setActiveString(stringIndex);
      }
    }
  }, [notes]);

  if (useManualStrings) {
    const strings = Array.from({ length: 37 }, (_, index) => {
      const yPosition = 0;
      const zPosition = index * 0.5 - (37 * 0.5) / 2; // Center in depth
      const stringLength = 1 + index * 0.5; // Varying length from 1 to 18.5
      if (process.env.NODE_ENV === 'development') {
        console.log(`Corde ${index} : position Y = ${yPosition}, position Z = ${zPosition}, length = ${stringLength}`);
      }
      return (
        <mesh key={index} position={[0, yPosition, zPosition]} onClick={() => setActiveString(index)} >
          <cylinderGeometry args={[0.1, 0.1, stringLength]} /> {/* Varying dimensions */}
          <meshStandardMaterial color={activeString === index ? 'yellow' : `hsl(${index * 10}, 100%, 50%)`} />
        </mesh>
      );
    });    

    return (
      <group>
        {strings}
      </group>
    );
  }

  return null;
};



export default HarpStringModel;
