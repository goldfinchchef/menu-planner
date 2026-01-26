import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import DriverView from './pages/DriverView.jsx'
import ClientPortal from './pages/ClientPortal.jsx'
import AdminPage from './pages/AdminPage.jsx'
import './index.css'

// Error Boundary component to catch and display React errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', backgroundColor: '#ffffff', minHeight: '100vh', color: '#000000' }}>
          <h1 style={{ color: '#dc2626', fontSize: '24px', marginBottom: '20px' }}>Something went wrong</h1>
          <p style={{ color: '#333333', fontSize: '16px', marginBottom: '20px' }}>The app encountered an error. This is often caused by corrupted saved data.</p>
          <button
            onClick={() => {
              localStorage.removeItem('goldfinchChefData');
              localStorage.removeItem('goldfinchShopData');
              localStorage.removeItem('goldfinchShopChecked');
              localStorage.removeItem('goldfinchShopOverrides');
              window.location.reload();
            }}
            style={{
              marginTop: '10px',
              padding: '15px 30px',
              backgroundColor: '#3d59ab',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            Clear Data & Reload
          </button>
          <div style={{ marginTop: '30px', padding: '20px', backgroundColor: '#fee2e2', borderRadius: '8px', border: '2px solid #dc2626' }}>
            <h2 style={{ color: '#dc2626', fontSize: '18px', marginBottom: '10px' }}>Error Details:</h2>
            <pre style={{ backgroundColor: '#ffffff', padding: '15px', overflow: 'auto', color: '#000000', fontSize: '14px', border: '1px solid #ccc', borderRadius: '4px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{this.state.error?.toString()}
{this.state.errorInfo?.componentStack}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/driver" element={<DriverView />} />
          <Route path="/client/:id" element={<ClientPortal />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
