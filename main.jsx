import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'

// Lazy load components to isolate initialization issues
const App = React.lazy(() => import('./App.jsx'))
const DriverView = React.lazy(() => import('./pages/DriverView.jsx'))
const ClientPortal = React.lazy(() => import('./pages/ClientPortal.jsx'))
const AdminPage = React.lazy(() => import('./pages/AdminPage.jsx'))

const Loading = () => (
  <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <React.Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/driver" element={<DriverView />} />
          <Route path="/client/:id" element={<ClientPortal />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  </React.StrictMode>,
)
