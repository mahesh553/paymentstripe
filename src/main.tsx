import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.tsx'
import { UserProvider } from './context/UserContext.tsx'
import { SubscriptionProvider } from './context/SubscriptionContext.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <UserProvider>
          <SubscriptionProvider>
            <App />
          </SubscriptionProvider>
        </UserProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)