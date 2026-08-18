'use client';

import React, { useState } from 'react';
import { LeagueSettings, StrategyType } from '../types';
import { STRATEGIES } from '../data/players';
import { getAvailableSeasons, formatSeasonLabel, getCurrentSeason } from '../lib/season';
import { 
  Coins, 
  Users2, 
  ShieldCheck, 
  Sparkles, 
  RefreshCw, 
  Pin,
  Sliders,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  ExternalLink,
  Bot
} from 'lucide-react';

interface ConfigPanelProps {
  settings: LeagueSettings;
  setSettings: React.Dispatch<React.SetStateAction<LeagueSettings>>;
  onGenerate: () => void;
  onSeasonChange: (newSeason: string) => void;
  pinnedCount: number;
  isGenerating: boolean;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  settings,
  setSettings,
  onGenerate,
  onSeasonChange,
  pinnedCount,
  isGenerating
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const quickBudgets = [300, 500, 600, 1000];
  const participantOptions = [6, 8, 10, 12];
  const availableSeasons = getAvailableSeasons();
  const currentSeason = getCurrentSeason();

  const handleBudgetChange = (val: number) => {
    setSettings(prev => ({ ...prev, totalBudget: Math.max(50, val) }));
  };

  const handleStrategyChange = (strat: StrategyType) => {
    setSettings(prev => ({ ...prev, strategy: strat }));
  };

  const handleApiKeyChange = (key: string) => {
    setSettings(prev => ({ ...prev, geminiApiKey: key }));
    try {
      if (key) {
        localStorage.setItem('fanta_optimizer_gemini_api_key_v1', key);
      } else {
        localStorage.removeItem('fanta_optimizer_gemini_api_key_v1');
      }
    } catch (e) {
      console.error(e);
    }
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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Impostazioni della Lega</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Configura parametri, stagione, budget e modello AI</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Season Selector Dropdown */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'var(--bg-input)', 
            border: '1px solid var(--border-subtle)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)'
          }}>
            <Calendar size={13} style={{ color: 'var(--accent-emerald-light)' }} />
            <select
              value={settings.selectedSeason}
              onChange={(e) => onSeasonChange(e.target.value)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontWeight: 700,
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {availableSeasons.map(s => (
                <option key={s} value={s} style={{ background: 'var(--bg-card)', color: '#fff' }}>
                  Stagione {formatSeasonLabel(s)} {s === currentSeason ? '⭐' : ''}
                </option>
              ))}
            </select>
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
              <span>{pinnedCount} bloccati</span>
            </div>
          )}
        </div>
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
                width: '120px',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {quickBudgets.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBudgetChange(b)}
                  style={{
                    background: settings.totalBudget === b ? 'var(--accent-emerald)' : 'var(--bg-input)',
                    color: settings.totalBudget === b ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '6px 10px',
                    fontSize: '0.75rem',
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
            <Users2 size={15} style={{ color: 'var(--role-c-border)' }} />
            <span>Numero Partecipanti</span>
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {participantOptions.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => setSettings(prev => ({ ...prev, participants: p }))}
                style={{
                  flex: 1,
                  background: settings.participants === p ? 'var(--accent-emerald)' : 'var(--bg-input)',
                  color: settings.participants === p ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {p} fanta-squadre
              </button>
            ))}
          </div>
        </div>

        {/* Modifiers & Bonuses */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <ShieldCheck size={15} style={{ color: 'var(--role-d-border)' }} />
            <span>Bonus e Modificatori</span>
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={settings.defenseModifier}
                onChange={(e) => setSettings(prev => ({ ...prev, defenseModifier: e.target.checked }))}
                style={{ accentColor: 'var(--accent-emerald)' }}
              />
              <span>Modificatore di Difesa attivo</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
              <input
                type="checkbox"
                checked={settings.cleanSheetBonus}
                onChange={(e) => setSettings(prev => ({ ...prev, cleanSheetBonus: e.target.checked }))}
                style={{ accentColor: 'var(--accent-emerald)' }}
              />
              <span>Bonus Porta Inviolata (+1 pt per Clean Sheet)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Google AI Studio Gemini API Key Card (Free Tier) */}
      <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bot size={17} style={{ color: 'var(--accent-emerald-light)' }} />
            <span style={{ fontSize: '0.9rem', fontWeight: 800 }}>Google AI Studio (Gemini 2.5 Flash / Free Tier)</span>
            <span style={{ fontSize: '0.7rem', background: settings.geminiApiKey ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.08)', color: settings.geminiApiKey ? 'var(--accent-emerald-light)' : 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
              {settings.geminiApiKey ? '🟢 Gemini AI Connesso' : '⚪ Modalità Locale'}
            </span>
          </div>

          <a 
            href="https://aistudio.google.com/app/apikey" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: '0.78rem', color: 'var(--accent-emerald-light)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <span>Ottieni chiave gratuita su Google AI Studio</span>
            <ExternalLink size={12} />
          </a>
        </div>

        <div style={{ position: 'relative', maxWidth: '540px' }}>
          <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <KeyRound size={15} />
          </div>
          <input
            type={showApiKey ? 'text' : 'password'}
            placeholder="Incolla qui la tua API Key di Google AI Studio (opzionale)"
            value={settings.geminiApiKey || ''}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 36px 8px 34px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
              fontFamily: 'var(--font-mono)'
            }}
          />
          <button
            type="button"
            onClick={() => setShowApiKey(!showApiKey)}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            title={showApiKey ? 'Nascondi' : 'Mostra'}
          >
            {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
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
