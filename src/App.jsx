import { HashRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast.jsx'
import { AuthProvider } from './hooks/useAuth.jsx'
import { ThemeProvider } from './hooks/useTheme.jsx'
import Home from './pages/Home.jsx'
import AdminSync from './pages/AdminSync.jsx'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <HashRouter>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/admin" element={<AdminSync />} />
            </Routes>
          </HashRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
