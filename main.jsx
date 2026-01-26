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
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
          <p>The app encountered an error. This is often caused by corrupted saved data.</p>
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
              padding: '10px 20px',
              backgroundColor: '#3d59ab',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Clear Data & Reload
          </button>
          <details style={{ marginTop: '20px' }}>
            <summary style={{ cursor: 'pointer' }}>Error Details</summary>
            <pre style={{ backgroundColor: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
              {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack}
            </pre>
          </details>
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
