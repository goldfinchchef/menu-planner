import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import './index.css'

// Placeholder pages for now
function PlaceholderPage({ name }) {
  return <div style={{ padding: '40px' }}>{name} - Coming soon</div>
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/admin" element={<PlaceholderPage name="Admin" />} />
        <Route path="/driver" element={<PlaceholderPage name="Driver" />} />
        <Route path="/client/:id" element={<PlaceholderPage name="Client" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
