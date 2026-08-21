'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Player, Role, LiveAuctionItem, GeneratedSquad } from '../types';
import { calculateDynamicPrice, findAlternatives, getPlayerAuctionRange, getMaxBid, MarketValuation } from '../lib/optimizer';
import { resolveStoredSlots } from '../lib/player-resolve';
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
  AlertCircle,
  Shield,
  Layers,
  Search,
  Check,
  RotateCcw,
  Plus
} from 'lucide-react';

const STORAGE_CUSTOM_SQUAD_KEY = 'fanta_optimizer_custom_squad_state_v3';
const STORAGE_LIVE_AUCTION_KEY = 'fanta_optimizer_live_auction_items_v2';

interface LiveAuctionAssistantProps {
  squad: GeneratedSquad;
  allPlayers: Player[];
  totalBudget: number;
  participants: number;
  valuations?: Map<string, MarketValuation>;
  onSelectPlayer: (player: Player) => void;
}

export const LiveAuctionAssistant: React.FC<LiveAuctionAssistantProps> = ({
  squad,
  allPlayers,
  totalBudget,
  participants,
  valuations,
  onSelectPlayer
}) => {
  const [squadSource, setSquadSource] = useState<'custom' | 'optimized'>('custom');
  const [activeAlternativeSlot, setActiveAlternativeSlot] = useState<LiveAuctionItem | null>(null);
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<Role | 'ALL'>('ALL');
  const [searchPickerQuery, setSearchPickerQuery] = useState('');

  // Load custom slots from localStorage
  const loadCustomSlots = (): Record<Role, Array<Player | null>> => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_SQUAD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.P && parsed.D && parsed.C && parsed.A) {
          // Stesso riaggancio del costruttore: identità, non id posizionale
          return {
            P: resolveStoredSlots(parsed.P, allPlayers, 'P', 3),
            D: resolveStoredSlots(parsed.D, allPlayers, 'D', 8),
            C: resolveStoredSlots(parsed.C, allPlayers, 'C', 8),
            A: resolveStoredSlots(parsed.A, allPlayers, 'A', 6),
          };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return {
      P: [null, null, null],
      D: [null, null, null, null, null, null, null, null],
      C: [null, null, null, null, null, null, null, null],
      A: [null, null, null, null, null, null]
    };
  };

  // Build items based on chosen source
  const buildItemsForSource = (source: 'custom' | 'optimized'): LiveAuctionItem[] => {
    const items: LiveAuctionItem[] = [];
    const roles: Role[] = ['P', 'D', 'C', 'A'];

    if (source === 'custom') {
      const customSlots = loadCustomSlots();
      roles.forEach(role => {
        const list = customSlots[role];
        list.forEach((player, idx) => {
          if (player) {
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
          } else {
            // Empty slot in custom builder
            items.push({
              id: `auction-${role}-${idx + 1}`,
              role,
              slotNumber: idx + 1,
              slotTitle: `${idx + 1}° Slot ${role} (Libero)`,
              targetBudget: 1,
              boughtPlayer: null,
              boughtPrice: 1,
              status: 'pending',
              suggestedAlternatives: allPlayers
                .filter(p => p.role === role && p.starterProbability >= 80)
                .sort((a, b) => b.expectedPoints - a.expectedPoints)
                .slice(0, 6)
            });
          }
        });
      });
    } else {
      // AI Optimized squad
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
    }

    return items;
  };

  const [auctionItems, setAuctionItems] = useState<LiveAuctionItem[]>(() => {
    return buildItemsForSource('custom');
  });

  // Switch source handler
  const handleSwitchSource = (newSource: 'custom' | 'optimized') => {
    setSquadSource(newSource);
    setAuctionItems(buildItemsForSource(newSource));
  };

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
          slotTitle: `${item.slotNumber}° Slot ${item.role}`,
          boughtPlayer: newPlayer,
          targetBudget: newPrice,
          boughtPrice: newPrice,
          suggestedAlternatives: findAlternatives(newPlayer, allPlayers, totalBudget, participants, [newPlayer.id])
        };
      }
      return item;
    }));
    setActiveAlternativeSlot(null);
    setSearchPickerQuery('');
  };

  // Reset live board
  const handleResetAuction = () => {
    if (confirm('Vuoi resettare lo stato di tutti gli acquisti d\'asta?')) {
      setAuctionItems(buildItemsForSource(squadSource));
    }
  };

  // Calculate live stats
  const boughtItems = auctionItems.filter(i => i.status === 'bought');
  const pendingItems = auctionItems.filter(i => i.status === 'pending');

  const totalSpentLive = boughtItems.reduce((sum, i) => sum + (i.boughtPrice || 0), 0);
  const remainingBudgetLive = Math.max(0, totalBudget - totalSpentLive);

  const budgetVariance = boughtItems.reduce((sum, i) => {
    return sum + ((i.boughtPrice || 0) - i.targetBudget);
  }, 0);

  const filteredItems = useMemo(() => {
    return auctionItems.filter(item => {
      if (selectedRoleFilter !== 'ALL' && item.role !== selectedRoleFilter) {
        return false;
      }
      return true;
    });
  }, [auctionItems, selectedRoleFilter]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner: Squad Source Selector & Live Stats */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Assistente Asta Live</h2>
              <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                Live Tracker
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Traccia gli acquisti durante l'asta, ricalcola i crediti residui e trova al volo i Piani B se il prezzo sale
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Squad Source Selector */}
            <div style={{ display: 'flex', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => handleSwitchSource('custom')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: squadSource === 'custom' ? 'var(--accent-gold)' : 'transparent',
                  color: squadSource === 'custom' ? '#0a0e17' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Rosa Custom
              </button>
              <button
                onClick={() => handleSwitchSource('optimized')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  background: squadSource === 'optimized' ? 'var(--accent-emerald)' : 'transparent',
                  color: squadSource === 'optimized' ? '#fff' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                Rosa Generata
              </button>
            </div>

            <button
              onClick={handleResetAuction}
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '4px' }}
              title="Resetta gli acquisti d'asta"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Spesa Effettiva</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-gold)' }}>
              {totalSpentLive} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {totalBudget} cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Crediti Rimanenti</span>
            <span className="stat-widget-value" style={{ color: remainingBudgetLive < 0 ? '#ef4444' : 'var(--accent-emerald-light)' }}>
              {remainingBudgetLive} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Giocatori Acquistati</span>
            <span className="stat-widget-value">
              {boughtItems.length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 25</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Saldo vs Target Previsto</span>
            <span className="stat-widget-value" style={{ color: budgetVariance > 0 ? '#f87171' : budgetVariance < 0 ? 'var(--accent-emerald-light)' : 'var(--text-primary)' }}>
              {budgetVariance > 0 ? `+${budgetVariance}` : budgetVariance} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>cr</span>
            </span>
          </div>
        </div>
      </div>

      {/* Role Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {(['ALL', 'P', 'D', 'C', 'A'] as const).map(role => (
          <button
            key={role}
            onClick={() => setSelectedRoleFilter(role)}
            className={`btn-secondary ${selectedRoleFilter === role ? 'active' : ''}`}
            style={{
              padding: '8px 16px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: selectedRoleFilter === role ? 'var(--accent-emerald)' : 'var(--bg-card)',
              color: selectedRoleFilter === role ? '#fff' : 'var(--text-secondary)',
              borderColor: selectedRoleFilter === role ? 'var(--accent-emerald)' : 'var(--border-subtle)'
            }}
          >
            {role === 'ALL' ? 'Tutti i 25 Slot' : role === 'P' ? 'Portieri (3)' : role === 'D' ? 'Difensori (8)' : role === 'C' ? 'Centrocampisti (8)' : 'Attaccanti (6)'}
          </button>
        ))}
      </div>

      {/* Auction Slot Cards Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredItems.map(item => {
          const isBought = item.status === 'bought';
          const isSkipped = item.status === 'skipped';
          const p = item.boughtPlayer;
          const priceDiff = (item.boughtPrice || 0) - item.targetBudget;
          // Fin dove conviene rilanciare: valore reale del giocatore, limitato
          // da quanto resta in cassa lasciando un credito per ogni slot ancora da riempire
          const maxBid = p
            ? getMaxBid(valuations?.get(p.id), remainingBudgetLive, pendingItems.length)
            : null;

          return (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                borderLeft: isBought ? '4px solid var(--accent-emerald)' : isSkipped ? '4px solid #ef4444' : '4px solid var(--accent-gold)',
                background: isBought ? 'rgba(16, 185, 129, 0.04)' : isSkipped ? 'rgba(239, 68, 68, 0.04)' : 'var(--bg-card)'
              }}
            >
              {/* Left: Role + Player Info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '240px' }}>
                <span className={`role-badge ${item.role}`}>
                  {item.role}#{item.slotNumber}
                </span>

                {p ? (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span 
                        onClick={() => onSelectPlayer(p)}
                        style={{ fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', color: '#fff' }}
                        title="Clicca per scheda scout"
                      >
                        {p.name}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        ({p.team})
                      </span>
                      {p.isCustomPrice && (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--accent-gold)', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                          Prezzo custom
                        </span>
                      )}
                      {p.isPenaltyTaker && <span title="Rigorista" style={{ color: '#f87171', fontWeight: 800, fontSize: '0.7rem' }}>R</span>}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>Prezzo d&apos;asta: <strong style={{ color: 'var(--text-secondary)' }}>{item.targetBudget} cr</strong></span>
                      {!isBought && maxBid !== null && maxBid > item.targetBudget && (
                        <>
                          <span>•</span>
                          <span title="Oltre questa cifra conviene lasciarlo e ripiegare sulle alternative">
                            spingi fino a <strong style={{ color: 'var(--accent-emerald-light)' }}>{maxBid} cr</strong>
                          </span>
                        </>
                      )}
                      <span>•</span>
                      <span style={{ color: 'var(--accent-emerald-light)', fontWeight: 700 }}>FM {p.expectedPoints.toFixed(1)}</span>
                      <span>•</span>
                      <span>{p.starterProbability}% Tit.</span>
                      {typeof p.market?.ownership === 'number' && p.market.ownership >= 10 && (
                        <>
                          <span>•</span>
                          <span title="Percentuale di squadre che lo hanno in rosa: aspettati concorrenza">
                            conteso ({p.market.ownership.toString().replace('.', ',')}%)
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
                      Slot Libero (Nessun giocatore assegnato)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                      Usa il tasto "Scegli Giocatore / Piano B" per assegnare un profilo
                    </div>
                  </div>
                )}
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
                      <span style={{ color: '#f87171' }}>+{priceDiff} cr sopra target</span>
                    ) : (
                      <span style={{ color: 'var(--accent-emerald-light)' }}>{priceDiff} cr risparmiati!</span>
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
                  <span>{p ? 'Piano B' : 'Scegli Giocatore'}</span>
                </button>

                <button
                  onClick={() => handleSetStatus(item.id, isBought ? 'pending' : 'bought')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isBought ? 'var(--accent-emerald)' : 'var(--bg-input)',
                    color: isBought ? '#fff' : 'var(--accent-emerald-light)',
                    border: '1px solid var(--accent-emerald)'
                  }}
                >
                  <CheckCircle2 size={14} />
                  <span>{isBought ? 'Preso' : 'Segna Preso'}</span>
                </button>

                <button
                  onClick={() => handleSetStatus(item.id, isSkipped ? 'pending' : 'skipped')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '7px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: isSkipped ? '#ef4444' : 'var(--bg-input)',
                    color: isSkipped ? '#fff' : '#f87171',
                    border: '1px solid #ef4444'
                  }}
                  title="Segna come perso/andato ad altro fanta-allenatore"
                >
                  <XCircle size={14} />
                  <span>{isSkipped ? 'Perso' : 'Perso'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Alternative Piano B Modal / Quick Swap Drawer */}
      {activeAlternativeSlot && (
        <div className="modal-overlay" onClick={() => { setActiveAlternativeSlot(null); setSearchPickerQuery(''); }}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Replace size={16} style={{ color: 'var(--accent-gold)' }} />
                  <span>Piano B per {activeAlternativeSlot.slotTitle}</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {activeAlternativeSlot.boughtPlayer 
                    ? `Trova un'alternativa per sostituire ${activeAlternativeSlot.boughtPlayer.name} a parità di budget`
                    : `Scegli un calciatore per questo slot di ruolo ${activeAlternativeSlot.role}`
                  }
                </p>
              </div>
              <button onClick={() => { setActiveAlternativeSlot(null); setSearchPickerQuery(''); }} className="btn-icon">
                ✕
              </button>
            </div>

            {/* Search filter in modal */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                autoFocus
                placeholder={`Cerca per nome o squadra...`}
                value={searchPickerQuery}
                onChange={(e) => setSearchPickerQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '8px 12px 8px 36px',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem'
                }}
              />
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                let candidates = activeAlternativeSlot.suggestedAlternatives;
                if (searchPickerQuery) {
                  candidates = allPlayers
                    .filter(p => p.role === activeAlternativeSlot.role)
                    .filter(p => p.name.toLowerCase().includes(searchPickerQuery.toLowerCase()) || p.team.toLowerCase().includes(searchPickerQuery.toLowerCase()))
                    .slice(0, 20);
                }

                if (candidates.length === 0) {
                  return <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Nessuna alternativa trovata.</p>;
                }

                return candidates.map(alt => {
                  const altPrice = calculateDynamicPrice(alt, totalBudget, participants);
                  return (
                    <div
                      key={alt.id}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
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
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          FM attesa: <strong style={{ color: 'var(--accent-emerald-light)' }}>{alt.expectedPoints.toFixed(1)}</strong> • Titolarità: {alt.starterProbability}% {alt.isPenaltyTaker && '· Rigorista'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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

                        <button
                          onClick={() => handleSelectAlternative(activeAlternativeSlot.id, alt)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Seleziona
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
