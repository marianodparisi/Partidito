import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, MatchResult, PositionSkillMap, SavedMatch } from './types';
import { generateBalancedTeams } from './utils/balancer';
import { dbAddPlayer, dbDeletePlayer, dbGetPlayers, dbSaveMatch, dbGetHistory, dbDeleteMatch, dbUpdatePlayer, dbShareMatch, dbUpdateMatch } from './utils/db-supabase';
import { onAuthStateChange, signOut } from './utils/auth';
import { PlayerCard } from './components/PlayerCard';
import { Modal, ModalConfig } from './components/Modal';
import { AuthModal } from './components/AuthModal';
import { ShareView } from './components/ShareView';

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
  const [teamAName, setTeamAName] = useState('Equipo 1');
  const [teamBName, setTeamBName] = useState('Equipo 2');
  const [matchLocation, setMatchLocation] = useState('');
  const [matchScheduledAt, setMatchScheduledAt] = useState('');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [scoreDraftA, setScoreDraftA] = useState('');
  const [scoreDraftB, setScoreDraftB] = useState('');

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
  const initialLoadDone = useRef(false);
  const [activeTab, setActiveTab] = useState<'roster' | 'match' | 'history'>('roster');
  const [useStaminaInMatch, setUseStaminaInMatch] = useState(false);

  // Share URL detection
  const shareId = new URLSearchParams(window.location.search).get('share');

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

  const formatSchedule = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const buildCurrentMatchData = (): MatchResult | null => {
    if (!matchResult) return null;

    const safeTeamAName = teamAName.trim() || 'Equipo 1';
    const safeTeamBName = teamBName.trim() || 'Equipo 2';
    const scheduledAt = matchScheduledAt ? new Date(matchScheduledAt).getTime() : undefined;

    return {
      ...matchResult,
      teamA: {
        ...matchResult.teamA,
        name: safeTeamAName
      },
      teamB: {
        ...matchResult.teamB,
        name: safeTeamBName
      },
      location: matchLocation.trim() || undefined,
      scheduledAt: Number.isFinite(scheduledAt) ? scheduledAt : undefined
    };
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
    setTeamAName(result.teamA.name);
    setTeamBName(result.teamB.name);
    setMatchLocation('');
    setMatchScheduledAt('');
  };

  const saveMatchToHistory = async () => {
    const currentMatch = buildCurrentMatchData();
    if (!currentMatch) return;
    if (!user) {
      showAlert("Iniciá sesión", "Para guardar partidos en el historial necesitás iniciar sesión.");
      return;
    }
    const toSave: SavedMatch = {
      ...currentMatch,
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

  const handleShareMatch = async () => {
    const currentMatch = buildCurrentMatchData();
    if (!currentMatch || !user) return;
    try {
      const id = await dbShareMatch(currentMatch);
      const url = `${window.location.origin}${window.location.pathname}?share=${id}`;
      await navigator.clipboard.writeText(url);
      showSuccess('Link copiado', '¡El link del partido se copió al portapapeles! Compartilo con tus amigos.');
    } catch (e) {
      showAlert('Error', 'No se pudo generar el link para compartir.');
    }
  };

  const copyToClipboard = (result: MatchResult = matchResult!) => {
    if (!result) return;

    const locationLine = result.location ? `\nCancha: ${result.location}` : '';
    const scheduleLine = result.scheduledAt ? `\nHorario: ${formatSchedule(result.scheduledAt)}` : '';
    const scoreLine = (result.scoreA != null && result.scoreB != null) ? `\nResultado: ${result.scoreA}-${result.scoreB}` : '';

    const text = `
Partido
${locationLine ? locationLine.trim() : ''}
${scheduleLine ? scheduleLine.trim() : ''}
${scoreLine ? scoreLine.trim() : ''}

${result.teamA.name}:
${result.teamA.players.map(p => p.name).join('\n')}

${result.teamB.name}:
${result.teamB.players.map(p => p.name).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      showSuccess('Copiado', '¡Los equipos se han copiado al portapapeles!');
    });
  };

  const startScoreEdit = (match: SavedMatch) => {
    setEditingScoreId(match.id);
    setScoreDraftA(match.scoreA != null ? String(match.scoreA) : '');
    setScoreDraftB(match.scoreB != null ? String(match.scoreB) : '');
  };

  const cancelScoreEdit = () => {
    setEditingScoreId(null);
    setScoreDraftA('');
    setScoreDraftB('');
  };

  const saveHistoryScore = async (match: SavedMatch) => {
    const nextScoreA = parseInt(scoreDraftA, 10);
    const nextScoreB = parseInt(scoreDraftB, 10);

    if (Number.isNaN(nextScoreA) || Number.isNaN(nextScoreB) || nextScoreA < 0 || nextScoreB < 0) {
      showAlert('Resultado inválido', 'Ingresá un resultado válido. Ejemplo: 3 y 2.');
      return;
    }

    const updatedMatch: SavedMatch = {
      ...match,
      scoreA: nextScoreA,
      scoreB: nextScoreB
    };

    setHistory(prev => prev.map(h => h.id === match.id ? updatedMatch : h));
    cancelScoreEdit();

    try {
      if (user) await dbUpdateMatch(updatedMatch);
      showSuccess('Resultado guardado', `Se actualizó el marcador a ${nextScoreA}-${nextScoreB}.`);
    } catch (error) {
      console.error('Error updating match score:', error);
      showAlert('Error', 'No se pudo actualizar el resultado del partido.');
      if (user) {
        const loadedHistory = await dbGetHistory();
        setHistory(loadedHistory);
      }
    }
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

  // If accessed via share link, show public view immediately
  if (shareId) {
    return <ShareView shareId={shareId} />;
  }

  if (!initialLoadDone.current && (authLoading || isLoading)) {
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
  if (!authLoading && !isLoading) {
    initialLoadDone.current = true;
  }

  return (
    <div className="min-h-screen pb-24 md:pb-20">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        {...modal}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-3 py-2 md:px-6 md:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="bg-[var(--primary)] p-0.5 md:p-2 rounded-sm rotate-3">
              <span className="material-symbols-outlined text-black font-bold block text-sm md:text-2xl">sports_soccer</span>
            </div>
            <span className="display-font font-black text-lg md:text-2xl tracking-tighter uppercase italic">Partidito</span>
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
      <div className="md:hidden sticky top-[41px] z-40 bg-black/90 backdrop-blur-xl border-b border-white/10 px-3 py-1.5">
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

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-12">

        {/* ==================== ROSTER TAB ==================== */}
        {activeTab === 'roster' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
            {/* Header */}
            <div className="md:col-span-4 mb-0 md:mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="mono-font text-[var(--primary)] text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] mb-0.5 md:mb-2">
                    {editingPlayerId ? 'PLAYER_EDIT_V2' : 'PLAYER_ADD_V2'}
                  </h2>
                  <h1 className="display-font text-3xl md:text-7xl font-black uppercase italic tracking-tighter">
                    {editingPlayerId ? 'Editar' : 'Dashboard'}
                  </h1>
                </div>
                <div className="text-right">
                  <p className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold">
                    TEAM_SKILL: {players.length > 0 ? (players.reduce((s, p) => s + p.skill, 0) / players.length).toFixed(1) : '0'}
                  </p>
                  <p className="mono-font text-white/30 text-[8px] md:text-xs hidden md:block">STATUS: OPERATIONAL</p>
                  <p className="mono-font text-white/30 text-[8px] md:hidden uppercase">
                    {players.length} jugadores
                  </p>
                </div>
              </div>
            </div>

            {/* Name Input Card */}
            <div className="md:col-span-4 glass-card p-3 md:p-10 rounded-none border-l-4 md:border-l-[12px] border-[var(--primary)] relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 md:p-4 mono-font text-[var(--primary)] opacity-20 text-[8px] md:text-xs">
                {editingPlayerId ? 'EDIT_MODE' : '001_PLAYER_ID'}
              </div>
              <div className="flex flex-col gap-2 md:gap-6 relative z-10">
                <div className="flex items-center gap-1.5 md:gap-4">
                  <span className="material-symbols-outlined text-[var(--primary)] text-sm md:text-4xl">
                    {editingPlayerId ? 'edit' : 'person_add'}
                  </span>
                  <h3 className="display-font text-xs md:text-3xl font-black uppercase italic">
                    {editingPlayerId ? 'Editando Jugador' : 'Nuevo Jugador'}
                  </h3>
                </div>
                <form onSubmit={handleSavePlayer}>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="NOMBRE..."
                    autoComplete="off"
                    className="w-full text-lg md:text-5xl bg-white/5 border border-white/10 md:border-b-4 md:border-t-0 md:border-x-0 px-3 py-2 md:p-6 text-white placeholder:text-white/10 focus:ring-0 focus:outline-none focus:border-[var(--primary)]/50 md:focus:border-[var(--primary)] transition-all uppercase font-black italic display-font tracking-tight"
                  />
                </form>
              </div>
            </div>

            {/* Skills Section Header */}
            <div className="md:col-span-4 mt-2 md:mt-8">
              <h4 className="mono-font text-[var(--primary)] text-[9px] md:text-xs font-bold uppercase tracking-[0.4em] flex items-center gap-2 md:gap-4">
                <span className="h-px w-8 md:w-12 bg-[var(--primary)]"></span>
                CORE_SKILLS
              </h4>
            </div>

            {/* Skill Cards - Mobile: 2-col compact, Desktop: 4-col bento */}
            <div className="md:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-6">
              {skillPositionConfig.map(({ pos, label, icon, color }) => {
                const val = positionSkills[pos];
                const padded = String(Math.round(val)).padStart(2, '0');
                const shortLabel = { [Position.GK]: 'GK', [Position.DEF]: 'DF', [Position.MID]: 'MF', [Position.FWD]: 'ATK' }[pos];
                return (
                  <div
                    key={pos}
                    className={`glass-card bento-card p-3 md:p-6 h-24 md:h-auto md:min-h-[220px] flex flex-col justify-between relative overflow-hidden group border-t-2 md:border-t-4 ${posColorMap[color].split(' ')[0]}`}
                  >
                    <span className="hidden md:block material-symbols-outlined bg-player-silhouette">{icon}</span>
                    {/* Desktop large number */}
                    <div className="hidden md:block relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-xl ${posColorMap[color].split(' ')[1]}`}>{icon}</span>
                        <span className="mono-font text-xs font-bold uppercase tracking-wider text-white/70">{label}</span>
                      </div>
                      <div className="skill-number display-font">{padded}</div>
                    </div>
                    {/* Mobile compact: icon + label */}
                    <div className="md:hidden flex items-center gap-1 relative z-10">
                      <span className={`material-symbols-outlined text-[14px] ${posColorMap[color].split(' ')[1]}`}>{icon}</span>
                      <span className="mono-font text-[8px] font-bold uppercase tracking-wider text-white/50">{shortLabel}</span>
                    </div>
                    {/* Mobile: ghost number */}
                    <div className="md:hidden absolute -right-1 -top-1 opacity-10 display-font font-black text-4xl italic leading-none pointer-events-none">{padded}</div>
                    {/* Slider */}
                    <div className="relative z-10 flex items-end gap-2">
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={val}
                        onPointerDown={() => nameInputRef.current?.blur()}
                        onChange={(e) => handleSkillChange(pos, parseFloat(e.target.value))}
                        className="w-full md:h-auto h-1"
                      />
                      <span className="md:hidden mono-font text-[10px] font-bold text-[var(--primary)] italic">{Math.round(val)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stamina Row */}
            <div className="md:col-span-2 glass-card px-3 py-2 md:p-8 flex items-center justify-between gap-2 md:gap-6 md:flex-col md:items-stretch border-r-0 md:border-r-4 border-rose-600">
              {/* Mobile: compact inline */}
              <div className="flex items-center gap-2 md:hidden">
                <span className="material-symbols-outlined text-rose-500 text-sm">favorite</span>
                <span className="display-font font-bold italic text-[10px] uppercase tracking-tighter">Cardio / Resistencia</span>
              </div>
              {/* Desktop: full layout */}
              <div className="hidden md:flex items-center gap-6">
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
                  className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-3 py-1 md:px-6 md:py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex-shrink-0"
                >
                  Agregar
                </button>
              ) : (
                <div className="flex items-center gap-2 md:gap-4 flex-1 max-w-[200px]">
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="0.5"
                    value={newStamina}
                    onPointerDown={() => nameInputRef.current?.blur()}
                    onChange={(e) => setNewStamina(parseFloat(e.target.value))}
                    className="w-full h-1 md:h-auto"
                  />
                  <span className="mono-font text-[var(--primary)] font-bold text-sm md:text-lg w-6 md:w-8 text-right">{newStamina}</span>
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

            {/* Tip Card - desktop only */}
            <div className="md:col-span-2 glass-card p-8 border border-white/5 hidden md:flex items-start gap-5">
              <span className="material-symbols-outlined text-[var(--primary)] text-3xl">terminal</span>
              <div>
                <span className="mono-font text-[var(--primary)] text-xs font-bold block mb-1">SYSTEM_TIP:</span>
                <p className="text-white/60 text-sm leading-relaxed mono-font uppercase tracking-tight">
                  Equilibra las habilidades para optimizar la generación de equipos. El algoritmo requiere datos precisos.
                </p>
              </div>
            </div>

            {/* Submit Button - Desktop: inline, Mobile: fixed bottom */}
            <div className="md:col-span-4 mt-6 hidden md:flex gap-4">
              {editingPlayerId && (
                <button
                  type="button"
                  onClick={cancelEditing}
                  className="flex-1 bg-white/5 border border-white/10 text-white/70 p-10 flex items-center justify-center gap-4 transition-all hover:bg-white/10 hover:border-white/20"
                >
                  <span className="material-symbols-outlined text-3xl">close</span>
                  <span className="display-font text-4xl font-black uppercase italic tracking-tighter">Cancelar</span>
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
                <span className="display-font text-5xl font-black uppercase italic tracking-tighter">
                  {editingPlayerId ? 'Actualizar' : 'Agregar Jugador'}
                </span>
                <span className="material-symbols-outlined font-black text-5xl opacity-0 group-hover:opacity-100 transition-all translate-x-[-20px] group-hover:translate-x-0">chevron_right</span>
              </button>
            </div>

            {/* Player List */}
            {players.length > 0 && (
              <>
                <div className="md:col-span-4 mt-4 md:mt-12">
                  <h4 className="mono-font text-[var(--primary)] text-[9px] md:text-xs font-bold uppercase tracking-[0.4em] flex items-center gap-2 md:gap-4 mb-2 md:mb-6">
                    <span className="h-px w-8 md:w-12 bg-[var(--primary)]"></span>
                    Plantel // {players.length}_Jugadores
                  </h4>
                </div>
                {/* Mobile: compact list */}
                <div className="md:col-span-4 md:hidden space-y-2">
                  {players.map(player => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      onEdit={startEditing}
                      onDelete={handleDeletePlayer}
                      mobileCompact
                    />
                  ))}
                </div>
                {/* Desktop: bento grid */}
                <div className="md:col-span-4 hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4 md:gap-6">
            {/* Header */}
            <div className="md:col-span-6 mb-0 md:mb-4">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="mono-font text-[var(--primary)] text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] mb-0.5 md:mb-2">MATCH_SETUP</h2>
                  <h1 className="display-font text-3xl md:text-7xl font-black uppercase italic tracking-tighter">Armar Partido</h1>
                </div>
                <div className="text-right">
                  <p className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold">
                    {selectedPlayerIds.size}/{players.length} SEL
                  </p>
                  <p className="mono-font text-white/30 text-[8px] md:text-xs hidden md:block">MODE: COMPETITIVE_SQUAD</p>
                </div>
              </div>
            </div>

            {!matchResult ? (
              <>
                {/* Selection Header */}
                <div className="md:col-span-6 glass-card p-3 md:p-8 border-l-4 md:border-l-[12px] border-[var(--primary)] flex items-center md:flex-row justify-between gap-2 md:gap-4">
                  <div className="min-w-0">
                    <h3 className="display-font text-sm md:text-2xl font-black uppercase italic">Selección de Plantilla</h3>
                    <p className="mono-font text-white/40 text-[9px] md:text-sm mt-0.5 md:mt-1 uppercase truncate">Selecciona quiénes vinieron hoy</p>
                  </div>
                  <button
                    onClick={selectAll}
                    className="mono-font text-[var(--primary)] text-[9px] md:text-sm font-bold uppercase tracking-widest border border-[var(--primary)] px-2 py-1 md:px-6 md:py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex-shrink-0"
                  >
                    {selectedPlayerIds.size === players.length ? 'Ninguno' : 'Todos'}
                  </button>
                </div>

                {/* Player Selection Grid */}
                <div className="md:col-span-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-6 max-h-[400px] md:max-h-[600px] overflow-y-auto pr-1 md:pr-2 custom-scrollbar">
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
                    <div className="col-span-3 glass-card p-8 md:p-12 text-center border border-dashed border-white/10">
                      <p className="mono-font text-white/30 text-[10px] md:text-sm uppercase tracking-wider">
                        Agrega jugadores en "Jugadores" primero
                      </p>
                    </div>
                  )}
                </div>

                {/* Stats Bar */}
                <div className="md:col-span-3 glass-card p-3 md:p-6 border-t-4 border-[var(--primary)]">
                  <div className="flex justify-between items-center h-full">
                    <div className="flex items-center gap-2 md:gap-4">
                      <span className="material-symbols-outlined text-[var(--primary)] text-xl md:text-3xl">group</span>
                      <div>
                        <p className="mono-font text-white/40 text-[10px] uppercase tracking-wider">Seleccionados</p>
                        <p className="display-font font-black text-xl md:text-3xl italic">{selectedPlayerIds.size} / {players.length}</p>
                      </div>
                    </div>
                    <div className="h-8 md:h-10 w-px bg-white/10"></div>
                    <div className="flex items-center gap-2 md:gap-4">
                      <span className="material-symbols-outlined text-[var(--primary)] text-xl md:text-3xl">grid_view</span>
                      <div>
                        <p className="mono-font text-white/40 text-[10px] uppercase tracking-wider">Tamaño Partido</p>
                        <p className="display-font font-black text-xl md:text-3xl italic">
                          {Math.floor(selectedPlayerIds.size / 2)} vs {Math.ceil(selectedPlayerIds.size / 2)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stamina Toggle + Info */}
                <div className="md:col-span-3 glass-card p-3 md:p-6 border border-white/5 flex items-center gap-3 md:gap-5">
                  {players.some(p => p.stamina != null) ? (
                    <>
                      <label className="flex items-center gap-2 md:gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={useStaminaInMatch}
                          onChange={(e) => setUseStaminaInMatch(e.target.checked)}
                          className="w-5 h-5 border-2 border-white/20 bg-transparent text-[var(--primary)] focus:ring-0 checked:bg-[var(--primary)] rounded-none"
                        />
                        <span className="material-symbols-outlined text-rose-500 text-xl md:text-2xl">favorite</span>
                        <span className="mono-font text-white/60 text-[10px] md:text-xs uppercase tracking-wider">Considerar cardio en el balance</span>
                      </label>
                    </>
                  ) : (
                    <>
                      <span className="hidden md:block material-symbols-outlined text-[var(--primary)] text-3xl">analytics</span>
                      <div>
                        <span className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold block mb-1">ANALYTICS_SYSTEM:</span>
                        <p className="text-white/60 text-[10px] md:text-xs leading-relaxed mono-font uppercase tracking-tight">
                          El sistema optimizará posiciones automáticamente.
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {/* Generate Button */}
                <div className="md:col-span-6 mt-2 md:mt-4">
                  <button
                    onClick={generateMatch}
                    disabled={selectedPlayerIds.size < 2}
                    className="w-full bg-[var(--primary)] text-black p-5 md:p-10 neon-glow flex items-center justify-center gap-3 md:gap-6 transition-all hover:scale-[1.01] active:scale-95 group relative overflow-hidden disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 italic flex items-center justify-center font-black opacity-10 text-9xl">GO_MATCH</div>
                    <span className="material-symbols-outlined font-black text-3xl md:text-5xl relative z-10">rebase_edit</span>
                    <span className="display-font text-xl md:text-5xl font-black uppercase italic tracking-tighter relative z-10">Generar Equipos</span>
                    <span className="material-symbols-outlined font-black text-5xl opacity-0 group-hover:opacity-100 transition-all translate-x-[-20px] group-hover:translate-x-0 relative z-10">bolt</span>
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Match Result View */}
                <div className="md:col-span-6 flex justify-between items-center flex-wrap gap-2 md:gap-4">
                  <button
                    onClick={() => setMatchResult(null)}
                    className="mono-font text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:text-white flex items-center gap-1 md:gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    Volver
                  </button>
                  <div className="flex items-center gap-1.5 md:gap-3">
                    <button
                      onClick={() => copyToClipboard(buildCurrentMatchData() || matchResult)}
                      className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-2 py-1 md:px-4 md:py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex items-center gap-1 md:gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span className="hidden md:inline">Copiar</span>
                    </button>
                    <button
                      onClick={saveMatchToHistory}
                      className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-2 py-1 md:px-4 md:py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex items-center gap-1 md:gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">save</span>
                      <span className="hidden md:inline">Guardar</span>
                    </button>
                    {user && (
                      <button
                        onClick={handleShareMatch}
                        className="mono-font text-[var(--primary)] text-[10px] md:text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-2 py-1 md:px-4 md:py-2 hover:bg-[var(--primary)] hover:text-black transition-all flex items-center gap-1 md:gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">share</span>
                        <span className="hidden md:inline">Compartir</span>
                      </button>
                    )}
                    <button
                      onClick={generateMatch}
                      className="mono-font text-white/50 text-[10px] md:text-xs font-bold uppercase tracking-widest border border-white/20 px-2 py-1 md:px-4 md:py-2 hover:border-white/50 hover:text-white transition-all flex items-center gap-1 md:gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">refresh</span>
                      <span className="hidden md:inline">Re-calcular</span>
                    </button>
                  </div>
                </div>

                {/* Score Display */}
                <div className="md:col-span-6 glass-card p-4 md:p-6 border border-white/10">
                  <h4 className="mono-font text-[var(--primary)] text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] mb-3">
                    DATOS_DEL_PARTIDO
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="mono-font text-[9px] md:text-[10px] text-white/50 uppercase tracking-widest">Nombre Equipo A</span>
                      <input
                        type="text"
                        value={teamAName}
                        onChange={(e) => setTeamAName(e.target.value)}
                        placeholder="Equipo A"
                        className="mt-1 w-full bg-white/5 border border-white/10 px-3 py-2 text-sm md:text-base focus:outline-none focus:border-[var(--primary)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mono-font text-[9px] md:text-[10px] text-white/50 uppercase tracking-widest">Nombre Equipo B</span>
                      <input
                        type="text"
                        value={teamBName}
                        onChange={(e) => setTeamBName(e.target.value)}
                        placeholder="Equipo B"
                        className="mt-1 w-full bg-white/5 border border-white/10 px-3 py-2 text-sm md:text-base focus:outline-none focus:border-[var(--primary)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mono-font text-[9px] md:text-[10px] text-white/50 uppercase tracking-widest">Ubicación</span>
                      <input
                        type="text"
                        value={matchLocation}
                        onChange={(e) => setMatchLocation(e.target.value)}
                        placeholder="Cancha / lugar"
                        className="mt-1 w-full bg-white/5 border border-white/10 px-3 py-2 text-sm md:text-base focus:outline-none focus:border-[var(--primary)]"
                      />
                    </label>
                    <label className="block">
                      <span className="mono-font text-[9px] md:text-[10px] text-white/50 uppercase tracking-widest">Horario</span>
                      <input
                        type="datetime-local"
                        value={matchScheduledAt}
                        onChange={(e) => setMatchScheduledAt(e.target.value)}
                        className="mt-1 w-full bg-white/5 border border-white/10 px-3 py-2 text-sm md:text-base focus:outline-none focus:border-[var(--primary)]"
                      />
                    </label>
                  </div>
                </div>

                {/* Score Display */}
                <div className="md:col-span-6 glass-card p-4 md:p-10 border-l-4 md:border-l-8 border-[var(--primary)] relative overflow-hidden">
                  <div className="flex flex-row items-center justify-between gap-3 md:gap-8">
                    <div className="text-center">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-blue-600 rounded-full flex items-center justify-center mb-1 md:mb-3 border-2 md:border-4 border-white/20">
                        <span className="display-font font-black text-sm md:text-2xl">T_A</span>
                      </div>
                      <p className="mono-font text-[10px] md:text-sm font-bold">{teamAName.trim() || 'Equipo 1'}</p>
                      <p className="mono-font text-[8px] md:text-[10px] text-white/40">AVG: {matchResult.teamA.averageSkill}</p>
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="display-font text-4xl md:text-8xl font-black italic tracking-tighter">
                        <span>{matchResult.teamA.players.length}</span>
                        <span className="text-white/20 mx-2 md:mx-4">vs</span>
                        <span className="text-[var(--primary)]">{matchResult.teamB.players.length}</span>
                      </div>
                      <span className="mono-font text-[8px] md:text-xs text-white/30 uppercase tracking-[0.3em] mt-1 md:mt-2">PLAYERS</span>
                    </div>
                    <div className="text-center">
                      <div className="w-12 h-12 md:w-20 md:h-20 bg-orange-600 rounded-full flex items-center justify-center mb-1 md:mb-3 border-2 md:border-4 border-white/10">
                        <span className="display-font font-black text-sm md:text-2xl">T_B</span>
                      </div>
                      <p className="mono-font text-[10px] md:text-sm font-bold">{teamBName.trim() || 'Equipo 2'}</p>
                      <p className="mono-font text-[8px] md:text-[10px] text-white/40">AVG: {matchResult.teamB.averageSkill}</p>
                    </div>
                  </div>
                </div>

                {/* Skill Difference */}
                <div className="md:col-span-6 glass-card p-3 md:p-6 border-t-2 md:border-t-4 border-[var(--primary)] text-center">
                  <p className="mono-font text-[var(--primary)] text-[9px] md:text-xs font-bold uppercase tracking-widest">
                    Diff: {matchResult.skillDifference.toFixed(1)}
                    {matchResult.skillDifference === 0 ? " // PERFECTO" : " // PAREJO"}
                  </p>
                  {(matchLocation.trim() || matchScheduledAt) && (
                    <p className="mono-font text-white/50 text-[9px] md:text-xs uppercase tracking-wide mt-2">
                      {matchLocation.trim() ? `Cancha: ${matchLocation.trim()}` : ''}
                      {matchLocation.trim() && matchScheduledAt ? ' // ' : ''}
                      {matchScheduledAt ? `Horario: ${formatSchedule(new Date(matchScheduledAt).getTime())}` : ''}
                    </p>
                  )}
                </div>

                {/* Team Columns */}
                <div className="md:col-span-3">
                  <h4 className="mono-font text-blue-500 text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] mb-2 md:mb-4 flex items-center gap-2 md:gap-3">
                    <span className="h-px w-6 md:w-8 bg-blue-500"></span>
                    {teamAName.trim() || 'Equipo 1'}
                  </h4>
                  <div className="space-y-1.5 md:space-y-3">
                    {matchResult.teamA.players.map(p => (
                      <PlayerCard key={p.id} player={p} compact />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-3">
                  <h4 className="mono-font text-orange-500 text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] mb-2 md:mb-4 flex items-center gap-2 md:gap-3">
                    <span className="h-px w-6 md:w-8 bg-orange-500"></span>
                    {teamBName.trim() || 'Equipo 2'}
                  </h4>
                  <div className="space-y-1.5 md:space-y-3">
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
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
            {/* Header */}
            <div className="md:col-span-12 mb-0 md:mb-4">
              <h2 className="mono-font text-[var(--primary)] text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] mb-0.5 md:mb-2">MATCH_HISTORY</h2>
              <h1 className="display-font text-3xl md:text-7xl font-black uppercase italic tracking-tighter">Historial</h1>
            </div>

            {/* Stats Summary Card */}
            {history.length > 0 && (
              <div className="md:col-span-12 glass-card p-3 md:p-8 border-t-2 md:border-t-4 border-[var(--primary)]">
                <div className="grid grid-cols-4 gap-2 md:gap-6">
                  <div className="text-center">
                    <p className="display-font text-2xl md:text-4xl font-black italic text-[var(--primary)]">{history.length}</p>
                    <p className="mono-font text-[7px] md:text-[10px] text-white/40 uppercase tracking-wider mt-0.5 md:mt-1">Jugados</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-2xl md:text-4xl font-black italic">
                      {history.reduce((sum, h) => sum + h.teamA.players.length + h.teamB.players.length, 0)}
                    </p>
                    <p className="mono-font text-[7px] md:text-[10px] text-white/40 uppercase tracking-wider mt-0.5 md:mt-1">Participaciones</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-2xl md:text-4xl font-black italic">
                      {history.length > 0
                        ? (history.reduce((sum, h) => sum + h.skillDifference, 0) / history.length).toFixed(1)
                        : '0'}
                    </p>
                    <p className="mono-font text-[7px] md:text-[10px] text-white/40 uppercase tracking-wider mt-0.5 md:mt-1">Diff Prom</p>
                  </div>
                  <div className="text-center">
                    <p className="display-font text-2xl md:text-4xl font-black italic text-[var(--primary)]">
                      {history.filter(h => h.skillDifference === 0).length}
                    </p>
                    <p className="mono-font text-[7px] md:text-[10px] text-white/40 uppercase tracking-wider mt-0.5 md:mt-1">Perfectos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Match List */}
            <div className="md:col-span-12">
              {history.length === 0 ? (
                <div className="glass-card p-8 md:p-12 text-center border border-dashed border-white/10">
                  <span className="material-symbols-outlined text-white/10 text-4xl md:text-6xl mb-2 md:mb-4 block">history</span>
                  <p className="mono-font text-white/30 text-[10px] md:text-sm uppercase tracking-wider">No hay partidos guardados</p>
                </div>
              ) : (
                <div className="space-y-2 md:space-y-4 max-h-[500px] md:max-h-[600px] overflow-y-auto pr-1 md:pr-4 custom-scrollbar">
                  {history.map(item => (
                    <div
                      key={item.id}
                      className="bento-card glass-card p-3 md:p-6 border border-white/5 flex items-center md:flex-row justify-between gap-2 md:gap-4 group"
                    >
                      <div className="flex items-center gap-2 md:gap-6 min-w-0 flex-1">
                        <div className="text-center w-12 md:w-20 flex-shrink-0">
                          <p className="mono-font text-[8px] md:text-[10px] text-white/30 font-bold">{formatDate(item.timestamp).split(',')[0]}</p>
                          <p className="display-font font-black text-sm md:text-xl italic leading-none">{formatDate(item.timestamp).split(',')[1]?.trim()}</p>
                        </div>
                        <div className="h-8 md:h-10 w-px bg-white/10 flex-shrink-0"></div>
                        <div className="min-w-0">
                          <div className="display-font text-sm md:text-xl font-black italic flex items-center gap-1 md:gap-2">
                            <span className="text-blue-400 truncate">{item.teamA.name}</span>
                            <span className="text-white/20 text-[10px] md:text-sm flex-shrink-0">vs</span>
                            <span className="text-orange-400 truncate">{item.teamB.name}</span>
                          </div>
                          <p className="mono-font text-[8px] md:text-[10px] text-white/40 mt-0.5 md:mt-1">
                            {item.teamA.players.length + item.teamB.players.length}p // diff: {item.skillDifference.toFixed(1)}
                          </p>
                          {(item.location || item.scheduledAt) && (
                            <p className="mono-font text-[8px] md:text-[10px] text-white/40 mt-0.5">
                              {item.location ? `Cancha: ${item.location}` : ''}
                              {item.location && item.scheduledAt ? ' // ' : ''}
                              {item.scheduledAt ? `Horario: ${formatSchedule(item.scheduledAt)}` : ''}
                            </p>
                          )}
                          <p className="mono-font text-[8px] md:text-[10px] text-[var(--primary)] mt-0.5">
                            Resultado: {item.scoreA != null && item.scoreB != null ? `${item.scoreA}-${item.scoreB}` : 'sin cargar'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        {editingScoreId === item.id ? (
                          <>
                            <input
                              type="number"
                              min={0}
                              value={scoreDraftA}
                              onChange={(e) => setScoreDraftA(e.target.value)}
                              className="w-14 bg-white/5 border border-white/10 px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
                            />
                            <span className="mono-font text-white/50 text-xs">-</span>
                            <input
                              type="number"
                              min={0}
                              value={scoreDraftB}
                              onChange={(e) => setScoreDraftB(e.target.value)}
                              className="w-14 bg-white/5 border border-white/10 px-2 py-1 text-xs focus:outline-none focus:border-[var(--primary)]"
                            />
                            <button
                              onClick={() => saveHistoryScore(item)}
                              className="text-white/30 p-1.5 md:p-0 md:mono-font md:text-[10px] md:font-bold md:uppercase md:tracking-widest md:border md:border-white/10 md:px-4 md:py-2 hover:text-[var(--primary)] md:hover:border-[var(--primary)] transition-all flex items-center gap-2"
                              title="Guardar resultado"
                            >
                              <span className="material-symbols-outlined text-sm">save</span>
                            </button>
                            <button
                              onClick={cancelScoreEdit}
                              className="text-white/30 p-1.5 md:p-0 md:mono-font md:text-[10px] md:font-bold md:uppercase md:tracking-widest md:border md:border-white/10 md:px-4 md:py-2 hover:text-white md:hover:border-white/40 transition-all flex items-center gap-2"
                              title="Cancelar"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startScoreEdit(item)}
                            className="text-white/30 p-1.5 md:p-0 md:mono-font md:text-[10px] md:font-bold md:uppercase md:tracking-widest md:border md:border-white/10 md:px-4 md:py-2 hover:text-[var(--primary)] md:hover:border-[var(--primary)] transition-all flex items-center gap-2"
                            title="Editar resultado"
                          >
                            <span className="material-symbols-outlined text-sm">sports_score</span>
                            <span className="hidden md:inline">Resultado</span>
                          </button>
                        )}
                        <button
                          onClick={() => copyToClipboard(item)}
                          className="text-white/30 p-1.5 md:p-0 md:mono-font md:text-[10px] md:font-bold md:uppercase md:tracking-widest md:border md:border-white/10 md:px-4 md:py-2 hover:text-[var(--primary)] md:hover:border-[var(--primary)] transition-all flex items-center gap-2"
                          title="Copiar equipos"
                        >
                          <span className="material-symbols-outlined text-sm">content_copy</span>
                          <span className="hidden md:inline">Copiar</span>
                        </button>
                        <button
                          onClick={() => handleDeleteHistory(item.id)}
                          className="text-white/30 p-1.5 md:p-0 md:mono-font md:text-[10px] md:font-bold md:uppercase md:tracking-widest md:border md:border-white/10 md:px-4 md:py-2 hover:text-red-500 md:hover:border-red-500 transition-all flex items-center gap-2"
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

      {/* Mobile Fixed Bottom Button - Roster Tab Only */}
      {activeTab === 'roster' && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-white/10 p-4 z-[110]">
          <div className="max-w-md mx-auto flex gap-2">
            <button
              type="button"
              onClick={handleSavePlayer}
              disabled={!newName.trim()}
              className="flex-1 bg-[var(--primary)] py-4 flex items-center justify-center gap-3 active:scale-[0.98] transition-all neon-glow disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-black font-black text-xl">
                {editingPlayerId ? 'save' : 'add_circle'}
              </span>
              <span className="display-font font-black italic text-lg text-black tracking-tight uppercase" style={{ transform: 'skew(-10deg)' }}>
                {editingPlayerId ? 'Actualizar' : 'Agregar Jugador'}
              </span>
            </button>
            {editingPlayerId && (
              <button
                type="button"
                onClick={cancelEditing}
                className="w-14 bg-white/5 border border-white/10 flex items-center justify-center active:scale-[0.98]"
              >
                <span className="material-symbols-outlined text-white/60">close</span>
              </button>
            )}
          </div>
        </div>
      )}

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
