import { Routes, Route, Navigate } from 'react-router-dom'
import { RefreshProvider } from './hooks/use-refresh'
import { PageShell } from './components/layout/page-shell'
import { OverviewPage } from './pages/overview-page'
import { ChainStatusPage } from './pages/chain-status-page'
import { AnalyticsPage } from './pages/analytics-page'
import { ChangeHistoryPage } from './pages/change-history-page'
import { FeatureProgressPage } from './pages/feature-progress-page'
import { ErrorBoundary } from './components/error-boundary'

export function App() {
  return (
    <RefreshProvider>
      <PageShell>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/chain" element={<ChainStatusPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/changes" element={<ChangeHistoryPage />} />
            <Route path="/features" element={<FeatureProgressPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </PageShell>
    </RefreshProvider>
  )
}
