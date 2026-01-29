import React, { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import ProblemGridCard from '../common/ProblemGridCard';
import FullscreenPost from './partials/FullscreenPost';
import boardImage from '../../assets/board.png';

const defaultProblems = [
  { id: 12, grade: 'V6', sends: 83, name: 'Moonwalk' },
  { id: 47, grade: 'V3', sends: 120, name: 'Pocket Party' },
  { id: 5, grade: 'V4', sends: 64, name: 'Sidepull City' },
  { id: 28, grade: 'V8', sends: 42, name: 'Crimp Reaper' },
  { id: 36, grade: 'V5', sends: 91, name: 'Compression Fit' },
  { id: 72, grade: 'V2', sends: 188, name: 'Warmup Rail' },
  { id: 9, grade: 'V7', sends: 51, name: 'Spicy Arete' },
  { id: 63, grade: 'V1', sends: 205, name: 'Jug Train' },
];

const holdTypes = {
  1: { color: 'rgba(5, 103, 232, 1)' },
  2: { color: 'rgb(34, 197, 94)' },
  3: { color: 'rgb(234, 179, 8)' },
  4: { color: 'rgb(239, 68, 68)' },
};

const ExplorePage = ({ problems, onSave, onSend, savedIds = new Set(), likedIds = new Set(), openPostId, clearOpenPost, onOpenPost }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [vRating, setVRating] = useState('');
  const [openPost, setOpenPost] = useState(null);

  const list = problems?.length ? problems : defaultProblems;

  const filteredProblems = useMemo(() => {
    return list.filter(({ id, grade, name }) => {
      const gradeNumber = Number(grade.replace('V', ''));
      const matchesGrade =
        vRating === '' ? true : gradeNumber === Number(vRating.replace('V', ''));
      const matchesSearch =
        searchTerm.trim().length === 0 ||
        grade.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `problem ${id}`.includes(searchTerm.toLowerCase()) ||
        (name || '').toLowerCase().includes(searchTerm.toLowerCase());
      return matchesGrade && matchesSearch;
    });
  }, [searchTerm, vRating, list]);

  React.useEffect(() => {
    if (!openPostId) return;
    const found = list.find((p) => p.id === openPostId);
    if (found) {
      setOpenPost(found);
      onOpenPost?.(found.id);
    }
    clearOpenPost?.();
  }, [openPostId, list, onOpenPost, clearOpenPost]);

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-6 md:p-12 bg-neutral-100">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-4 md:mb-6">
          <h2 className="text-3xl md:text-5xl font-black text-gray-900 uppercase tracking-wider">
            Explore
          </h2>
          <div className="relative">
            <Search 
              className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" 
              size={20} 
              strokeWidth={2.5} 
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search problems"
              className="w-full pl-12 pr-4 py-3 md:py-3.5 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-black uppercase tracking-widest text-gray-600">
              Search by V Rating
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={vRating}
              onChange={(e) => setVRating(e.target.value.replace(/[^0-9]/g, ''))}
              maxLength={2}
              placeholder="e.g. 5"
              className="w-24 px-3 py-2 rounded-full border border-gray-200 bg-white text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-red-400"
            />
            <span className="text-xs font-semibold text-gray-500">Enter number after V (0-12)</span>
          </div>
        </div>

        {/* Masonry feed */}
        {filteredProblems.length === 0 ? (
          <div className="text-gray-600 font-semibold bg-white border-2 border-dashed border-gray-300 p-8 text-center">
            No problems found. Post a new one from Create.
          </div>
        ) : (
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 md:gap-6">
            {filteredProblems.map(({ id, grade, sends, name, holds, authorUsername }) => (
              <ProblemGridCard 
                key={id} 
                id={id} 
                grade={grade} 
                sends={sends} 
                name={name}
                holds={holds}
                saved={savedIds.has(id)}
                liked={likedIds.has(id)}
                authorUsername={authorUsername}
                onOpen={() => {
                  const post = list.find((p) => p.id === id);
                  if (post) {
                    setOpenPost(post);
                    onOpenPost?.(post.id);
                  }
                }}
                onBookmark={() => onSave?.(id)}
                onHeart={() => onSend?.(id)}
              />
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
          saved={savedIds.has(openPost.id)}
        />
      )}
    </div>
  );
};

export default ExplorePage;
