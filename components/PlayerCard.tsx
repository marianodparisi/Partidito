import React from 'react';
import { Player, Position } from '../types';

interface PlayerCardProps {
  player: Player;
  onDelete?: (id: string) => void;
  onEdit?: (player: Player) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compact?: boolean;
  mobileCompact?: boolean;
}

const positionLabels: Record<string, string> = {
  [Position.GK]: 'GK',
  [Position.DEF]: 'DEF',
  [Position.MID]: 'MED',
  [Position.FWD]: 'OFE',
};

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  onDelete,
  onEdit,
  selectable,
  selected,
  onToggleSelect,
  compact = false,
  mobileCompact = false
}) => {
  const handleClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(player.id);
    }
  };

  // Mobile compact mode: slim row for roster list on small screens
  if (mobileCompact) {
    return (
      <div className="glass-card p-3 flex items-center justify-between border border-white/5 gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="bg-[var(--primary)] text-black font-black px-2 py-0.5 skill-badge display-font text-xs flex-shrink-0">
            {player.skill}
          </div>
          <span className="display-font font-bold text-sm uppercase italic text-white truncate">
            {player.name}
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(player);
              }}
              className="text-white/30 p-1.5 hover:text-[var(--primary)] transition-colors"
              title="Editar"
            >
              <span className="material-symbols-outlined text-base">edit</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(player.id);
              }}
              className="text-white/30 p-1.5 hover:text-red-500 transition-colors"
              title="Eliminar"
            >
              <span className="material-symbols-outlined text-base">delete</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Compact mode: simple row for team results
  if (compact) {
    return (
      <div className="glass-card p-2.5 md:p-4 flex items-center justify-between border border-white/5">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex w-8 h-8 bg-white/5 items-center justify-center border border-white/10">
            <span className="material-symbols-outlined text-white/40 text-sm">person</span>
          </div>
          <span className="display-font font-bold text-xs md:text-sm uppercase italic text-white">{player.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-[var(--primary)] text-black font-black px-2 md:px-3 py-0.5 skill-badge display-font text-xs md:text-sm">
            {player.skill}
          </div>
        </div>
      </div>
    );
  }

  // Selectable card: name + average only (compact for match selection)
  if (selectable) {
    return (
      <div
        className={`glass-card p-2.5 md:p-4 border group cursor-pointer relative overflow-hidden flex items-center justify-between transition-all duration-200 ${
          selected
            ? 'border-[var(--primary)] shadow-[0_0_20px_rgba(175,255,0,0.15)]'
            : 'border-white/10 hover:border-[var(--primary)]'
        }`}
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 md:gap-3">
          <input
            type="checkbox"
            checked={selected}
            readOnly
            className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/20 bg-transparent text-[var(--primary)] focus:ring-0 checked:bg-[var(--primary)] rounded-none cursor-pointer flex-shrink-0"
          />
          <h4 className="display-font font-black text-sm md:text-base uppercase italic group-hover:text-[var(--primary)] transition-colors truncate">
            {player.name}
          </h4>
        </div>
        <div className="bg-[var(--primary)] text-black font-black px-2 md:px-3 py-0.5 skill-badge display-font text-xs md:text-sm flex-shrink-0 ml-2 md:ml-3">
          {player.skill}
        </div>
      </div>
    );
  }

  // Full card for roster management
  return (
    <div
      className="glass-card bento-card p-3 md:p-6 border border-white/10 group cursor-pointer relative overflow-hidden"
      onClick={handleClick}
    >
      {/* Header: Name + Skill Badge */}
      <div className="flex items-center justify-between mb-3 md:mb-6">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="hidden md:flex w-12 h-12 bg-white/5 items-center justify-center border border-white/10">
            <span className="material-symbols-outlined text-white/40">person</span>
          </div>
          <h4 className="display-font font-black text-base md:text-xl uppercase italic group-hover:text-[var(--primary)] transition-colors truncate">
            {player.name}
          </h4>
        </div>
        <div className="bg-[var(--primary)] text-black font-black px-3 md:px-4 py-0.5 md:py-1 skill-badge display-font text-sm md:text-lg flex-shrink-0 ml-2">
          {player.skill}
        </div>
      </div>

      {/* Stats Grid */}
      <div className={`grid gap-1 md:gap-2 border-t border-white/5 pt-2 md:pt-4 ${player.stamina != null ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {[Position.GK, Position.DEF, Position.MID, Position.FWD].map(pos => {
          const val = player.positionSkills[pos] || 0;
          return (
            <div key={pos} className="text-center bg-white/5 p-1 md:p-2 border border-white/5">
              <span className="block stat-label mono-font text-white/40 mb-0.5 md:mb-1">{positionLabels[pos]}</span>
              <span className="block display-font font-bold text-sm md:text-lg">{val}</span>
            </div>
          );
        })}
        {player.stamina != null && (
          <div className="text-center bg-white/5 p-1 md:p-2 border border-white/5">
            <span className="material-symbols-outlined text-rose-500 text-[10px] md:text-xs block mb-0.5 md:mb-1">favorite</span>
            <span className="block display-font font-bold text-sm md:text-lg">{player.stamina}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {(onEdit || onDelete) && (
        <div className="flex gap-1 md:gap-2 mt-2 md:mt-4 pt-2 md:pt-4 border-t border-white/5">
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit(player);
              }}
              className="flex-1 mono-font text-[10px] font-bold uppercase tracking-widest text-white/30 border border-white/10 px-2 md:px-3 py-1.5 md:py-2 hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-1 md:gap-2"
              title="Editar"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              <span className="hidden md:inline">Editar</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(player.id);
              }}
              className="mono-font text-[10px] font-bold uppercase tracking-widest text-white/30 border border-white/10 px-2 md:px-3 py-1.5 md:py-2 hover:border-red-500 hover:text-red-500 transition-all flex items-center justify-center gap-1 md:gap-2"
              title="Eliminar"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
