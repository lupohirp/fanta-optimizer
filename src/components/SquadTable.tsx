'use client';

import React from 'react';
import { Player, Role, GeneratedSquad } from '../types';
import { calculateDynamicPrice } from '../lib/optimizer';
import { 
  Pin, 
  PinOff, 
  Sparkles, 
  Info, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Replace
} from 'lucide-react';

interface SquadTableProps {
  squad: GeneratedSquad;
  totalBudget: number;
  participants: number;
  pinnedIds: string[];
  onTogglePin: (playerId: string) => void;
  onSelectPlayer: (player: Player) => void;
  onRequestAlternatives: (player: Player) => void;
}

export const SquadTable: React.FC<SquadTableProps> = ({
  squad,
  totalBudget,
  participants,
  pinnedIds,
  onTogglePin,
  onSelectPlayer,
  onRequestAlternatives
}) => {
  const roles: { role: Role; title: string; count: number }[] = [
    { role: 'P', title: 'Portieri', count: 3 },
    { role: 'D', title: 'Difensori', count: 8 },
    { role: 'C', title: 'Centrocampisti', count: 8 },
    { role: 'A', title: 'Attaccanti', count: 6 },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {roles.map(({ role, title, count }) => {
        const players = squad.players.filter(p => p.role === role);
        const roleSpent = squad.budgetBreakdown[role];
        const rolePct = squad.budgetPercentages[role];

        return (
          <div key={role} className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '14px',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className={`role-badge ${role}`} style={{ fontSize: '0.9rem', padding: '4px 10px' }}>
                  {role}
                </span>
                <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>{title} ({players.length}/{count})</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Totale Spesa: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{roleSpent} cr</strong> ({rolePct}%)
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '8px 10px' }}>Calciatore</th>
                    <th style={{ padding: '8px 10px' }}>Squadra</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Quot.</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Prezzo Asta</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>FantaMedia</th>
                    <th style={{ padding: '8px 10px', textAlign: 'center' }}>Caratteristiche</th>
                    <th style={{ padding: '8px 10px', textAlign: 'right' }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((p, idx) => {
                    const isPinned = pinnedIds.includes(p.id);
                    const price = calculateDynamicPrice(p, totalBudget, participants);

                    return (
                      <tr 
                        key={p.id}
                        style={{ 
                          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                          background: isPinned ? 'var(--accent-gold-soft)' : 'transparent',
                          transition: 'background 0.15s'
                        }}
                      >
                        {/* Name + Slot index */}
                        <td style={{ padding: '10px', fontWeight: 700 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: '18px', fontFamily: 'var(--font-mono)' }}>
                              #{idx + 1}
                            </span>
                            <span 
                              onClick={() => onSelectPlayer(p)}
                              style={{ cursor: 'pointer', color: 'var(--text-primary)', textDecoration: 'underline text-decoration-color: transparent', transition: 'all 0.2s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-emerald-light)')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                            >
                              {p.name}
                            </span>
                          </div>
                        </td>

                        {/* Team */}
                        <td style={{ padding: '10px', color: 'var(--text-secondary)' }}>
                          {p.team}
                        </td>

                        {/* Quotazione */}
                        <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          {p.quotation}
                        </td>

                        {/* Estimated Price */}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ 
                            background: 'var(--bg-input)', 
                            border: '1px solid var(--border-subtle)', 
                            padding: '3px 8px', 
                            borderRadius: 'var(--radius-sm)',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--accent-gold)'
                          }}>
                            {price} cr
                          </span>
                        </td>

                        {/* Expected Points */}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ 
                            fontWeight: 700, 
                            fontFamily: 'var(--font-mono)',
                            color: p.expectedPoints >= 7.0 ? 'var(--accent-emerald-light)' : 'var(--text-primary)'
                          }}>
                            {p.expectedPoints.toFixed(1)}
                          </span>
                        </td>

                        {/* Tags */}
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            {p.isPenaltyTaker && (
                              <span style={{ background: 'var(--danger-soft)', color: 'var(--danger)', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }} title="Rigorista principale o di scorta">
                                Rigorista
                              </span>
                            )}
                            {p.isFreeKickTaker && (
                              <span style={{ background: 'var(--info-soft)', color: 'var(--info)', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }} title="Tiratore piazzati / corner">
                                Piazzati
                              </span>
                            )}
                            <span style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px' }}>
                              Tit. {p.starterProbability}%
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => onTogglePin(p.id)}
                              className={`btn-icon ${isPinned ? 'active' : ''}`}
                              title={isPinned ? 'Sblocca giocatore per ri-ottimizzare' : 'Blocca giocatore nella rosa'}
                            >
                              {isPinned ? <Pin size={15} /> : <PinOff size={15} />}
                            </button>

                            <button
                              onClick={() => onRequestAlternatives(p)}
                              className="btn-icon"
                              title="Trova alternative equivalenti (Piano B)"
                            >
                              <Replace size={15} />
                            </button>

                            <button
                              onClick={() => onSelectPlayer(p)}
                              className="btn-icon"
                              title="Dettagli e note scout"
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
        );
      })}
    </div>
  );
};
