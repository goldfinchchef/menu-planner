import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DriverView from './pages/DriverView.jsx'
import ClientPortal from './pages/ClientPortal.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/driver" element={<DriverView />} />
        <Route path="/client/:id" element={<ClientPortal />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
