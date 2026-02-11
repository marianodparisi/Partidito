export enum Position {
  GK = 'Arquero',
  DEF = 'Defensa',
  MID = 'Medio',
  FWD = 'Ofensa'
}

export type PositionSkillMap = Record<Position, number>;

export interface Player {
  id: string;
  name: string;
  skill: number; // Represents the Average Skill (Overall)
  positions: Position[]; // Derived: The position(s) with the highest skill
  positionSkills: PositionSkillMap; // Specific skill for each position (Mandatory)
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

export interface SavedMatch extends MatchResult {
  id: string;
  timestamp: number;
}