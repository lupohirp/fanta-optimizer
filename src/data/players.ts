import { Player, StrategyInfo } from '../types';
import officialPlayersJson from './official_2026_27_players.json';

export const STRATEGIES: Record<string, StrategyInfo> = {
  balanced: {
    id: 'balanced',
    name: 'Bilanciata (Moneyball)',
    shortDesc: 'Massimo rendimento per ogni singolo credito',
    description: 'Distribuzione equilibrata senza follie su singoli giocatori. Rosa profonda con titolari costanti in ogni reparto.',
    icon: 'Target',
    budgetWeights: { P: 0.08, D: 0.18, C: 0.30, A: 0.44 },
    recommendedFormation: '3-4-3',
  },
  heavy_attack: {
    id: 'heavy_attack',
    name: 'Attacco Pesante (Top Bomber)',
    shortDesc: '1-2 Top assoluti in attacco + Titolari low-cost',
    description: 'Investe circa il 50-55% del budget nel reparto offensivo per assicurarsi i capocannonieri del campionato. Difesa e porta low cost.',
    icon: 'Sword',
    budgetWeights: { P: 0.06, D: 0.14, C: 0.25, A: 0.55 },
    recommendedFormation: '3-4-3',
  },
  defense_modifier: {
    id: 'defense_modifier',
    name: 'Modificatore Difesa',
    shortDesc: 'Top Portiere + 3-4 Difensori da bonus/6.5',
    description: 'Pensata per leghe con il bonus modificatore. Punta su difensori con media voto alta e portiere di primissima fascia con tanti clean sheet.',
    icon: 'Shield',
    budgetWeights: { P: 0.12, D: 0.28, C: 0.26, A: 0.34 },
    recommendedFormation: '4-3-3',
  },
  midfield_power: {
    id: 'midfield_power',
    name: 'Centrocampo da Bonus',
    shortDesc: 'Incursori e rigoristi in mediana + Attacco corale',
    description: 'Punta su centrocampisti che giocano vicini alla porta avversaria (rigoristi/trequartisti) e tridenti offensivi composti da 2° e 3° slot.',
    icon: 'Zap',
    budgetWeights: { P: 0.07, D: 0.16, C: 0.42, A: 0.35 },
    recommendedFormation: '3-5-2',
  },
  hype_young: {
    id: 'hype_young',
    name: 'Scommesse & Talenti',
    shortDesc: 'Titolari economici + giovani ad alto potenziale',
    description: 'Punta su nuovi acquisti, giovani talenti e giocatori sottovalutati per creare una rosa a costo contenuto ma con potenziale esplosivo.',
    icon: 'Sparkles',
    budgetWeights: { P: 0.07, D: 0.17, C: 0.33, A: 0.43 },
    recommendedFormation: '3-4-3',
  },
};

export const SERIE_A_TEAMS = [
  'Atalanta', 'Bologna', 'Cagliari', 'Como', 'Empoli', 'Fiorentina', 
  'Genoa', 'Inter', 'Juventus', 'Lazio', 'Lecce', 'Milan', 
  'Monza', 'Napoli', 'Parma', 'Roma', 'Torino', 'Udinese', 'Venezia', 'Verona',
  'Frosinone', 'Sassuolo'
];

export const INITIAL_PLAYERS: Player[] = officialPlayersJson as Player[];
