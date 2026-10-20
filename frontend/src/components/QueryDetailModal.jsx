import React from 'react';
import { X, Layers, Clock, Zap, History, Bot, Sparkles } from 'lucide-react';

export default function QueryDetailModal({ item, onClose }) {
  if (!item) return null;

  const isReused = item.response_source === 'reused_knowledge';

  return (
    <div className="modal-overlay" onClick={onClose} id="query-detail-modal">
      <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={18} color="#6366F1" />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Query Log Inspection #{item.id}</h3>
          </div>
          <button className="close-btn" onClick={onClose} id="btn-close-query-modal">
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Original Query */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
              Original Query:
            </div>
            <div style={{
              padding: '12px 14px',
              background: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: 'var(--text-main)',
              lineHeight: 1.5,
              borderLeft: '3px solid var(--primary)'
            }}>
              "{item.original_query}"
            </div>
          </div>

          {/* Canonical Normalized Query */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px', fontWeight: 600 }}>
              Normalized Canonical Form:
            </div>
            <div style={{
              padding: '10px 12px',
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: '8px',
              fontSize: '0.82rem',
              fontFamily: 'var(--font-mono)',
              color: '#94A3B8'
            }}>
              {item.normalized_query}
            </div>
          </div>

          {/* Metadata Badges */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            padding: '14px',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Submission Source</span>
              <strong style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>{item.source}</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Embedding Cache</span>
              <strong style={{ fontSize: '0.85rem', color: item.embedding_cache_hit ? '#10B981' : '#F59E0B' }}>
                {item.embedding_cache_hit ? 'HIT (Reused)' : 'MISS (Generated)'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Answer Source</span>
              <strong style={{ fontSize: '0.85rem', color: isReused ? '#10B981' : '#6366F1' }}>
                {isReused ? 'Reused History' : 'Generative AI'}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Processing Latency</span>
              <strong style={{ fontSize: '0.85rem', color: '#A5B4FC' }}>{item.processing_time_ms}ms</strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'block' }}>Semantic Match</span>
              <strong style={{ fontSize: '0.85rem', color: item.similarity_score ? '#10B981' : 'var(--text-dim)' }}>
                {item.similarity_score ? (item.similarity_score * 100).toFixed(1) + '%' : 'N/A'}
              </strong>
            </div>
          </div>

          {/* Answer Content */}
          <div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px', fontWeight: 600 }}>
              System Response:
            </div>
            <div style={{
              padding: '16px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              fontSize: '0.88rem',
              color: '#E2E8F0',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              maxHeight: '260px',
              overflowY: 'auto'
            }}>
              {item.answer || 'No answer recorded'}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
