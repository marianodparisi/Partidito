import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, MatchResult, PositionSkillMap, SavedMatch } from './types';
import { generateBalancedTeams } from './utils/balancer';
import { dbAddPlayer, dbDeletePlayer, dbGetPlayers, dbSaveMatch, dbGetHistory, dbDeleteMatch, dbUpdatePlayer } from './utils/db-supabase';
import { onAuthStateChange, signOut } from './utils/auth';
import { PlayerCard } from './components/PlayerCard';
import { Modal, ModalConfig } from './components/Modal';
import { AuthModal } from './components/AuthModal';

function App() {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // --- State ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [history, setHistory] = useState<SavedMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [positionSkills, setPositionSkills] = useState<PositionSkillMap>({
    [Position.GK]: 1,
    [Position.DEF]: 1,
    [Position.MID]: 1,
    [Position.FWD]: 1,
  });
  const [newStamina, setNewStamina] = useState<number | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'match' | 'history'>('roster');
  const [useStaminaInMatch, setUseStaminaInMatch] = useState(false);

  // Modal State
  const [modal, setModal] = useState<ModalConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
  });

  // --- Effects ---

  useEffect(() => {
    const { data: { subscription } } = onAuthStateChange((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) setShowAuthModal(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const loadData = async () => {
      try {
        const loadedPlayers = await dbGetPlayers();

        const migratedPlayers = loadedPlayers.map(p => {
            const newSkills = { ...p.positionSkills };
            [Position.GK, Position.DEF, Position.MID, Position.FWD].forEach(pos => {
                if (newSkills[pos] === undefined) {
                    newSkills[pos] = 1;
                }
            });
            const maxSkill = Math.max(...(Object.values(newSkills) as number[]));
            const positions = (Object.keys(newSkills) as Position[]).filter(k => newSkills[k] === maxSkill);

            return {
                ...p,
                positionSkills: newSkills as PositionSkillMap,
                positions
            };
        });

        if (migratedPlayers.length === 0) {
          const lsData = localStorage.getItem('fb_players');
          if (lsData) {
            try {
              const parsed = JSON.parse(lsData);
              const lsPlayers = parsed.map((p: any) => {
                let skills = p.positionSkills || {};

                [Position.GK, Position.DEF, Position.MID, Position.FWD].forEach(pos => {
                    if (skills[pos] === undefined) skills[pos] = p.skill || 1;
                });

                const maxSkill = Math.max(...(Object.values(skills as PositionSkillMap) as number[]));
                const positions = (Object.keys(skills) as Position[]).filter(k => skills[k as Position] === maxSkill);

                return {
                  ...p,
                  positions,
                  positionSkills: skills,
                  skill: parseFloat((Object.values(skills as Record<string, number>).reduce((a,b)=>a+b,0) / 4).toFixed(1))
                };
              });

              for (const p of lsPlayers) {
                await dbAddPlayer(p);
              }
              setPlayers(lsPlayers);
            } catch (e) {
              console.error("Migration failed", e);
            }
          }
        } else {
            setPlayers(migratedPlayers);
        }

        const loadedHistory = await dbGetHistory();
        setHistory(loadedHistory);

      } catch (error) {
        console.error("Failed to load DB", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]);

  // --- Helpers ---
  const calculateAverageSkill = (skills: PositionSkillMap): number => {
    const values = Object.values(skills);
    const sum = values.reduce((a, b) => a + b, 0);
    return parseFloat((sum / 4).toFixed(1));
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-ES', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  };

  // --- Modal Helpers ---
  const closeModal = () => setModal(prev => ({ ...prev, isOpen: false }));

  const showAlert = (title: string, message: string) => {
    setModal({
      isOpen: true,
      type: 'alert',
      title,
      message,
      confirmText: 'Entendido',
      onConfirm: () => closeModal(),
      onCancel: () => closeModal()
    });
  };

  const showSuccess = (title: string, message: string) => {
    setModal({
      isOpen: true,
      type: 'success',
      title,
      message,
      confirmText: 'Genial',
      onConfirm: () => closeModal(),
      onCancel: () => closeModal()
    });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void, confirmText = 'Eliminar') => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      confirmText,
      cancelText: 'Cancelar',
      onConfirm: () => {
        onConfirm();
        closeModal();
      },
      onCancel: () => closeModal()
    });
  };

  // --- Handlers ---
  const handleSavePlayer = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) return;

    const avgSkill = calculateAverageSkill(positionSkills);

    const maxSkill = Math.max(...(Object.values(positionSkills) as number[]));
    const mainPositions = (Object.keys(positionSkills) as Position[]).filter(p => positionSkills[p] === maxSkill);

    const staminaValue = newStamina ?? undefined;

    if (editingPlayerId) {
      setPlayers(prev => prev.map(p => {
        if (p.id === editingPlayerId) {
            const updated: Player = {
                ...p,
                name: newName,
                skill: avgSkill,
                positions: mainPositions,
                positionSkills: { ...positionSkills },
                stamina: staminaValue,
            };
            if (user) dbUpdatePlayer(updated);
            return updated;
        }
        return p;
      }));
      setEditingPlayerId(null);
    } else {
      const newPlayer: Player = {
        id: crypto.randomUUID(),
        name: newName,
        skill: avgSkill,
        positions: mainPositions,
        positionSkills: positionSkills,
        stamina: staminaValue,
      };

      setPlayers(prev => [newPlayer, ...prev]);
      if (user) await dbAddPlayer(newPlayer);
    }

    setNewName('');
    setPositionSkills({
      [Position.GK]: 1,
      [Position.DEF]: 1,
      [Position.MID]: 1,
      [Position.FWD]: 1,
    });
    setNewStamina(null);
  };

  const startEditing = (player: Player) => {
    setNewName(player.name);
    setPositionSkills({ ...player.positionSkills });
    setNewStamina(player.stamina ?? null);
    setEditingPlayerId(player.id);
    setActiveTab('roster');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setNewName('');
    setEditingPlayerId(null);
    setPositionSkills({
        [Position.GK]: 1,
        [Position.DEF]: 1,
        [Position.MID]: 1,
        [Position.FWD]: 1,
    });
    setNewStamina(null);
  };

  const handleSkillChange = (pos: Position, value: number) => {
    setPositionSkills(prev => ({
      ...prev,
      [pos]: value
    }));
  };

  const handleDeletePlayer = (id: string) => {
    showConfirm(
      'Eliminar Jugador',
      '¿Estás seguro de que quieres eliminar a este jugador? Esta acción no se puede deshacer.',
      async () => {
        try {
            setPlayers(prev => prev.filter(p => p.id !== id));
            setSelectedPlayerIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });

            if (editingPlayerId === id) {
                cancelEditing();
            }

            if (user) await dbDeletePlayer(id);
        } catch (error) {
            console.error("Error deleting player:", error);
            showAlert("Error", "Hubo un error al eliminar el jugador.");
            if (user) {
              const loadedPlayers = await dbGetPlayers();
              setPlayers(loadedPlayers);
            }
        }
      }
    );
  };

  const toggleSelection = (id: string) => {
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedPlayerIds.size === players.length) {
      setSelectedPlayerIds(new Set());
    } else {
      setSelectedPlayerIds(new Set(players.map(p => p.id)));
    }
  };

  const generateMatch = () => {
    const availablePlayers = players.filter(p => selectedPlayerIds.has(p.id));
    if (availablePlayers.length < 2) {
      showAlert("Jugadores Insuficientes", "Necesitas seleccionar al menos 2 jugadores para armar equipos.");
      return;
    }
    const result = generateBalancedTeams(availablePlayers, useStaminaInMatch);
    setMatchResult(result);
  };

  const saveMatchToHistory = async () => {
    if (!matchResult) return;
    if (!user) {
      showAlert("Iniciá sesión", "Para guardar partidos en el historial necesitás iniciar sesión.");
      return;
    }
    const toSave: SavedMatch = {
      ...matchResult,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setHistory(prev => [toSave, ...prev]);
    await dbSaveMatch(toSave);
    showSuccess("Guardado", "El partido se ha guardado correctamente en el historial.");
  };

  const handleDeleteHistory = (id: string) => {
      showConfirm(
        'Eliminar Partido',
        '¿Deseas eliminar este partido del historial?',
        async () => {
          setHistory(prev => prev.filter(h => h.id !== id));
          if (user) await dbDeleteMatch(id);
        }
      );
  };

  const copyToClipboard = (result: MatchResult = matchResult!) => {
    if (!result) return;

    const text = `
${result.teamA.name}:
${result.teamA.players.map(p => p.name).join('\n')}

${result.teamB.name}:
${result.teamB.players.map(p => p.name).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      showSuccess('Copiado', '¡Los equipos se han copiado al portapapeles!');
    });
  };

  const currentAverage = calculateAverageSkill(positionSkills);

  const skillPositionConfig: { pos: Position; label: string; icon: string; color: string }[] = [
    { pos: Position.GK, label: 'Arquero', icon: 'front_hand', color: 'blue' },
    { pos: Position.DEF, label: 'Defensa', icon: 'shield', color: 'orange' },
    { pos: Position.MID, label: 'Medio', icon: 'show_chart', color: 'purple' },
    { pos: Position.FWD, label: 'Ofensa', icon: 'swords', color: 'red' },
  ];

  const posColorMap: Record<string, string> = {
    blue: 'border-blue-500 text-blue-500',
    orange: 'border-orange-500 text-orange-500',
    purple: 'border-purple-500 text-purple-500',
    red: 'border-red-500 text-red-500',
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="bg-[var(--primary)] p-3 rounded-sm rotate-3">
          <span className="material-symbols-outlined text-black font-bold text-3xl block">sports_soccer</span>
        </div>
        <span className="display-font font-black text-2xl tracking-tighter uppercase italic text-white">Partidito</span>
        <p className="mono-font text-white/30 text-xs uppercase tracking-widest">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        {...modal}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-[var(--primary)] p-2 rounded-sm rotate-3">
              <span className="material-symbols-outlined text-black font-bold block">sports_soccer</span>
            </div>
            <span className="display-font font-black text-2xl tracking-tighter uppercase italic">Partidito</span>
          </div>
          <div className="hidden md:flex items-center gap-1 mono-font bg-white/5 p-1 rounded-sm">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'roster' ? 'bg-[var(--primary)] text-black' : 'text-white/50 hover:text-white'}`}
            >
              Jugadores
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'match' ? 'bg-[var(--primary)] text-black' : 'text-white/50 hover:text-white'}`}
            >
              Partido
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'bg-[var(--primary)] text-black' : 'text-white/50 hover:text-white'}`}
            >
              Historial
            </button>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <button
                onClick={async () => {
                  try {
                    await signOut();
                    setPlayers([]);
                    setHistory([]);
                    setSelectedPlayerIds(new Set());
                    setMatchResult(null);
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}
                className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border-b-2 border-[var(--primary)] pb-1 hover:opacity-80"
              >
                Salir
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border-b-2 border-[var(--primary)] pb-1 hover:opacity-80"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Tab Bar */}
      <div className="md:hidden sticky top-[65px] z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 px-4 py-2">
        <div className="flex items-center gap-1 mono-font bg-white/5 p-1 rounded-sm">
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'roster' ? 'bg-[var(--primary)] text-black' : 'text-white/50'}`}
          >
            Jugadores
          </button>
          <button
            onClick={() => setActiveTab('match')}
            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'match' ? 'bg-[var(--primary)] text-black' : 'text-white/50'}`}
          >
            Partido
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-3 py-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${activeTab === 'history' ? 'bg-[var(--primary)] text-black' : 'text-white/50'}`}
          >
            Historial
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 lg:p-12">

        {/* ==================== ROSTER TAB ==================== */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Header */}
            <div className="md:col-span-4 mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="mono-font text-[var(--primary)] text-sm font-bold uppercase tracking-[0.3em] mb-2">System // Roster_Management</h2>
                  <h1 className="display-font text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
                    {editingPlayerId ? 'Editar' : 'Dashboard'}
                  </h1>
                </div>
                <div className="text-right hidden md:block">
                  <p className="mono-font text-white/30 text-xs">STATUS: OPERATIONAL</p>
                  <p className="mono-font text-[var(--primary)] text-xs font-bold">
                    PLAYERS_COUNT: {players.length}
                  </p>
                </div>
              </div>
            </div>

            {/* Name Input Card */}
            <div className="md:col-span-4 glass-card p-10 rounded-none border-l-[12px] border-[var(--primary)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 mono-font text-[var(--primary)] opacity-20 text-xs">
                {editingPlayerId ? 'EDIT_MODE' : '001_PLAYER_ID'}
              </div>
              <div className="flex flex-col gap-6 relative z-10">
                <div className="flex items-center gap-4">
                  <span className="material-symbols-outlined text-[var(--primary)] text-4xl">
                    {editingPlayerId ? 'edit' : 'person_add'}
                  </span>
                  <h3 className="display-font text-3xl font-black uppercase italic">
                    {editingPlayerId ? 'Editando Jugador' : 'Nuevo Jugador'}
                  </h3>
                </div>
                <form onSubmit={handleSavePlayer}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="INGRESE NOMBRE"
                    autoComplete="off"
                    className="w-full text-3xl md:text-5xl bg-white/5 border-b-4 border-white/10 border-t-0 border-x-0 p-6 text-white placeholder:text-white/10 focus:ring-0 focus:border-[var(--primary)] transition-all uppercase font-black italic display-font"
                  />
                </form>
              </div>
            </div>

            {/* Skills Section Header */}
            <div className="md:col-span-4 mt-8">
              <h4 className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                <span className="h-px w-12 bg-[var(--primary)]"></span>
                Habilidades_Core
              </h4>
            </div>

            {/* Skill Cards */}
            {skillPositionConfig.map(({ pos, label, icon, color }) => {
              const val = positionSkills[pos];
              const padded = String(Math.round(val)).padStart(2, '0');
              return (
                <div
                  key={pos}
                  className={`glass-card bento-card p-6 min-h-[220px] flex flex-col justify-between relative overflow-hidden group border-t-4 ${posColorMap[color].split(' ')[0]}`}
                >
                  <span className="material-symbols-outlined bg-player-silhouette">{icon}</span>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`material-symbols-outlined text-xl ${posColorMap[color].split(' ')[1]}`}>{icon}</span>
                      <span className="mono-font text-xs font-bold uppercase tracking-wider text-white/70">{label}</span>
                    </div>
                    <div className="skill-number display-font">{padded}</div>
                  </div>
                  <div className="relative z-10">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={val}
                      onPointerDown={() => nameInputRef.current?.blur()}
                      onChange={(e) => handleSkillChange(pos, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              );
            })}

            {/* Stamina + Tip Row */}
            <div className="md:col-span-2 glass-card p-8 flex flex-col md:flex-row items-center justify-between gap-6 border-r-4 border-rose-600">
              <div className="flex items-center gap-6">
                <div className="p-4 bg-rose-600/20 text-rose-500 border border-rose-600/30">
                  <span className="material-symbols-outlined text-4xl block">favorite</span>
                </div>
                <div>
                  <h3 className="display-font font-black text-2xl uppercase italic leading-tight">Cardio / Resistencia</h3>
                  <p className="mono-font text-white/40 text-xs tracking-wider">ENDURANCE_LEVEL_CHECK</p>
                </div>
              </div>
              {newStamina === null ? (
                <button
                  type="button"
                  onClick={() => setNewStamina(5)}
                  className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-6 py-2 hover:bg-[var(--primary)] hover:text-black transition-all"
                >
                  Agregar
                </button>
              ) : (
                <div className="flex items-center gap-4 flex-1 max-w-[200px]">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={newStamina}
                    onPointerDown={() => nameInputRef.current?.blur()}
                    onChange={(e) => setNewStamina(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <span className="mono-font text-[var(--primary)] font-bold text-lg w-8 text-right">{newStamina}</span>
                  <button
                    type="button"
                    onClick={() => setNewStamina(null)}
                    className="text-rose-500 hover:text-rose-400"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>

            <div className="md:col-span-2 glass-card p-8 border border-white/5 flex items-start gap-5">
              <span className="material-symbols-outlined text-[var(--primary)] text-3xl">terminal</span>
              <div>
                <span className="mono-font text-[var(--primary)] text-xs font-bold block mb-1">SYSTEM_TIP:</span>
                <p className="text-white/60 text-sm leading-relaxed mono-font uppercase tracking-tight">
                  Equilibra las habilidades para optimizar la generación de equipos. El algoritmo requiere datos precisos.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="md:col-span-4 mt-6 flex gap-4">
              {editingPlayerId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 bg-white/5 border border-white/10 text-white/70 p-10 flex items-center justify-center gap-4 transition-all hover:bg-white/10 hover:border-white/20"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                  <span className="display-font text-2xl md:text-4xl font-black uppercase italic tracking-tighter">Cancelar</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSavePlayer}
                disabled={!newName.trim()}
                className="flex-1 bg-[var(--primary)] text-black p-10 neon-glow flex items-center justify-center gap-6 transition-all hover:scale-[1.01] active:scale-95 group disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <span className="material-symbols-outlined font-black text-5xl">
                  {editingPlayerId ? 'save' : 'add_box'}
                </span>
                <span className="display-font text-3xl md:text-5xl font-black uppercase italic tracking-tighter">
                  {editingPlayerId ? 'Actualizar' : 'Agregar Jugador'}
                </span>
                <span className="material-symbols-outlined font-black text-5xl opacity-0 group-hover:opacity-100 transition-all translate-x-[-20px] group-hover:translate-x-0">chevron_right</span>
              </button>
            </div>

            {/* Player List */}
            {players.length > 0 && (
              <>
                <div className="md:col-span-4 mt-12">
                  <h4 className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-[0.4em] mb-6 flex items-center gap-4">
                    <span className="h-px w-12 bg-[var(--primary)]"></span>
                    Plantel // {players.length}_Jugadores
                  </h4>
                </div>
                <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {players.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onEdit={startEditing}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                </div>
              </>
            )}

            {players.length === 0 && (
              <div className="md:col-span-4 glass-card p-12 text-center border border-dashed border-white/10">
                <span className="material-symbols-outlined text-white/10 text-6xl mb-4 block">group_off</span>
                <p className="mono-font text-white/30 text-sm uppercase tracking-wider">No hay jugadores creados aún</p>
              </div>
            )}
          </div>
        )}

        {/* ==================== MATCH TAB ==================== */}
        {activeTab === 'match' && (
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6">
            {/* Header */}
            <div className="md:col-span-6 mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="mono-font text-[var(--primary)] text-sm font-bold uppercase tracking-[0.3em] mb-2">DASHBOARD // MATCH_SETUP</h2>
                  <h1 className="display-font text-5xl md:text-7xl font-black uppercase italic tracking-tighter">Armar Partido</h1>
                </div>
                <div className="text-right hidden md:block">
                  <p className="mono-font text-white/30 text-xs">MODE: COMPETITIVE_SQUAD</p>
                  <p className="mono-font text-[var(--primary)] text-xs font-bold">ALGORITHM_READY: YES</p>
                </div>
              </div>
            </div>

            {!matchResult ? (
              <>
                {/* Selection Header */}
                <div className="md:col-span-6 glass-card p-8 border-l-[12px] border-[var(--primary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="display-font text-2xl font-black uppercase italic">Selección de Plantilla</h3>
                    <p className="mono-font text-white/40 text-sm mt-1 uppercase">Selecciona quiénes vinieron hoy para equilibrar los equipos</p>
                  </div>
                  <button
                    onClick={selectAll}
                    className="mono-font text-[var(--primary)] text-sm font-bold uppercase tracking-widest border border-[var(--primary)] px-6 py-2 hover:bg-[var(--primary)] hover:text-black transition-all"
                  >
                    {selectedPlayerIds.size === players.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                {/* Player Selection Grid */}
                <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {players.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      selectable
                      selected={selectedPlayerIds.has(player.id)}
                      onToggleSelect={toggleSelection}
                    />
                  ))}
                  {players.length === 0 && (
                    <div className="col-span-3 glass-card p-12 text-center border border-dashed border-white/10">
                      <p className="mono-font text-white/30 text-sm uppercase tracking-wider">
                        Agrega jugadores en la pestaña "Jugadores" primero
                      </p>
                    </div>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="md:col-span-3 glass-card p-6 border-t-4 border-[var(--primary)]">
                  <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[var(--primary)] text-3xl">group</span>
                      <div>
                        <p className="mono-font text-white/40 text-[10px] uppercase tracking-wider">Seleccionados</p>
                        <p className="display-font font-black text-3xl italic">{selectedPlayerIds.size} / {players.length}</p>
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/10"></div>
                    <div className="flex items-center gap-4">
                      <span className="material-symbols-outlined text-[var(--primary)] text-3xl">grid_view</span>
                      <div>
                        <p className="mono-font text-white/40 text-[10px] uppercase tracking-wider">Tamaño Partido</p>
                        <p className="display-font font-black text-3xl italic">
                          {Math.floor(selectedPlayerIds.size / 2)} vs {Math.ceil(selectedPlayerIds.size / 2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stamina Toggle + Info */}
                <div className="md:col-span-3 glass-card p-6 border border-white/5 flex items-center gap-5">
                  {players.some(p => p.stamina != null) ? (
                    <>
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useStaminaInMatch}
                          onChange={(e) => setUseStaminaInMatch(e.target.checked)}
                          className="w-5 h-5 border-2 border-white/20 bg-transparent text-[var(--primary)] focus:ring-0 checked:bg-[var(--primary)] rounded-none"
                        />
                        <span className="material-symbols-outlined text-rose-500 text-2xl">favorite</span>
                        <span className="mono-font text-white/60 text-xs uppercase tracking-wider">Considerar cardio en el balance</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[var(--primary)] text-3xl">analytics</span>
                      <div>
                        <span className="mono-font text-[var(--primary)] text-xs font-bold block mb-1">ANALYTICS_SYSTEM:</span>
                        <p className="text-white/60 text-xs leading-relaxed mono-font uppercase tracking-tight">
                          El sistema optimizará posiciones automáticamente basándose en las estadísticas individuales.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Generate Button */}
                <div className="md:col-span-6 mt-4">
                  <button
                    onClick={generateMatch}
                    disabled={selectedPlayerIds.size < 2}
                    className="w-full bg-[var(--primary)] text-black p-10 neon-glow flex items-center justify-center gap-6 transition-all hover:scale-[1.01] active:scale-95 group relative overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 italic flex items-center justify-center font-black opacity-10 text-9xl">GO_MATCH</div>
                    <span className="material-symbols-outlined font-black text-5xl relative z-10">rebase_edit</span>
                    <span className="display-font text-3xl md:text-5xl font-black uppercase italic tracking-tighter relative z-10">Generar Equipos</span>
                    <span className="material-symbols-outlined font-black text-5xl opacity-0 group-hover:opacity-100 transition-all translate-x-[-20px] group-hover:translate-x-0 relative z-10">bolt</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Match Result View */}
                <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-4">
                  <button
                    onClick={() => setMatchResult(null)}
                    className="mono-font text-white/50 text-xs font-bold uppercase tracking-widest hover:text-white flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => copyToClipboard()}
                      className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-4 py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      Copiar
                    </button>
                    <button
                      onClick={saveMatchToHistory}
                      className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-4 py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      Guardar
                    </button>
                    <button
                      onClick={generateMatch}
                      className="mono-font text-white/50 text-xs font-bold uppercase tracking-widest border border-white/20 px-4 py-2 hover:border-white/50 hover:text-white transition-all flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      Re-calcular
                    </button>
                  </div>
                </div>

                {/* Score Display */}
                <div className="md:col-span-6 glass-card p-10 border-l-8 border-[var(--primary)] relative overflow-hidden">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-3 border-4 border-white/20">
                        <span className="display-font font-black text-2xl">T_A</span>
                      </div>
                      <p className="mono-font text-sm font-bold">{matchResult.teamA.name}</p>
                      <p className="mono-font text-[10px] text-white/40">AVG: {matchResult.teamA.averageSkill}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="display-font text-6xl md:text-8xl font-black italic tracking-tighter">
                        <span>{matchResult.teamA.players.length}</span>
                        <span className="text-white/20 mx-4">vs</span>
                        <span className="text-[var(--primary)]">{matchResult.teamB.players.length}</span>
                      </div>
                      <span className="mono-font text-xs text-white/30 uppercase tracking-[0.3em] mt-2">PLAYERS</span>
                    </div>
                    <div className="text-center">
                      <div className="w-20 h-20 bg-orange-600 rounded-full flex items-center justify-center mb-3 border-4 border-white/10">
                        <span className="display-font font-black text-2xl">T_B</span>
                      </div>
                      <p className="mono-font text-sm font-bold">{matchResult.teamB.name}</p>
                      <p className="mono-font text-[10px] text-white/40">AVG: {matchResult.teamB.averageSkill}</p>
                    </div>
                  </div>
                </div>

                {/* Skill Difference */}
                <div className="md:col-span-6 glass-card p-6 border-t-4 border-[var(--primary)] text-center">
                  <p className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest">
                    Diferencia de habilidad: {matchResult.skillDifference.toFixed(1)}
                    {matchResult.skillDifference === 0 ? " // PARTIDO PERFECTO" : " // MUY PAREJO"}
                  </p>
                </div>

                {/* Team Columns */}
                <div className="md:col-span-3">
                  <h4 className="mono-font text-blue-500 text-xs font-bold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                    <span className="h-px w-8 bg-blue-500"></span>
                    {matchResult.teamA.name}
                  </h4>
                  <div className="space-y-3">
                    {matchResult.teamA.players.map(p => (
                      <PlayerCard key={p.id} player={p} compact />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <h4 className="mono-font text-orange-500 text-xs font-bold uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                    <span className="h-px w-8 bg-orange-500"></span>
                    {matchResult.teamB.name}
                  </h4>
                  <div className="space-y-3">
                    {matchResult.teamB.players.map(p => (
                      <PlayerCard key={p.id} player={p} compact />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ==================== HISTORY TAB ==================== */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Header */}
            <div className="md:col-span-12 mb-4">
              <h2 className="mono-font text-[var(--primary)] text-sm font-bold uppercase tracking-[0.3em] mb-2">DASHBOARD // MATCH_HISTORY</h2>
              <h1 className="display-font text-5xl md:text-7xl font-black uppercase italic tracking-tighter">Historial</h1>
            </div>

            {/* Stats Summary Card */}
            {history.length > 0 && (
              <div className="md:col-span-12 glass-card p-8 border-t-4 border-[var(--primary)]">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <p className="display-font text-4xl font-black italic text-[var(--primary)]">{history.length}</p>
                    <p className="mono-font text-[10px] text-white/40 uppercase tracking-wider mt-1">Partidos Jugados</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-4xl font-black italic">
                      {history.reduce((sum, h) => sum + h.teamA.players.length + h.teamB.players.length, 0)}
                    </p>
                    <p className="mono-font text-[10px] text-white/40 uppercase tracking-wider mt-1">Participaciones</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-4xl font-black italic">
                      {history.length > 0
                        ? (history.reduce((sum, h) => sum + h.skillDifference, 0) / history.length).toFixed(1)
                        : '0'}
                    </p>
                    <p className="mono-font text-[10px] text-white/40 uppercase tracking-wider mt-1">Diff Promedio</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-4xl font-black italic text-[var(--primary)]">
                      {history.filter(h => h.skillDifference === 0).length}
                    </p>
                    <p className="mono-font text-[10px] text-white/40 uppercase tracking-wider mt-1">Partidos Perfectos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Match List */}
            <div className="md:col-span-12">
              {history.length === 0 ? (
                <div className="glass-card p-12 text-center border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-white/10 text-6xl mb-4 block">history</span>
                  <p className="mono-font text-white/30 text-sm uppercase tracking-wider">No hay partidos guardados</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="bento-card glass-card p-6 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-6">
                        <div className="text-center w-20">
                          <p className="mono-font text-[10px] text-white/30 font-bold">{formatDate(item.timestamp).split(',')[0]}</p>
                          <p className="display-font font-black text-xl italic leading-none">{formatDate(item.timestamp).split(',')[1]?.trim()}</p>
                        </div>
                        <div className="h-10 w-px bg-white/10"></div>
                        <div>
                          <div className="display-font text-xl font-black italic flex items-center gap-2">
                            <span className="text-blue-400">{item.teamA.name}</span>
                            <span className="text-white/20 text-sm">vs</span>
                            <span className="text-orange-400">{item.teamB.name}</span>
                          </div>
                          <p className="mono-font text-[10px] text-white/40 mt-1">
                            {item.teamA.players.length + item.teamB.players.length} jugadores // diff: {item.skillDifference.toFixed(1)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyToClipboard(item)}
                          className="mono-font text-white/30 text-[10px] font-bold uppercase tracking-widest border border-white/10 px-4 py-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center gap-2"
                          title="Copiar equipos"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          Copiar
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="mono-font text-white/30 text-[10px] font-bold uppercase tracking-widest border border-white/10 px-4 py-2 hover:border-red-500 hover:text-red-500 transition-all flex items-center gap-2"
                          title="Eliminar"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-16 text-center">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8"></div>
        <p className="mono-font text-white/20 text-[10px] uppercase tracking-[0.5em]">
          Partidito // Engine v2.0 // Zero Gravity UI
        </p>
      </footer>
    </div>
  );
}

export default App;
