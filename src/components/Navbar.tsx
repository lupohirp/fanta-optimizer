'use client';

import React from 'react';
import {
  Trophy,
  Shirt,
  Gavel,
  Users,
  GitCompare,
  BookOpen,
  RefreshCw
} from 'lucide-react';

export type TabType = 'generator' | 'live_auction' | 'database' | 'comparator' | 'guide';

interface NavbarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onManualSync: () => void;
  isSyncing: boolean;
  lastSyncTime: string;
  playersCount: number;
}

const TABS: { id: TabType; label: string; Icon: React.ElementType }[] = [
  { id: 'generator', label: 'La Mia Rosa', Icon: Shirt },
  { id: 'live_auction', label: 'Asta Live', Icon: Gavel },
  { id: 'database', label: 'Listone', Icon: Users },
  { id: 'comparator', label: 'Confronta', Icon: GitCompare },
  { id: 'guide', label: 'Guida', Icon: BookOpen }
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onManualSync,
  isSyncing,
  lastSyncTime,
  playersCount
}) => {
  return (
    <header className="navbar">
      <div className="brand-wrapper">
        <div className="brand-icon">
          <Trophy size={26} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-title">FantaOptimizer</div>
          <div className="brand-subtitle" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Serie A · {playersCount} giocatori</span>
            <span
              onClick={onManualSync}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Clicca per aggiornare le quotazioni ufficiali Fantacalcio.it"
            >
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: isSyncing ? '#f59e0b' : '#10b981'
              }} />
              <span>{isSyncing ? 'Aggiornamento...' : lastSyncTime}</span>
              <RefreshCw size={10} className={isSyncing ? 'spin' : ''} style={{ marginLeft: '2px' }} />
            </span>
          </div>
        </div>
      </div>

      <nav className="nav-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            className={`nav-tab-btn ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </header>
  );
};
