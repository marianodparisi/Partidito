import { supabase } from './supabase';
import { Player, SavedMatch } from '../types';

// ============ PLAYERS ============

export const dbGetPlayers = async (): Promise<Player[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching players:', error);
    return [];
  }

  return (data || []).map(p => ({
    id: p.id,
    name: p.name,
    skill: p.skill,
    positions: p.positions,
    positionSkills: p.position_skills,
    ...(p.stamina != null && { stamina: p.stamina }),
  }));
};

export const dbAddPlayer = async (player: Player): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('players')
    .insert({
      id: player.id,
      user_id: user.id,
      name: player.name,
      skill: player.skill,
      positions: player.positions,
      position_skills: player.positionSkills,
      stamina: player.stamina ?? null,
    });

  if (error) {
    console.error('Error adding player:', error);
    throw error;
  }
};

export const dbUpdatePlayer = async (player: Player): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('players')
    .update({
      name: player.name,
      skill: player.skill,
      positions: player.positions,
      position_skills: player.positionSkills,
      stamina: player.stamina ?? null,
      updated_at: new Date().toISOString()
    })
    .eq('id', player.id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating player:', error);
    throw error;
  }
};

export const dbDeletePlayer = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('players')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting player:', error);
    throw error;
  }
};

// ============ MATCHES ============

export const dbGetHistory = async (): Promise<SavedMatch[]> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .eq('user_id', user.id)
    .order('timestamp', { ascending: false });

  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }

  return (data || []).map(m => ({
    id: m.id,
    timestamp: m.timestamp,
    teamA: m.team_a,
    teamB: m.team_b,
    skillDifference: m.skill_difference
  }));
};

export const dbSaveMatch = async (match: SavedMatch): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('matches')
    .insert({
      id: match.id,
      user_id: user.id,
      timestamp: match.timestamp,
      team_a: match.teamA,
      team_b: match.teamB,
      skill_difference: match.skillDifference
    });

  if (error) {
    console.error('Error saving match:', error);
    throw error;
  }
};

export const dbDeleteMatch = async (id: string): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting match:', error);
    throw error;
  }
};

// ============ SHARED MATCHES ============

export const dbShareMatch = async (match: import('../types').MatchResult): Promise<string> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const id = crypto.randomUUID();
  const { error } = await supabase
    .from('shared_matches')
    .insert({
      id,
      user_id: user.id,
      data: match,
    });

  if (error) {
    console.error('Error sharing match:', error);
    throw error;
  }

  return id;
};

export const dbGetSharedMatch = async (id: string): Promise<import('../types').MatchResult | null> => {
  const { data, error } = await supabase
    .from('shared_matches')
    .select('data')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data.data as import('../types').MatchResult;
};
