import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

export default function RoleSelect() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Toy Store — Choose Your Portal</title>
        <meta name="description" content="AI-powered toy store support portal. Enter as a customer to ask questions, or as admin to manage and respond." />
      </Head>

      <div className="role-select-page">
        {/* Animated background orbs */}
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />

        <div className="role-select-content">
          {/* Logo + title */}
          <div className="role-logo">
            <span className="role-logo-icon">🧸</span>
          </div>
          <h1 className="role-select-title">ToyStore AI Support</h1>
          <p className="role-select-subtitle">
            Smart, AI-powered help for every toy question
          </p>

          {/* Two portal cards */}
          <div className="role-cards">
            {/* Customer Card */}
            <button
              className="role-card role-card-customer"
              onClick={() => router.push('/customer')}
              id="btn-enter-customer"
            >
              <div className="role-card-icon">🛍️</div>
              <div className="role-card-body">
                <h2>Customer Portal</h2>
                <p>Browse toys, ask questions about products, prices, warranties, and orders. Get answers from our shopkeeper.</p>
              </div>
              <div className="role-card-arrow">→</div>
            </button>

            {/* Admin Card */}
            <button
              className="role-card role-card-admin"
              onClick={() => router.push('/admin')}
              id="btn-enter-admin"
            >
              <div className="role-card-icon">🏪</div>
              <div className="role-card-body">
                <h2>Shopkeeper Portal</h2>
                <p>Review customer inquiries, approve responses, and manage the knowledge base.</p>
              </div>
              <div className="role-card-arrow">→</div>
            </button>
          </div>

          {/* <p className="role-select-footer">
            Powered by pgvector · Semantic Embedding Cache · LLM Reasoning
          </p> */}
        </div>
      </div>

      <style jsx>{`
        .role-select-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 24px;
        }

        /* Animated glowing orbs */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
          animation: orbFloat 8s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%);
          top: -150px; left: -100px;
          animation-duration: 9s;
        }
        .orb-2 {
          width: 400px; height: 400px;
          background: radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%);
          bottom: -100px; right: -80px;
          animation-duration: 11s;
          animation-delay: -3s;
        }
        .orb-3 {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(245,158,11,0.10) 0%, transparent 70%);
          top: 40%; left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 7s;
          animation-delay: -5s;
        }
        @keyframes orbFloat {
          0% { transform: translate(0, 0); }
          100% { transform: translate(30px, 20px); }
        }

        .role-select-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 780px;
          width: 100%;
        }

        .role-logo {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #6366F1, #06B6D4);
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 40px rgba(99,102,241,0.35), 0 0 80px rgba(99,102,241,0.12);
          animation: logoPulse 3s ease-in-out infinite;
        }
        @keyframes logoPulse {
          0%, 100% { box-shadow: 0 0 40px rgba(99,102,241,0.35), 0 0 80px rgba(99,102,241,0.12); }
          50% { box-shadow: 0 0 60px rgba(99,102,241,0.5), 0 0 100px rgba(99,102,241,0.2); }
        }
        .role-logo-icon { font-size: 2.4rem; }

        .role-select-title {
          font-size: clamp(2rem, 5vw, 2.8rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          background: linear-gradient(135deg, #F8FAFC 30%, #94A3B8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-align: center;
          margin: 0;
        }

        .role-select-subtitle {
          font-size: 1.05rem;
          color: var(--text-muted);
          text-align: center;
          max-width: 500px;
          line-height: 1.65;
        }

        .role-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          width: 100%;
          margin-top: 8px;
        }

        @media (max-width: 640px) {
          .role-cards { grid-template-columns: 1fr; }
        }

        .role-card {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
          padding: 28px 24px;
          border-radius: 20px;
          border: 1px solid var(--border-subtle);
          background: var(--bg-glass);
          backdrop-filter: blur(16px);
          cursor: pointer;
          text-align: left;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          position: relative;
          overflow: hidden;
        }

        .role-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, var(--card-glow, rgba(99,102,241,0.08)), transparent 60%);
          opacity: 0;
          transition: opacity 0.3s ease;
          pointer-events: none;
        }

        .role-card:hover::before { opacity: 1; }

        .role-card:hover {
          transform: translateY(-8px);
          border-color: var(--card-border, rgba(99,102,241,0.4));
          box-shadow: 0 20px 60px -10px var(--card-shadow, rgba(99,102,241,0.25));
        }

        .role-card-customer {
          --card-glow: rgba(99,102,241,0.12);
          --card-border: rgba(99,102,241,0.45);
          --card-shadow: rgba(99,102,241,0.3);
        }

        .role-card-admin {
          --card-glow: rgba(6,182,212,0.12);
          --card-border: rgba(6,182,212,0.45);
          --card-shadow: rgba(6,182,212,0.3);
        }

        .role-card-icon {
          font-size: 2.2rem;
          line-height: 1;
        }

        .role-card-body h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: var(--text-main);
          margin-bottom: 6px;
          letter-spacing: -0.01em;
        }

        .role-card-body p {
          font-size: 0.88rem;
          color: var(--text-muted);
          line-height: 1.6;
        }

        .role-card-arrow {
          position: absolute;
          bottom: 22px;
          right: 22px;
          font-size: 1.3rem;
          color: var(--text-dim);
          transition: transform 0.25s ease, color 0.25s ease;
        }

        .role-card:hover .role-card-arrow {
          transform: translateX(4px);
          color: var(--text-main);
        }

        .role-select-footer {
          font-size: 0.78rem;
          color: var(--text-dim);
          letter-spacing: 0.04em;
          text-align: center;
          margin-top: 8px;
        }
      `}</style>
    </>
  );
}
