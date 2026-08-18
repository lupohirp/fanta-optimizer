'use client';

import React from 'react';
import { LeagueSettings, StrategyType } from '../types';
import { STRATEGIES } from '../data/players';
import { 
  Coins, 
  Users2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Pin,
  Sliders
} from 'lucide-react';

interface ConfigPanelProps {
  settings: LeagueSettings;
  setSettings: React.Dispatch<React.SetStateAction<LeagueSettings>>;
  onGenerate: () => void;
  pinnedCount: number;
  isGenerating: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  settings,
  setSettings,
  onGenerate,
  pinnedCount,
  isGenerating
}) => {
  const quickBudgets = [300, 500, 600, 1000];
  const participantOptions = [6, 8, 10, 12];

  const handleBudgetChange = (val: number) => {
    setSettings(prev => ({ ...prev, totalBudget: Math.max(50, val) }));
  };

  const handleStrategyChange = (strat: StrategyType) => {
    setSettings(prev => ({ ...prev, strategy: strat }));
  };

  return (
    <div className="glass-card" style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            width: '32px', 
            height: '32px', 
            borderRadius: '8px', 
            background: 'var(--accent-emerald-glow)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--accent-emerald-light)'
          }}>
            <Sliders size={18} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Parametri d'Asta & Strategia</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Imposta crediti e stile di gioco per calcolare la rosa perfetta</p>
          </div>
        </div>

        {pinnedCount > 0 && (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(245, 158, 11, 0.15)', 
            border: '1px solid rgba(245, 158, 11, 0.3)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            color: '#fbbf24',
            fontSize: '0.8rem',
            fontWeight: 600
          }}>
            <Pin size={13} />
            <span>{pinnedCount} {pinnedCount === 1 ? 'giocatore bloccato' : 'giocatori bloccati'}</span>
          </div>
        )}
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
        gap: '20px', 
        marginBottom: '20px' 
      }}>
        {/* Budget Input */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <Coins size={15} style={{ color: 'var(--accent-gold)' }} />
            <span>Budget Totale (Crediti)</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number"
              min={50}
              max={5000}
              step={10}
              value={settings.totalBudget}
              onChange={(e) => handleBudgetChange(parseInt(e.target.value) || 500)}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                padding: '10px 14px',
                fontSize: '1.1rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                width: '120px'
              }}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {quickBudgets.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBudgetChange(b)}
                  style={{
                    background: settings.totalBudget === b ? 'var(--accent-emerald)' : 'var(--bg-card-subtle)',
                    color: settings.totalBudget === b ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    padding: '6px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Participants Selection */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <Users2 size={15} style={{ color: 'var(--role-c-text)' }} />
            <span>Partecipanti Lega</span>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            {participantOptions.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, participants: p }))}
                style={{
                  flex: 1,
                  background: settings.participants === p ? 'var(--role-c-border)' : 'var(--bg-input)',
                  color: settings.participants === p ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${settings.participants === p ? 'var(--role-c-text)' : 'var(--border-subtle)'}`,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                {p} Squadre
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '5px' }}>
            {settings.participants >= 10 
              ? '⚠️ Prezzi dei top player aumentati per alta scarsità' 
              : settings.participants === 6 
                ? 'ℹ️ Prezzi più abbordabili data l\'ampia offerta' 
                : 'Standard 8 squadre (calibrazione ottimale)'}
          </p>
        </div>

        {/* Modifiers Toggles */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <ShieldCheck size={15} style={{ color: 'var(--accent-emerald-light)' }} />
            <span>Bonus & Regolamento</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={settings.defenseModifier}
                onChange={(e) => setSettings(prev => ({ ...prev, defenseModifier: e.target.checked }))}
                style={{ accentColor: 'var(--accent-emerald)', width: '16px', height: '16px' }}
              />
              <span>Modificatore Difesa attivo (+1 a +6 pt)</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={settings.cleanSheetBonus}
                onChange={(e) => setSettings(prev => ({ ...prev, cleanSheetBonus: e.target.checked }))}
                style={{ accentColor: 'var(--accent-emerald)', width: '16px', height: '16px' }}
              />
              <span>Bonus Porta Inviolata (+1 pt portiere)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Strategy selector cards */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Seleziona Strategia di Rosa:
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '10px' 
        }}>
          {Object.values(STRATEGIES).map(strat => {
            const isSelected = settings.strategy === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => handleStrategyChange(strat.id)}
                style={{
                  background: isSelected ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-input)',
                  border: `1.5px solid ${isSelected ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#fff' : 'var(--text-primary)', marginBottom: '4px' }}>
                  {strat.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  {strat.shortDesc}
                </div>
                <div style={{ 
                  display: 'flex', 
                  gap: '4px', 
                  marginTop: '8px', 
                  fontSize: '0.68rem', 
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)' 
                }}>
                  <span>P:{Math.round(strat.budgetWeights.P * 100)}%</span>
                  <span>D:{Math.round(strat.budgetWeights.D * 100)}%</span>
                  <span>C:{Math.round(strat.budgetWeights.C * 100)}%</span>
                  <span>A:{Math.round(strat.budgetWeights.A * 100)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Trigger Button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '300px', padding: '14px 24px', fontSize: '1rem' }}
        >
          {isGenerating ? (
            <>
              <RefreshCw size={18} className="spin" />
              <span>Ottimizzazione in corso...</span>
            </>
          ) : (
            <>
              <Sparkles size={18} />
              <span>Genera Rosa Ottimizzata</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
