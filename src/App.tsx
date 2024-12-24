import React, { useState } from 'react';
import './styles.css';
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
    <div className="container">
      {/* Section pour charger la partition */}
      <div className="header">
        <ScoreLoader onLoad={handleScoreLoad} />
      </div>

      <div className="content">
        {/* Section pour afficher les notes extraites */}
        <div className="notes-container card">
          <h4>Notes extraites :</h4>
          <div className="notes-grid">
            {notes.map((note, index) => (
              <div key={index} className="note-card">
                <p><strong>Step:</strong> {note.pitch.step}</p>
                <p><strong>Octave:</strong> {note.pitch.octave}</p>
                <p><strong>Alter:</strong> {note.pitch.alter}</p>
                <p><strong>Duration:</strong> {note.duration}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section pour afficher le modèle de harpe */}
        <div className="harp-container">
          <Canvas camera={{ position: [0, 0, 20], fov: 75 }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <pointLight position={[10, 10, 10]} />
            <HarpModel useManualStrings={true} notes={notes} />
            <OrbitControls />
          </Canvas>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>Footer content here</p>
      </div>
    </div>
  );
}

export default App;
