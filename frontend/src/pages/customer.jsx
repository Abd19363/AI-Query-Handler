import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { customerSubmitQuery, customerGetQuery, customerListQueries } from '../lib/api';

const STATUS_META = {
  pending_review: { label: 'Pending Review', color: '#F59E0B', icon: '⏳' },
  ai_processed:   { label: 'AI Processed',   color: '#6366F1', icon: '🤖' },
  answered:        { label: 'Answered',        color: '#10B981', icon: '✅' },
};

function QueryCard({ q, isNew }) {
  const meta = STATUS_META[q.status] || STATUS_META.pending_review;
  return (
    <div className={`cq-card ${isNew ? 'cq-card-new' : ''}`}>
      <div className="cq-card-top">
        <span className="cq-card-id">#{q.id}</span>
        <span className="cq-status-pill" style={{ color: meta.color, borderColor: `${meta.color}44`, background: `${meta.color}12` }}>
          {meta.icon} {meta.label}
        </span>
      </div>
      <p className="cq-card-query">"{q.original_query}"</p>
      {q.answer && (
        <div className="cq-answer-box">
          <div className="cq-answer-label">💬 Shopkeeper's Answer</div>
          <p className="cq-answer-text">{q.answer}</p>
        </div>
      )}
      {!q.answer && q.status !== 'answered' && (
        <p className="cq-waiting">Your question is with our shopkeeper — we'll get back to you shortly!</p>
      )}
      <div className="cq-card-time">
        {new Date(q.submitted_at).toLocaleString()}
      </div>
    </div>
  );
}

export default function CustomerPortal() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState('');
  const [nameSubmitted, setNameSubmitted] = useState(false);
  const [query, setQuery] = useState('');
  const [queries, setQueries] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newId, setNewId] = useState(null);
  const [lastSubmitted, setLastSubmitted] = useState('');
  const pollRef = useRef(null);

  const queriesRef = useRef([]);
  queriesRef.current = queries;

  // Load existing queries for this customer
  const loadQueries = useCallback(async (name) => {
    try {
      const data = await customerListQueries(name);
      setQueries(data);
    } catch (e) {
      // silent
    }
  }, []);

  // Poll pending/ai_processed queries for status updates
  const pollPending = useCallback(async () => {
    const toUpdate = queriesRef.current.filter(q => q.status !== 'answered');
    if (toUpdate.length === 0) return;
    try {
      const results = await Promise.all(
        toUpdate.map(q => customerGetQuery(q.id).catch(() => null))
      );
      setQueries(current => current.map(q => {
        const updated = results.find(r => r && r.id === q.id);
        return updated ? { ...q, ...updated } : q;
      }));
    } catch (e) {
      // silent
    }
  }, []);

  useEffect(() => {
    if (!nameSubmitted) return;
    loadQueries(customerName);
    pollRef.current = setInterval(pollPending, 4000);
    return () => clearInterval(pollRef.current);
  }, [nameSubmitted, customerName, loadQueries, pollPending]);

  const handleSubmitName = (e) => {
    e.preventDefault();
    if (!customerName.trim()) return;
    setNameSubmitted(true);
  };

  const handleSubmitQuery = async (e) => {
    e.preventDefault();
    const queryText = query.trim();
    if (!queryText || submitting) return;
    if (queryText === lastSubmitted) return;
    setError('');
    setSubmitting(true);
    try {
      const result = await customerSubmitQuery(queryText, customerName);
      setNewId(result.id);
      setLastSubmitted(queryText);
      // Query text remains in the input box; button is disabled until user changes it
      setQueries(prev => [result, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isQueryUnchanged = Boolean(lastSubmitted && query.trim() === lastSubmitted);
  const isSubmitDisabled = submitting || !query.trim() || isQueryUnchanged;

  // --- Name entry screen ---
  if (!nameSubmitted) {
    return (
      <>
        <Head>
          <title>Customer Portal — ToyStore AI Support</title>
          <meta name="description" content="Submit your toy store questions and get answers from our shopkeeper." />
        </Head>
        <div className="portal-page">
          <div className="portal-header">
            <button className="back-btn" onClick={() => router.push('/')}>← Back</button>
            <div className="portal-brand">
              <span className="portal-brand-icon">🛍️</span>
              <div>
                <div className="portal-brand-name">Customer Portal</div>
                <div className="portal-brand-sub">ToyStore AI Support</div>
              </div>
            </div>
          </div>

          <div className="name-entry-wrap">
            <div className="name-entry-card glass-panel">
              <div className="name-entry-icon">👋</div>
              <h2 className="name-entry-title">Welcome!</h2>
              <p className="name-entry-sub">Enter your name so we can personalise your experience and track your questions.</p>
              <form onSubmit={handleSubmitName} className="name-entry-form">
                <input
                  id="input-customer-name"
                  className="query-input-text"
                  type="text"
                  placeholder="Your name (e.g. Sarah)"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  autoFocus
                />
                <button id="btn-continue-customer" className="btn-primary" type="submit" disabled={!customerName.trim()}>
                  Continue →
                </button>
              </form>
            </div>
          </div>
        </div>
        <PortalStyles role="customer" />
      </>
    );
  }

  // --- Main customer portal ---
  return (
    <>
      <Head>
        <title>Customer Portal — ToyStore AI Support</title>
        <meta name="description" content="Submit your toy store questions and get answers from our shopkeeper." />
      </Head>
      <div className="portal-page">
        {/* Header */}
        <div className="portal-header glass-panel">
          <button className="back-btn" onClick={() => router.push('/')}>← Home</button>
          <div className="portal-brand">
            <span className="portal-brand-icon">🛍️</span>
            <div>
              <div className="portal-brand-name">Customer Portal</div>
              <div className="portal-brand-sub">Hello, <strong>{customerName}</strong>!</div>
            </div>
          </div>
          <div className="header-meta">
            <span className="status-pill">
              <span className="status-indicator" />
              Live
            </span>
          </div>
        </div>

        {/* Submit query box */}
        <div className="portal-section glass-panel">
          <h2 className="section-title">🧸 Ask a Question</h2>
          <p className="section-sub">Ask about toys, prices, availability, warranties, or orders — our shopkeeper will respond!</p>
          <form onSubmit={handleSubmitQuery}>
            <textarea
              id="customer-query-input"
              className="query-textarea"
              placeholder="e.g. Do you have LEGO sets for ages 6-8? What's the price range?"
              value={query}
              onChange={e => setQuery(e.target.value)}
              rows={4}
            />
            {error && <div className="error-banner">⚠️ {error}</div>}
            <div className="action-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="char-count">{query.length}/5000</div>
                {query && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.78rem' }}
                    onClick={() => {
                      setQuery('');
                      setLastSubmitted('');
                    }}
                    title="Clear input box"
                  >
                    Clear
                  </button>
                )}
              </div>
              <button
                id="btn-submit-customer-query"
                className="btn-primary"
                type="submit"
                disabled={isSubmitDisabled}
                title={isQueryUnchanged ? "This query was already sent. Modify text to submit again." : ""}
              >
                {submitting ? (
                  <><span className="spinner" /> Sending…</>
                ) : isQueryUnchanged ? (
                  <>✅ Submitted (Modify to send another)</>
                ) : (
                  <>📨 Send to Shopkeeper</>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Queries list */}
        <div className="portal-section glass-panel">
          <div className="section-header-row">
            <h2 className="section-title">📋 My Questions</h2>
            <span className="count-badge">{queries.length}</span>
          </div>
          {queries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">💬</div>
              <p>You haven't asked anything yet. Send your first question above!</p>
            </div>
          ) : (
            <div className="cq-list">
              {queries.map(q => (
                <QueryCard key={q.id} q={q} isNew={q.id === newId} />
              ))}
            </div>
          )}
        </div>
      </div>
      <PortalStyles role="customer" />
    </>
  );
}

function PortalStyles({ role }) {
  const accentColor = role === 'customer' ? '#6366F1' : '#06B6D4';
  const accentGlow  = role === 'customer' ? 'rgba(99,102,241,0.3)' : 'rgba(6,182,212,0.3)';

  return (
    <style jsx global>{`
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

      .portal-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }
      .portal-brand-icon { font-size: 1.8rem; }
      .portal-brand-name { font-weight: 700; font-size: 1rem; color: var(--text-main); }
      .portal-brand-sub  { font-size: 0.8rem; color: var(--text-muted); }

      .portal-section { padding: 24px; }

      .section-title { font-size: 1.1rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px; }
      .section-sub   { font-size: 0.87rem; color: var(--text-muted); margin-bottom: 18px; line-height: 1.5; }

      .section-header-row {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
      }

      .count-badge {
        background: ${accentColor}22;
        color: ${accentColor};
        border: 1px solid ${accentColor}44;
        border-radius: 9999px;
        font-size: 0.78rem;
        font-weight: 700;
        padding: 2px 10px;
      }

      .char-count { font-size: 0.78rem; color: var(--text-dim); }

      .error-banner {
        background: rgba(244,63,94,0.1);
        border: 1px solid rgba(244,63,94,0.3);
        color: #FB7185;
        padding: 10px 14px;
        border-radius: var(--radius-sm);
        font-size: 0.87rem;
        margin: 12px 0;
      }

      .spinner {
        display: inline-block;
        width: 14px; height: 14px;
        border: 2px solid rgba(255,255,255,0.3);
        border-top-color: #fff;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
      }
      @keyframes spin { to { transform: rotate(360deg); } }

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

      .cq-list { display: flex; flex-direction: column; gap: 14px; }

      .cq-card {
        background: rgba(0,0,0,0.2);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        padding: 16px 18px;
        transition: border-color 0.2s;
      }
      .cq-card-new {
        border-color: ${accentColor}60;
        box-shadow: 0 0 20px ${accentGlow};
        animation: cardPop 0.5s cubic-bezier(0.16,1,0.3,1);
      }
      @keyframes cardPop {
        0% { transform: scale(0.97); opacity: 0.6; }
        100% { transform: scale(1); opacity: 1; }
      }

      .cq-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      .cq-card-id { font-size: 0.75rem; color: var(--text-dim); font-family: var(--font-mono); }
      .cq-status-pill {
        font-size: 0.75rem;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 9999px;
        border: 1px solid;
      }
      .cq-card-query {
        font-size: 0.92rem;
        color: var(--text-main);
        font-style: italic;
        margin-bottom: 12px;
        line-height: 1.5;
      }
      .cq-answer-box {
        background: rgba(16,185,129,0.06);
        border: 1px solid rgba(16,185,129,0.2);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        margin-bottom: 10px;
      }
      .cq-answer-label { font-size: 0.75rem; font-weight: 700; color: #34D399; margin-bottom: 6px; letter-spacing: 0.04em; }
      .cq-answer-text  { font-size: 0.9rem; color: #E2E8F0; line-height: 1.6; }
      .cq-waiting      { font-size: 0.83rem; color: var(--text-dim); margin-bottom: 10px; font-style: italic; }
      .cq-card-time    { font-size: 0.74rem; color: var(--text-dim); }

      /* Name entry */
      .name-entry-wrap {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 60vh;
      }
      .name-entry-card {
        max-width: 460px;
        width: 100%;
        padding: 36px 32px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        text-align: center;
      }
      .name-entry-icon  { font-size: 2.8rem; }
      .name-entry-title { font-size: 1.6rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.02em; }
      .name-entry-sub   { font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; }
      .name-entry-form  { display: flex; flex-direction: column; gap: 12px; width: 100%; }
    `}</style>
  );
}
