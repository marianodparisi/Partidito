import { Player, Team, MatchResult, Position } from '../types';

export const calculateTeamStats = (players: Player[], name: string): Team => {
  const totalSkill = players.reduce((sum, p) => sum + p.skill, 0);
  return {
    name,
    players,
    totalSkill,
    averageSkill: players.length > 0 ? parseFloat((totalSkill / players.length).toFixed(2)) : 0
  };
};

export const generateBalancedTeams = (availablePlayers: Player[]): MatchResult => {
  // Create copies to avoid mutating state directly during sort
  const players = [...availablePlayers];
  
  const teamAPlayers: Player[] = [];
  const teamBPlayers: Player[] = [];

  // 1. Identify Goalkeepers (anyone who has GK in their positions)
  // We prioritize balancing GKs against each other.
  const goalkeepers = players.filter(p => p.positions.includes(Position.GK)).sort((a, b) => b.skill - a.skill);
  
  // 2. Identify pure Field Players (those who do NOT have GK)
  const fieldPlayers = players.filter(p => !p.positions.includes(Position.GK)).sort((a, b) => b.skill - a.skill);

  // Distribute GKs
  goalkeepers.forEach((gk, index) => {
    if (index % 2 === 0) {
      teamAPlayers.push(gk);
    } else {
      teamBPlayers.push(gk);
    }
  });

  // Distribute Field Players using snake draft/greedy balance
  fieldPlayers.forEach((player) => {
    const skillA = teamAPlayers.reduce((sum, p) => sum + p.skill, 0);
    const skillB = teamBPlayers.reduce((sum, p) => sum + p.skill, 0);

    // If teams have different sizes, prioritize filling the smaller team first to avoid numeric imbalance
    if (teamAPlayers.length < teamBPlayers.length) {
      teamAPlayers.push(player);
    } else if (teamBPlayers.length < teamAPlayers.length) {
      teamBPlayers.push(player);
    } else {
      // If sizes are equal, give the player to the weaker team
      if (skillA <= skillB) {
        teamAPlayers.push(player);
      } else {
        teamBPlayers.push(player);
      }
    }
  });

  const teamA = calculateTeamStats(teamAPlayers, "Equipo A");
  const teamB = calculateTeamStats(teamBPlayers, "Equipo B");

  return {
    teamA,
    teamB,
    skillDifference: Math.abs(teamA.totalSkill - teamB.totalSkill)
  };
};