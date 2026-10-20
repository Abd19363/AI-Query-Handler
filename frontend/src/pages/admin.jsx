import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { adminListQueries, adminProcessQuery, adminSendAnswer, adminDeleteQuery, adminClearAllQueries } from '../lib/api';

const STATUS_META = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  ai_processed:   { label: 'AI Processed',   color: '#6366F1', bg: 'rgba(99,102,241,0.12)', icon: '🤖' },
  answered:        { label: 'Answered',        color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
};

function PipelineMeta({ meta }) {
  if (!meta) return null;
  return (
    <div className="adm-pipeline-meta">
      <div className="adm-meta-title">🔬 AI Pipeline Details</div>
      <div className="adm-meta-grid">
        <div className="adm-meta-item">
          <span className="adm-meta-label">Embedding Cache</span>
          <span className={`adm-meta-val ${meta.embedding_cache_hit ? 'hit' : 'miss'}`}>
            {meta.embedding_cache_hit ? '✅ HIT' : '❌ MISS'}
          </span>
        </div>
        <div className="adm-meta-item">
          <span className="adm-meta-label">Answer Reused</span>
          <span className={`adm-meta-val ${meta.answer_reused ? 'hit' : 'miss'}`}>
            {meta.answer_reused ? '✅ Yes' : '❌ No (LLM used)'}
          </span>
        </div>
        {meta.similarity_score != null && (
          <div className="adm-meta-item">
            <span className="adm-meta-label">Similarity Score</span>
            <span className="adm-meta-val">{(meta.similarity_score * 100).toFixed(1)}%</span>
          </div>
        )}
        <div className="adm-meta-item">
          <span className="adm-meta-label">Processing Time</span>
          <span className="adm-meta-val">{meta.processing_time_ms} ms</span>
        </div>
      </div>
      {Array.isArray(meta.processing_path) && (
        <div className="adm-pipeline-path">
          {meta.processing_path.map((step, i) => (
            <div key={i} className="adm-pipeline-step">
              <span className="adm-step-num">{i + 1}</span>
              <span>{step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QueryRow({ q, onProcess, onSendSuccess, onDelete, onExpand, expanded }) {
  const meta = STATUS_META[q.status] || STATUS_META.pending_review;
  return (
    <div className={`adm-row glass-panel ${expanded ? 'adm-row-expanded' : ''}`}>
      <div className="adm-row-top" onClick={onExpand} style={{ cursor: 'pointer' }}>
        <div className="adm-row-left">
          <span className="adm-row-id">#{q.id}</span>
          <span className="adm-customer-tag">
            👤 {q.customer_name || 'Customer'}
          </span>
          <span
            className="adm-status-pill"
            style={{ color: meta.color, background: meta.bg, borderColor: `${meta.color}44` }}
          >
            {meta.icon} {meta.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="adm-row-time">{new Date(q.submitted_at).toLocaleString()}</div>
          <button
            className="adm-row-del-btn"
            title="Delete this query from queue"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(q.id);
            }}
          >
            ✕
          </button>
          <div className="adm-expand-icon">{expanded ? '▲' : '▼'}</div>
        </div>
      </div>

      <div className="adm-row-query">
        <span className="adm-q-label">Customer Query:</span>
        <span className="adm-q-text">"{q.original_query}"</span>
      </div>

      {expanded && (
        <div className="adm-row-detail">
          {/* AI Suggested answer */}
          {q.ai_answer && (
            <div className="adm-ai-box" style={{
              background: q._meta?.answer_reused ? 'rgba(16,185,129,0.08)' : 'rgba(99,102,241,0.07)',
              borderColor: q._meta?.answer_reused ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.25)'
            }}>
              <div className="adm-ai-label" style={{ color: q._meta?.answer_reused ? '#34D399' : '#A5B4FC' }}>
                {q._meta?.answer_reused ? '⚡ Stored Knowledge Answer Reused (Cache Hit)' : '🤖 AI Generated Answer'}
              </div>
              <p className="adm-ai-text">{q.ai_answer}</p>
            </div>
          )}

          {/* Final answer sent to customer */}
          {q.final_answer && (
            <div className="adm-final-box">
              <div className="adm-final-label">✅ Answer Sent to Customer</div>
              <p className="adm-final-text">{q.final_answer}</p>
            </div>
          )}

          {/* Pipeline metadata */}
          {q._meta && <PipelineMeta meta={q._meta} />}

          {/* Actions */}
          <QueryActions q={q} onProcess={onProcess} onSendSuccess={onSendSuccess} onDelete={onDelete} />
        </div>
      )}
    </div>
  );
}

function QueryActions({ q, onProcess, onSendSuccess, onDelete }) {
  const [answer, setAnswer] = useState(q.ai_answer || '');
  const [sending, setSending] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(q.status === 'answered');

  // Sync answer textarea when ai_answer is updated after processing
  useEffect(() => {
    if (q.ai_answer) setAnswer(q.ai_answer);
  }, [q.ai_answer]);

  const handleProcess = async () => {
    setProcessing(true);
    setError('');
    try {
      await onProcess(q.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSend = async () => {
    const textToSend = answer.trim() || q.ai_answer;
    if (!textToSend) return;
    setSending(true);
    setError('');
    try {
      await adminSendAnswer(q.id, textToSend);
      setSent(true);
      if (onSendSuccess) {
        onSendSuccess(q.id, textToSend);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  if (sent || q.status === 'answered') {
    return (
      <div className="adm-action-done">
        ✅ Answer has been sent to the customer.
      </div>
    );
  }

  return (
    <div className="adm-actions">
      {error && <div className="error-banner">⚠️ {error}</div>}

      {/* Step 1: Process with AI */}
      {q.status === 'pending_review' && (
        <button
          id={`btn-process-${q.id}`}
          className="btn-primary adm-process-btn"
          onClick={handleProcess}
          disabled={processing}
        >
          {processing ? <><span className="spinner" /> Running AI Pipeline…</> : '🤖 Process with AI'}
        </button>
      )}

      {/* Step 2: Review & send answer */}
      {(q.status === 'ai_processed' || q.ai_answer) && (
        <div className="adm-send-section">
          <label className="input-label" htmlFor={`adm-answer-${q.id}`}>
            {q._meta?.answer_reused
              ? '⚡ Respective Stored Knowledge Answer (review or edit before sending):'
              : '✏️ Edit answer before sending to customer:'}
          </label>
          <textarea
            id={`adm-answer-${q.id}`}
            className="query-textarea"
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            rows={3}
            placeholder="Type or edit the answer to send to the customer..."
          />
          <div className="adm-send-row">
            <div className="adm-send-hint">
              {q._meta?.answer_reused
                ? '⚡ Reused from stored knowledge base. Click Send to deliver it to the customer.'
                : 'Keep the response concise — 2-3 lines max.'}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {q.ai_answer && answer !== q.ai_answer && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setAnswer(q.ai_answer)}
                  style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                  title="Reset to the exact stored answer"
                >
                  ↺ Reset to Stored
                </button>
              )}
              <button
                id={`btn-send-${q.id}`}
                className="btn-send"
                onClick={handleSend}
                disabled={sending || (!answer.trim() && !q.ai_answer)}
              >
                {sending ? <><span className="spinner" /> Sending…</> : '📨 Send to Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPortal() {
  const router = useRouter();
  const [queries, setQueries] = useState([]);
  const [filter, setFilter] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadQueries = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListQueries(filter === 'all' ? undefined : filter);
      setQueries(data);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadQueries();
    const t = setInterval(loadQueries, 8000);
    return () => clearInterval(t);
  }, [loadQueries]);

  const handleProcess = async (queryId) => {
    const result = await adminProcessQuery(queryId);
    // Merge pipeline metadata into the query row
    setQueries(prev => prev.map(q => {
      if (q.id !== queryId) return q;
      return {
        ...q,
        ai_answer: result.ai_answer,
        status: result.status,
        _meta: result.pipeline_metadata,
      };
    }));
  };

  const handleSendSuccess = (queryId, sentAnswer) => {
    setQueries(prev => prev.map(q => {
      if (q.id !== queryId) return q;
      return {
        ...q,
        status: 'answered',
        final_answer: sentAnswer,
      };
    }));
  };

  const handleDeleteQuery = async (queryId) => {
    try {
      await adminDeleteQuery(queryId);
      setQueries(prev => prev.filter(q => q.id !== queryId));
    } catch (e) {
      console.error("Failed to delete query:", e);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all customer queries from the queue?")) return;
    try {
      await adminClearAllQueries();
      setQueries([]);
    } catch (e) {
      console.error("Failed to clear queries:", e);
    }
  };

  const counts = {
    all: queries.length,
    pending_review: queries.filter(q => q.status === 'pending_review').length,
    ai_processed:   queries.filter(q => q.status === 'ai_processed').length,
    answered:        queries.filter(q => q.status === 'answered').length,
  };

  const displayed = filter === 'all' ? queries : queries.filter(q => q.status === filter);

  return (
    <>
      <Head>
        <title>Shopkeeper Portal — ToyStore AI Support</title>
        <meta name="description" content="Admin panel for reviewing customer queries, running AI analysis, and sending answers." />
      </Head>

      <div className="portal-page adm-page">
        {/* Header */}
        <div className="portal-header glass-panel">
          <button className="back-btn" onClick={() => router.push('/')}>← Home</button>
          <div className="portal-brand">
            <span className="portal-brand-icon">🏪</span>
            <div>
              <div className="portal-brand-name">Shopkeeper Portal</div>
              <div className="portal-brand-sub">AI-Assisted Customer Response System</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {queries.length > 0 && (
              <button
                id="btn-admin-clear"
                className="btn-secondary"
                onClick={handleClearAll}
                title="Clear all queries from the queue"
                style={{ padding: '7px 12px', fontSize: '0.82rem', color: '#FDA4AF', borderColor: 'rgba(244,63,94,0.3)' }}
              >
                🗑️ Clear Queue
              </button>
            )}
            <button
              id="btn-nav-dashboard"
              className="btn-secondary"
              onClick={() => router.push('/dashboard')}
              title="View 7-Step AI Pipeline & pgvector Metrics"
              style={{ padding: '7px 12px', fontSize: '0.82rem' }}
            >
              📊 Pipeline Deep-Dive
            </button>
            <button
              id="btn-admin-refresh"
              className="btn-secondary"
              onClick={loadQueries}
              disabled={loading}
              style={{ padding: '7px 12px', fontSize: '0.82rem' }}
            >
              {loading ? '↻ Loading…' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="glass-panel adm-filter-bar">
          {[
            { key: 'all',            label: '📋 All',          count: counts.all },
            { key: 'pending_review', label: '⏳ Pending',       count: counts.pending_review },
            { key: 'ai_processed',   label: '🤖 AI Processed',  count: counts.ai_processed },
            { key: 'answered',       label: '✅ Answered',      count: counts.answered },
          ].map(f => (
            <button
              key={f.key}
              id={`btn-filter-${f.key}`}
              className={`tab-btn ${filter === f.key ? 'active' : ''}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
              <span className="adm-filter-count">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Query list */}
        <div className="adm-list">
          {displayed.length === 0 && !loading && (
            <div className="empty-state glass-panel">
              <div className="empty-icon">📭</div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-main)', margin: '4px 0' }}>
                No Customer Inquiries
              </h3>
              <p style={{ maxWidth: '460px', lineHeight: 1.6, color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                {filter === 'all'
                  ? 'The customer query queue is clean. When customers submit toy questions through the Customer Portal, they will appear here in real time for AI analysis and shopkeeper response.'
                  : `No queries currently matching status "${filter}".`}
              </p>
            </div>
          )}
          {displayed.map(q => (
            <QueryRow
              key={q.id}
              q={q}
              expanded={expandedId === q.id}
              onExpand={() => setExpandedId(prev => prev === q.id ? null : q.id)}
              onProcess={handleProcess}
              onSendSuccess={handleSendSuccess}
              onDelete={handleDeleteQuery}
            />
          ))}
        </div>
      </div>

      <style jsx global>{`
        .adm-page { max-width: 1000px; }

        .adm-filter-bar {
          display: flex;
          gap: 8px;
          padding: 14px 20px;
          flex-wrap: wrap;
        }

        .adm-filter-count {
          background: rgba(255,255,255,0.08);
          border-radius: 9999px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 7px;
          margin-left: 4px;
        }

        .adm-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .adm-row {
          padding: 16px 20px;
          transition: border-color 0.2s;
        }
        .adm-row-expanded {
          border-color: rgba(99,102,241,0.4);
          box-shadow: 0 4px 24px rgba(99,102,241,0.12);
        }

        .adm-row-top {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }

        .adm-row-left {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          flex-wrap: wrap;
        }

        .adm-row-id {
          font-family: var(--font-mono);
          font-size: 0.75rem;
          color: var(--text-dim);
        }

        .adm-customer-tag {
          font-size: 0.8rem;
          color: var(--text-muted);
          background: rgba(255,255,255,0.04);
          padding: 3px 10px;
          border-radius: 9999px;
          border: 1px solid var(--border-subtle);
        }

        .adm-status-pill {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 9999px;
          border: 1px solid;
        }

        .adm-row-time {
          font-size: 0.75rem;
          color: var(--text-dim);
          white-space: nowrap;
        }

        .adm-expand-icon {
          font-size: 0.75rem;
          color: var(--text-dim);
          margin-left: 6px;
        }

        .adm-row-query {
          font-size: 0.88rem;
          margin-bottom: 6px;
          line-height: 1.5;
        }
        .adm-q-label { color: var(--text-dim); font-size: 0.75rem; margin-right: 6px; }
        .adm-q-text  { color: var(--text-main); font-style: italic; }

        .adm-row-detail {
          margin-top: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .adm-ai-box {
          background: rgba(99,102,241,0.07);
          border: 1px solid rgba(99,102,241,0.25);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }
        .adm-ai-label { font-size: 0.75rem; font-weight: 700; color: #A5B4FC; margin-bottom: 6px; }
        .adm-ai-text  { font-size: 0.9rem; color: #E2E8F0; line-height: 1.6; }

        .adm-final-box {
          background: rgba(16,185,129,0.07);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: var(--radius-sm);
          padding: 12px 14px;
        }
        .adm-final-label { font-size: 0.75rem; font-weight: 700; color: #34D399; margin-bottom: 6px; }
        .adm-final-text  { font-size: 0.9rem; color: #E2E8F0; line-height: 1.6; }

        .adm-pipeline-meta {
          background: rgba(0,0,0,0.25);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 14px 16px;
        }
        .adm-meta-title {
          font-size: 0.78rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 10px;
        }
        .adm-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 10px;
          margin-bottom: 12px;
        }
        .adm-meta-item { display: flex; flex-direction: column; gap: 3px; }
        .adm-meta-label { font-size: 0.73rem; color: var(--text-dim); }
        .adm-meta-val { font-size: 0.82rem; font-weight: 600; color: var(--text-muted); }
        .adm-meta-val.hit  { color: #34D399; }
        .adm-meta-val.miss { color: #FB7185; }

        .adm-pipeline-path {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .adm-pipeline-step {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 0.79rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .adm-step-num {
          background: rgba(99,102,241,0.2);
          color: #A5B4FC;
          border-radius: 50%;
          width: 18px; height: 18px;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.65rem;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .adm-actions { display: flex; flex-direction: column; gap: 12px; }

        .adm-process-btn { align-self: flex-start; }

        .adm-send-section { display: flex; flex-direction: column; gap: 10px; }
        .adm-send-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .adm-send-hint { font-size: 0.78rem; color: var(--text-dim); }

        .btn-send {
          background: linear-gradient(135deg, #10B981, #059669);
          color: #FFF;
          border: none;
          padding: 10px 22px;
          border-radius: var(--radius-md);
          font-family: var(--font-main);
          font-size: 0.88rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 16px rgba(16,185,129,0.25);
          transition: all 0.2s ease;
        }
        .btn-send:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(16,185,129,0.4);
        }
        .btn-send:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .adm-action-done {
          font-size: 0.88rem;
          color: #34D399;
          padding: 10px 14px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: var(--radius-sm);
        }

        /* Shared styles needed by this page */
        .portal-page {
          max-width: 860px;
          margin: 0 auto;
          padding: 24px 20px 60px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .portal-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px 20px;
        }
        .back-btn {
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
          padding: 7px 14px;
          border-radius: var(--radius-sm);
          font-family: var(--font-main);
          font-size: 0.84rem;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .back-btn:hover { background: rgba(255,255,255,0.09); color: var(--text-main); }
        .portal-brand { display: flex; align-items: center; gap: 12px; flex: 1; }
        .portal-brand-icon { font-size: 1.8rem; }
        .portal-brand-name { font-weight: 700; font-size: 1rem; color: var(--text-main); }
        .portal-brand-sub  { font-size: 0.8rem; color: var(--text-muted); }
        .spinner {
          display: inline-block;
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .error-banner {
          background: rgba(244,63,94,0.1);
          border: 1px solid rgba(244,63,94,0.3);
          color: #FB7185;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          font-size: 0.87rem;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 40px 20px;
          color: var(--text-dim);
          font-size: 0.9rem;
          text-align: center;
        }
        .empty-icon { font-size: 2.5rem; }
        .adm-row-del-btn {
          background: rgba(244,63,94,0.08);
          border: 1px solid rgba(244,63,94,0.25);
          color: #FB7185;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.72rem;
          cursor: pointer;
          transition: all 0.2s ease;
          padding: 0;
        }
        .adm-row-del-btn:hover {
          background: rgba(244,63,94,0.25);
          color: #FFF;
          transform: scale(1.1);
        }
      `}</style>
    </>
  );
}
