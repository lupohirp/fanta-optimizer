'use client';

import React, { useState, useMemo } from 'react';
import { Player, Role, FilterOptions } from '../types';
import { SERIE_A_TEAMS } from '../data/players';
import { calculateDynamicPrice } from '../lib/optimizer';
import { 
  Search, 
  Filter, 
  Pin, 
  PinOff, 
  Info, 
  ArrowUpDown,
  Crosshair,
  ShieldAlert,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

interface PlayerDatabaseProps {
  players: Player[];
  totalBudget: number;
  participants: number;
  pinnedIds: string[];
  onTogglePin: (playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onOpenImport?: () => void;
}

export const PlayerDatabase: React.FC<PlayerDatabaseProps> = ({
  players,
  totalBudget,
  participants,
  pinnedIds,
  onTogglePin,
  onSelectPlayer,
  onOpenImport
}) => {
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    role: 'ALL',
    team: 'ALL',
    maxPrice: totalBudget,
    tier: 'ALL',
    onlyPenaltyTakers: false,
    onlyStarters: false,
    sortBy: 'points',
    sortOrder: 'desc'
  });

  const filteredPlayers = useMemo(() => {
    return players
      .filter(p => {
        // Search
        if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase()) && !p.team.toLowerCase().includes(filters.search.toLowerCase())) {
          return false;
        }
        // Role
        if (filters.role !== 'ALL' && p.role !== filters.role) {
          return false;
        }
        // Team
        if (filters.team !== 'ALL' && p.team !== filters.team) {
          return false;
        }
        // Penalty takers
        if (filters.onlyPenaltyTakers && !p.isPenaltyTaker) {
          return false;
        }
        // Starters
        if (filters.onlyStarters && p.starterProbability < 80) {
          return false;
        }
        // Tier
        if (filters.tier !== 'ALL' && p.tier !== filters.tier) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const priceA = calculateDynamicPrice(a, totalBudget, participants);
        const priceB = calculateDynamicPrice(b, totalBudget, participants);
        let comparison = 0;

        if (filters.sortBy === 'points') {
          comparison = b.expectedPoints - a.expectedPoints;
        } else if (filters.sortBy === 'price') {
          comparison = priceB - priceA;
        } else if (filters.sortBy === 'quotation') {
          comparison = b.quotation - a.quotation;
        } else if (filters.sortBy === 'goals') {
          comparison = b.expectedGoals - a.expectedGoals;
        } else if (filters.sortBy === 'name') {
          comparison = a.name.localeCompare(b.name);
        }

        return filters.sortOrder === 'desc' ? comparison : -comparison;
      });
  }, [players, filters, totalBudget, participants]);

  const handleSortChange = (field: FilterOptions['sortBy']) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Search & Filter Toolbar */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Listino & Database Calciatori</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Esplora statistiche, fanta-medie, rigoristi e blocca i tuoi preferiti per l'algoritmo
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Mostrati <strong style={{ color: 'var(--text-primary)' }}>{filteredPlayers.length}</strong> su {players.length} calciatori
            </div>

            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.78rem', gap: '6px' }}
              >
                <FileSpreadsheet size={14} style={{ color: 'var(--accent-emerald-light)' }} />
                <span>Carica Listino (.xlsx/.csv)</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
          {/* Search Bar */}
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Cerca calciatore o squadra..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
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

          {/* Role selector */}
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'P', 'D', 'C', 'A'] as const).map(r => (
              <button
                key={r}
                onClick={() => setFilters(prev => ({ ...prev, role: r }))}
                style={{
                  flex: 1,
                  background: filters.role === r ? 'var(--accent-emerald)' : 'var(--bg-input)',
                  color: filters.role === r ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {r === 'ALL' ? 'Tutti' : r}
              </button>
            ))}
          </div>

          {/* Team filter */}
          <select
            value={filters.team}
            onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '9px 12px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <option value="ALL">Tutte le squadre</option>
            {SERIE_A_TEAMS.map(team => (
              <option key={team} value={team}>{team}</option>
            ))}
          </select>
        </div>

        {/* Checkbox filters */}
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
            <input
              type="checkbox"
              checked={filters.onlyPenaltyTakers}
              onChange={(e) => setFilters(prev => ({ ...prev, onlyPenaltyTakers: e.target.checked }))}
              style={{ accentColor: 'var(--accent-emerald)' }}
            />
            <span>🎯 Solo Rigoristi</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>
            <input
              type="checkbox"
              checked={filters.onlyStarters}
              onChange={(e) => setFilters(prev => ({ ...prev, onlyStarters: e.target.checked }))}
              style={{ accentColor: 'var(--accent-emerald)' }}
            />
            <span>⚡ Solo Titolari Fissi (≥80%)</span>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card-subtle)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Ruolo</th>
                <th style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => handleSortChange('name')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>Calciatore</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px' }}>Squadra</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('quotation')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <span>Quot.</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('price')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <span>Prezzo Asta ({totalBudget}cr)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('points')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <span>FantaMedia (xP)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center', cursor: 'pointer' }} onClick={() => handleSortChange('goals')}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                    <span>Gol / Assist</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>Caratteristiche</th>
                <th style={{ padding: '12px 14px', textAlign: 'right' }}>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map(p => {
                const isPinned = pinnedIds.includes(p.id);
                const price = calculateDynamicPrice(p, totalBudget, participants);

                return (
                  <tr 
                    key={p.id}
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                      background: isPinned ? 'rgba(245, 158, 11, 0.06)' : 'transparent',
                      transition: 'background 0.15s'
                    }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span className={`role-badge ${p.role}`}>{p.role}</span>
                    </td>

                    <td style={{ padding: '12px 14px', fontWeight: 800 }}>
                      <span 
                        onClick={() => onSelectPlayer(p)}
                        style={{ cursor: 'pointer', color: '#fff' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-emerald-light)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = '#fff')}
                      >
                        {p.name}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                      {p.team}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      {p.quotation}
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ 
                        background: 'var(--bg-input)', 
                        border: '1px solid var(--border-subtle)', 
                        padding: '4px 10px', 
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--accent-gold)'
                      }}>
                        {price} cr
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <span style={{ 
                        fontWeight: 800, 
                        fontFamily: 'var(--font-mono)',
                        color: p.expectedPoints >= 7.0 ? 'var(--accent-emerald-light)' : 'var(--text-primary)'
                      }}>
                        {p.expectedPoints.toFixed(1)}
                      </span>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                      {p.expectedGoals}G / {p.expectedAssists}A
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {p.isPenaltyTaker && (
                          <span style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            🎯 Rigori
                          </span>
                        )}
                        {p.isFreeKickTaker && (
                          <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                            📐 Piazzati
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => onTogglePin(p.id)}
                          className={`btn-secondary ${isPinned ? 'active' : ''}`}
                          style={{
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            gap: '5px',
                            background: isPinned ? 'var(--accent-gold)' : 'var(--bg-input)',
                            color: isPinned ? '#0a0e17' : 'var(--text-primary)',
                            borderColor: isPinned ? 'var(--accent-gold)' : 'var(--border-subtle)'
                          }}
                          title={isPinned ? 'Sblocca dalla rosa' : 'Blocca nella rosa per la generazione'}
                        >
                          <Pin size={13} />
                          <span>{isPinned ? 'Bloccato' : 'Blocca'}</span>
                        </button>

                        <button
                          onClick={() => onSelectPlayer(p)}
                          className="btn-icon"
                          title="Scheda completa"
                        >
                          <Info size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
