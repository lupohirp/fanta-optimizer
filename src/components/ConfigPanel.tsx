'use client';

import React from 'react';
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
  Bot,
  LayoutGrid
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
  const quickBudgets = [300, 500, 600, 1000];
  const participantOptions = [6, 8, 10, 12];
  const formationOptions: LeagueSettings['targetFormation'][] = ['auto', '3-4-3', '4-3-3', '3-5-2', '4-4-2', '4-2-3-1'];
  const availableSeasons = getAvailableSeasons();
  const currentSeason = getCurrentSeason();

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
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Impostazioni Lega</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Budget, partecipanti, modulo e strategia</p>
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
                <option key={s} value={s} style={{ background: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                  Stagione {formatSeasonLabel(s)}{s === currentSeason ? ' (attuale)' : ''}
                </option>
              ))}
            </select>
          </div>

          {pinnedCount > 0 && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              background: 'var(--accent-gold-soft)', 
              border: '1px solid var(--accent-gold-border)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              color: 'var(--accent-gold)',
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

        {/* Target Formation */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
            <LayoutGrid size={15} style={{ color: 'var(--role-a-text)' }} />
            <span>Modulo</span>
          </label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {formationOptions.map(f => {
              const isSelected = settings.targetFormation === f;
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setSettings(prev => ({ ...prev, targetFormation: f }))}
                  style={{
                    background: isSelected ? 'var(--accent-emerald)' : 'var(--bg-input)',
                    color: isSelected ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '7px 11px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    fontFamily: f === 'auto' ? 'inherit' : 'var(--font-mono)',
                    cursor: 'pointer'
                  }}
                >
                  {f === 'auto' ? 'Auto' : f}
                </button>
              );
            })}
          </div>
          {settings.defenseModifier && settings.targetFormation === 'auto' && (
            <p style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', marginTop: '6px' }}>
              Mod. difesa attivo: in Auto si gioca con almeno 4 difensori
            </p>
          )}
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

      {/* Advanced AI settings (collapsed by default) */}
      <details style={{ marginBottom: '20px' }}>
        <summary style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-muted)',
          listStyle: 'none',
          userSelect: 'none'
        }}>
          <Bot size={14} />
          <span>Impostazioni AI (avanzate)</span>
        </summary>
        <div style={{
          marginTop: '10px',
          background: 'var(--bg-card-subtle)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: 0 }}>
            L&apos;AI scrive pagelle e commenti tattici; la rosa la calcola sempre l&apos;ottimizzatore.
            Richiede <code style={{ color: 'var(--accent-gold)' }}>GEMINI_API_KEY</code> in .env.local.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Modello:</span>
            <select
              value={settings.geminiModel || 'gemini-3.5-flash-lite'}
              onChange={(e) => setSettings(prev => ({ ...prev, geminiModel: e.target.value }))}
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '6px 12px',
                color: 'var(--accent-emerald-light)',
                fontWeight: 700,
                fontSize: '0.82rem',
                fontFamily: 'var(--font-mono)'
              }}
            >
              <option value="gemini-3.5-flash-lite">gemini-3.5-flash-lite (Predefinito)</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash</option>
              <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
              <option value="gemini-2.5-flash">gemini-2.5-flash</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash</option>
            </select>
          </div>
        </div>
      </details>

      {/* Strategy selector cards */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Strategia d&apos;asta
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
                  background: isSelected ? 'var(--accent-emerald-soft)' : 'var(--bg-input)',
                  border: `1.5px solid ${isSelected ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isSelected ? '#fff' : 'var(--text-primary)', marginBottom: '4px' }}>
                  {strat.name.replace(/^[^\p{L}]+/u, '')}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                  {strat.shortDesc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Trigger Button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="btn-primary"
          style={{ width: '100%', maxWidth: '340px', padding: '14px 24px', fontSize: '1rem' }}
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
