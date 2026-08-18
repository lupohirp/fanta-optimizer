export type Role = 'P' | 'D' | 'C' | 'A';

export interface HistoricalStats {
  season: string;          // es. '2025-26', '2024-25'
  played: number;          // PG (Partite giocate)
  avgRating: number;       // MV (Media Voto pura)
  fantaAvg: number;        // FM (FantaMedia con bonus/malus)
  goals: number;           // Gol fatti
  goalsConceded?: number;  // Gol subiti (per i portieri)
  assists: number;         // Assist
  penaltiesScored: number; // Rigori segnati
  penaltiesTaken: number;  // Rigori calciati
  yellowCards: number;     // Ammonizioni
  redCards: number;        // Espulsioni
}

export interface Player {
  id: string;
  name: string;
  team: string;
  role: Role;
  quotation: number;         // Quotazione listino ufficiale (es. 1 - 38)
  estimatedPrice500: number;  // Prezzo medio d'asta stimato (su budget 500 / 8 partecipanti)
  expectedPoints: number;     // FantaMedia attesa (es. 5.9 - 8.5)
  tier: 1 | 2 | 3 | 4 | 5;    // 1 = Top Assoluto, 2 = Semitop, 3 = Titolare affidabile, 4 = Rotazione, 5 = Scommessa/Low Cost
  isPenaltyTaker: boolean;    // Rigorista principale o secondario
  isFreeKickTaker: boolean;   // Tiratore piazzati / corner
  starterProbability: number; // Probabilità titolarità % (es. 95, 80, 50)
  expectedGoals: number;      // Gol stimati stagione
  expectedAssists: number;    // Assist stimati stagione
  trend: 'up' | 'stable' | 'down';
  notes?: string;             // Consigli / scout notes
  historicalStats?: HistoricalStats[]; // Statistiche stagioni precedenti
  valueIndex?: number;        // Indice di convenienza (xP / Prezzo)
  avgAuctionPrice500?: number; // Prezzo medio reale registrato nelle aste (base 500)
  minAuctionPrice500?: number; // Range minimo asta reale
  maxAuctionPrice500?: number; // Range massimo asta reale
  budgetPercentage?: number;   // Percentuale media sul budget complessivo (%)
  isCustomPrice?: boolean;     // Indica se l'utente ha impostato un prezzo custom
}

export type StrategyType = 
  | 'balanced'
  | 'heavy_attack'
  | 'defense_modifier'
  | 'midfield_power'
  | 'hype_young';

export interface StrategyInfo {
  id: StrategyType;
  name: string;
  shortDesc: string;
  description: string;
  icon: string;
  budgetWeights: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  recommendedFormation: string;
}

export interface LeagueSettings {
  selectedSeason: string;      // es. '2026-27', '2027-28'
  totalBudget: number;         // es. 500, 1000, 300
  participants: number;        // 6, 8, 10, 12
  defenseModifier: boolean;    // Modificatore difesa attivo?
  cleanSheetBonus: boolean;    // Bonus porta inviolata (+1)
  strategy: StrategyType;
  targetFormation: '3-4-3' | '4-3-3' | '3-5-2' | '4-4-2' | '4-2-3-1' | 'auto';
  slots: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  geminiModel?: string;        // es. 'gemini-3.5-flash-lite'
}

export interface SquadSlot {
  role: Role;
  slotIndex: number;
  slotLabel: string;
  targetBudget: number;
  targetTier: number;
  player: Player | null;
  actualPrice?: number;
  isPinned?: boolean;
}

export interface GeneratedSquad {
  id: string;
  name: string;
  season: string;
  strategy: StrategyType;
  createdAt: number;
  players: Player[];
  pinnedPlayerIds: string[];
  totalBudget: number;
  budgetSpent: number;
  budgetRemaining: number;
  projectedFantaPoints: number;
  projectedGoals: number;
  projectedAssists: number;
  averageStarterProbability: number;
  penaltyTakersCount: number;
  budgetBreakdown: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  budgetPercentages: {
    P: number;
    D: number;
    C: number;
    A: number;
  };
  formation: string;
  startingXI: Player[];
  bench: Player[];
}

export interface LiveAuctionItem {
  id: string;
  role: Role;
  slotNumber: number;
  slotTitle: string;
  targetBudget: number;
  boughtPlayer: Player | null;
  boughtPrice: number | null;
  status: 'pending' | 'bought' | 'skipped';
  suggestedAlternatives: Player[];
}

export interface FilterOptions {
  search: string;
  role: Role | 'ALL';
  team: string | 'ALL';
  maxPrice: number;
  tier: number | 'ALL';
  onlyPenaltyTakers: boolean;
  onlyStarters: boolean;
  sortBy: 'price' | 'points' | 'quotation' | 'name' | 'goals' | 'value' | 'starter';
  sortOrder: 'asc' | 'desc';
}
