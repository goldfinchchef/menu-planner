import React from 'react'
import ReactDOM from 'react-dom/client'

// Minimal test - no router, no components
function TestApp() {
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#3d59ab' }}>App is working!</h1>
      <p>If you see this, React is loading correctly.</p>
      <p>Click a link to test routing:</p>
      <ul>
        <li><a href="/">Home</a></li>
        <li><a href="/admin">Admin</a></li>
        <li><a href="/driver">Driver</a></li>
      </ul>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TestApp />
  </React.StrictMode>,
)
