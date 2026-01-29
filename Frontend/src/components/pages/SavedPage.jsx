import React, { useMemo, useState } from 'react';
import SavedProblemCard from '../common/SavedProblemCard';
import FullscreenPost from './partials/FullscreenPost';

const formatSaved = (value) => {
  if (!value) return 'just now';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

const SavedPage = ({ savedProblems = [], user, onSend, onSave, likedIds = new Set() }) => {
  const [filter, setFilter] = useState('all');
  const [openPost, setOpenPost] = useState(null);

  const filtered = useMemo(() => {
    if (filter === 'mine') {
      return savedProblems.filter((p) => p.userEmail === user?.email);
    }
    if (filter === 'others') {
      return savedProblems.filter((p) => p.userEmail !== user?.email);
    }
    return savedProblems;
  }, [filter, savedProblems, user]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-wider border-l-4 border-blue-500 pl-4">
            Saved Problems
          </h2>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'mine', label: 'Created by you' },
              { key: 'others', label: 'Created by others' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-2 rounded-full text-xs font-black uppercase tracking-widest border ${
                  filter === f.key ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        
        {filtered.length === 0 ? (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            No saved problems yet. Create or save a problem to see it here.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
            {filtered.map((p) => (
              <div key={p.id} onClick={() => setOpenPost(p)} className="cursor-pointer">
                <SavedProblemCard 
                  id={p.id} 
                  grade={p.grade} 
                  savedDate={formatSaved(p.savedDate)} 
                  name={p.name}
                  holds={p.holds}
                  authorUsername={p.authorUsername}
                  liked={likedIds.has(p.id)}
                  saved
                  onBookmark={(e) => {
                    e?.stopPropagation?.();
                    onSave?.(p.id);
                  }}
                  onHeart={(e) => {
                    e?.stopPropagation?.();
                    onSend?.(p.id);
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {openPost && (
        <FullscreenPost
          post={openPost}
          onClose={() => setOpenPost(null)}
          onSave={() => onSave?.(openPost.id)}
          onSend={() => onSend?.(openPost.id)}
          liked={likedIds.has(openPost.id)}
          saved
        />
      )}
    </div>
  );
};

export default SavedPage;
