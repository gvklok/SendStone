import React from 'react';
import { Bookmark, Mountain, Lightbulb } from 'lucide-react';
import BoardPreview from './BoardPreview';

const ProblemGridCard = ({
  id,
  grade,
  sends = 0,
  name,
  holds = [],
  saved = false,
  liked = false,
  authorUsername,
  onBookmark,
  onHeart,
  onOpen
}) => (
  <div
    className="relative mb-6 break-inside-avoid rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer"
    onClick={onOpen}
  >
    <div className="relative bg-neutral-900">
      <BoardPreview holds={holds} className="w-full" />
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onHeart?.();
          }}
          className={`backdrop-blur-sm rounded-full p-2 text-white transition-colors ${
            liked ? 'bg-emerald-500' : 'bg-black/40 hover:bg-black/60'
          }`}
          aria-label="Log ascent"
          title="Log ascent"
        >
          <Mountain size={16} strokeWidth={2.25} className="opacity-90" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onBookmark?.();
          }}
          className={`backdrop-blur-sm rounded-full p-2 text-white transition-colors ${
            saved ? 'bg-blue-500' : 'bg-black/40 hover:bg-black/60'
          }`}
          aria-label="Save problem"
          title="Save problem"
        >
          <Bookmark size={16} strokeWidth={2.25} className="opacity-90" />
        </button>
      </div>
    </div>
    <div className="px-3 py-2 flex items-center justify-between text-[11px] text-gray-600 font-semibold uppercase tracking-widest gap-2">
      <span className="truncate min-w-0">{name || `Problem #${id}`}</span>
      <span className="text-gray-500 whitespace-nowrap flex-shrink-0">{grade} · {sends} ascents</span>
    </div>
    <div className="px-3 pb-2 text-[10px] text-gray-500 uppercase font-semibold tracking-widest">
      @{authorUsername || 'climber'}
    </div>
  </div>
);

export default ProblemGridCard;
