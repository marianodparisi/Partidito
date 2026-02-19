import {
  dbAddPlayer,
  dbDeleteMatch,
  dbDeletePlayer,
  dbGetHistory,
  dbGetPlayers,
  dbSaveMatch,
  dbUpdateMatch,
  dbUpdatePlayer
} from '../db';
import { Player, Position, SavedMatch } from '../../types';

const DB_NAME = 'football_balancer_db';

const resetDatabase = async () => {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('IndexedDB deletion blocked during tests; retrying.');
      resolve();
    };
  });
};

const createPlayer = (overrides: Partial<Player> = {}): Player => ({
  id: crypto.randomUUID(),
  name: 'Test Player',
  skill: 5,
  positions: [Position.MID],
  positionSkills: {
    [Position.GK]: 1,
    [Position.DEF]: 5,
    [Position.MID]: 7,
    [Position.FWD]: 3
  },
  ...overrides
});

const createMatch = (players: Player[], overrides: Partial<SavedMatch> = {}): SavedMatch => ({
  id: crypto.randomUUID(),
  timestamp: Date.now(),
  teamA: {
    name: 'Equipo Verde',
    players: players.slice(0, Math.ceil(players.length / 2)),
    totalSkill: 20,
    averageSkill: 5
  },
  teamB: {
    name: 'Equipo Blanco',
    players: players.slice(Math.ceil(players.length / 2)),
    totalSkill: 18,
    averageSkill: 4.5
  },
  skillDifference: 0.5,
  ...overrides
});

describe('IndexedDB helpers', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('adds and retrieves players', async () => {
    const player = createPlayer({ name: 'Lucía' });
    await dbAddPlayer(player);

    const players = await dbGetPlayers();
    expect(players).toHaveLength(1);
    expect(players[0]?.name).toBe('Lucía');
  });

  it('updates existing players', async () => {
    const player = createPlayer({ name: 'Miguel', skill: 4 });
    await dbAddPlayer(player);

    const updated: Player = {
      ...player,
      name: 'Miguel Ángel',
      skill: 8,
      positionSkills: {
        ...player.positionSkills,
        [Position.FWD]: 9
      }
    };

    await dbUpdatePlayer(updated);

    const [stored] = await dbGetPlayers();
    expect(stored?.name).toBe('Miguel Ángel');
    expect(stored?.skill).toBe(8);
    expect(stored?.positionSkills[Position.FWD]).toBe(9);
  });

  it('deletes players', async () => {
    const player = createPlayer();
    await dbAddPlayer(player);

    await dbDeletePlayer(player.id);
    const players = await dbGetPlayers();
    expect(players).toHaveLength(0);
  });

  it('stores match history in reverse chronological order', async () => {
    const basePlayers = [createPlayer({ name: 'A' }), createPlayer({ name: 'B' }), createPlayer({ name: 'C' })];

    const olderMatch = createMatch(basePlayers, { timestamp: 1_700_000_000_000 });
    const newerMatch = createMatch(basePlayers, { timestamp: 1_800_000_000_000 });

    await dbSaveMatch(olderMatch);
    await dbSaveMatch(newerMatch);

    const history = await dbGetHistory();
    expect(history).toHaveLength(2);
    expect(history[0]?.id).toBe(newerMatch.id);
    expect(history[1]?.id).toBe(olderMatch.id);
  });

  it('removes matches from history', async () => {
    const players = [createPlayer({ name: 'A' }), createPlayer({ name: 'B' })];
    const match = createMatch(players);

    await dbSaveMatch(match);
    await dbDeleteMatch(match.id);

    const history = await dbGetHistory();
    expect(history).toHaveLength(0);
  });

  it('updates match score in history', async () => {
    const players = [createPlayer({ name: 'A' }), createPlayer({ name: 'B' })];
    const match = createMatch(players, { scoreA: 1, scoreB: 1 });

    await dbSaveMatch(match);
    await dbUpdateMatch({ ...match, scoreA: 3, scoreB: 2 });

    const [stored] = await dbGetHistory();
    expect(stored?.scoreA).toBe(3);
    expect(stored?.scoreB).toBe(2);
  });
});
