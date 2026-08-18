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
  FileSpreadsheet
} from 'lucide-react';

export type TabType = 'generator' | 'live_auction' | 'database' | 'comparator' | 'guide';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onShareWhatsApp: () => void;
  onOpenImport: () => void;
  hasSquad: boolean;
  playersCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onShareWhatsApp,
  onOpenImport,
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
          <div className="brand-subtitle">Motore Intelligente per Rose & Aste da 1° Posto</div>
        </div>
      </div>

      <nav className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'generator' ? 'active' : ''}`}
          onClick={() => setActiveTab('generator')}
        >
          <Sparkles size={16} />
          <span>Generatore Rose</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'live_auction' ? 'active' : ''}`}
          onClick={() => setActiveTab('live_auction')}
        >
          <Gavel size={16} />
          <span>Assistente Asta Live</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'database' ? 'active' : ''}`}
          onClick={() => setActiveTab('database')}
        >
          <Users size={16} />
          <span>Listino ({playersCount})</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'comparator' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparator')}
        >
          <GitCompare size={16} />
          <span>Confronta Strategie</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
          onClick={() => setActiveTab('guide')}
        >
          <BookOpen size={16} />
          <span>Guida & Tips</span>
        </button>
      </nav>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <button
          onClick={onOpenImport}
          className="btn-secondary"
          style={{ padding: '8px 12px', fontSize: '0.82rem', gap: '6px' }}
          title="Carica il file Excel o CSV ufficiale di Fantacalcio.it"
        >
          <FileSpreadsheet size={15} style={{ color: 'var(--accent-emerald-light)' }} />
          <span>Carica Excel/CSV</span>
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
