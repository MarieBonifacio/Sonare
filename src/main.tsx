import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css'; // Si tu as des styles globaux

// Trouve l'élément root dans le DOM (assure-toi qu'il existe dans index.html)
const rootElement = document.getElementById('root') as HTMLElement;

// Crée un root React avec React 18
const root = ReactDOM.createRoot(rootElement);

// Rends l'application
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
