import React, { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Note } from 'musicxml-interfaces'; // Import du type Note
import ScoreLoader from './components/ScoreLoader';
import HarpModel from './components/HarpModel';

function App() {
  const [notes, setNotes] = useState<Note[]>([]); // Utilisation du type Note correct

  const handleScoreLoad = (loadedNotes: Note[]) => {
    console.log('Notes chargées depuis ScoreLoader :', loadedNotes);
    setNotes(loadedNotes); // Met à jour l'état des notes
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '10px', background: '#f5f5f5', textAlign: 'center' }}>
        <ScoreLoader onLoad={handleScoreLoad} />
      </div>

      <div style={{ flex: 1 }}>
        <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
          <ambientLight intensity={0.5} />
          <directionalLight position={[10, 10, 5]} intensity={1} />
          <gridHelper args={[20, 20]} />
          <HarpModel notes={notes} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}

export default App;
