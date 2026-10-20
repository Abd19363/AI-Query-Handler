import React from 'react';
import { RefreshCw, Sparkles } from 'lucide-react';

export default function Header({ health, onRefresh, loading }) {
  return (
    <header className="app-header glass-panel">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Sparkles size={22} color="#FFF" />
        </div>
        <div className="brand-title">
          <h1>AI Query Handler</h1>
        </div>
      </div>

      <div className="header-badges">
        <div className="status-pill" title="Database status">
          <div className="status-indicator" style={{ background: health?.database ? '#10B981' : '#F43F5E' }} />
          <span>Database: {health?.database ? 'Online' : 'Checking...'}</span>
        </div>

        <button
          className="btn-secondary"
          onClick={onRefresh}
          disabled={loading}
          title="Refresh metrics and history"
          id="btn-refresh-dashboard"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </header>
  );
}
