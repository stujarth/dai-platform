import { Routes, Route } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LandingPage from '@/pages/LandingPage'
import WizardPage from '@/pages/WizardPage'
import DashboardPage from '@/pages/DashboardPage'
import PipelinePage from '@/pages/PipelinePage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      {/* Landing page has its own layout / navbar */}
      <Route path="/" element={<LandingPage />} />

      {/* App pages share the AppShell (navbar + chat panel) */}
      <Route element={<AppShell />}>
        <Route path="/wizard" element={<WizardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/pipeline" element={<PipelinePage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
