import React, { useState } from 'react';
import { Send, Sparkles, RefreshCw, Edit3, MessageSquare } from 'lucide-react';
import { submitQuery, generateQuery } from '../lib/api';

export default function QueryHandler({ onQueryProcessed }) {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'ai_generate'
  const [manualQuery, setManualQuery] = useState('');
  const [lastSubmittedManual, setLastSubmittedManual] = useState('');
  
  // AI Generator state
  const [topic, setTopic] = useState('');
  const [generatedQuery, setGeneratedQuery] = useState('');
  const [lastSubmittedGenerated, setLastSubmittedGenerated] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Processing state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Unchanged check: query text equals the one that was already submitted
  const isManualUnchanged = Boolean(lastSubmittedManual && manualQuery.trim() === lastSubmittedManual);
  const isManualDisabled = isSubmitting || !manualQuery.trim() || isManualUnchanged;

  const isGeneratedUnchanged = Boolean(lastSubmittedGenerated && generatedQuery.trim() === lastSubmittedGenerated);
  const isGeneratedDisabled = isSubmitting || !generatedQuery.trim() || isGeneratedUnchanged;

  // Handle Manual Submit
  const handleManualSubmit = async (e) => {
    e?.preventDefault();
    const queryToSubmit = manualQuery.trim();
    if (!queryToSubmit) {
      setErrorMessage('Please enter a query before submitting.');
      return;
    }
    if (queryToSubmit === lastSubmittedManual) {
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      const result = await submitQuery(queryToSubmit, 'manual');
      setLastSubmittedManual(queryToSubmit);
      onQueryProcessed(result);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle AI Query Generation
  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const res = await generateQuery(topic.trim());
      setGeneratedQuery(res.generated_query);
      setLastSubmittedGenerated('');
    } catch (err) {
      setErrorMessage(err.message || 'Query generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle Submit of AI-Generated Query
  const handleGeneratedSubmit = async (e) => {
    e?.preventDefault();
    const queryToSubmit = generatedQuery.trim();
    if (!queryToSubmit) {
      setErrorMessage('Please generate or type a query before submitting.');
      return;
    }
    if (queryToSubmit === lastSubmittedGenerated) {
      return;
    }
    setErrorMessage('');
    setIsSubmitting(true);
    try {
      // Must pass through exactly the same pipeline
      const result = await submitQuery(queryToSubmit, 'ai_generated');
      setLastSubmittedGenerated(queryToSubmit);
      onQueryProcessed(result);
    } catch (err) {
      setErrorMessage(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="query-box glass-panel" id="query-handler-section">
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
          onClick={() => setActiveTab('manual')}
          id="tab-manual-query"
        >
          <Edit3 size={16} />
          <span>Method A: Manual Query</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'ai_generate' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai_generate')}
          id="tab-ai-generated-query"
        >
          <Sparkles size={16} color="#06B6D4" />
          <span>Method B: AI-Generated Query</span>
        </button>
      </div>

      {errorMessage && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(244, 63, 94, 0.12)',
          border: '1px solid rgba(244, 63, 94, 0.3)',
          borderRadius: '8px',
          color: '#FDA4AF',
          fontSize: '0.85rem',
          marginBottom: '16px'
        }}>
          {errorMessage}
        </div>
      )}

      {/* METHOD A: Manual Input */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualSubmit}>
          <label className="input-label" htmlFor="manual-query-input">
            Enter Customer Inquiry or Shopkeeper Question:
          </label>
          <textarea
            id="manual-query-input"
            className="query-textarea"
            placeholder="Type your question here..."
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setManualQuery('');
                setLastSubmittedManual('');
              }}
              disabled={isSubmitting || !manualQuery}
            >
              Clear
            </button>

            <button
              type="submit"
              className="btn-primary"
              disabled={isManualDisabled}
              title={isManualUnchanged ? "Query already processed. Modify the query text to submit again." : ""}
              id="btn-submit-manual-query"
            >
              {isSubmitting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
              <span>
                {isSubmitting
                  ? 'Processing Pipeline...'
                  : isManualUnchanged
                  ? 'Submitted (Modify to re-submit)'
                  : 'Submit Query'}
              </span>
            </button>
          </div>
        </form>
      )}

      {/* METHOD B: AI Generator */}
      {activeTab === 'ai_generate' && (
        <div>
          <label className="input-label" htmlFor="ai-topic-input">
            Enter Topic or Retail Scenario Context:
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              id="ai-topic-input"
              type="text"
              className="query-input-text"
              placeholder="e.g. refund request, damaged product, warranty claim..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating || isSubmitting}
            />
            <button
              type="button"
              className="btn-primary"
              onClick={handleGenerate}
              disabled={isGenerating || isSubmitting}
              style={{ height: '46px', whiteSpace: 'nowrap' }}
              id="btn-generate-ai-scenario"
            >
              {isGenerating ? <RefreshCw size={16} className="spin" /> : <Sparkles size={16} />}
              <span>{isGenerating ? 'Generating...' : 'Generate Scenario'}</span>
            </button>
          </div>

          <label className="input-label" htmlFor="editable-generated-query">
            Editable Generated Query (Review or modify before submitting):
          </label>
          <textarea
            id="editable-generated-query"
            className="query-textarea"
            placeholder="The AI will generate a realistic customer query here. You can edit it before submitting."
            value={generatedQuery}
            onChange={(e) => setGeneratedQuery(e.target.value)}
            disabled={isSubmitting}
          />

          <div className="action-row">
            <button
              type="button"
              className="btn-secondary"
              onClick={handleGenerate}
              disabled={isGenerating || isSubmitting}
            >
              <RefreshCw size={14} />
              <span>Regenerate</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleGeneratedSubmit}
              disabled={isGeneratedDisabled}
              title={isGeneratedUnchanged ? "Query already processed. Modify the query text or regenerate to submit again." : ""}
              id="btn-submit-generated-query"
            >
              {isSubmitting ? <RefreshCw size={16} className="spin" /> : <Send size={16} />}
              <span>
                {isSubmitting
                  ? 'Executing Pipeline...'
                  : isGeneratedUnchanged
                  ? 'Submitted (Modify to re-submit)'
                  : 'Submit to Pipeline'}
              </span>
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
