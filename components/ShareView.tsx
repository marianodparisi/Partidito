import React, { useEffect, useState } from 'react';
import { MatchResult } from '../types';
import { dbGetSharedMatch } from '../utils/db-supabase';

interface ShareViewProps {
  shareId: string;
}

export const ShareView: React.FC<ShareViewProps> = ({ shareId }) => {
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    dbGetSharedMatch(shareId).then(result => {
      if (result) setMatch(result);
      else setNotFound(true);
      setLoading(false);
    });
  }, [shareId]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="bg-[var(--primary)] p-3 rounded-sm rotate-3">
          <span className="material-symbols-outlined text-black font-bold text-3xl block">sports_soccer</span>
        </div>
        <span className="display-font font-black text-2xl tracking-tighter uppercase italic">Partidito</span>
        <p className="mono-font text-white/30 text-xs uppercase tracking-widest">Cargando partido...</p>
      </div>
    );
  }

  if (notFound || !match) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <span className="material-symbols-outlined text-white/10 text-6xl">link_off</span>
        <p className="mono-font text-white/30 text-sm uppercase tracking-wider text-center">
          Este link no existe o ya expiró
        </p>
        <a
          href="/"
          className="mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border-b border-[var(--primary)]"
        >
          Ir a Partidito
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 px-3 py-2 md:px-6 md:py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 md:gap-4">
            <div className="bg-[var(--primary)] p-0.5 md:p-2 rounded-sm rotate-3">
              <span className="material-symbols-outlined text-black font-bold block text-sm md:text-2xl">sports_soccer</span>
            </div>
            <span className="display-font font-black text-lg md:text-2xl tracking-tighter uppercase italic">Partidito</span>
          </a>
          <span className="mono-font text-white/30 text-[9px] md:text-xs uppercase tracking-widest">Partido compartido</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto p-4 md:p-8 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="mb-2 md:mb-6">
          <h2 className="mono-font text-[var(--primary)] text-[9px] md:text-sm font-bold uppercase tracking-[0.3em] mb-0.5 md:mb-2">MATCH_SHARE</h2>
          <h1 className="display-font text-3xl md:text-6xl font-black uppercase italic tracking-tighter">Equipos</h1>
        </div>

        {/* Score card */}
        <div className="glass-card p-4 md:p-8 border-l-4 md:border-l-8 border-[var(--primary)]">
          <div className="flex items-center justify-between gap-3 md:gap-8">
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-600 rounded-full flex items-center justify-center mb-1 md:mb-2 border-2 border-white/20 mx-auto">
                <span className="display-font font-black text-sm md:text-xl">T_A</span>
              </div>
              <p className="mono-font text-[10px] md:text-sm font-bold">{match.teamA.name}</p>
              <p className="mono-font text-[8px] md:text-[10px] text-white/40">AVG: {match.teamA.averageSkill}</p>
            </div>
            <div className="flex flex-col items-center">
              <div className="display-font text-4xl md:text-7xl font-black italic tracking-tighter">
                <span>{match.teamA.players.length}</span>
                <span className="text-white/20 mx-2 md:mx-4">vs</span>
                <span className="text-[var(--primary)]">{match.teamB.players.length}</span>
              </div>
              <span className="mono-font text-[8px] md:text-xs text-white/30 uppercase tracking-[0.3em] mt-1">PLAYERS</span>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 md:w-16 md:h-16 bg-orange-600 rounded-full flex items-center justify-center mb-1 md:mb-2 border-2 border-white/10 mx-auto">
                <span className="display-font font-black text-sm md:text-xl">T_B</span>
              </div>
              <p className="mono-font text-[10px] md:text-sm font-bold">{match.teamB.name}</p>
              <p className="mono-font text-[8px] md:text-[10px] text-white/40">AVG: {match.teamB.averageSkill}</p>
            </div>
          </div>
        </div>

        {/* Skill diff */}
        <div className="glass-card p-3 md:p-4 border-t-2 border-[var(--primary)] text-center">
          <p className="mono-font text-[var(--primary)] text-[9px] md:text-xs font-bold uppercase tracking-widest">
            Diff: {match.skillDifference.toFixed(1)}
            {match.skillDifference === 0 ? ' // PARTIDO PERFECTO' : ' // MUY PAREJO'}
          </p>
        </div>

        {/* Team lists */}
        <div className="grid grid-cols-2 gap-3 md:gap-6">
          {/* Team A */}
          <div>
            <h4 className="mono-font text-blue-500 text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] mb-2 md:mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-blue-500"></span>
              {match.teamA.name}
            </h4>
            <div className="space-y-1.5">
              {match.teamA.players.map(p => (
                <div key={p.id} className="glass-card p-2.5 flex items-center justify-between border border-white/5">
                  <span className="display-font font-bold text-xs md:text-sm uppercase italic truncate">{p.name}</span>
                  <span className="mono-font text-[var(--primary)] font-bold text-xs flex-shrink-0 ml-2">{p.skill}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team B */}
          <div>
            <h4 className="mono-font text-orange-500 text-[9px] md:text-xs font-bold uppercase tracking-[0.3em] mb-2 md:mb-3 flex items-center gap-2">
              <span className="h-px w-6 bg-orange-500"></span>
              {match.teamB.name}
            </h4>
            <div className="space-y-1.5">
              {match.teamB.players.map(p => (
                <div key={p.id} className="glass-card p-2.5 flex items-center justify-between border border-white/5">
                  <span className="display-font font-bold text-xs md:text-sm uppercase italic truncate">{p.name}</span>
                  <span className="mono-font text-[var(--primary)] font-bold text-xs flex-shrink-0 ml-2">{p.skill}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-4 text-center">
          <p className="mono-font text-white/20 text-[8px] md:text-[10px] uppercase tracking-widest mb-3">Armado con</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 mono-font text-[var(--primary)] text-xs font-bold uppercase tracking-widest border border-[var(--primary)] px-4 py-2 hover:bg-[var(--primary)] hover:text-black transition-all"
          >
            <span className="material-symbols-outlined text-sm">sports_soccer</span>
            Armar mis equipos
          </a>
        </div>
      </main>
    </div>
  );
};
