'use client';

import React from 'react';
import { 
  Trophy, 
  Sparkles, 
  Gavel, 
  Users, 
  GitCompare, 
  BookOpen, 
  Share2, 
  RefreshCw,
  Hammer
} from 'lucide-react';

export type TabType = 'generator' | 'custom_builder' | 'live_auction' | 'database' | 'comparator' | 'guide';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onShareWhatsApp: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  lastSyncTime: string;
  hasSquad: boolean;
  playersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onShareWhatsApp,
  onManualSync,
  isSyncing,
  lastSyncTime,
  hasSquad,
  playersCount
}) => {
  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Trophy size={26} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">FantaOptimizer Pro</div>
          <div className="brand-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Listone Ufficiale Serie A 2026/27</span>
            {/* Live Sync Status Pill */}
            <span 
              onClick={onManualSync}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--accent-emerald-light)',
                padding: '1px 8px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title="Clicca per sincronizzare istantaneamente con le quotazioni ufficiali Fantacalcio.it"
            >
              <span style={{ 
                width: '6px', 
                height: '6px', 
                borderRadius: '50%', 
                background: isSyncing ? '#f59e0b' : '#10b981',
                boxShadow: isSyncing ? '0 0 8px #f59e0b' : '0 0 8px #10b981'
              }} />
              <span>{isSyncing ? 'Sincronizzazione...' : `Live 2026/27: ${lastSyncTime}`}</span>
              <RefreshCw size={10} className={isSyncing ? 'spin' : ''} style={{ marginLeft: '2px' }} />
            </span>
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Sparkles size={16} />
          <span>Generatore AI</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'custom_builder' ? 'active' : ''}`}
          onClick={() => setActiveTab('custom_builder')}
        >
          <Hammer size={16} />
          <span>Costruttore Custom</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'live_auction' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_auction')}
        >
          <Gavel size={16} />
          <span>Asta Live</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Users size={16} />
          <span>Listone ({playersCount})</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'comparator' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparator')}
        >
          <GitCompare size={16} />
          <span>Confronta</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          <BookOpen size={16} />
          <span>Guida</span>
        </button>
      </nav>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onManualSync}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.82rem', gap: '6px' }}
          title="Sincronizza quotazioni ufficiali Fantacalcio.it 2026/27"
        >
          <RefreshCw size={14} className={isSyncing ? 'spin' : ''} style={{ color: 'var(--accent-emerald-light)' }} />
          <span>Aggiorna Dati</span>
        </button>

        {hasSquad && (
          <button 
            onClick={onShareWhatsApp}
            className="btn-primary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
            title="Condividi o copia per WhatsApp"
          >
            <Share2 size={15} />
            <span>Copia Rosa</span>
          </button>
        )}
      </div>
    </header>
  );
};
