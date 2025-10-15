import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/loader.css'
import './styles/app-overrides.css'
import { clearOldServiceWorkers } from './clearSW';
clearOldServiceWorkers(); // kill old cached PWA from Netlify

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
