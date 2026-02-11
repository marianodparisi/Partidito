import { Player, Team, MatchResult, Position } from '../types';

export const calculateTeamStats = (players: Player[], name: string): Team => {
  // Total skill now reflects the overall utility. 
  // However, for stats display, we might want to sum their "Average Skill".
  const totalSkill = players.reduce((sum, p) => sum + p.skill, 0);
  return {
    name,
    players,
    totalSkill: parseFloat(totalSkill.toFixed(2)),
    averageSkill: players.length > 0 ? parseFloat((totalSkill / players.length).toFixed(2)) : 0
  };
};

const getFieldSkill = (p: Player): number => {
  // Average of non-GK positions
  return (p.positionSkills[Position.DEF] + p.positionSkills[Position.MID] + p.positionSkills[Position.FWD]) / 3;
};

export const generateBalancedTeams = (availablePlayers: Player[]): MatchResult => {
  if (availablePlayers.length === 0) {
    return { 
      teamA: calculateTeamStats([], "Equipo 1"), 
      teamB: calculateTeamStats([], "Equipo 2"), 
      skillDifference: 0 
    };
  }

  // 1. Sort everyone by GK skill to find the designated Goalkeepers
  // We assume we need 2 GKs for a match.
  const sortedByGK = [...availablePlayers].sort((a, b) => b.positionSkills[Position.GK] - a.positionSkills[Position.GK]);
  
  // Pick top 2 as GKs
  const goalkeepers = sortedByGK.slice(0, 2);
  const fieldPlayers = sortedByGK.slice(2);

  const teamAPlayers: Player[] = [];
  const teamBPlayers: Player[] = [];

  // Distribute GKs: Best GK to Team A? 
  // To balance, maybe best GK goes to Team B if we assume snake draft logic later?
  // Let's just alternate for now.
  if (goalkeepers.length > 0) teamAPlayers.push(goalkeepers[0]);
  if (goalkeepers.length > 1) teamBPlayers.push(goalkeepers[1]);

  // 2. Sort remaining players by FIELD skill (DEF/MID/FWD avg)
  fieldPlayers.sort((a, b) => getFieldSkill(b) - getFieldSkill(a));

  // 3. Snake draft / Greedy balance for field players
  fieldPlayers.forEach((player) => {
    // We balance based on the "Effective Field Skill" accumulated so far + the GK's field utility?
    // Actually, simple skill sum is usually robust enough, but let's use the field skill metric for field players.
    // For the existing GKs in the team, should we count their field skill? 
    // Yes, in amateur football GKs also play. But for "Balanced Teams" we usually care about the total "Power".
    // Let's use the player.skill (Total Average) for the greedy decision to keep it simple and robust.
    
    const skillA = teamAPlayers.reduce((sum, p) => sum + p.skill, 0);
    const skillB = teamBPlayers.reduce((sum, p) => sum + p.skill, 0);

    if (teamAPlayers.length < teamBPlayers.length) {
      teamAPlayers.push(player);
    } else if (teamBPlayers.length < teamAPlayers.length) {
      teamBPlayers.push(player);
    } else {
      if (skillA <= skillB) {
        teamAPlayers.push(player);
      } else {
        teamBPlayers.push(player);
      }
    }
  });

  const teamA = calculateTeamStats(teamAPlayers, "Equipo 1");
  const teamB = calculateTeamStats(teamBPlayers, "Equipo 2");

  return {
    teamA,
    teamB,
    skillDifference: parseFloat(Math.abs(teamA.totalSkill - teamB.totalSkill).toFixed(2))
  };
};