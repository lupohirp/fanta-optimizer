'use client';

import React, { useState, useMemo } from 'react';
import { Player, Role, LeagueSettings, GeneratedSquad } from '../types';
import { calculateDynamicPrice, findAlternatives } from '../lib/optimizer';
import { 
  Plus, 
  Trash2, 
  Sparkles, 
  Search, 
  X, 
  Coins, 
  TrendingUp, 
  ShieldCheck, 
  Share2, 
  Download,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  UserCheck
} from 'lucide-react';

interface CustomSquadBuilderProps {
  allPlayers: Player[];
  settings: LeagueSettings;
  totalBudget: number;
  participants: number;
  onSaveToMainSquad: (squad: GeneratedSquad) => void;
  onSelectPlayerModal: (player: Player) => void;
}

export const CustomSquadBuilder: React.FC<CustomSquadBuilderProps> = ({
  allPlayers,
  settings,
  totalBudget,
  participants,
  onSaveToMainSquad,
  onSelectPlayerModal
}) => {
  // 25 slots state
  const [selectedSlots, setSelectedSlots] = useState<{
    P: Array<Player | null>;
    D: Array<Player | null>;
    C: Array<Player | null>;
    A: Array<Player | null>;
  }>({
    P: [null, null, null],
    D: [null, null, null, null, null, null, null, null],
    C: [null, null, null, null, null, null, null, null],
    A: [null, null, null, null, null, null]
  });

  // Slot picker modal state
  const [activePickerRole, setActivePickerRole] = useState<Role | null>(null);
  const [activePickerIndex, setActivePickerIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState('ALL');

  // Flattened all selected players
  const currentPlayers = useMemo(() => {
    const list: Player[] = [];
    ['P', 'D', 'C', 'A'].forEach(r => {
      selectedSlots[r as Role].forEach(p => {
        if (p) list.push(p);
      });
    });
    return list;
  }, [selectedSlots]);

  // Selected player IDs
  const selectedIds = useMemo(() => new Set(currentPlayers.map(p => p.id)), [currentPlayers]);

  // Total spent
  const totalSpent = useMemo(() => {
    return currentPlayers.reduce(
      (sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants),
      0
    );
  }, [currentPlayers, totalBudget, participants]);

  const remainingBudget = Math.max(0, totalBudget - totalSpent);
  const emptySlotsCount = 25 - currentPlayers.length;
  const avgRemainingPerSlot = emptySlotsCount > 0 ? Math.floor(remainingBudget / emptySlotsCount) : 0;

  // Reparto breakdown
  const roleSpent = useMemo(() => {
    const res: Record<Role, number> = { P: 0, D: 0, C: 0, A: 0 };
    ['P', 'D', 'C', 'A'].forEach(r => {
      res[r as Role] = selectedSlots[r as Role].reduce((sum, p) => {
        return sum + (p ? calculateDynamicPrice(p, totalBudget, participants) : 0);
      }, 0);
    });
    return res;
  }, [selectedSlots, totalBudget, participants]);

  // Projected FM of starting XI (best 11 among selected)
  const startingMetrics = useMemo(() => {
    if (currentPlayers.length === 0) return { fm: 0, goals: 0, assists: 0 };

    const sortedP = selectedSlots.P.filter(Boolean) as Player[];
    const sortedD = (selectedSlots.D.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);
    const sortedC = (selectedSlots.C.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);
    const sortedA = (selectedSlots.A.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);

    const topP = sortedP.slice(0, 1);
    const topD = sortedD.slice(0, 3);
    const topC = sortedC.slice(0, 4);
    const topA = sortedA.slice(0, 3);

    const starters = [...topP, ...topD, ...topC, ...topA];
    const fm = starters.length > 0 
      ? parseFloat((starters.reduce((s, p) => s + p.expectedPoints, 0) / starters.length).toFixed(1))
      : 0;

    const goals = currentPlayers.reduce((s, p) => s + p.expectedGoals, 0);
    const assists = currentPlayers.reduce((s, p) => s + p.expectedAssists, 0);

    return { fm, goals, assists };
  }, [currentPlayers, selectedSlots]);

  // Add player to slot
  const handleAssignPlayer = (player: Player) => {
    if (!activePickerRole || activePickerIndex === null) return;

    setSelectedSlots(prev => {
      const nextRoleList = [...prev[activePickerRole]];
      nextRoleList[activePickerIndex] = player;
      return {
        ...prev,
        [activePickerRole]: nextRoleList
      };
    });

    setActivePickerRole(null);
    setActivePickerIndex(null);
    setSearchQuery('');
  };

  // Remove player from slot
  const handleRemovePlayer = (role: Role, index: number) => {
    setSelectedSlots(prev => {
      const nextRoleList = [...prev[role]];
      nextRoleList[index] = null;
      return {
        ...prev,
        [role]: nextRoleList
      };
    });
  };

  // Magic Autocomplete: Fills all empty slots with optimal players for the remaining budget
  const handleMagicFill = () => {
    let budgetLeft = remainingBudget;
    const nextSlots = {
      P: [...selectedSlots.P],
      D: [...selectedSlots.D],
      C: [...selectedSlots.C],
      A: [...selectedSlots.A]
    };
    const used = new Set(selectedIds);

    const roles: Role[] = ['P', 'D', 'C', 'A'];

    roles.forEach(role => {
      const list = nextSlots[role];
      list.forEach((slot, idx) => {
        if (slot !== null) return; // already filled

        // Count remaining empty slots total across all roles
        let remainingEmptyTotal = 0;
        roles.forEach(r => {
          nextSlots[r].forEach(s => { if (s === null) remainingEmptyTotal++; });
        });

        const maxAffordableForThisSlot = Math.max(1, budgetLeft - (remainingEmptyTotal - 1));

        // Find candidate
        const candidates = allPlayers
          .filter(p => p.role === role && !used.has(p.id))
          .map(p => {
            const price = calculateDynamicPrice(p, totalBudget, participants);
            const score = p.expectedPoints * 10 + (p.starterProbability / 100) * 10 + (p.isPenaltyTaker ? 8 : 0);
            return { player: p, price, score };
          })
          .filter(c => c.price <= maxAffordableForThisSlot)
          .sort((a, b) => b.score - a.score);

        const chosen = candidates[0] || allPlayers
          .filter(p => p.role === role && !used.has(p.id))
          .map(p => ({ player: p, price: calculateDynamicPrice(p, totalBudget, participants), score: 0 }))
          .sort((a, b) => a.price - b.price)[0];

        if (chosen) {
          nextSlots[role][idx] = chosen.player;
          used.add(chosen.player.id);
          budgetLeft -= chosen.price;
        }
      });
    });

    setSelectedSlots(nextSlots);
  };

  // Reset custom board
  const handleResetBoard = () => {
    setSelectedSlots({
      P: [null, null, null],
      D: [null, null, null, null, null, null, null, null],
      C: [null, null, null, null, null, null, null, null],
      A: [null, null, null, null, null, null]
    });
  };

  // Filter candidates for picker
  const pickerCandidates = useMemo(() => {
    if (!activePickerRole) return [];
    return allPlayers
      .filter(p => p.role === activePickerRole && !selectedIds.has(p.id))
      .filter(p => {
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.team.toLowerCase().includes(searchQuery.toLowerCase())) {
          return false;
        }
        if (filterTeam !== 'ALL' && p.team !== filterTeam) {
          return false;
        }
        return true;
      })
      .map(p => ({
        player: p,
        price: calculateDynamicPrice(p, totalBudget, participants)
      }))
      .sort((a, b) => b.player.expectedPoints - a.player.expectedPoints);
  }, [allPlayers, activePickerRole, selectedIds, searchQuery, filterTeam, totalBudget, participants]);

  const roleLabels: Record<Role, string> = {
    P: 'Portieri (3)',
    D: 'Difensori (8)',
    C: 'Centrocampisti (8)',
    A: 'Attaccanti (6)'
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Dashboard: Budget & Real-time Metrics */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🛠️ Costruttore Rosa Custom (Slot per Slot)</span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Componi manualmente la tua rosa ideale scegliendo i 25 calciatori o usa l'Autocompletamento AI
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleMagicFill}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}
              title="Completa gli slot vuoti ottimizzando i crediti residui"
            >
              <Sparkles size={15} />
              <span>🪄 Autocompleta Slot Vuoti (AI)</span>
            </button>

            <button
              onClick={handleResetBoard}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.85rem', gap: '6px' }}
            >
              <Trash2 size={14} />
              <span>Svuota Rosa</span>
            </button>
          </div>
        </div>

        {/* Live Counters */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '16px' }}>
          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Spesa / Budget</span>
            <span className="stat-widget-value" style={{ color: totalSpent > totalBudget ? '#ef4444' : 'var(--accent-gold)' }}>
              {totalSpent} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {totalBudget} cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Crediti Rimanenti</span>
            <span className="stat-widget-value" style={{ color: remainingBudget < 0 ? '#ef4444' : 'var(--accent-emerald-light)' }}>
              {remainingBudget} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>cr</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Slot Completati</span>
            <span className="stat-widget-value">
              {currentPlayers.length} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ 25</span>
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Media Cr / Slot Vuoto</span>
            <span className="stat-widget-value" style={{ color: 'var(--role-c-text)' }}>
              {emptySlotsCount > 0 ? `${avgRemainingPerSlot} cr` : 'Completa'}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">FM Media Titolari</span>
            <span className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
              {startingMetrics.fm > 0 ? startingMetrics.fm : '-'}
            </span>
          </div>

          <div className="stat-widget" style={{ padding: '12px' }}>
            <span className="stat-widget-label">Gol Stimati Rosa</span>
            <span className="stat-widget-value">
              ~{startingMetrics.goals} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>gol</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-full)', height: '8px', overflow: 'hidden', display: 'flex' }}>
          <div style={{ width: `${(roleSpent.P / totalBudget) * 100}%`, background: 'var(--role-p-border)' }} title={`P: ${roleSpent.P}cr`} />
          <div style={{ width: `${(roleSpent.D / totalBudget) * 100}%`, background: 'var(--role-d-border)' }} title={`D: ${roleSpent.D}cr`} />
          <div style={{ width: `${(roleSpent.C / totalBudget) * 100}%`, background: 'var(--role-c-border)' }} title={`C: ${roleSpent.C}cr`} />
          <div style={{ width: `${(roleSpent.A / totalBudget) * 100}%`, background: 'var(--role-a-border)' }} title={`A: ${roleSpent.A}cr`} />
        </div>
      </div>

      {/* Role Slot Sections */}
      {(['P', 'D', 'C', 'A'] as Role[]).map(role => (
        <div key={role} className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`role-badge ${role}`}>{role}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{roleLabels[role]}</h3>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Spesi: <strong style={{ color: 'var(--accent-gold)' }}>{roleSpent[role]} cr</strong>
            </div>
          </div>

          {/* Slots grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '10px' }}>
            {selectedSlots[role].map((player, idx) => {
              if (player) {
                const price = calculateDynamicPrice(player, totalBudget, participants);
                return (
                  <div
                    key={`${role}-${idx}`}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', width: '18px' }}>
                        #{idx + 1}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div 
                          onClick={() => onSelectPlayerModal(player)}
                          style={{ fontWeight: 800, fontSize: '0.9rem', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={player.name}
                        >
                          {player.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {player.team} • FM {player.expectedPoints.toFixed(1)} {player.isPenaltyTaker && '• 🎯'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ 
                        background: 'rgba(245, 158, 11, 0.15)', 
                        color: '#fbbf24', 
                        fontWeight: 800, 
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85rem'
                      }}>
                        {price} cr
                      </span>

                      <button
                        onClick={() => handleRemovePlayer(role, idx)}
                        className="btn-icon"
                        style={{ width: '28px', height: '28px' }}
                        title="Rimuovi giocatore da questo slot"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              }

              // Empty slot button
              return (
                <button
                  key={`${role}-${idx}`}
                  onClick={() => {
                    setActivePickerRole(role);
                    setActivePickerIndex(idx);
                    setSearchQuery('');
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1.5px dashed var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-emerald)';
                    e.currentTarget.style.color = 'var(--accent-emerald-light)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }}
                >
                  <Plus size={15} />
                  <span>Slot #{idx + 1} • Scegli {role}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Quick Player Picker Drawer / Modal */}
      {activePickerRole && activePickerIndex !== null && (
        <div className="modal-overlay" onClick={() => { setActivePickerRole(null); setActivePickerIndex(null); }}>
          <div className="modal-content" style={{ maxWidth: '650px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`role-badge ${activePickerRole}`}>{activePickerRole}</span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>
                  Scegli {roleLabels[activePickerRole]} per Slot #{activePickerIndex + 1}
                </h3>
              </div>
              <button onClick={() => { setActivePickerRole(null); setActivePickerIndex(null); }} className="btn-icon">
                <X size={18} />
              </button>
            </div>

            {/* Search filter in modal */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  autoFocus
                  placeholder={`Cerca per nome o squadra...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '9px 12px 9px 36px',
                    color: 'var(--text-primary)',
                    fontSize: '0.88rem'
                  }}
                />
              </div>
            </div>

            {/* List */}
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
              {pickerCandidates.length === 0 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  Nessun calciatore trovato con questi filtri.
                </div>
              ) : (
                pickerCandidates.slice(0, 50).map(({ player, price }) => {
                  const isAffordable = price <= remainingBudget;
                  return (
                    <div
                      key={player.id}
                      onClick={() => handleAssignPlayer(player)}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-emerald)';
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.background = 'var(--bg-input)';
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#fff' }}>
                          {player.name} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 500 }}>({player.team})</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          FM attesa: <strong style={{ color: 'var(--accent-emerald-light)' }}>{player.expectedPoints.toFixed(1)}</strong> • Titolarità: {player.starterProbability}% {player.isPenaltyTaker && '• 🎯 Rigorista'}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ 
                          background: isAffordable ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: isAffordable ? '#fbbf24' : '#f87171', 
                          fontWeight: 800, 
                          fontFamily: 'var(--font-mono)',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.9rem'
                        }}>
                          {price} cr
                        </span>

                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Seleziona
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
