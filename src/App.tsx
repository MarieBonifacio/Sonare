import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import HarpModel from './components/HarpModel';
import ScoreLoader from './components/ScoreLoader'; // Importation du ScoreLoader

function App() {
  // État pour stocker les notes extraites de la partition
  const [notes, setNotes] = useState<any[]>([]);

  // Fonction appelée lorsque des notes sont chargées via ScoreLoader
  const handleScoreLoad = (loadedNotes: any[]) => {
    console.log('Notes chargées :', loadedNotes);
    setNotes(loadedNotes); // Mise à jour des notes dans l'état
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Section pour charger la partition */}
      <div style={{ padding: '10px', background: '#f5f5f5' }}>
        <ScoreLoader onLoad={handleScoreLoad} />
      </div>

          {/* Section pour afficher les notes extraites */}
    <div style={{ padding: '10px', background: '#fff', maxHeight: '200px', overflow: 'auto' }}>
      <h4>Notes extraites :</h4>
      <ul>
        {notes.map((note, index) => (
          <li key={index}>
            {`Step: ${note.pitch.step}, Octave: ${note.pitch.octave}, Alter: ${note.pitch.alter}, Duration: ${note.duration}`}
          </li>
        ))}
      </ul>
    </div>

      {/* Canvas pour la scène 3D */}
      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 25], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <pointLight position={[10, 10, 10]} />
          <gridHelper args={[20, 20]} />

          {/* HarpModel affichant les cordes avec les notes */}
          <HarpModel useManualStrings={true} notes={notes} />

          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

export default App;

