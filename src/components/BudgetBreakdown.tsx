'use client';

import React from 'react';
import { GeneratedSquad, Role } from '../types';

interface BudgetBreakdownProps {
  squad: GeneratedSquad;
  totalBudget: number;
}

export const BudgetBreakdown: React.FC<BudgetBreakdownProps> = ({
  squad,
  totalBudget
}) => {
  const roles: { role: Role; color: string }[] = [
    { role: 'P', color: 'var(--role-p-text)' },
    { role: 'D', color: 'var(--role-d-text)' },
    { role: 'C', color: 'var(--role-c-text)' },
    { role: 'A', color: 'var(--role-a-text)' },
  ];

  return (
    <div className="stat-strip" style={{ flexDirection: 'column', gap: '12px', padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto' }}>
        <div className="stat-strip-item">
          <span
            className="stat-strip-value"
            style={{ color: squad.budgetSpent > totalBudget ? 'var(--danger)' : 'var(--text-primary)' }}
          >
            {squad.budgetSpent}<span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/{totalBudget}</span>
          </span>
          <span className="stat-strip-label">crediti spesi</span>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-value" style={{ color: 'var(--accent-emerald-light)' }}>
            {squad.projectedFantaPoints}
          </span>
          <span className="stat-strip-label">punti a giornata</span>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-value">~{squad.projectedGoals}</span>
          <span className="stat-strip-label">gol attesi</span>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-value">{squad.penaltyTakersCount}</span>
          <span className="stat-strip-label">rigoristi</span>
        </div>

        <div className="stat-strip-item">
          <span className="stat-strip-value">{squad.averageStarterProbability}%</span>
          <span className="stat-strip-label">titolarità</span>
        </div>
      </div>

      {/* Budget split by role */}
      <div>
        <div style={{
          height: '6px',
          width: '100%',
          borderRadius: '3px',
          background: 'var(--bg-input)',
          overflow: 'hidden',
          display: 'flex',
          marginBottom: '8px'
        }}>
          <div style={{ width: `${squad.budgetPercentages.P}%`, background: 'var(--role-p-text)' }} title={`Porta: ${squad.budgetPercentages.P}%`} />
          <div style={{ width: `${squad.budgetPercentages.D}%`, background: 'var(--role-d-text)' }} title={`Difesa: ${squad.budgetPercentages.D}%`} />
          <div style={{ width: `${squad.budgetPercentages.C}%`, background: 'var(--role-c-text)' }} title={`Centrocampo: ${squad.budgetPercentages.C}%`} />
          <div style={{ width: `${squad.budgetPercentages.A}%`, background: 'var(--role-a-text)' }} title={`Attacco: ${squad.budgetPercentages.A}%`} />
        </div>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {roles.map(({ role, color }) => (
            <span key={role} style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, display: 'inline-block' }} />
              <strong style={{ color }}>{role}</strong> {squad.budgetBreakdown[role]} cr
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
