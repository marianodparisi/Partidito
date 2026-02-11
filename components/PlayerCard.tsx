import React from 'react';
import { Player, Position } from '../types';
import { IconShield, IconGoal, IconSword, IconActivity, IconTrash } from './Icons';

interface PlayerCardProps {
  player: Player;
  onDelete?: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compact?: boolean;
}

const getPositionStyles = (pos: Position) => {
  switch (pos) {
    case Position.GK: return { color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: IconGoal };
    case Position.DEF: return { color: 'text-blue-600 bg-blue-50 border-blue-200', icon: IconShield };
    case Position.MID: return { color: 'text-green-600 bg-green-50 border-green-200', icon: IconActivity };
    case Position.FWD: return { color: 'text-red-600 bg-red-50 border-red-200', icon: IconSword };
    default: return { color: 'text-gray-600 bg-gray-50 border-gray-200', icon: IconActivity };
  }
};

const getSkillColor = (skill: number) => {
  if (skill >= 9) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (skill >= 7) return 'bg-green-100 text-green-700 border-green-200';
  if (skill >= 5) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
};

export const PlayerCard: React.FC<PlayerCardProps> = ({ 
  player, 
  onDelete, 
  selectable, 
  selected, 
  onToggleSelect,
  compact = false
}) => {
  const handleClick = () => {
    if (selectable && onToggleSelect) {
      onToggleSelect(player.id);
    }
  };

  const baseClasses = "relative flex items-center justify-between bg-white rounded-xl transition-all duration-200";
  const selectClasses = selectable 
    ? `cursor-pointer border-2 ${selected ? 'border-pitch-500 shadow-md ring-1 ring-pitch-500' : 'border-transparent shadow-sm hover:shadow-md hover:border-gray-200'}`
    : "border border-gray-100 shadow-sm";
  const paddingClasses = compact ? "p-3" : "p-4";

  // Use the first position for the main avatar, or a fallback
  const mainPos = player.positions[0] || Position.MID;
  const MainIcon = getPositionStyles(mainPos).icon;

  return (
    <div 
      className={`${baseClasses} ${selectClasses} ${paddingClasses}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Main Icon Avatar */}
        <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-gray-50 border border-gray-200`}>
           <MainIcon className="w-5 h-5 text-gray-500" />
        </div>
        
        <div className="min-w-0">
          <h3 className={`font-semibold text-gray-900 truncate ${compact ? 'text-sm' : 'text-base'}`}>{player.name}</h3>
          
          {/* Mini Position Badges */}
          <div className="flex flex-wrap gap-1 mt-0.5">
            {player.positions.map(pos => {
               const style = getPositionStyles(pos);
               const MiniIcon = style.icon;
               return (
                 <div key={pos} className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium border ${style.color}`}>
                    <MiniIcon className="w-3 h-3" />
                    {!compact && <span>{pos}</span>}
                 </div>
               );
            })}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-3 pl-2">
        <div className={`px-2.5 py-1 rounded-lg border font-bold text-sm whitespace-nowrap ${getSkillColor(player.skill)}`}>
          {player.skill}
        </div>
        {onDelete && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(player.id);
            }}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <IconTrash className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};