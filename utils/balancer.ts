import { Player, Team, MatchResult, Position } from '../types';

export const calculateTeamStats = (players: Player[], name: string): Team => {
  const totalSkill = players.reduce((sum, p) => sum + p.skill, 0);
  return {
    name,
    players,
    totalSkill: parseFloat(totalSkill.toFixed(2)),
    averageSkill: players.length > 0 ? parseFloat((totalSkill / players.length).toFixed(2)) : 0
  };
};

const getFieldSkill = (p: Player): number => {
  return (p.positionSkills[Position.DEF] + p.positionSkills[Position.MID] + p.positionSkills[Position.FWD]) / 3;
};

// Effective rating that optionally blends stamina into the player's skill value
const getEffectiveSkill = (p: Player, useStamina: boolean): number => {
  if (!useStamina || p.stamina == null) return p.skill;
  // Blend: 70% skill + 30% stamina (stamina is already 0-10 same scale)
  return p.skill * 0.7 + p.stamina * 0.3;
};

export const generateBalancedTeams = (availablePlayers: Player[], useStamina = false): MatchResult => {
  if (availablePlayers.length === 0) {
    return {
      teamA: calculateTeamStats([], "Equipo 1"),
      teamB: calculateTeamStats([], "Equipo 2"),
      skillDifference: 0
    };
  }

  // 1. Sort everyone by GK skill to find the designated Goalkeepers
  const sortedByGK = [...availablePlayers].sort((a, b) => b.positionSkills[Position.GK] - a.positionSkills[Position.GK]);

  const goalkeepers = sortedByGK.slice(0, 2);
  const fieldPlayers = sortedByGK.slice(2);

  const teamAPlayers: Player[] = [];
  const teamBPlayers: Player[] = [];

  if (goalkeepers.length > 0) teamAPlayers.push(goalkeepers[0]);
  if (goalkeepers.length > 1) teamBPlayers.push(goalkeepers[1]);

  // 2. Sort remaining players by FIELD skill
  fieldPlayers.sort((a, b) => getFieldSkill(b) - getFieldSkill(a));

  // 3. Greedy balance using effective skill (with or without stamina)
  fieldPlayers.forEach((player) => {
    const skillA = teamAPlayers.reduce((sum, p) => sum + getEffectiveSkill(p, useStamina), 0);
    const skillB = teamBPlayers.reduce((sum, p) => sum + getEffectiveSkill(p, useStamina), 0);

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