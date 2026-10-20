import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../components/Header';
import MetricsGrid from '../components/MetricsGrid';
import PipelineVisualizer from '../components/PipelineVisualizer';
import ResponseDisplay from '../components/ResponseDisplay';
import QueryHistory from '../components/QueryHistory';
import { fetchHealth, fetchMetrics, fetchHistory } from '../lib/api';

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [health, setHealth] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [history, setHistory] = useState([]);
  const [activeResult, setActiveResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [hl, mt, hs] = await Promise.all([
        fetchHealth().catch(() => null),
        fetchMetrics().catch(() => null),
        fetchHistory(30, 0).catch(() => []),
      ]);
      if (hl) setHealth(hl);
      if (mt) setMetrics(mt);
      if (Array.isArray(hs)) {
        setHistory(hs);
        // Automatically set first query if none selected
        setActiveResult(prev => prev || (hs.length > 0 ? hs[0] : null));
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <>
      <Head>
        <title>Deep Pipeline Analytics — ToyStore AI Support</title>
        <meta name="description" content="7-Step AI Pipeline visualizer, real-time pgvector cache metrics, and query audit log." />
      </Head>

      <main className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Navigation Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              onClick={() => router.push('/')}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              ← Portals
            </button>
            <button
              className="btn-secondary"
              onClick={() => router.push('/admin')}
              style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            >
              🏪 Shopkeeper Queue
            </button>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            System Architecture · pgvector & Semantic Embedding Cache
          </span>
        </div>

        <Header health={health} onRefresh={loadData} loading={isLoading} />

        <div style={{ marginTop: '20px' }}>
          <MetricsGrid metrics={metrics} />
        </div>

        <div className="main-content-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)',
          gap: '24px',
          marginTop: '28px'
        }}>
          <div className="left-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {activeResult ? (
              <ResponseDisplay result={activeResult} />
            ) : (
              <div className="glass-panel" style={{
                padding: '32px 20px',
                textAlign: 'center',
                color: 'var(--text-dim)',
                fontSize: '0.88rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span style={{ fontSize: '2rem' }}>🔍</span>
                <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>No Query Selected</strong>
                <span>Click &quot;Inspect&quot; on any query in the Audit Log below to view its response and cache details.</span>
              </div>
            )}
          </div>

          <div className="right-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <PipelineVisualizer metadata={activeResult?.metadata} />
          </div>
        </div>

        <QueryHistory history={history} onSelectQuery={(item) => setActiveResult(item)} />
      </main>

      <style jsx global>{`
        @media (max-width: 900px) {
          .main-content-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
