import React from 'react';
import { Bookmark, Heart } from 'lucide-react';
import BoardImage from './BoardImage';

const holdTypes = {
  1: { color: 'rgba(5, 103, 232, 1)' },
  2: { color: 'rgb(34, 197, 94)' },
  3: { color: 'rgb(234, 179, 8)' },
  4: { color: 'rgb(239, 68, 68)' }
};

const SavedProblemCard = ({
  id,
  grade,
  savedDate,
  name,
  holds = [],
  authorUsername,
  liked = false,
  saved = true,
  onHeart,
  onBookmark
}) => (
  <div className="relative mb-6 break-inside-avoid rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
    <div className="relative bg-neutral-900">
      <div className="aspect-[3/4] overflow-hidden">
        <BoardImage size="full" className="w-full h-full opacity-90" />
        <div className="absolute inset-0">
          {holds.map((hold, idx) => (
            <div
              key={idx}
              className="absolute w-2.5 h-2.5 md:w-3 md:h-3 rounded-full border border-white/60"
              style={{
                left: `${hold.x}%`,
                top: `${hold.y}%`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: `${holdTypes[hold.type]?.color || 'rgba(5, 103, 232, 1)'}`,
                opacity: 0.9
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute top-3 right-3 flex gap-2 text-white">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHeart?.();
          }}
          className={`backdrop-blur-sm rounded-full p-2 transition-colors ${
            liked ? 'bg-red-500' : 'bg-black/40 hover:bg-black/60'
          }`}
          aria-label="Add send"
        >
          <Heart size={16} strokeWidth={2.25} className="opacity-90" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark?.();
          }}
          className={`backdrop-blur-sm rounded-full p-2 transition-colors ${
            saved ? 'bg-blue-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white'
          }`}
          aria-label="Save problem"
        >
          <Bookmark size={16} strokeWidth={2.25} className="opacity-90" />
        </button>
      </div>
    </div>
    <div className="px-3 py-2 flex items-center justify-between text-[11px] text-gray-600 font-semibold uppercase tracking-widest">
      <span>{name || `Problem #${id}`}</span>
      <span className="text-gray-500">{grade} · saved {savedDate}</span>
    </div>
    <div className="px-3 pb-2 text-[10px] text-gray-500 uppercase font-semibold tracking-widest">
      @{authorUsername || 'climber'}
    </div>
  </div>
);

export default SavedProblemCard;
