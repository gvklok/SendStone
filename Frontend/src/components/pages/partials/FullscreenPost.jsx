import React from 'react';
import boardImage from '../../../assets/board.png';

const holdTypes = {
  1: { color: 'rgba(5, 103, 232, 1)' },
  2: { color: 'rgb(34, 197, 94)' },
  3: { color: 'rgb(234, 179, 8)' },
  4: { color: 'rgb(239, 68, 68)' },
};

const FullscreenPost = ({ post, onClose, onSave, onSend, liked = false, saved = false }) => {
  if (!post) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 text-white font-bold uppercase tracking-widest"
          >
            Back
          </button>
          <div className="flex gap-2">
            <button
              onClick={onSend}
              className={`p-3 rounded-full ${
                liked ? 'bg-red-500 text-white' : 'bg-gray-900 text-white'
              }`}
              aria-label="Add send"
            >
              ♥
            </button>
            <button
              onClick={onSave}
              className={`p-3 rounded-full ${
                saved ? 'bg-blue-500 text-white' : 'bg-gray-900 text-white'
              }`}
              aria-label="Save problem"
            >
              🔖
            </button>
          </div>
        </div>

        <div className="md:flex">
          <div className="md:w-1/2 bg-neutral-900 relative">
            <img
              src={boardImage}
              alt={post.name}
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0">
              {post.holds?.map((hold, idx) => (
                <div
                  key={idx}
                  className="absolute w-3.5 h-3.5 md:w-4 md:h-4 rounded-full border border-white/60"
                  style={{
                    left: `${hold.x}%`,
                    top: `${hold.y}%`,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: holdTypes[hold.type]?.color || 'rgba(5,103,232,1)',
                    opacity: 0.9,
                  }}
                />
              ))}
            </div>
          </div>
          <div className="md:w-1/2 p-6 space-y-4">
            <div className="text-sm font-black uppercase tracking-widest text-gray-600">
              @{post.authorUsername || 'climber'}
            </div>
            <div className="text-2xl md:text-3xl font-black text-gray-900">
              {post.name || `Problem #${post.id}`}
            </div>
            <div className="text-sm font-bold uppercase tracking-wider text-gray-700">
              Grade: {post.grade}
            </div>
            <div className="text-gray-600 text-base leading-relaxed">
              {post.description || 'No description provided.'}
            </div>
            <div className="text-sm font-semibold text-gray-500 uppercase tracking-widest">
              {post.sends || 0} sends
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPost;
