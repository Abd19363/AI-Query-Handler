import React from 'react';
import { Bot, History, Sparkles, CheckCircle2, ShieldCheck, HelpCircle } from 'lucide-react';

export default function ResponseDisplay({ result }) {
  if (!result) return null;

  const { query_id, original_query, answer, response_source, metadata, submitted_at } = result;
  const isReused = response_source === 'reused_knowledge';

  return (
    <div className="response-card glass-panel" id="response-display-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className={`response-badge ${isReused ? 'badge-reused' : 'badge-generated'}`}>
            {isReused ? <History size={14} /> : <Bot size={14} />}
            <span>{isReused ? 'Reused from History' : 'LLM-Generated'}</span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
            Query #{query_id}
          </span>
        </div>

        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {new Date(submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      </div>

      <div style={{
        marginTop: '14px',
        padding: '12px 14px',
        background: 'rgba(0, 0, 0, 0.25)',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        borderLeft: '3px solid var(--primary)'
      }}>
        <strong style={{ color: '#CBD5E1' }}>User Query: </strong>
        "{original_query}"
      </div>

      {/* Formatted AI Response */}
      <div className="response-content">
        {answer}
      </div>

      {/* Audit Footnote */}
      <div className="response-meta-bar">
        <span>Source: <strong>{metadata?.source}</strong></span>
        <span>Embedding: <strong>{metadata?.embedding_cache_hit ? 'Reused (Cache Hit)' : 'Generated (Cache Miss)'}</strong></span>
        <span>LLM Invocation: <strong>{metadata?.llm_api_called ? 'Yes' : 'No (Saved)'}</strong></span>
        <span>Duration: <strong>{metadata?.processing_time_ms}ms</strong></span>
        {metadata?.similarity_score && (
          <span>Semantic Match: <strong>{(metadata.similarity_score * 100).toFixed(1)}%</strong></span>
        )}
      </div>
    </div>
  );
}
