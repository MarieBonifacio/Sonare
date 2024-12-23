import { Note } from 'musicxml-interfaces';
import React from 'react';
import { Mesh, Color } from 'three';

interface HarpModelProps {
  notes: Note[];
}


const HarpModel: React.FC<HarpModelProps> = ({ notes }) => {
  // Génération de 36 cordes
  const strings = Array.from({ length: 36 }, (_, index) => (
    <mesh
      key={index}
      name={`String${index}`} // Nom unique pour chaque corde
      position={[0, index * 0.5 - 8, 0]} // Espacement vertical (axe Y)
      scale={[0.1, 2, 0.1]} // Dimensions ajustées : épaisses et longues
    >
      <cylinderGeometry args={[0.05, 0.05, 2]} /> {/* Diamètre = 0.05, Hauteur = 2 */}
      <meshStandardMaterial color={`hsl(${index * 10}, 100%, 50%)`} /> {/* Couleur unique */}
    </mesh>
  ));

  return <group>{strings}</group>;
};

export default HarpModel;



