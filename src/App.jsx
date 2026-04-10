import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Splash from './pages/Splash'
import Feed from './pages/Feed'
import Vote from './pages/Vote'
import Results from './pages/Results'
import Verify from './pages/Verify'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/splash" replace />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/vote/:id" element={<Vote />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/verify" element={<Verify />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
