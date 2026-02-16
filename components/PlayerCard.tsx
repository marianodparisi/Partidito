import React from 'react';
import { Player, Position } from '../types';
import { IconShield, IconGoal, IconSword, IconActivity, IconTrash, IconEdit, IconHeart } from './Icons';

interface PlayerCardProps {
  player: Player;
  onDelete?: (id: string) => void;
  onEdit?: (player: Player) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compact?: boolean;
}

const getPositionIcon = (pos: Position) => {
  switch (pos) {
    case Position.GK: return IconGoal;
    case Position.DEF: return IconShield;
    case Position.MID: return IconActivity;
    case Position.FWD: return IconSword;
    default: return IconActivity;
  }
};

const getSkillColor = (skill: number) => {
  if (skill >= 8) return 'text-emerald-600 font-bold';
  if (skill >= 5) return 'text-yellow-600 font-medium';
  return 'text-gray-400';
};

const getMainSkillColor = (skill: number) => {
  if (skill >= 9) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (skill >= 7) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (skill >= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onDelete,
  onEdit,
  selectable, 
  selected, 
  onToggleSelect, 
  compact = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    if (selectable && onToggleSelect) {
      onToggleSelect(player.id);
    }
  };

  const baseClasses = "relative flex flex-col bg-white rounded-xl transition-all duration-200";
  const selectClasses = selectable 
    ? `cursor-pointer border-2 ${selected ? 'border-pitch-500 shadow-md ring-1 ring-pitch-500' : 'border-transparent shadow-sm hover:shadow-md hover:border-gray-200'}`
    : "border border-gray-100 shadow-sm";
  const paddingClasses = compact ? "p-3" : "p-4";

  // Identify main position for Icon (highest skill)
  const maxSkill = Math.max(...(Object.values(player.positionSkills) as number[]));
  const mainPos = (Object.keys(player.positionSkills) as Position[]).find(p => player.positionSkills[p] === maxSkill) || Position.MID;
  const MainIcon = getPositionIcon(mainPos);

  return (
    <div 
      className={`${baseClasses} ${selectClasses} ${paddingClasses}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200`}>
             <MainIcon className="w-5 h-5 text-gray-500" />
          </div>
          <h3 className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>{player.name}</h3>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-lg border font-bold text-sm whitespace-nowrap ${getMainSkillColor(player.skill)}`}>
            {player.skill}
          </div>
          
          <div className="flex gap-1 z-10">
            {onEdit && !compact && (
                <button 
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onEdit) onEdit(player);
                }}
                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                title="Editar"
                >
                <IconEdit className="w-4 h-4" />
                </button>
            )}
            {onDelete && !compact && (
                <button 
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (onDelete) onDelete(player.id);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                title="Eliminar"
                >
                <IconTrash className="w-4 h-4" />
                </button>
            )}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div className={`grid gap-1 w-full bg-gray-50 rounded-lg p-2 border border-gray-100 ${player.stamina != null ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {[Position.GK, Position.DEF, Position.MID, Position.FWD].map(pos => {
          const val = player.positionSkills[pos] || 0;
          return (
            <div key={pos} className="flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase text-gray-400 font-bold mb-0.5">{pos === Position.GK ? 'GK' : pos.substring(0,3)}</span>
              <span className={`text-sm ${getSkillColor(val)}`}>{val}</span>
            </div>
          );
        })}
        {player.stamina != null && (
          <div className="flex flex-col items-center justify-center">
            <IconHeart className="w-3 h-3 text-orange-400 mb-0.5" />
            <span className={`text-sm ${getSkillColor(player.stamina)}`}>{player.stamina}</span>
          </div>
        )}
      </div>
    </div>
  );
};