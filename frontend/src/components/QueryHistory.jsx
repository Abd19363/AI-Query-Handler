import React, { useState } from 'react';
import { History, Eye, CheckCircle2, Zap, RotateCcw, Sparkles } from 'lucide-react';
import QueryDetailModal from './QueryDetailModal';

export default function QueryHistory({ history, onSelectQuery }) {
  const [selectedItem, setSelectedItem] = useState(null);

  const items = Array.isArray(history) ? history : [];

  return (
    <div className="history-section glass-panel" style={{ marginTop: '28px' }} id="query-history-section">
      <div className="history-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#6366F1" />
          <h2 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Query Audit Log</h2>
        </div>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
          {items.length} live queries logged
        </span>
      </div>

      <div className="history-table-wrapper">
        <table className="history-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Query Text</th>
              <th>Source</th>
              <th>Embedding Cache</th>
              <th>Answer Source</th>
              <th>Similarity</th>
              <th>Latency</th>
              <th>Time</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-dim)' }}>
                  No queries logged yet. Submit your first query above to see real-time audit logging!
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} onClick={() => setSelectedItem(row)}>
                  <td style={{ fontWeight: 600, color: 'var(--text-dim)' }}>#{row.id}</td>
                  <td className="query-cell" title={row.original_query}>
                    {row.original_query}
                  </td>
                  <td>
                    <span className="status-pill" style={{ fontSize: '0.72rem' }}>
                      {row.source}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${row.embedding_cache_hit ? 'hit' : 'miss'}`}
                      style={{
                        fontSize: '0.72rem',
                        color: row.embedding_cache_hit ? '#34D399' : '#FBBF24',
                        background: row.embedding_cache_hit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'
                      }}
                    >
                      {row.embedding_cache_hit ? 'HIT' : 'MISS'}
                    </span>
                  </td>
                  <td>
                    <span
                      className="status-pill"
                      style={{
                        fontSize: '0.72rem',
                        color: row.response_source === 'reused_knowledge' ? '#34D399' : '#A5B4FC',
                        background: row.response_source === 'reused_knowledge' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(99, 102, 241, 0.1)'
                      }}
                    >
                      {row.response_source === 'reused_knowledge' ? 'Reused' : 'Generated'}
                    </span>
                  </td>
                  <td>
                    {row.similarity_score ? `${(row.similarity_score * 100).toFixed(1)}%` : '-'}
                  </td>
                  <td>{row.processing_time_ms}ms</td>
                  <td>
                    {row.submitted_at
                      ? new Date(row.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                      : '-'}
                  </td>
                  <td>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedItem(row);
                      }}
                    >
                      <Eye size={12} />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedItem && (
        <QueryDetailModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}
