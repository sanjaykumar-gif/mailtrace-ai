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
          <Route path="/scan" element={<HomeScanner />} />
          <Route path="/analyze" element={<HomeScanner />} />
          <Route path="/verify" element={<HomeScanner />} />
          <Route path="/upload" element={<HomeScanner />} />

          {/* SOC Executive Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />

          {/* GeoTrace & Origin Tracing */}
          <Route path="/geotrace" element={<GeoTraceView />} />
          <Route path="/geotrace/:id" element={<GeoTraceView />} />
          <Route path="/trace" element={<GeoTraceView />} />

          {/* Incidents & Security Policies */}
          <Route path="/incidents" element={<PolicyIncidents />} />
          <Route path="/incidents/:id" element={<PolicyIncidents />} />
          <Route path="/policies" element={<PolicyIncidents />} />
          <Route path="/policy/:id" element={<PolicyIncidents />} />

          {/* Live Ingestion Sentinel */}
          <Route path="/live" element={<LiveMonitor />} />
          <Route path="/monitor" element={<LiveMonitor />} />

          {/* Deep Inspection Result & Report */}
          <Route path="/result/:id" element={<Result />} />
          <Route path="/analysis/:id" element={<Result />} />
          <Route path="/report/:id" element={<Result />} />

          {/* Forensics Lab */}
          <Route path="/forensics" element={<Forensics />} />
          <Route path="/forensics/:id" element={<Forensics />} />

          {/* Attack DNA & Campaign Correlation */}
          <Route path="/attack-dna" element={<AttackDNA />} />
          <Route path="/attack-dna/:id" element={<AttackDNA />} />
          <Route path="/dna" element={<AttackDNA />} />
          <Route path="/dna/:id" element={<AttackDNA />} />
          <Route path="/campaign/:id" element={<AttackDNA />} />
          <Route path="/campaigns/:id" element={<AttackDNA />} />

          {/* Blockchain Forensic Ledger */}
          <Route path="/ledger" element={<LedgerExplorer />} />
          <Route path="/ledger/:id" element={<LedgerExplorer />} />
          <Route path="/blockchain" element={<LedgerExplorer />} />

          {/* Audit History */}
          <Route path="/history" element={<History />} />
          <Route path="/audit" element={<History />} />

          {/* Authentication & User Roles */}
          <Route path="/login" element={<Auth />} />
          <Route path="/signup" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />

          {/* Wildcard Fallback */}
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </main>
      {/* 🤖 ARIA — Gemini AI Assistant (persists across all pages) */}
      <GeminiAssistant />
    </div>
  )
}
