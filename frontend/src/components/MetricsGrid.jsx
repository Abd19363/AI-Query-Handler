import React from 'react';
import { Activity, Zap, RotateCcw, Layers, Sparkles, Clock } from 'lucide-react';

export default function MetricsGrid({ metrics }) {
  const cards = [
    {
      id: 'metric-card-total-queries',
      title: 'Total Queries',
      value: metrics ? metrics.total_queries?.toLocaleString() ?? '0' : '0',
      sub: metrics ? (
        <><strong>{metrics.total_queries ?? 0}</strong> queries processed</>
      ) : (
        <>Live query counter</>
      ),
      icon: Activity,
      accent: '#6366F1'
    },
    {
      id: 'metric-card-embedding-cache',
      title: 'Embedding Cache Hit',
      value: `${metrics?.embedding_cache_hit_rate_pct ?? 0}%`,
      sub: metrics ? (
        <><strong>{metrics.embedding_cache_hits ?? 0}</strong> hits / {metrics.embedding_cache_misses ?? 0} misses</>
      ) : (
        <>Hits vs misses</>
      ),
      icon: Zap,
      accent: '#10B981'
    },
    {
      id: 'metric-card-answer-reuse',
      title: 'Answer Reuse Rate',
      value: `${metrics?.answer_cache_hit_rate_pct ?? 0}%`,
      sub: metrics ? (
        <><strong>{metrics.answer_cache_hits ?? 0}</strong> reused answers</>
      ) : (
        <>Cached responses</>
      ),
      icon: RotateCcw,
      accent: '#06B6D4'
    },
    {
      id: 'metric-card-embedding-calls',
      title: 'Embedding API Calls',
      value: metrics ? metrics.embedding_api_calls?.toLocaleString() ?? '0' : '0',
      sub: metrics ? (
        <>Remote vector requests</>
      ) : (
        <>Invocations count</>
      ),
      icon: Layers,
      accent: '#F59E0B'
    },
    {
      id: 'metric-card-llm-calls',
      title: 'Generative Calls',
      value: metrics ? metrics.llm_api_calls?.toLocaleString() ?? '0' : '0',
      sub: metrics ? (
        <>AI completions generated</>
      ) : (
        <>Completions count</>
      ),
      icon: Sparkles,
      accent: '#EC4899'
    },
    {
      id: 'metric-card-latency',
      title: 'Avg Latency',
      value: `${metrics?.avg_processing_time_ms ?? 0}ms`,
      sub: metrics ? (
        <>End-to-end execution</>
      ) : (
        <>Response duration</>
      ),
      icon: Clock,
      accent: '#8B5CF6'
    }
  ];

  return (
    <div className="metrics-grid" id="operational-metrics-dashboard">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <div
            key={c.id}
            id={c.id}
            className="metric-card glass-panel"
            style={{ '--card-accent': c.accent }}
          >
            <div className="metric-header">
              <span className="metric-title">{c.title}</span>
              <div className="metric-icon-box">
                <IconComponent size={18} />
              </div>
            </div>
            <div className="metric-value">{c.value}</div>
            <div className="metric-sub">{c.sub}</div>
          </div>
        );
      })}
    </div>
  );
}
