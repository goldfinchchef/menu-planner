import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'

// Test pages - no external imports
function HomePage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#3d59ab' }}>Home Page Works!</h1>
      <p>React Router is working.</p>
      <nav>
        <Link to="/" style={{ marginRight: '20px' }}>Home</Link>
        <Link to="/admin" style={{ marginRight: '20px' }}>Admin</Link>
        <Link to="/driver">Driver</Link>
      </nav>
    </div>
  )
}

function AdminPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#3d59ab' }}>Admin Page Works!</h1>
      <Link to="/">Back to Home</Link>
    </div>
  )
}

function DriverPage() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#3d59ab' }}>Driver Page Works!</h1>
      <Link to="/">Back to Home</Link>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/driver" element={<DriverPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
