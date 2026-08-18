'use client';

import React from 'react';
import { Player } from '../types';
import { calculateDynamicPrice } from '../lib/optimizer';
import { 
  Pin, 
  PinOff, 
  Target, 
  Flame, 
  Crosshair, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Sparkles,
  Edit3,
  Calendar,
  History,
  X
} from 'lucide-react';

interface PlayerModalProps {
  player: Player | null;
  onClose: () => void;
  totalBudget: number;
  participants: number;
  isPinned: boolean;
  onTogglePin: (playerId: string) => void;
  onEditPlayer?: (player: Player) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  onClose,
  totalBudget,
  participants,
  isPinned,
  onTogglePin,
  onEditPlayer
}) => {
  if (!player) return null;

  const dynamicPrice = calculateDynamicPrice(player, totalBudget, participants);
  const history = player.historicalStats && player.historicalStats.length > 0 ? player.historicalStats[0] : null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={`player-jersey ${player.role}`} style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
              {player.role}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{player.name}</h3>
                <span className={`role-badge ${player.role}`}>{player.role}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {player.team} • Tier {player.tier}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {onEditPlayer && (
              <button 
                onClick={() => {
                  onClose();
                  onEditPlayer(player);
                }} 
                className="btn-icon"
                title="Modifica statistiche, squadra o prezzo"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button onClick={onClose} className="btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Price and FM highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '18px' }}>
          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">Prezzo Asta Stimato</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-gold)' }}>
              {dynamicPrice} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">FM Proiettata (Ponderata)</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
              {player.expectedPoints.toFixed(2)}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">Quotazione Listino</span>
            <span className="stat-widget-value">
              {player.quotation}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">Titolarità Stimata</span>
            <span className="stat-widget-value">
              {player.starterProbability}%
            </span>
          </div>
        </div>

        {/* Historical Stats Section */}
        {history && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} />
              <span>DATI STORICI STAGIONE {history.season.replace('-', '/')} (t-1)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ background: 'var(--bg-card)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Presenze (PG)</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', fontFamily: 'var(--font-mono)' }}>{history.played} / 38</div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Media Voto (MV)</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', fontFamily: 'var(--font-mono)' }}>{history.avgRating.toFixed(2)}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>FantaMedia (FM)</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>{history.fantaAvg.toFixed(2)}</div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '6px 8px', borderRadius: 'var(--radius-sm)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Gol / Assist</div>
                <div style={{ fontWeight: 800, fontSize: '0.92rem', fontFamily: 'var(--font-mono)' }}>{history.goals}G / {history.assists}A</div>
              </div>
            </div>
          </div>
        )}

        {/* Expected Stats & Attributes */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '18px' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase' }}>
            PROIEZIONE BONUS & CARATTERISTICHE
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {player.isPenaltyTaker && (
              <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', fontSize: '0.78rem', padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                🎯 Rigorista
              </span>
            )}
            {player.isFreeKickTaker && (
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.78rem', padding: '3px 10px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                📐 Tiratore Piazzati / Corner
              </span>
            )}
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '3px 10px', borderRadius: 'var(--radius-sm)' }}>
              ⚽ ~{player.expectedGoals} Gol previsti
            </span>
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.78rem', padding: '3px 10px', borderRadius: 'var(--radius-sm)' }}>
              🅰️ ~{player.expectedAssists} Assist previsti
            </span>
          </div>

          {player.notes && (
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5, background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-emerald)' }}>
              <strong>Analisi Scout & Proiezione:</strong> {player.notes}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
          <button
            onClick={() => onTogglePin(player.id)}
            className={`btn-secondary ${isPinned ? 'active' : ''}`}
            style={{
              flex: 1,
              background: isPinned ? 'var(--accent-gold)' : 'var(--bg-card-subtle)',
              color: isPinned ? '#0a0e17' : 'var(--text-primary)',
              borderColor: isPinned ? 'var(--accent-gold)' : 'var(--border-subtle)',
              fontWeight: 700
            }}
          >
            {isPinned ? <PinOff size={16} /> : <Pin size={16} />}
            <span>{isPinned ? 'Rimuovi Blocco' : 'Blocca nella Rosa'}</span>
          </button>

          <button
            onClick={onClose}
            className="btn-primary"
            style={{ flex: 1 }}
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};
