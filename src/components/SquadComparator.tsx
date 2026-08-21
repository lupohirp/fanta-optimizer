'use client';

import React, { useState } from 'react';
import { Player, Role, GeneratedSquad } from '../types';
import { calculateDynamicPrice } from '../lib/optimizer';
import { GitCompare, Trash2, Check } from 'lucide-react';

/** Rosa salvata dall'utente: la GeneratedSquad più i partecipanti al momento del salvataggio */
export type SavedSquad = GeneratedSquad & { participants: number };

interface SquadComparatorProps {
  savedSquads: SavedSquad[];
  onDeleteSquad: (id: string) => void;
  onSelectPlayer: (player: Player) => void;
}

const MAX_COMPARE = 3;

export const SquadComparator: React.FC<SquadComparatorProps> = ({
  savedSquads,
  onDeleteSquad,
  onSelectPlayer
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_COMPARE) return [...prev.slice(1), id];
      return [...prev, id];
    });
  };

  const selected = savedSquads.filter(s => selectedIds.includes(s.id));

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  // Righe della tabella di confronto; higherIsBetter evidenzia il valore migliore
  const metricRows: { label: string; value: (s: SavedSquad) => number | string; higherIsBetter?: boolean; suffix?: string }[] = [
    { label: 'Modulo', value: s => s.formation },
    { label: 'Spesa', value: s => s.budgetSpent, suffix: ' cr' },
    { label: 'Punti a giornata', value: s => s.projectedFantaPoints, higherIsBetter: true },
    { label: 'Gol attesi', value: s => s.projectedGoals, higherIsBetter: true },
    { label: 'Assist attesi', value: s => s.projectedAssists, higherIsBetter: true },
    { label: 'Rigoristi', value: s => s.penaltyTakersCount, higherIsBetter: true },
    { label: 'Titolarità media', value: s => s.averageStarterProbability, higherIsBetter: true, suffix: '%' },
    { label: 'Spesa porta', value: s => s.budgetBreakdown.P, suffix: ' cr' },
    { label: 'Spesa difesa', value: s => s.budgetBreakdown.D, suffix: ' cr' },
    { label: 'Spesa centrocampo', value: s => s.budgetBreakdown.C, suffix: ' cr' },
    { label: 'Spesa attacco', value: s => s.budgetBreakdown.A, suffix: ' cr' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div className="glass-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--info-soft)',
            color: 'var(--info)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GitCompare size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Confronta le tue rose</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Salva le rose da &quot;La Mia Rosa&quot; con il pulsante Salva, poi selezionane fino a {MAX_COMPARE} qui per confrontarle
            </p>
          </div>
        </div>
      </div>

      {/* Saved list or empty state */}
      {savedSquads.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '48px 20px' }}>
          <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '6px' }}>Nessuna rosa salvata</p>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Genera o costruisci una rosa in &quot;La Mia Rosa&quot; e premi Salva: la ritroverai qui, pronta per il confronto.
          </p>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {savedSquads.map(sq => {
            const isSelected = selectedIds.includes(sq.id);
            return (
              <div
                key={sq.id}
                onClick={() => toggleSelect(sq.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  background: 'var(--bg-input)',
                  border: '1px solid ' + (isSelected ? 'var(--accent-emerald)' : 'var(--border-subtle)'),
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '5px',
                    border: '1.5px solid ' + (isSelected ? 'var(--accent-emerald)' : 'var(--text-muted)'),
                    background: isSelected ? 'var(--accent-emerald)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff'
                  }}>
                    {isSelected && <Check size={13} strokeWidth={3} />}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {sq.name}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span>{formatDate(sq.createdAt)}</span>
                      <span>{sq.formation}</span>
                      <span>{sq.budgetSpent}/{sq.totalBudget} cr</span>
                      <span>{sq.projectedFantaPoints} pt/g</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedIds(prev => prev.filter(x => x !== sq.id));
                    onDeleteSquad(sq.id);
                  }}
                  className="btn-icon"
                  style={{ width: '30px', height: '30px', flexShrink: 0 }}
                  title="Elimina questa rosa salvata"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Comparison */}
      {selected.length >= 2 && (
        <>
          <div className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: `${180 + selected.length * 140}px` }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}></th>
                    {selected.map(sq => (
                      <th key={sq.id} style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {sq.name.replace(/\s*\(.*\)/, '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metricRows.map(row => {
                    const values = selected.map(s => row.value(s));
                    const numeric = values.every(v => typeof v === 'number');
                    const bestVal = row.higherIsBetter && numeric ? Math.max(...(values as number[])) : null;
                    return (
                      <tr key={row.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '9px 16px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{row.label}</td>
                        {values.map((v, i) => {
                          const isBest = bestVal !== null && v === bestVal;
                          return (
                            <td key={selected[i].id} style={{
                              padding: '9px 16px',
                              textAlign: 'right',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: isBest ? 800 : 600,
                              color: isBest ? 'var(--accent-emerald-light)' : 'var(--text-primary)',
                              whiteSpace: 'nowrap'
                            }}>
                              {v}{row.suffix || ''}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Starting XIs side by side */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${selected.length}, minmax(240px, 1fr))`,
            gap: '14px',
            overflowX: 'auto'
          }}>
            {selected.map(sq => (
              <div key={sq.id} className="glass-card" style={{ padding: '14px' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '10px' }}>
                  Titolari <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.78rem' }}>({sq.formation})</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {sq.startingXI.map(p => (
                    <div
                      key={p.id}
                      onClick={() => onSelectPlayer(p)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', cursor: 'pointer', padding: '3px 0' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                        <span className={`role-badge ${p.role as Role}`}>{p.role}</span>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                        {calculateDynamicPrice(p, sq.totalBudget, sq.participants || 8)} cr
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {savedSquads.length > 0 && selected.length < 2 && (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Seleziona almeno 2 rose per vedere il confronto
        </p>
      )}
    </div>
  );
};
