'use client';

import React from 'react';
import { GeneratedSquad, Role } from '../types';
import {
  Coins,
  Target,
  Flame,
  UserCheck
} from 'lucide-react';

interface BudgetBreakdownProps {
  squad: GeneratedSquad;
  totalBudget: number;
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  squad,
  totalBudget
}) => {
  const roles: { role: Role; color: string }[] = [
    { role: 'P', color: '#fbbf24' },
    { role: 'D', color: '#34d399' },
    { role: 'C', color: '#60a5fa' },
    { role: 'A', color: '#f87171' },
  ];

  return (
    <div className="glass-card" style={{ marginBottom: '24px', padding: '18px 20px' }}>
      {/* Key metrics row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Coins size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Spesa</span>
          </div>
          <div className="stat-widget-value">
            {squad.budgetSpent} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>/ {totalBudget} cr</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--accent-emerald-light)' }}>
            {squad.budgetRemaining} crediti avanzati
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Target size={14} style={{ color: 'var(--accent-emerald-light)' }} />
            <span>FM 11 Titolare</span>
          </div>
          <div className="stat-widget-value" style={{ color: 'var(--accent-emerald-light)' }}>
            {squad.projectedFantaPoints} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pt/g</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            FantaMedia attesa a giornata
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Flame size={14} style={{ color: '#f87171' }} />
            <span>Bonus Attesi</span>
          </div>
          <div className="stat-widget-value">
            ~{squad.projectedGoals} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>gol</span>
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            ~{squad.projectedAssists} assist · {squad.penaltyTakersCount} rigoristi
          </div>
        </div>

        <div className="stat-widget">
          <div className="stat-widget-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <UserCheck size={14} style={{ color: 'var(--accent-gold)' }} />
            <span>Titolarità Media</span>
          </div>
          <div className="stat-widget-value">
            {squad.averageStarterProbability}%
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
            Rischio s.v. minimo
          </div>
        </div>
      </div>

      {/* Budget split by role: stacked bar + inline chips */}
      <div style={{
        height: '10px',
        width: '100%',
        borderRadius: '5px',
        background: 'var(--bg-input)',
        overflow: 'hidden',
        display: 'flex',
        marginBottom: '10px'
      }}>
        <div style={{ width: `${squad.budgetPercentages.P}%`, background: '#f59e0b', transition: 'width 0.3s' }} title={`Porta: ${squad.budgetPercentages.P}%`} />
        <div style={{ width: `${squad.budgetPercentages.D}%`, background: '#10b981', transition: 'width 0.3s' }} title={`Difesa: ${squad.budgetPercentages.D}%`} />
        <div style={{ width: `${squad.budgetPercentages.C}%`, background: '#3b82f6', transition: 'width 0.3s' }} title={`Centrocampo: ${squad.budgetPercentages.C}%`} />
        <div style={{ width: `${squad.budgetPercentages.A}%`, background: '#ef4444', transition: 'width 0.3s' }} title={`Attacco: ${squad.budgetPercentages.A}%`} />
      </div>

      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
        {roles.map(({ role, color }) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span className={`role-badge ${role}`}>{role}</span>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color }}>
              {squad.budgetBreakdown[role]} cr
            </span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              ({squad.budgetPercentages[role]}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
