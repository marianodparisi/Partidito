import React, { useState, useEffect } from 'react';
import { Player, Position, MatchResult } from './types';
import { generateBalancedTeams } from './utils/balancer';
import { PlayerCard } from './components/PlayerCard';
import { IconUsers, IconPlus, IconRefresh, IconActivity, IconGoal, IconShield, IconSword } from './components/Icons';

function App() {
  // --- State ---
  const [players, setPlayers] = useState<Player[]>(() => {
    const saved = localStorage.getItem('fb_players');
    if (!saved) return [];
    try {
      const parsed = JSON.parse(saved);
      // Migration: Convert single position to array if old data exists
      return parsed.map((p: any) => ({
        ...p,
        positions: Array.isArray(p.positions) ? p.positions : (p.position ? [p.position] : [Position.MID])
      }));
    } catch (e) {
      console.error("Failed to parse players", e);
      return [];
    }
  });

  const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newSkill, setNewSkill] = useState(5);
  // Changed from single position to array of positions
  const [newPositions, setNewPositions] = useState<Position[]>([Position.MID]);
  const [activeTab, setActiveTab] = useState<'roster' | 'match'>('roster');

  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('fb_players', JSON.stringify(players));
  }, [players]);

  // --- Handlers ---
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    if (newPositions.length === 0) return;

    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newName,
      skill: newSkill,
      positions: newPositions
    };

    setPlayers(prev => [newPlayer, ...prev]);
    setNewName('');
    setNewSkill(5);
    setNewPositions([Position.MID]); // Reset to default
  };

  const toggleNewPosition = (pos: Position) => {
    setNewPositions(prev => {
      if (prev.includes(pos)) {
        // Prevent removing the last position
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== pos);
      } else {
        return [...prev, pos];
      }
    });
  };

  const handleDeletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setSelectedPlayerIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
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
      alert("Necesitas al menos 2 jugadores para armar equipos.");
      return;
    }
    const result = generateBalancedTeams(availablePlayers);
    setMatchResult(result);
  };

  // Helper for position buttons in form
  const getPosButtonClass = (pos: Position, selected: boolean) => {
    const base = "flex flex-col items-center justify-center p-2 rounded-xl border transition-all text-xs font-semibold gap-1";
    if (!selected) return `${base} bg-white border-gray-200 text-gray-400 hover:border-gray-300 hover:bg-gray-50`;
    
    switch (pos) {
      case Position.GK: return `${base} bg-yellow-50 border-yellow-400 text-yellow-700 ring-1 ring-yellow-400`;
      case Position.DEF: return `${base} bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400`;
      case Position.MID: return `${base} bg-green-50 border-green-400 text-green-700 ring-1 ring-green-400`;
      case Position.FWD: return `${base} bg-red-50 border-red-400 text-red-700 ring-1 ring-red-400`;
      default: return base;
    }
  };

  // --- Renders ---

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      
      {/* Header */}
      <header className="bg-white sticky top-0 z-10 border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-pitch-500 rounded-lg flex items-center justify-center text-white">
              <IconUsers className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Fútbol Equilibrado</h1>
          </div>
          <nav className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('roster')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'roster' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Jugadores
            </button>
            <button
              onClick={() => setActiveTab('match')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${activeTab === 'match' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Partido
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        
        {/* VIEW: ROSTER MANAGEMENT */}
        {activeTab === 'roster' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Add Player Form */}
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold mb-4 text-gray-800 flex items-center gap-2">
                <IconPlus className="w-5 h-5 text-pitch-600" />
                Nuevo Jugador
              </h2>
              <form onSubmit={handleAddPlayer} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Name Input - Improved Readability */}
                <div className="md:col-span-4 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nombre</label>
                  <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="Ej. Lionel M."
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-pitch-500 focus:ring-2 focus:ring-pitch-100 outline-none transition-all font-medium"
                  />
                </div>
                
                {/* Position Multi-Select */}
                <div className="md:col-span-4 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Posiciones (Seleccionar)</label>
                  <div className="grid grid-cols-4 gap-2">
                    <button type="button" onClick={() => toggleNewPosition(Position.GK)} className={getPosButtonClass(Position.GK, newPositions.includes(Position.GK))}>
                      <IconGoal className="w-5 h-5" />
                      GK
                    </button>
                    <button type="button" onClick={() => toggleNewPosition(Position.DEF)} className={getPosButtonClass(Position.DEF, newPositions.includes(Position.DEF))}>
                      <IconShield className="w-5 h-5" />
                      DEF
                    </button>
                    <button type="button" onClick={() => toggleNewPosition(Position.MID)} className={getPosButtonClass(Position.MID, newPositions.includes(Position.MID))}>
                      <IconActivity className="w-5 h-5" />
                      MID
                    </button>
                    <button type="button" onClick={() => toggleNewPosition(Position.FWD)} className={getPosButtonClass(Position.FWD, newPositions.includes(Position.FWD))}>
                      <IconSword className="w-5 h-5" />
                      FWD
                    </button>
                  </div>
                </div>

                {/* Skill Slider */}
                <div className="md:col-span-4 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Habilidad: {newSkill}</label>
                  <div className="flex items-center gap-4 h-[46px]">
                    <span className="text-sm font-semibold text-gray-400">1</span>
                    <input 
                      type="range" 
                      min="1" 
                      max="10" 
                      step="0.5"
                      value={newSkill}
                      onChange={e => setNewSkill(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pitch-600"
                    />
                    <span className="text-sm font-bold text-pitch-700 w-8 text-right">{newSkill}</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="md:col-span-12 mt-2">
                  <button 
                    type="submit" 
                    disabled={!newName.trim() || newPositions.length === 0}
                    className="w-full py-3 bg-pitch-600 hover:bg-pitch-500 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    <IconPlus className="w-5 h-5" />
                    Agregar Jugador al Plantel
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
                 <div className="flex justify-between items-center">
                    <button 
                      onClick={() => setMatchResult(null)}
                      className="text-gray-500 hover:text-gray-900 font-medium flex items-center gap-2"
                    >
                      ← Volver a selección
                    </button>
                    <button 
                      onClick={generateMatch} // Re-run logic
                      className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm flex items-center gap-2"
                    >
                      <IconRefresh className="w-4 h-4" />
                      Re-calcular
                    </button>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Team A */}
                    <div className="bg-white rounded-2xl overflow-hidden shadow-lg border-t-4 border-pitch-500">
                      <div className="bg-gray-50 p-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-bold text-xl text-gray-900">Equipo A</h3>
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
                        <h3 className="font-bold text-xl text-gray-900">Equipo B</h3>
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
      </main>
    </div>
  );
}

export default App;