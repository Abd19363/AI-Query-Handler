import React from 'react';
import { CheckCircle2, AlertTriangle, Zap, Database, GitBranch, Cpu, Clock } from 'lucide-react';

export default function PipelineVisualizer({ metadata }) {
  if (!metadata) {
    return (
      <div className="pipeline-box glass-panel" id="pipeline-visualizer-box">
        <div className="pipeline-header">
          <span className="pipeline-title">
            <GitBranch size={16} color="#6366F1" />
            7-Step Pipeline Execution Visualizer
          </span>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Awaiting Query</span>
        </div>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-dim)', textAlign: 'center', padding: '20px 0' }}>
          Submit a query above to see real-time pipeline execution, cache inspection, and vector similarity steps.
        </p>
      </div>
    );
  }

  const {
    source,
    embedding_cache_hit,
    embedding_api_called,
    answer_reused,
    llm_api_called,
    processing_time_ms,
    similarity_score,
    similarity_threshold,
    retrieved_records_count,
    processing_path
  } = metadata;

  return (
    <div className="pipeline-box glass-panel" id="pipeline-visualizer-box">
      <div className="pipeline-header">
        <span className="pipeline-title">
          <GitBranch size={16} color="#6366F1" />
          7-Step Pipeline Execution Path
        </span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span className="status-pill" style={{ color: '#A5B4FC' }}>
            <Clock size={12} />
            {processing_time_ms}ms
          </span>
          <span className={`status-pill ${embedding_cache_hit ? 'hit' : 'miss'}`} style={{
            background: embedding_cache_hit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
            color: embedding_cache_hit ? '#34D399' : '#FBBF24',
            borderColor: embedding_cache_hit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
          }}>
            {embedding_cache_hit ? 'Embedding Cache HIT' : 'Embedding Cache MISS'}
          </span>
        </div>
      </div>

      <div className="pipeline-steps-list">
        {processing_path && processing_path.map((step, idx) => {
          let isHit = step.includes('HIT') || step.includes('Reused historical answer');
          let isMiss = step.includes('MISS');
          let className = 'pipeline-step-item';
          if (isHit) className += ' hit';
          else if (isMiss) className += ' miss';
          else className += ' active';

          return (
            <div key={idx} className={className}>
              <div style={{ marginTop: '2px' }}>
                {isHit ? (
                  <CheckCircle2 size={15} color="#10B981" />
                ) : isMiss ? (
                  <Zap size={15} color="#F59E0B" />
                ) : (
                  <GitBranch size={15} color="#6366F1" />
                )}
              </div>
              <div>
                <span style={{ fontWeight: 500 }}>{step}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Decision Summary Banner */}
      <div style={{
        marginTop: '16px',
        padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '10px',
        fontSize: '0.78rem'
      }}>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Source: </span>
          <strong style={{ color: 'var(--text-main)' }}>{source}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Vector Candidates: </span>
          <strong style={{ color: 'var(--text-main)' }}>{retrieved_records_count}</strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>Top Similarity: </span>
          <strong style={{ color: similarity_score >= similarity_threshold ? '#10B981' : '#F59E0B' }}>
            {similarity_score ? (similarity_score * 100).toFixed(1) + '%' : 'N/A'}
          </strong>
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>LLM Invoked: </span>
          <strong style={{ color: llm_api_called ? '#EC4899' : '#10B981' }}>
            {llm_api_called ? 'Yes (Generated)' : 'No (Saved)'}
          </strong>
        </div>
      </div>
    </div>
  );
}
