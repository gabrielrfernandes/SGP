import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { inicializarFirestore } from './services/firebase.ts';

// Inicializa a conexão com o banco em nuvem e sincroniza o seed inicial
inicializarFirestore().catch(console.error);

createRoot(document.getElementById('root')!).render(<App />);
