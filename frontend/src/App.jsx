import { Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import HomeScanner from './pages/HomeScanner.jsx'
import Dashboard from './pages/Dashboard.jsx'
import GeoTraceView from './pages/GeoTraceView.jsx'
import PolicyIncidents from './pages/PolicyIncidents.jsx'
import LiveMonitor from './pages/LiveMonitor.jsx'
import Result from './pages/Result.jsx'
import Forensics from './pages/Forensics.jsx'
import AttackDNA from './pages/AttackDNA.jsx'
import History from './pages/History.jsx'
import LedgerExplorer from './pages/LedgerExplorer.jsx'
import Auth from './pages/Auth.jsx'
import GeminiAssistant from './components/GeminiAssistant.jsx'

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <main className="main">
        <Routes>
          {/* Main All-In-One Email Scanner */}
          <Route path="/" element={<HomeScanner />} />
          <Route path="/analyze" element={<HomeScanner />} />
          <Route path="/verify" element={<HomeScanner />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/geotrace" element={<GeoTraceView />} />
          <Route path="/incidents" element={<PolicyIncidents />} />
          <Route path="/policies" element={<PolicyIncidents />} />
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/result/:id" element={<Result />} />
          <Route path="/forensics" element={<Forensics />} />
          <Route path="/forensics/:id" element={<Forensics />} />
          <Route path="/attack-dna" element={<AttackDNA />} />
          <Route path="/attack-dna/:id" element={<AttackDNA />} />
          <Route path="/ledger" element={<LedgerExplorer />} />
          <Route path="/history" element={<History />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<HomeScanner />} />
        </Routes>
      </main>
      {/* 🤖 ARIA — Gemini AI Assistant (persists across all pages) */}
      <GeminiAssistant />
    </div>
  )
}

