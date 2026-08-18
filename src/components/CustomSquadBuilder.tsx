'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Player, Role, LeagueSettings, GeneratedSquad } from '../types';
import { calculateDynamicPrice, optimizeSquad } from '../lib/optimizer';
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
  UserCheck,
  Save,
  Shield,
  Layers,
  ArrowRight
} from 'lucide-react';

const STORAGE_CUSTOM_SQUAD_KEY = 'fanta_optimizer_custom_squad_state_v2';

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

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CUSTOM_SQUAD_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.P && parsed.D && parsed.C && parsed.A) {
          const mappedSlots = {
            P: parsed.P.map((sp: Player | null) => sp ? allPlayers.find(p => p.id === sp.id) || sp : null),
            D: parsed.D.map((sp: Player | null) => sp ? allPlayers.find(p => p.id === sp.id) || sp : null),
            C: parsed.C.map((sp: Player | null) => sp ? allPlayers.find(p => p.id === sp.id) || sp : null),
            A: parsed.A.map((sp: Player | null) => sp ? allPlayers.find(p => p.id === sp.id) || sp : null)
          };
          setSelectedSlots(mappedSlots);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [allPlayers]);

  // Persist to localStorage on change
  const saveToLocalStorage = (slots: typeof selectedSlots) => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_SQUAD_KEY, JSON.stringify(slots));
    } catch (e) {
      console.error(e);
    }
  };

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

  // Available Goalkeeper Blocks by Team
  const goalkeeperBlocks = useMemo(() => {
    const keepers = allPlayers.filter(p => p.role === 'P');
    const teamsMap: Record<string, Player[]> = {};

    keepers.forEach(k => {
      if (!teamsMap[k.team]) teamsMap[k.team] = [];
      teamsMap[k.team].push(k);
    });

    return Object.entries(teamsMap)
      .map(([team, list]) => {
        const sorted = list.sort((a, b) => b.expectedPoints - a.expectedPoints);
        const top3 = sorted.slice(0, 3);
        const blockPrice = top3.reduce((sum, p) => sum + calculateDynamicPrice(p, totalBudget, participants), 0);
        return {
          team,
          starter: top3[0],
          players: top3,
          price: blockPrice
        };
      })
      .sort((a, b) => b.starter.expectedPoints - a.starter.expectedPoints);
  }, [allPlayers, totalBudget, participants]);

  // Projected FM of starting XI
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
  const handleAssignPlayer = (player: Player, autoFillSameTeamKeepers = false) => {
    if (!activePickerRole || activePickerIndex === null) return;

    setSelectedSlots(prev => {
      const nextRoleList = [...prev[activePickerRole]];
      nextRoleList[activePickerIndex] = player;

      let nextPList = [...prev.P];
      if (activePickerRole === 'P' && autoFillSameTeamKeepers) {
        const teamKeepers = allPlayers
          .filter(p => p.role === 'P' && p.team === player.team && p.id !== player.id)
          .sort((a, b) => calculateDynamicPrice(a, totalBudget, participants) - calculateDynamicPrice(b, totalBudget, participants));

        nextPList = [player, teamKeepers[0] || null, teamKeepers[1] || null];
      }

      const updated = {
        ...prev,
        [activePickerRole]: activePickerRole === 'P' && autoFillSameTeamKeepers ? nextPList : nextRoleList
      };
      saveToLocalStorage(updated);
      return updated;
    });

    setActivePickerRole(null);
    setActivePickerIndex(null);
    setSearchQuery('');
  };

  // Assign entire Goalkeeper Block for a team
  const handleAssignGoalkeeperBlock = (blockKeepers: Player[]) => {
    setSelectedSlots(prev => {
      const updated = {
        ...prev,
        P: [blockKeepers[0] || null, blockKeepers[1] || null, blockKeepers[2] || null]
      };
      saveToLocalStorage(updated);
      return updated;
    });
    setActivePickerRole(null);
    setActivePickerIndex(null);
  };

  // Remove player from slot
  const handleRemovePlayer = (role: Role, index: number) => {
    setSelectedSlots(prev => {
      const nextRoleList = [...prev[role]];
      nextRoleList[index] = null;
      const updated = {
        ...prev,
        [role]: nextRoleList
      };
      saveToLocalStorage(updated);
      return updated;
    });
  };

  // Magic Autocomplete: Uses the AI Optimizer engine with current chosen players as pinned
  const handleMagicFill = () => {
    const pinnedIds = currentPlayers.map(p => p.id);

    // Call full optimizer preserving all chosen players and proper budget distribution
    const generated = optimizeSquad(allPlayers, settings, pinnedIds);

    const generatedP = generated.players.filter(p => p.role === 'P');
    const generatedD = generated.players.filter(p => p.role === 'D');
    const generatedC = generated.players.filter(p => p.role === 'C');
    const generatedA = generated.players.filter(p => p.role === 'A');

    // Fill slots prioritizing already placed players
    const buildRoleSlots = (currentRoleSlots: Array<Player | null>, genPool: Player[]) => {
      const result: Array<Player | null> = [...currentRoleSlots];
      const usedInRole = new Set(result.filter(Boolean).map(p => p!.id));
      const remainingGen = genPool.filter(p => !usedInRole.has(p.id));

      let genIdx = 0;
      for (let i = 0; i < result.length; i++) {
        if (result[i] === null && genIdx < remainingGen.length) {
          result[i] = remainingGen[genIdx++];
        }
      }
      return result;
    };

    const nextSlots = {
      P: buildRoleSlots(selectedSlots.P, generatedP),
      D: buildRoleSlots(selectedSlots.D, generatedD),
      C: buildRoleSlots(selectedSlots.C, generatedC),
      A: buildRoleSlots(selectedSlots.A, generatedA)
    };

    setSelectedSlots(nextSlots);
    saveToLocalStorage(nextSlots);
  };

  // Convert to GeneratedSquad and apply
  const handleApplyToMain = () => {
    if (currentPlayers.length < 25) {
      alert('La rosa non è ancora completa (25 giocatori necessari). Puoi usare il tasto "Autocompleta Slot Vuoti (AI)" per riempire gli slot mancanti!');
      return;
    }

    const sortedP = selectedSlots.P.filter(Boolean) as Player[];
    const sortedD = (selectedSlots.D.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);
    const sortedC = (selectedSlots.C.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);
    const sortedA = (selectedSlots.A.filter(Boolean) as Player[]).sort((a, b) => b.expectedPoints - a.expectedPoints);

    const startingXI = [...sortedP.slice(0, 1), ...sortedD.slice(0, 3), ...sortedC.slice(0, 4), ...sortedA.slice(0, 3)];
    const startingIds = new Set(startingXI.map(p => p.id));
    const bench = currentPlayers.filter(p => !startingIds.has(p.id));

    const customSquad: GeneratedSquad = {
      id: `custom-squad-${Date.now()}`,
      name: `Rosa Custom Personale (${totalBudget}cr)`,
      season: settings.selectedSeason || '2026-27',
      strategy: 'balanced',
      createdAt: Date.now(),
      players: currentPlayers,
      pinnedPlayerIds: currentPlayers.map(p => p.id),
      totalBudget,
      budgetSpent: totalSpent,
      budgetRemaining: Math.max(0, totalBudget - totalSpent),
      projectedFantaPoints: startingMetrics.fm * 11,
      projectedGoals: startingMetrics.goals,
      projectedAssists: startingMetrics.assists,
      averageStarterProbability: Math.round(currentPlayers.reduce((s, p) => s + p.starterProbability, 0) / currentPlayers.length),
      penaltyTakersCount: currentPlayers.filter(p => p.isPenaltyTaker).length,
      budgetBreakdown: roleSpent,
      budgetPercentages: {
        P: totalSpent > 0 ? Math.round((roleSpent.P / totalSpent) * 100) : 0,
        D: totalSpent > 0 ? Math.round((roleSpent.D / totalSpent) * 100) : 0,
        C: totalSpent > 0 ? Math.round((roleSpent.C / totalSpent) * 100) : 0,
        A: totalSpent > 0 ? Math.round((roleSpent.A / totalSpent) * 100) : 0,
      },
      formation: '3-4-3',
      startingXI,
      bench
    };

    onSaveToMainSquad(customSquad);
  };

  // Reset custom board
  const handleResetBoard = () => {
    const empty = {
      P: [null, null, null],
      D: [null, null, null, null, null, null, null, null],
      C: [null, null, null, null, null, null, null, null],
      A: [null, null, null, null, null, null]
    };
    setSelectedSlots(empty);
    saveToLocalStorage(empty);
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
    P: 'Portieri (Blocco Unica Squadra)',
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
              <span>🛠️ Costruttore Rosa Custom (Salvataggio Automatico)</span>
              <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--accent-emerald-light)', padding: '2px 8px', borderRadius: 'var(--radius-full)', fontWeight: 700 }}>
                💾 Auto-salvato
              </span>
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Componi manualmente la tua rosa o autocompleta gli slot vuoti • I dati restano salvati sul tuo dispositivo
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleMagicFill}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px' }}
              title="Completa gli slot vuoti ottimizzando i crediti residui con il budget corretto per reparto"
            >
              <Sparkles size={15} />
              <span>🪄 Autocompleta Slot Vuoti (AI)</span>
            </button>

            {currentPlayers.length === 25 && (
              <button
                onClick={handleApplyToMain}
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', gap: '6px', background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <ArrowRight size={15} />
                <span>Visualizza su Campo / Esporta</span>
              </button>
            )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`role-badge ${role}`}>{role}</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{roleLabels[role]}</h3>
              {role === 'P' && (
                <span style={{ fontSize: '0.72rem', color: 'var(--accent-gold)', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  🛡️ Tris Portieri Stessa Squadra
                </span>
              )}
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
          <div className="modal-content" style={{ maxWidth: '680px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
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

            {/* 1-Click Goalkeeper Blocks by Team */}
            {activePickerRole === 'P' && (
              <div style={{ marginBottom: '14px', background: 'var(--bg-card)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 800, color: 'var(--accent-gold)', marginBottom: '8px' }}>
                  <Shield size={14} />
                  <span>Blocchi Portieri Completi per Squadra (Tris 1°, 2°, 3° Portiere):</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                  {goalkeeperBlocks.map(block => (
                    <button
                      key={block.team}
                      onClick={() => handleAssignGoalkeeperBlock(block.players)}
                      style={{
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '6px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.82rem', color: '#fff' }}>
                          Tris {block.team}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          {block.starter.name} + riserve
                        </div>
                      </div>
                      <span style={{ color: 'var(--accent-gold)', fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                        {block.price} cr
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                      onClick={() => handleAssignPlayer(player, activePickerRole === 'P')}
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
                          {activePickerRole === 'P' ? 'Seleziona + Blocco' : 'Seleziona'}
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
