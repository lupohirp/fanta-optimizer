'use client';

import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { calculateDynamicPrice, getPlayerAuctionRange, MarketValuation } from '../lib/optimizer';
import { marketGridFor } from '../lib/market';
import { ConsensusAlternative } from '../lib/consensus';
import { Fixture, calendarVerdict } from '../lib/calendar';
import { difficultyColor } from './CalendarPanel';
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
  valuation?: MarketValuation;
  lowProfileAlternatives?: ConsensusAlternative[];
  fixtures?: Fixture[];
}

export const PlayerModal: React.FC<PlayerModalProps> = ({
  player,
  onClose,
  totalBudget,
  participants,
  isPinned,
  onTogglePin,
  onEditPlayer,
  onSavePlayer,
  valuation,
  lowProfileAlternatives,
  fixtures
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

  // Prezzo in tutti e quattro i formati di lega rilevati dal mercato
  const marketGrid = player.market ? marketGridFor(player.market) : null;
  // A quale formato standard corrisponde la lega dell'utente (7-8 e 9-11 squadre,
  // 300-400 e 440-560 crediti sono le fasce su cui il mercato aggrega i dati)
  const matchedParticipants =
    participants >= 7 && participants <= 8 ? 8 : participants >= 9 && participants <= 11 ? 10 : null;
  const matchedBudget =
    totalBudget >= 300 && totalBudget <= 400 ? 350 : totalBudget >= 440 && totalBudget <= 560 ? 500 : null;
  const isStandardFormat = matchedParticipants !== null && matchedBudget !== null;
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
                    Prezzo custom
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

        {/* Mercato: quanto viene pagato davvero nelle aste */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Gavel size={14} style={{ color: 'var(--text-muted)' }} />
              <span>{auctionRange.isReal ? 'Prezzi d\'asta reali' : 'Prezzo stimato'}</span>
            </div>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              lega da {participants} · {totalBudget} cr
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Se lo prendi bene</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.min} cr
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Prezzo medio</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.avg} cr
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Se parte l&apos;asta</div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f87171', fontFamily: 'var(--font-mono)' }}>
                {auctionRange.max} cr
              </div>
            </div>
          </div>

          {/* Verdetto: quanto vale rispetto a quanto costa */}
          {valuation && valuation.verdict !== 'giusto' && (
            <div style={{
              marginTop: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              fontSize: '0.78rem'
            }}>
              <span style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                fontSize: '0.72rem',
                background: valuation.verdict === 'affare' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(248, 113, 113, 0.14)',
                color: valuation.verdict === 'affare' ? 'var(--accent-emerald-light)' : '#f87171'
              }}>
                {valuation.verdict === 'affare' ? 'Affare' : 'Sopravvalutato'}
              </span>
              <span style={{ color: 'var(--text-secondary)' }}>
                per il rendimento che dà ne vale circa{' '}
                <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{valuation.fairPrice} cr</strong>
              </span>
            </div>
          )}

          {/* Quanto costa in ogni formato di lega + quanto è conteso */}
          {player.market && (
            <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {marketGrid && (
                <>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Quanto costa negli altri formati di lega
                  </div>
                  <div className="market-format-grid">
                    {marketGrid.map(cell => {
                      const isYours = cell.participants === matchedParticipants && cell.budget === matchedBudget;
                      return (
                        <div
                          key={cell.label}
                          title={cell.observed
                            ? 'Prezzo medio rilevato nelle aste di questo formato'
                            : 'Previsione ricavata dai formati con dati rilevati'}
                          style={{
                            background: isYours ? 'rgba(16, 185, 129, 0.10)' : 'var(--bg-card)',
                            border: '1px solid ' + (isYours ? 'var(--accent-emerald)' : 'var(--border-subtle)'),
                            borderRadius: 'var(--radius-sm)',
                            padding: '7px 6px',
                            textAlign: 'center'
                          }}
                        >
                          <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {cell.label}
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-mono)',
                            fontWeight: 800,
                            fontSize: '0.92rem',
                            color: isYours ? 'var(--accent-emerald-light)' : 'var(--text-primary)'
                          }}>
                            {cell.price}
                          </div>
                          <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                            {cell.observed ? 'rilevato' : 'previsto'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!isStandardFormat && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                      La tua lega ({participants} squadre · {totalBudget} cr):{' '}
                      <strong style={{ color: 'var(--accent-emerald-light)', fontFamily: 'var(--font-mono)' }}>
                        {auctionRange.avg} cr
                      </strong>
                    </div>
                  )}
                </>
              )}

              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {typeof player.market.ownership === 'number' && (
                  <span>
                    In rosa nel{' '}
                    <strong style={{ color: 'var(--text-secondary)' }}>
                      {player.market.ownership.toString().replace('.', ',')}%
                    </strong>{' '}
                    delle squadre
                  </span>
                )}
                {typeof player.market.trend7d === 'number' && player.market.trend7d !== 0 && (
                  <span>
                    Ultimi 7 giorni{' '}
                    <strong style={{ color: player.market.trend7d > 0 ? 'var(--accent-emerald-light)' : '#f87171' }}>
                      {player.market.trend7d > 0 ? '+' : ''}
                      {player.market.trend7d.toString().replace('.', ',')} cr
                    </strong>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Calendario: i prossimi impegni visti dal suo ruolo */}
        {fixtures && fixtures.length > 0 && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '9px', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700 }}>Prossimi impegni</div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {calendarVerdict(fixtures).label}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fixtures.length}, 1fr)`, gap: '5px' }}>
              {fixtures.map(f => {
                const c = difficultyColor(f.difficulty);
                return (
                  <div
                    key={f.round}
                    title={`${f.round}ª giornata: ${f.home ? f.opponent + ' in casa' : 'in trasferta a ' + f.opponent}`}
                    style={{
                      background: c.bg,
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 4px',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{f.round}ª</div>
                    <div style={{ fontSize: '0.76rem', fontWeight: 700, color: c.fg, fontFamily: 'var(--font-mono)' }}>
                      {f.home ? '' : '@'}{f.opponent.slice(0, 3).toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Alternative meno battute: stessa resa, senza guerra di rilanci */}
        {lowProfileAlternatives && lowProfileAlternatives.length > 0 && (
          <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, marginBottom: '3px' }}>Se non vuoi la guerra</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '9px' }}>
              Stessa fascia di rendimento, ma quasi nessuno li sta comprando
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {lowProfileAlternatives.map(alt => (
                <div key={alt.player.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`role-badge ${alt.player.role}`}>{alt.player.role}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.84rem' }}>{alt.player.name}</span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{alt.player.team}</span>
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: '10px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{alt.ownership.toFixed(1).replace('.', ',')}% rose</span>
                    <span>{alt.price} cr</span>
                    {alt.saves > 0 && <span style={{ color: 'var(--accent-emerald-light)' }}>-{alt.saves}</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

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
                Rigorista
              </span>
            )}
            {player.isFreeKickTaker && (
              <span style={{ background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 700 }}>
                Tiratore piazzati
              </span>
            )}
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              ~{player.expectedGoals} gol
            </span>
            <span style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-sm)' }}>
              ~{player.expectedAssists} assist
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
