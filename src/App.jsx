import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './lib/auth'
import Landing from './pages/Landing'
import Splash from './pages/Splash'
import Feed from './pages/Feed'
import Vote from './pages/Vote'
import Results from './pages/Results'
import Verify from './pages/Verify'
import ResetPassword from './pages/ResetPassword'
import Admin from './pages/Admin'
import Upcoming from './pages/Upcoming'
import Suggestions from './pages/Suggestions'
import Profile from './pages/Profile'
import MyPulses from './pages/MyPulses'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/splash" element={<Splash />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/vote/:id" element={<Vote />} />
          <Route path="/results/:id" element={<Results />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/upcoming" element={<Upcoming />} />
          <Route path="/suggestions" element={<Suggestions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-pulses" element={<MyPulses />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
