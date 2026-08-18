'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { calculateDynamicPrice, getPlayerAuctionRange } from '../lib/optimizer';
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
  Coins,
  Gavel,
  Check,
  RotateCcw,
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
  onSavePlayer?: (player: Player) => void;
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  onClose,
  totalBudget,
  participants,
  isPinned,
  onTogglePin,
  onEditPlayer,
  onSavePlayer
}) => {
  if (!player) return null;

  const currentPrice = calculateDynamicPrice(player, totalBudget, participants);
  const [customPriceInput, setCustomPriceInput] = useState<number>(currentPrice);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (player) {
      setCustomPriceInput(calculateDynamicPrice(player, totalBudget, participants));
      setSavedSuccess(false);
    }
  }, [player, totalBudget, participants]);

  const auctionRange = getPlayerAuctionRange(player, totalBudget, participants);
  const history = player.historicalStats && player.historicalStats.length > 0 ? player.historicalStats[0] : null;

  const handleSaveCustomPrice = () => {
    if (!onSavePlayer || !player) return;
    const price500Scaled = Math.max(1, Math.round(customPriceInput * (500 / totalBudget)));
    const updatedPlayer: Player = {
      ...player,
      estimatedPrice500: price500Scaled,
      avgAuctionPrice500: price500Scaled,
      isCustomPrice: true
    };
    onSavePlayer(updatedPlayer);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetToDefaultPrice = () => {
    if (!onSavePlayer || !player) return;
    // Default calibration based on quotation and role
    const q = player.quotation || 1;
    const role = player.role;
    let default500 = 1;
    if (role === 'A') {
      if (q >= 33) default500 = Math.round(160 + (q - 33) * 20);
      else if (q >= 28) default500 = Math.round(110 + (q - 28) * 10);
      else if (q >= 22) default500 = Math.round(55 + (q - 22) * 8);
      else if (q >= 15) default500 = Math.round(20 + (q - 15) * 4.5);
      else if (q >= 8) default500 = Math.round(6 + (q - 8) * 2);
      else default500 = Math.max(1, Math.round(q * 0.7));
    } else if (role === 'C') {
      if (q >= 28) default500 = Math.round(52 + (q - 28) * 5);
      else if (q >= 22) default500 = Math.round(34 + (q - 22) * 3);
      else if (q >= 16) default500 = Math.round(18 + (q - 16) * 2.5);
      else if (q >= 10) default500 = Math.round(8 + (q - 10) * 1.6);
      else if (q >= 5) default500 = Math.round(3 + (q - 5) * 1);
      else default500 = Math.max(1, Math.round(q * 0.5));
    } else if (role === 'D') {
      if (q >= 30) default500 = Math.round(48 + (q - 30) * 4);
      else if (q >= 24) default500 = Math.round(32 + (q - 24) * 2.5);
      else if (q >= 17) default500 = Math.round(18 + (q - 17) * 2);
      else if (q >= 10) default500 = Math.round(7 + (q - 10) * 1.5);
      else if (q >= 5) default500 = Math.round(3 + (q - 5) * 0.8);
      else default500 = Math.max(1, Math.round(q * 0.4));
    } else {
      if (q >= 25) default500 = Math.round(26 + (q - 25) * 1.2);
      else if (q >= 18) default500 = Math.round(18 + (q - 18) * 1.1);
      else if (q >= 10) default500 = Math.round(8 + (q - 10) * 1.2);
      else if (q >= 3) default500 = Math.round(2 + (q - 3) * 0.5);
      else default500 = 1;
    }

    const updatedPlayer: Player = {
      ...player,
      estimatedPrice500: default500,
      avgAuctionPrice500: default500,
      isCustomPrice: false
    };
    onSavePlayer(updatedPlayer);
    setCustomPriceInput(Math.round(default500 * (totalBudget / 500)));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className={`player-jersey ${player.role}`} style={{ width: '48px', height: '48px', fontSize: '1.1rem' }}>
              {player.role}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>{player.name}</h3>
                <span className={`role-badge ${player.role}`}>{player.role}</span>
                {player.isCustomPrice && (
                  <span style={{ fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                    ✏️ Prezzo Custom
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {player.team} • Tier {player.tier} • {player.starterProbability}% Titolarità
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
                title="Modifica statistiche complete"
              >
                <Edit3 size={16} />
              </button>
            )}
            <button onClick={onClose} className="btn-icon">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Custom Price Editor Box */}
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 800, color: 'var(--accent-gold)' }}>
              <Coins size={16} />
              <span>Valore d'Asta Personalizzato ({totalBudget} cr):</span>
            </div>
            {player.isCustomPrice && (
              <button
                onClick={handleResetToDefaultPrice}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                title="Ripristina valore calcolato dall'algoritmo"
              >
                <RotateCcw size={12} />
                <span>Ripristina Default</span>
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ position: 'relative', width: '130px' }}>
              <input
                type="number"
                min={1}
                max={totalBudget}
                value={customPriceInput}
                onChange={(e) => setCustomPriceInput(Math.max(1, parseInt(e.target.value) || 1))}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 30px 8px 12px',
                  color: 'var(--accent-gold)',
                  fontWeight: 800,
                  fontSize: '1.1rem',
                  fontFamily: 'var(--font-mono)'
                }}
              />
              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700 }}>
                cr
              </span>
            </div>

            <button
              onClick={handleSaveCustomPrice}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px', background: savedSuccess ? '#10b981' : undefined }}
            >
              {savedSuccess ? <Check size={16} /> : <Coins size={16} />}
              <span>{savedSuccess ? 'Valore Salvato!' : 'Salva Valore Custom'}</span>
            </button>

            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              ({((customPriceInput / totalBudget) * 100).toFixed(1)}% del budget)
            </span>
          </div>
        </div>

        {/* Quick Highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">FM Proiettata</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
              {player.expectedPoints.toFixed(2)}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">Quotazione Ufficiale</span>
            <span className="stat-widget-value">
              {player.quotation}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '10px' }}>
            <span className="stat-widget-label">Titolarità Attesa</span>
            <span className="stat-widget-value" style={{ color: player.starterProbability >= 85 ? 'var(--accent-emerald-light)' : '#fbbf24' }}>
              {player.starterProbability}%
            </span>
          </div>
        </div>

        {/* Real Auction Market Stats (Prezzi Medi d'Asta Reali) */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Gavel size={14} />
            <span>CAMPIONE NAZIONALE PREZZI D'ASTA (SERIE A)</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Minimo (Affare)</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.min} cr
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)' }}>Media Calibrata</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--accent-gold)', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.avg} cr
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Massimo (Hype)</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.max} cr
              </div>
            </div>
          </div>
        </div>

        {/* Historical Stats Section */}
        {history && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <History size={14} style={{ color: 'var(--accent-emerald-light)' }} />
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
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            {player.isPenaltyTaker && (
              <span style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#f87171', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                🎯 Rigorista
              </span>
            )}
            {player.isFreeKickTaker && (
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                📐 Tiratore Piazzati
              </span>
            )}
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              ⚽ ~{player.expectedGoals} Gol
            </span>
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              🅰️ ~{player.expectedAssists} Assist
            </span>
          </div>

          {player.notes && (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong>Note Scout:</strong> {player.notes}
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
