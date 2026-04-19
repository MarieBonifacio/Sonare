import React from 'react';
import { Note } from 'musicxml-interfaces';
import { useGLTF } from '@react-three/drei';
import { mapPitchToString, STRING_COUNT } from '../utils/noteMapper';

useGLTF.preload('/models/harp/Unity2Skfb.gltf');

interface HarpModelProps {
  notes: Note[];
  activeNoteIndex: number | null;
}

const HarpStringModel: React.FC<HarpModelProps> = ({
  notes,
  activeNoteIndex,
}) => {
  const { scene } = useGLTF('/models/harp/Unity2Skfb.gltf');

  const activeString =
    activeNoteIndex !== null && notes[activeNoteIndex]?.pitch
      ? mapPitchToString({
          step: notes[activeNoteIndex].pitch!.step ?? '',
          octave: notes[activeNoteIndex].pitch!.octave,
          alter: notes[activeNoteIndex].pitch!.alter ?? 0,
        })
      : null;

  return (
    <group>
      {/* Corps de la harpe (modèle 3D GLTF) */}
      <primitive
        object={scene}
        scale={6}
        position={[0, -4, 0]}
        rotation={[0, -Math.PI / 6, 0]}
      />

      {/* Cordes procédurales — superposées sur le corps */}
      {Array.from({ length: STRING_COUNT }, (_, index) => {
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
