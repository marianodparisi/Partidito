import React, { useState, useEffect, useRef } from 'react';
import { Player, Position, MatchResult, PositionSkillMap, SavedMatch } from './types';
import { generateBalancedTeams } from './utils/balancer';
import { dbAddPlayer, dbDeletePlayer, dbGetPlayers, dbSaveMatch, dbGetHistory, dbDeleteMatch, dbUpdatePlayer } from './utils/db-supabase';
import { onAuthStateChange, signOut } from './utils/auth';
import { PlayerCard } from './components/PlayerCard';
import { Modal, ModalConfig } from './components/Modal';
import { AuthModal } from './components/AuthModal';
import {
  IconUsers, IconPlus, IconRefresh, IconActivity,
  IconGoal, IconShield, IconSword, IconCopy, IconHistory, IconSave, IconTrash, IconEdit, IconSoccerBall, IconHeart
} from './components/Icons';

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

  // Auth listener
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

  // Load data from DB on mount (when user is authenticated)
  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    const loadData = async () => {
      try {
        const loadedPlayers = await dbGetPlayers();
        
        // Migration Check: Ensure old data has all 4 positions
        const migratedPlayers = loadedPlayers.map(p => {
            const newSkills = { ...p.positionSkills };
            [Position.GK, Position.DEF, Position.MID, Position.FWD].forEach(pos => {
                if (newSkills[pos] === undefined) {
                    newSkills[pos] = 1; // Default to 1 if missing
                }
            });
            // Re-calculate derived positions just in case
            const maxSkill = Math.max(...(Object.values(newSkills) as number[]));
            const positions = (Object.keys(newSkills) as Position[]).filter(k => newSkills[k] === maxSkill);
            
            return {
                ...p,
                positionSkills: newSkills as PositionSkillMap,
                positions
            };
        });

        // Migration Check from LocalStorage (Legacy)
        if (migratedPlayers.length === 0) {
          const lsData = localStorage.getItem('fb_players');
          if (lsData) {
            try {
              const parsed = JSON.parse(lsData);
              const lsPlayers = parsed.map((p: any) => {
                // If totally legacy without positionSkills
                let skills = p.positionSkills || {};
                
                // Initialize defaults
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
            // Update state with migrated DB players
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
  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const avgSkill = calculateAverageSkill(positionSkills);
    
    // Determine main positions (where skill is max)
    const maxSkill = Math.max(...(Object.values(positionSkills) as number[]));
    const mainPositions = (Object.keys(positionSkills) as Position[]).filter(p => positionSkills[p] === maxSkill);

    const staminaValue = newStamina ?? undefined;

    if (editingPlayerId) {
      // Update existing
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
      // Create new
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

    // Reset Form
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
            // Optimistic UI update
            setPlayers(prev => prev.filter(p => p.id !== id));
            setSelectedPlayerIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });

            // Cancel editing if we delete the player being edited
            if (editingPlayerId === id) {
                cancelEditing();
            }

            // DB update (only if logged in)
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

  const getPosIcon = (pos: Position) => {
    switch (pos) {
      case Position.GK: return <IconGoal className="w-4 h-4" />;
      case Position.DEF: return <IconShield className="w-4 h-4" />;
      case Position.MID: return <IconActivity className="w-4 h-4" />;
      case Position.FWD: return <IconSword className="w-4 h-4" />;
      default: return null;
    }
  };

  const currentAverage = calculateAverageSkill(positionSkills);

  if (authLoading || isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Cargando...</div>;
  }

  // --- Renders ---

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        {...modal}
      />
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
              <img src="/icons/logo.png" alt="Partidito" className="w-full h-full object-cover scale-125" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Partidito</h1>
            {user?.email && (
              <span className="hidden md:inline text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {user.email}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex bg-gray-100 rounded-lg p-1 overflow-x-auto max-w-full">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'roster' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Jugadores
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'match' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Partido
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Historial
            </button>
            </nav>
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
                className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all whitespace-nowrap"
                title="Cerrar sesión"
              >
                Salir
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-sm font-medium text-pitch-600 hover:text-pitch-700 hover:bg-pitch-50 rounded-md transition-all whitespace-nowrap"
              >
                Iniciar sesión
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* VIEW: ROSTER MANAGEMENT */}
        {activeTab === 'roster' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Add Player Form */}
            <section className={`bg-white rounded-2xl p-6 shadow-sm border transition-colors duration-300 ${editingPlayerId ? 'border-blue-200 ring-4 ring-blue-50' : 'border-gray-100'}`}>
              <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                {editingPlayerId ? <IconEdit className="w-5 h-5 text-blue-600" /> : <IconPlus className="w-5 h-5 text-pitch-600" />}
                {editingPlayerId ? 'Editar Jugador' : 'Nuevo Jugador'}
              </h2>
              <form onSubmit={handleSavePlayer} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Name Input */}
                <div className="md:col-span-12">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ej. Lionel M."
                    autoComplete="off"
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-pitch-500 focus:ring-2 focus:ring-pitch-100 outline-none transition-all font-medium"
                  />
                </div>
                
                {/* Skills per Position */}
                <div className="md:col-span-12">
                   <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Habilidades (0 = Muy Malo, 10 = Pro)</label>
                      <span className="text-xs font-bold px-2 py-1 bg-gray-100 text-gray-600 rounded">Promedio Total: {currentAverage}</span>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[Position.GK, Position.DEF, Position.MID, Position.FWD].map(pos => {
                        const skillVal = positionSkills[pos];

                        return (
                          <div
                            key={pos}
                            className="p-3 rounded-xl border border-pitch-100 bg-white shadow-sm flex flex-col gap-2"
                          >
                             <div className="flex items-center gap-2 text-gray-700">
                                {getPosIcon(pos)}
                                <span className="text-sm font-bold">{pos}</span>
                             </div>

                             <div className="flex items-center gap-2">
                                <input
                                  type="range"
                                  min="0"
                                  max="10"
                                  step="0.5"
                                  value={skillVal}
                                  onPointerDown={() => nameInputRef.current?.blur()}
                                  onChange={(e) => handleSkillChange(pos, parseFloat(e.target.value))}
                                  className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-pitch-600"
                                />
                                <span className="text-sm font-bold text-pitch-700 w-8 text-right">{skillVal}</span>
                             </div>
                          </div>
                        );
                      })}
                   </div>
                </div>

                {/* Stamina (optional) */}
                <div className="md:col-span-12">
                  <div className="flex items-center gap-3 mb-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Cardio / Resistencia</label>
                    <span className="text-[10px] text-gray-400">(opcional)</span>
                    {newStamina === null ? (
                      <button
                        type="button"
                        onClick={() => setNewStamina(5)}
                        className="text-xs text-pitch-600 hover:text-pitch-700 font-medium underline"
                      >
                        Agregar
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setNewStamina(null)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium underline"
                      >
                        Quitar
                      </button>
                    )}
                  </div>
                  {newStamina !== null && (
                    <div className="p-3 rounded-xl border border-orange-100 bg-white shadow-sm flex items-center gap-3">
                      <IconHeart className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <input
                        type="range"
                        min="0"
                        max="10"
                        step="0.5"
                        value={newStamina}
                        onPointerDown={() => nameInputRef.current?.blur()}
                        onChange={(e) => setNewStamina(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-orange-500"
                      />
                      <span className="text-sm font-bold text-orange-600 w-8 text-right">{newStamina}</span>
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="md:col-span-12 mt-2 flex gap-3">
                  {editingPlayerId && (
                     <button 
                        type="button" 
                        onClick={cancelEditing}
                        className="flex-1 py-3 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl transition-all hover:bg-gray-50 flex justify-center items-center gap-2"
                     >
                        Cancelar
                     </button>
                  )}
                  <button 
                    type="submit" 
                    disabled={!newName.trim()}
                    className={`flex-1 py-3 font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 ${editingPlayerId ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-pitch-600 hover:bg-pitch-500 text-white'}`}
                  >
                    {editingPlayerId ? <IconEdit className="w-5 h-5" /> : <IconPlus className="w-5 h-5" />}
                    {editingPlayerId ? 'Actualizar' : 'Agregar'}
                  </button>
                </div>
              </form>
            </section>

            {/* List */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-bold text-gray-800">Plantel ({players.length})</h2>
              </div>
              
              {players.length === 0 ? (
                <div className="text-center py-12 bg-gray-100 rounded-2xl border border-dashed border-gray-300">
                  <p className="text-gray-500">No hay jugadores creados aún.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                  {players.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player} 
                      onEdit={startEditing}
                      onDelete={handleDeletePlayer}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW: MATCH GENERATOR */}
        {activeTab === 'match' && (
          <div className="space-y-8 animate-fade-in">
            {!matchResult ? (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Armar Partido</h2>
                    <p className="text-sm text-gray-500">Selecciona quiénes vinieron hoy</p>
                  </div>
                  <button 
                    onClick={selectAll}
                    className="text-sm font-medium text-pitch-600 hover:text-pitch-700 underline"
                  >
                    {selectedPlayerIds.size === players.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar mb-6">
                  {players.map(player => (
                    <PlayerCard 
                      key={player.id} 
                      player={player} 
                      selectable 
                      selected={selectedPlayerIds.has(player.id)}
                      onToggleSelect={toggleSelection}
                      compact
                    />
                  ))}
                  {players.length === 0 && (
                     <div className="col-span-2 text-center text-gray-400 py-10">Agrega jugadores en la pestaña "Jugadores" primero.</div>
                  )}
                </div>

                <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                   <div className="flex justify-between items-center mb-4">
                      <span className="text-sm font-medium text-gray-600">Seleccionados: {selectedPlayerIds.size}</span>
                      <span className="text-sm font-medium text-gray-600">Tamaño: {Math.floor(selectedPlayerIds.size / 2)} vs {Math.ceil(selectedPlayerIds.size / 2)}</span>
                   </div>
                   {players.some(p => p.stamina != null) && (
                     <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
                       <input
                         type="checkbox"
                         checked={useStaminaInMatch}
                         onChange={(e) => setUseStaminaInMatch(e.target.checked)}
                         className="w-4 h-4 rounded border-gray-300 text-orange-500 accent-orange-500"
                       />
                       <IconHeart className="w-4 h-4 text-orange-500" />
                       <span className="text-sm font-medium text-gray-700">Considerar cardio en el balance</span>
                     </label>
                   )}
                   <button
                    onClick={generateMatch}
                    disabled={selectedPlayerIds.size < 2}
                    className="w-full py-4 bg-gray-900 hover:bg-black text-white text-lg font-bold rounded-xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <IconActivity className="w-5 h-5" />
                    Generar Equipos Equilibrados
                  </button>
                </div>
              </section>
            ) : (
              <div className="space-y-6">
                 {/* Match Results Display */}
                 <div className="flex justify-between items-center flex-wrap gap-2">
                    <button 
                      onClick={() => setMatchResult(null)}
                      className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100"
                    >
                      ← Volver
                    </button>
                    
                    <div className="flex items-center gap-2 ml-auto">
                      <button 
                        onClick={() => copyToClipboard()}
                        className="bg-pitch-50 border border-pitch-200 text-pitch-700 hover:bg-pitch-100 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <IconCopy className="w-4 h-4" />
                        Copiar
                      </button>
                      <button 
                        onClick={saveMatchToHistory}
                        className="bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <IconSave className="w-4 h-4" />
                        Guardar
                      </button>
                      <button 
                        onClick={generateMatch} 
                        className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2 transition-colors"
                      >
                        <IconRefresh className="w-4 h-4" />
                        Re-calcular
                      </button>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-t-4 border-pitch-500">
                      <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-900">{matchResult.teamA.name}</h3>
                        <span className="px-3 py-1 bg-white rounded-full border border-gray-200 text-sm font-bold text-gray-600">
                          Avg: {matchResult.teamA.averageSkill}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {matchResult.teamA.players.map(p => (
                          <PlayerCard key={p.id} player={p} compact />
                        ))}
                      </div>
                      <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Total Skill: {matchResult.teamA.totalSkill}</span>
                      </div>
                    </div>

                    {/* Team B */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-t-4 border-gray-800">
                      <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-900">{matchResult.teamB.name}</h3>
                        <span className="px-3 py-1 bg-white rounded-full border border-gray-200 text-sm font-bold text-gray-600">
                          Avg: {matchResult.teamB.averageSkill}
                        </span>
                      </div>
                      <div className="p-4 space-y-2">
                        {matchResult.teamB.players.map(p => (
                          <PlayerCard key={p.id} player={p} compact />
                        ))}
                      </div>
                      <div className="bg-gray-50 p-3 text-center border-t border-gray-100">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Total Skill: {matchResult.teamB.totalSkill}</span>
                      </div>
                    </div>
                 </div>

                 {/* Match Stats */}
                 <div className="bg-pitch-50 rounded-xl p-4 text-center border border-pitch-100">
                    <p className="text-pitch-800 font-medium">
                       Diferencia de habilidad: <span className="font-bold">{matchResult.skillDifference.toFixed(1)}</span>
                       {matchResult.skillDifference === 0 ? " (¡Partido Perfecto!)" : " (Muy Parejo)"}
                    </p>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6 animate-fade-in">
             <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <IconHistory className="w-5 h-5 text-gray-600" />
                Historial de Partidos ({history.length})
             </h2>

             {history.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                  <p className="text-gray-500">No hay partidos guardados.</p>
                </div>
             ) : (
               <div className="grid grid-cols-1 gap-4">
                 {history.map(item => (
                   <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-4">
                         <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                           <IconActivity className="w-4 h-4" />
                           {formatDate(item.timestamp)}
                         </div>
                         <div className="flex gap-2">
                           <button 
                             onClick={() => copyToClipboard(item)}
                             className="p-2 text-gray-400 hover:text-pitch-600 hover:bg-pitch-50 rounded-lg transition-colors"
                             title="Copiar equipos"
                           >
                             <IconCopy className="w-4 h-4" />
                           </button>
                           <button 
                             onClick={() => handleDeleteHistory(item.id)}
                             className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                             title="Borrar del historial"
                           >
                             <IconTrash className="w-4 h-4" />
                           </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Team A Summary */}
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                            <span className="font-bold text-gray-800">{item.teamA.name}</span>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">Avg: {item.teamA.averageSkill}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.teamA.players.map(p => p.name).join(', ')}
                          </p>
                        </div>

                        {/* Team B Summary */}
                        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div className="flex justify-between items-center mb-2 border-b border-gray-200 pb-2">
                            <span className="font-bold text-gray-800">{item.teamB.name}</span>
                            <span className="text-xs bg-white px-2 py-0.5 rounded border border-gray-200 text-gray-500">Avg: {item.teamB.averageSkill}</span>
                          </div>
                          <p className="text-sm text-gray-600 leading-relaxed">
                            {item.teamB.players.map(p => p.name).join(', ')}
                          </p>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;