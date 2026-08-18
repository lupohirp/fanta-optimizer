'use client';

import React, { useState } from 'react';
import { Player, Role, LiveAuctionItem, GeneratedSquad } from '../types';
import { calculateDynamicPrice, findAlternatives } from '../lib/optimizer';
import { 
  Gavel, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Coins, 
  HelpCircle, 
  Replace, 
  ArrowRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface LiveAuctionAssistantProps {
  squad: GeneratedSquad;
  allPlayers: Player[];
  totalBudget: number;
  participants: number;
  onSelectPlayer: (player: Player) => void;
}

export const LiveAuctionAssistant: React.FC<LiveAuctionAssistantProps> = ({
  squad,
  allPlayers,
  totalBudget,
  participants,
  onSelectPlayer
}) => {
  // Initialize auction items from squad
  const [auctionItems, setAuctionItems] = useState<LiveAuctionItem[]>(() => {
    const items: LiveAuctionItem[] = [];
    const roles: Role[] = ['P', 'D', 'C', 'A'];

    roles.forEach(role => {
      const rolePlayers = squad.players.filter(p => p.role === role);
      rolePlayers.forEach((player, idx) => {
        const price = calculateDynamicPrice(player, totalBudget, participants);
        const alts = findAlternatives(player, allPlayers, totalBudget, participants, [player.id]);

        items.push({
          id: `auction-${role}-${idx + 1}`,
          role,
          slotNumber: idx + 1,
          slotTitle: `${idx + 1}° Slot ${role}`,
          targetBudget: price,
          boughtPlayer: player,
          boughtPrice: price,
          status: 'pending',
          suggestedAlternatives: alts
        });
      });
    });

    return items;
  });

  const [activeAlternativeSlot, setActiveAlternativeSlot] = useState<LiveAuctionItem | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<Role | 'ALL'>('ALL');

  // Handle status update
  const handleSetStatus = (itemId: string, status: 'pending' | 'bought' | 'skipped') => {
    setAuctionItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status } : item
    ));
  };

  // Handle price update
  const handlePriceChange = (itemId: string, newPrice: number) => {
    setAuctionItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, boughtPrice: Math.max(1, newPrice) } : item
    ));
  };

  // Handle player swap from Piano B
  const handleSelectAlternative = (itemId: string, newPlayer: Player) => {
    const newPrice = calculateDynamicPrice(newPlayer, totalBudget, participants);
    setAuctionItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          boughtPlayer: newPlayer,
          boughtPrice: newPrice,
          suggestedAlternatives: findAlternatives(newPlayer, allPlayers, totalBudget, participants, [newPlayer.id])
        };
      }
      return item;
    }));
    setActiveAlternativeSlot(null);
  };

  // Calculate live stats
  const boughtItems = auctionItems.filter(i => i.status === 'bought');
  const pendingItems = auctionItems.filter(i => i.status === 'pending');

  const totalSpentLive = boughtItems.reduce((sum, i) => sum + (i.boughtPrice || 0), 0);
  const creditsRemainingLive = Math.max(0, totalBudget - totalSpentLive);
  const pendingSlotsCount = pendingItems.length;
  const avgCreditsPerSlot = pendingSlotsCount > 0 
    ? Math.floor(creditsRemainingLive / pendingSlotsCount) 
    : 0;

  // Filtered view
  const displayedItems = selectedRoleFilter === 'ALL' 
    ? auctionItems 
    : auctionItems.filter(i => i.role === selectedRoleFilter);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Live Auction Header Card */}
      <div className="glass-card" style={{ background: 'linear-gradient(135deg, #151c28 0%, #1e293b 100%)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: 'var(--radius-md)', 
              background: 'rgba(245, 158, 11, 0.2)', 
              color: '#fbbf24', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Gavel size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Assistente d'Asta Live</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Tieni traccia degli acquisti in tempo reale e rimodula i crediti al volo
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {(['ALL', 'P', 'D', 'C', 'A'] as const).map(role => (
              <button
                key={role}
                onClick={() => setSelectedRoleFilter(role)}
                style={{
                  background: selectedRoleFilter === role ? 'var(--accent-emerald)' : 'var(--bg-input)',
                  color: selectedRoleFilter === role ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {role === 'ALL' ? 'Tutti (25)' : role}
              </button>
            ))}
          </div>
        </div>

        {/* Live meters */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
          gap: '12px' 
        }}>
          <div className="stat-widget" style={{ background: 'var(--bg-main)' }}>
            <span className="stat-widget-label">Crediti Spesi Reali</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-gold)' }}>
              {totalSpentLive} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {totalBudget} cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ background: 'var(--bg-main)' }}>
            <span className="stat-widget-label">Crediti Rimasti</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
              {creditsRemainingLive} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ background: 'var(--bg-main)' }}>
            <span className="stat-widget-label">Slot da Comprare</span>
            <span className="stat-widget-value">
              {pendingSlotsCount} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ 25</span>
            </span>
          </div>

          <div className="stat-widget" style={{ background: 'var(--bg-main)' }}>
            <span className="stat-widget-label">Budget Medio per Slot</span>
            <span className="stat-widget-value" style={{ color: avgCreditsPerSlot <= 1 ? '#f87171' : 'var(--text-primary)' }}>
              ~{avgCreditsPerSlot} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cr/giocatore</span>
            </span>
          </div>
        </div>
      </div>

      {/* Slots Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {displayedItems.map(item => {
          const isBought = item.status === 'bought';
          const isSkipped = item.status === 'skipped';
          const p = item.boughtPlayer;
          if (!p) return null;

          const priceDiff = (item.boughtPrice || 0) - item.targetBudget;

          return (
            <div 
              key={item.id}
              className="glass-card"
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderLeft: `4px solid ${
                  isBought ? 'var(--accent-emerald)' : isSkipped ? '#ef4444' : 'var(--border-subtle)'
                }`,
                background: isBought ? 'rgba(16, 185, 129, 0.04)' : isSkipped ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)'
              }}
            >
              {/* Left: Role + Player Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                <span className={`role-badge ${item.role}`}>
                  {item.role}#{item.slotNumber}
                </span>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      onClick={() => onSelectPlayer(p)}
                      style={{ fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', color: '#fff' }}
                    >
                      {p.name}
                    </span>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      ({p.team})
                    </span>
                    {p.isPenaltyTaker && <span title="Rigorista">🎯</span>}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    Target stimato: <strong style={{ color: 'var(--accent-gold)' }}>{item.targetBudget} cr</strong> • FM {p.expectedPoints.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* Center: Price Input & Budget Variance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                    Prezzo Pagato (cr)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={totalBudget}
                    value={item.boughtPrice || ''}
                    onChange={(e) => handlePriceChange(item.id, parseInt(e.target.value) || 1)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '6px 10px',
                      color: 'var(--text-primary)',
                      fontWeight: 800,
                      fontFamily: 'var(--font-mono)',
                      width: '75px',
                      textAlign: 'center'
                    }}
                  />
                </div>

                {isBought && priceDiff !== 0 && (
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>
                    {priceDiff > 0 ? (
                      <span style={{ color: '#f87171' }}>+{priceDiff} cr spesi in più</span>
                    ) : (
                      <span style={{ color: 'var(--accent-emerald-light)' }}>{priceDiff} cr risparmiati</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Actions (Bought, Skipped, Piano B) */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setActiveAlternativeSlot(item)}
                  className="btn-secondary"
                  style={{ padding: '7px 12px', fontSize: '0.78rem', gap: '6px' }}
                  title="Trova Piano B o alternative"
                >
                  <Replace size={14} />
                  <span>Piano B</span>
                </button>

                <button
                  onClick={() => handleSetStatus(item.id, isBought ? 'pending' : 'bought')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: isBought ? 'var(--accent-emerald)' : 'var(--bg-input)',
                    color: isBought ? '#fff' : 'var(--text-secondary)',
                    border: `1px solid ${isBought ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{isBought ? 'Preso' : 'Segna Preso'}</span>
                </button>

                <button
                  onClick={() => handleSetStatus(item.id, isSkipped ? 'pending' : 'skipped')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: isSkipped ? '#ef4444' : 'var(--bg-input)',
                    color: isSkipped ? '#fff' : 'var(--text-muted)',
                    border: `1px solid ${isSkipped ? '#ef4444' : 'var(--border-subtle)'}`,
                    padding: '7px 10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Segna come perso / non preso"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Piano B / Alternatives Modal */}
      {activeAlternativeSlot && (
        <div className="modal-overlay" onClick={() => setActiveAlternativeSlot(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  Alternative "Piano B" per {activeAlternativeSlot.boughtPlayer?.name}
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  Slot: {activeAlternativeSlot.slotTitle} (Target: {activeAlternativeSlot.targetBudget} cr)
                </p>
              </div>
              <button onClick={() => setActiveAlternativeSlot(null)} className="btn-icon">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {activeAlternativeSlot.suggestedAlternatives.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nessuna alternativa diretta trovata in questa fascia.</p>
              ) : (
                activeAlternativeSlot.suggestedAlternatives.map(alt => {
                  const altPrice = calculateDynamicPrice(alt, totalBudget, participants);
                  return (
                    <div
                      key={alt.id}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem' }}>
                          {alt.name} <span style={{ color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.8rem' }}>({alt.team})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          FM attesa: <strong style={{ color: 'var(--accent-emerald-light)' }}>{alt.expectedPoints.toFixed(1)}</strong> {alt.isPenaltyTaker && '• 🎯 Rigorista'}
                        </div>
                        {alt.notes && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                            "{alt.notes}"
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: '#fbbf24', 
                            fontWeight: 800, 
                            fontFamily: 'var(--font-mono)',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem'
                          }}>
                            {altPrice} cr
                          </span>
                        </div>

                        <button
                          onClick={() => handleSelectAlternative(activeAlternativeSlot.id, alt)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Scegli
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
