import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import App from './App.jsx'
import DriverView from './pages/DriverView.jsx'
import ClientPortal from './pages/ClientPortal.jsx'
import AdminPage from './pages/AdminPage.jsx'
import './index.css'

// Experimental route-based navigation
import ExperimentalLayout from './experimental/ExperimentalLayout.jsx'
import SchedulePage from './experimental/pages/SchedulePage.jsx'
import MenuBuilderPage from './experimental/pages/MenuBuilderPage.jsx'
import DishTotalsPage from './experimental/pages/DishTotalsPage.jsx'
import ShoppingListPage from './experimental/pages/ShoppingListPage.jsx'
import RecipesPage from './experimental/pages/RecipesPage.jsx'
import IngredientsPage from './experimental/pages/IngredientsPage.jsx'
import ClientsDirectoryPage from './experimental/pages/ClientsDirectoryPage.jsx'
import HistoryPage from './experimental/pages/HistoryPage.jsx'

// Error boundary to catch React crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'system-ui' }}>
          <h1 style={{ color: '#dc2626' }}>Something went wrong</h1>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            The page failed to load. Please try refreshing.
          </p>
          <pre style={{
            background: '#f3f4f6',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            fontSize: '14px'
          }}>
            {this.state.error?.toString()}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#3d59ab',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Refresh Page
          </button>
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
          {/* Production routes - unchanged */}
          <Route path="/" element={<App />} />
          <Route path="/driver" element={<DriverView />} />
          <Route path="/client/:id" element={<ClientPortal />} />
          <Route path="/admin" element={<AdminPage />} />

          {/* Experimental route-based navigation */}
          <Route path="/test" element={<ExperimentalLayout />}>
            <Route index element={<Navigate to="/test/schedule" replace />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="menu/builder" element={<MenuBuilderPage />} />
            <Route path="kitchen">
              <Route index element={<Navigate to="/test/kitchen/dish-totals" replace />} />
              <Route path="dish-totals" element={<DishTotalsPage />} />
              <Route path="shopping-list" element={<ShoppingListPage />} />
              <Route path="recipes" element={<RecipesPage />} />
              <Route path="ingredients" element={<IngredientsPage />} />
            </Route>
            <Route path="clients">
              <Route index element={<Navigate to="/test/clients/directory" replace />} />
              <Route path="directory" element={<ClientsDirectoryPage />} />
              <Route path="history" element={<HistoryPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
