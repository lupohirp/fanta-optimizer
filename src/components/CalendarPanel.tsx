'use client';

import React from 'react';
import { Player, GeneratedSquad, LeagueSettings } from '../types';
import {
  TeamStrength,
  upcomingFixtures,
  calendarVerdict,
  roleCoverage,
  bestGapFillers,
  currentRound,
  TOTAL_ROUNDS
} from '../lib/calendar';
import { calculateDynamicPrice } from '../lib/optimizer';
import { CalendarDays } from 'lucide-react';

interface CalendarPanelProps {
  squad: GeneratedSquad;
  allPlayers: Player[];
  settings: LeagueSettings;
  strengths: Record<string, TeamStrength>;
  onSelectPlayer: (player: Player) => void;
}

/** Quante giornate guardiamo avanti: all'asta conta l'avvio, non maggio */
const HORIZON = 5;
const COVERAGE_HORIZON = 6;

/** Scala a cinque passi: dal verde pieno (partita agevole) al rosso (proibitiva) */
export function difficultyColor(d: number): { bg: string; fg: string; border: string } {
  if (d <= 1) return { bg: 'var(--accent-emerald)', fg: 'var(--text-inverse)', border: 'var(--accent-emerald)' };
  if (d === 2) return { bg: 'var(--accent-emerald-soft)', fg: 'var(--accent-emerald)', border: 'var(--accent-emerald-border)' };
  if (d === 3) return { bg: 'var(--bg-card-subtle)', fg: 'var(--text-secondary)', border: 'var(--border-subtle)' };
  if (d === 4) return { bg: 'var(--accent-gold-soft)', fg: 'var(--accent-gold)', border: 'var(--accent-gold-border)' };
  return { bg: 'var(--danger-soft)', fg: 'var(--danger)', border: 'var(--danger-border)' };
}

const ordinal = (n: number) => `${n}ª`;

export const CalendarPanel: React.FC<CalendarPanelProps> = ({
  squad,
  allPlayers,
  settings,
  strengths,
  onSelectPlayer
}) => {
  const from = currentRound();
  if (from > TOTAL_ROUNDS || squad.startingXI.length === 0) return null;

  const rated = squad.startingXI.map(p => ({
    player: p,
    fixtures: upcomingFixtures(p.team, p.role, strengths, from, HORIZON)
  }));

  const withVerdict = rated.map(r => ({ ...r, verdict: calendarVerdict(r.fixtures) }));
  const xiAvg = withVerdict.reduce((s, r) => s + r.verdict.avg, 0) / withVerdict.length;
  const overall = calendarVerdict([{ round: 0, opponent: '', home: true, start: '', difficulty: xiAvg }]);

  const sorted = [...withVerdict].sort((a, b) => a.verdict.avg - b.verdict.avg);
  const best = sorted.slice(0, 3);
  const worst = sorted.slice(-3).reverse();

  // Copertura dell'attacco titolare: quante giornate hanno almeno una partita agevole
  const strikers = squad.startingXI.filter(p => p.role === 'A');
  const coverage = roleCoverage(strikers, strengths, from, COVERAGE_HORIZON);
  const ownedIds = new Set(squad.players.map(p => p.id));
  const fillers = bestGapFillers(
    coverage.uncovered,
    allPlayers.filter(p => p.role === 'A' && !ownedIds.has(p.id) && p.starterProbability >= 70),
    strengths,
    from,
    COVERAGE_HORIZON
  );

  const row = (entry: typeof withVerdict[number]) => (
    <div
      key={entry.player.id}
      onClick={() => onSelectPlayer(entry.player)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '3px 0' }}
    >
      <span className={`role-badge ${entry.player.role}`}>{entry.player.role}</span>
      <span style={{ fontSize: '0.84rem', fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.player.name}
      </span>
      <span style={{ marginLeft: 'auto', display: 'flex', gap: '3px' }}>
        {entry.fixtures.map(f => {
          const c = difficultyColor(f.difficulty);
          return (
            <span
              key={f.round}
              title={`${ordinal(f.round)} giornata: ${f.home ? '' : 'in casa del '}${f.opponent}${f.home ? ' in casa' : ''}`}
              style={{
                background: c.bg,
                color: c.fg,
                border: `1px solid ${c.border}`,
                borderRadius: '4px',
                padding: '2px 5px',
                fontSize: '0.66rem',
                fontFamily: 'var(--font-mono)',
                whiteSpace: 'nowrap'
              }}
            >
              {f.home ? '' : '@'}{f.opponent.slice(0, 3).toUpperCase()}
            </span>
          );
        })}
      </span>
    </div>
  );

  return (
    <div className="glass-card" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <CalendarDays size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Come parte la tua rosa</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Le prossime {HORIZON} giornate, dalla {ordinal(from)}: {overall.label}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem' }}>
            {xiAvg.toFixed(1)}<span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>/5</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>difficoltà media</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Partono meglio</div>
          {best.map(row)}
        </div>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Partono peggio</div>
          {worst.map(row)}
        </div>
      </div>

      {/* La combo: non conta che uno abbia il calendario buono, conta non restare mai scoperti */}
      <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          {coverage.uncovered.length === 0 ? (
            <>
              In tutte le prime {COVERAGE_HORIZON} giornate hai almeno un attaccante titolare con
              una partita agevole: l&apos;attacco non va mai in apnea.
            </>
          ) : (
            <>
              I tuoi attaccanti titolari hanno una partita agevole in{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {coverage.covered.length} giornate su {coverage.covered.length + coverage.uncovered.length}
              </strong>
              . Scoperte: {coverage.uncovered.map(ordinal).join(', ')}.
            </>
          )}
        </div>

        {fillers.length > 0 && (
          <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>le coprirebbe</span>
            {fillers.map(g => (
              <span
                key={g.player.id}
                onClick={() => onSelectPlayer(g.player)}
                title={`${g.player.name} ha una partita agevole ${g.rounds.map(ordinal).join(' e ')}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px 9px',
                  fontSize: '0.76rem',
                  cursor: 'pointer'
                }}
              >
                <span style={{ fontWeight: 600 }}>{g.player.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{g.player.team}</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald-light)' }}>
                  {calculateDynamicPrice(g.player, settings.totalBudget, settings.participants)} cr
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
