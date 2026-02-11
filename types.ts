export enum Position {
  GK = 'Arquero',
  DEF = 'Defensa',
  MID = 'Medio',
  FWD = 'Ofensa'
}

export interface Player {
  id: string;
  name: string;
  skill: number; // 1-10
  positions: Position[]; // Changed from single position to array
}

export interface Team {
  name: string;
  players: Player[];
  totalSkill: number;
  averageSkill: number;
}

export interface MatchResult {
  teamA: Team;
  teamB: Team;
  skillDifference: number;
}