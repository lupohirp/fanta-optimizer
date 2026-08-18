'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Player, LeagueSettings, GeneratedSquad } from '../types';
import { INITIAL_PLAYERS } from '../data/players';
import { optimizeSquad, findAlternatives, calculateDynamicPrice } from '../lib/optimizer';
import { formatSquadForWhatsApp, exportSquadToCSV } from '../lib/export';

import { Navbar, TabType } from '../components/Navbar';
import { ConfigPanel } from '../components/ConfigPanel';
import { BudgetBreakdown } from '../components/BudgetBreakdown';
import { PitchView } from '../components/PitchView';
import { SquadTable } from '../components/SquadTable';
import { LiveAuctionAssistant } from '../components/LiveAuctionAssistant';
import { PlayerDatabase } from '../components/PlayerDatabase';
import { SquadComparator } from '../components/SquadComparator';
import { StrategyGuide } from '../components/StrategyGuide';
import { PlayerModal } from '../components/PlayerModal';

import { 
  Sparkles, 
  LayoutGrid, 
  Table as TableIcon, 
  Download, 
  Share2, 
  Check, 
  Replace,
  Pin
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('generator');
  const [allPlayers, setAllPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'pitch' | 'table'>('pitch');
  const [selectedPlayerForModal, setSelectedPlayerForModal] = useState<Player | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Piano B quick modal state
  const [alternativeTargetPlayer, setAlternativeTargetPlayer] = useState<Player | null>(null);
  const [alternativeList, setAlternativeList] = useState<Player[]>([]);

  // League settings
  const [settings, setSettings] = useState<LeagueSettings>({
    totalBudget: 500,
    participants: 8,
    defenseModifier: false,
    cleanSheetBonus: false,
    strategy: 'balanced',
    targetFormation: 'auto',
    slots: {
      P: 3,
      D: 8,
      C: 8,
      A: 6
    }
  });

  // Current generated squad
  const [squad, setSquad] = useState<GeneratedSquad>(() => {
    return optimizeSquad(INITIAL_PLAYERS, {
      totalBudget: 500,
      participants: 8,
      defenseModifier: false,
      cleanSheetBonus: false,
      strategy: 'balanced',
      targetFormation: 'auto',
      slots: { P: 3, D: 8, C: 8, A: 6 }
    }, []);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Generation handler
  const handleGenerateSquad = useCallback(() => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = optimizeSquad(allPlayers, settings, pinnedIds);
      setSquad(generated);
      setIsGenerating(false);
      showToast('⚡ Rosa ottimizzata con successo!');
    }, 250);
  }, [allPlayers, settings, pinnedIds]);

  // Toggle player pin
  const handleTogglePin = (playerId: string) => {
    setPinnedIds(prev => {
      const exists = prev.includes(playerId);
      const next = exists ? prev.filter(id => id !== playerId) : [...prev, playerId];
      showToast(exists ? '🔓 Giocatore sbloccato' : '📌 Giocatore bloccato nella rosa!');
      return next;
    });
  };

  // Request alternatives (Piano B)
  const handleRequestAlternatives = (player: Player) => {
    const currentSquadIds = squad.players.map(p => p.id);
    const alts = findAlternatives(
      player, 
      allPlayers, 
      settings.totalBudget, 
      settings.participants, 
      currentSquadIds
    );
    setAlternativeTargetPlayer(player);
    setAlternativeList(alts);
  };

  // Swap player in current squad
  const handleSwapPlayer = (oldPlayer: Player, newPlayer: Player) => {
    // Replace in squad
    const updatedPlayers = squad.players.map(p => p.id === oldPlayer.id ? newPlayer : p);
    
    // Also update pinned if old was pinned
    if (pinnedIds.includes(oldPlayer.id)) {
      setPinnedIds(prev => [...prev.filter(id => id !== oldPlayer.id), newPlayer.id]);
    }

    const customSettings = { ...settings };
    const reoptimized = optimizeSquad(allPlayers, customSettings, [...pinnedIds.filter(id => id !== oldPlayer.id), newPlayer.id]);
    setSquad(reoptimized);
    setAlternativeTargetPlayer(null);
    showToast(`✅ Sostituito ${oldPlayer.name} con ${newPlayer.name}!`);
  };

  // Share for WhatsApp
  const handleShareWhatsApp = () => {
    const text = formatSquadForWhatsApp(squad, settings.totalBudget, settings.participants);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('📋 Rosa formattata copiata negli appunti per WhatsApp!');
    } else {
      showToast('Impossibile accedere agli appunti');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    exportSquadToCSV(squad, settings.totalBudget, settings.participants);
    showToast('📥 Download file CSV avviato!');
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 999,
          background: 'var(--bg-card)',
          border: '1px solid var(--accent-emerald)',
          color: 'var(--text-primary)',
          padding: '12px 20px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontSize: '0.9rem',
          fontWeight: 600,
          animation: 'modalPop 0.2s ease-out'
        }}>
          <Check size={18} style={{ color: 'var(--accent-emerald-light)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onShareWhatsApp={handleShareWhatsApp}
        hasSquad={Boolean(squad)}
      />

      {/* Main Tab Content */}
      <main>
        {activeTab === 'generator' && (
          <div>
            {/* Parameters & Strategy Control Panel */}
            <ConfigPanel
              settings={settings}
              setSettings={setSettings}
              onGenerate={handleGenerateSquad}
              pinnedCount={pinnedIds.length}
              isGenerating={isGenerating}
            />

            {/* Budget Breakdown & High-level Metrics */}
            <BudgetBreakdown
              squad={squad}
              totalBudget={settings.totalBudget}
            />

            {/* View Switcher & Action Bar */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-card)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setViewMode('pitch')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: viewMode === 'pitch' ? 'var(--accent-emerald)' : 'transparent',
                    color: viewMode === 'pitch' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <LayoutGrid size={15} />
                  <span>Campo Titolari (11)</span>
                </button>

                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: viewMode === 'table' ? 'var(--accent-emerald)' : 'transparent',
                    color: viewMode === 'table' ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  <TableIcon size={15} />
                  <span>Rosa Completa (25)</span>
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleExportCSV}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <Download size={14} />
                  <span>Esporta CSV</span>
                </button>

                <button
                  onClick={handleShareWhatsApp}
                  className="btn-primary"
                  style={{ padding: '8px 16px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <Share2 size={14} />
                  <span>Copia per WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Display Selected View (Pitch vs Full Table) */}
            {viewMode === 'pitch' ? (
              <PitchView
                startingXI={squad.startingXI}
                bench={squad.bench}
                formation={squad.formation}
                totalBudget={settings.totalBudget}
                participants={settings.participants}
                onSelectPlayer={(p) => setSelectedPlayerForModal(p)}
              />
            ) : (
              <SquadTable
                squad={squad}
                totalBudget={settings.totalBudget}
                participants={settings.participants}
                pinnedIds={pinnedIds}
                onTogglePin={handleTogglePin}
                onSelectPlayer={(p) => setSelectedPlayerForModal(p)}
                onRequestAlternatives={handleRequestAlternatives}
              />
            )}
          </div>
        )}

        {activeTab === 'live_auction' && (
          <LiveAuctionAssistant
            squad={squad}
            allPlayers={allPlayers}
            totalBudget={settings.totalBudget}
            participants={settings.participants}
            onSelectPlayer={(p) => setSelectedPlayerForModal(p)}
          />
        )}

        {activeTab === 'database' && (
          <PlayerDatabase
            players={allPlayers}
            totalBudget={settings.totalBudget}
            participants={settings.participants}
            pinnedIds={pinnedIds}
            onTogglePin={handleTogglePin}
            onSelectPlayer={(p) => setSelectedPlayerForModal(p)}
          />
        )}

        {activeTab === 'comparator' && (
          <SquadComparator
            allPlayers={allPlayers}
            settings={settings}
            onSelectPlayer={(p) => setSelectedPlayerForModal(p)}
          />
        )}

        {activeTab === 'guide' && (
          <StrategyGuide />
        )}
      </main>

      {/* Player Scout Modal */}
      {selectedPlayerForModal && (
        <PlayerModal
          player={selectedPlayerForModal}
          onClose={() => setSelectedPlayerForModal(null)}
          totalBudget={settings.totalBudget}
          participants={settings.participants}
          isPinned={pinnedIds.includes(selectedPlayerForModal.id)}
          onTogglePin={handleTogglePin}
        />
      )}

      {/* Alternative Piano B Quick Swap Modal */}
      {alternativeTargetPlayer && (
        <div className="modal-overlay" onClick={() => setAlternativeTargetPlayer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                  Alternative per {alternativeTargetPlayer.name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Sostituisci questo giocatore con un profilo equivalente per prezzo e fanta-media
                </p>
              </div>
              <button onClick={() => setAlternativeTargetPlayer(null)} className="btn-icon">✕</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {alternativeList.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nessuna alternativa disponibile in questa fascia.</p>
              ) : (
                alternativeList.map(alt => {
                  const altPrice = calculateDynamicPrice(alt, settings.totalBudget, settings.participants);
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
                          FM attesa: <strong style={{ color: 'var(--accent-emerald-light)' }}>{alt.expectedPoints.toFixed(1)}</strong> {alt.isPenaltyTaker && '• 🎯 Rigori'}
                        </div>
                        {alt.notes && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {alt.notes}
                          </div>
                        )}
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
                          onClick={() => handleSwapPlayer(alternativeTargetPlayer, alt)}
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        >
                          Sostituisci
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
}
