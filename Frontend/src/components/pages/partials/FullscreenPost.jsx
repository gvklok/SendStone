import React, { useState, useEffect } from 'react';
import { Mountain, Bookmark, Lightbulb, X, Shuffle } from 'lucide-react';
import BoardPreview from '../../common/BoardPreview';
const API_BASE = process.env.REACT_APP_API_URL;


const FullscreenPost = ({ post, onClose, onSave, onSend, onRemix, liked = false, saved = false }) => {
  const [predictedGrade, setPredictedGrade] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState(null);
  const [ledStatus, setLedStatus] = useState(null); // 'lit' | 'unavailable' | 'error'

  // Reset prediction and LED status when post changes
  useEffect(() => {
    setPredictedGrade(null);
    setPredictionError(null);
    setLedStatus(null);
  }, [post?.id]);

  const handleSendToBoard = () => {
    if (!post?.id) return;

    // Toggle off — update immediately, fire-and-forget the HTTP call
    if (ledStatus === 'lit') {
      setLedStatus(null);
      fetch(`${API_BASE}/hardware/led/off`, { method: 'POST' }).catch(() => {});
      return;
    }

    // Optimistic: show lit immediately so the button feels instant
    setLedStatus('lit');
    fetch(`${API_BASE}/hardware/led/preview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ holds: post.holds || [] }),
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data) { setLedStatus('error'); return; }
        if (data.status?.includes('simulated')) setLedStatus('unavailable');
        // else stays 'lit'
      })
      .catch(() => setLedStatus('error'));
  };

  const handlePredictGrade = async () => {
    if (isPredicting) return;
    const holds = post.holds || [];
    const angle = post.angle || 40;
    setPredictionError(null);
    setIsPredicting(true);

    try {
      const response = await fetch(`${API_BASE}/ml/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holds, angle }),
      });

      if (response.ok) {
        const data = await response.json();
        setPredictedGrade(data.suggested_grade.toUpperCase());
      } else if (response.status === 503) {
        setPredictionError('ML model not available');
      } else {
        setPredictionError('Failed to predict grade');
      }
    } catch (err) {
      setPredictionError('Could not connect to ML service');
    } finally {
      setIsPredicting(false);
    }
  };

  if (!post) return null;

  const handleClose = () => {
    if (ledStatus === 'lit') {
      fetch(`${API_BASE}/hardware/led/off`, { method: 'POST' }).catch(() => {});
    }
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      {/* Outer card — let it size from content, cap at 90vh, scroll when needed */}
      <div
        className="bg-white w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar — sticky so it's always visible */}
        <div className="sticky top-0 z-10 bg-white/90 backdrop-blur flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="Close"
          >
            <X size={22} strokeWidth={2.5} />
          </button>
          <div className="flex gap-2">
            {/* Remix */}
            <button
              onClick={(e) => { e.stopPropagation(); onRemix?.(); }}
              className="p-2.5 rounded-full bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-600 transition-colors"
              aria-label="Remix route"
              title="Remix this route"
            >
              <Shuffle size={20} strokeWidth={2.25} />
            </button>
            {/* Send to Board (LED) */}
            <button
              onClick={(e) => { e.stopPropagation(); handleSendToBoard(); }}
              className={`p-2.5 rounded-full transition-colors ${
                ledStatus === 'lit'         ? 'bg-amber-400 text-white'
                : ledStatus === 'unavailable' ? 'bg-gray-200 text-gray-400'
                : ledStatus === 'error'       ? 'bg-red-100 text-red-500'
                : 'bg-gray-100 text-gray-700 hover:bg-amber-100 hover:text-amber-600'
              }`}
              aria-label="Send to board"
              title={
                ledStatus === 'lit'          ? 'Board lit up!'
                : ledStatus === 'unavailable' ? 'LEDs not connected'
                : ledStatus === 'error'       ? 'Failed to reach board'
                : 'Light up on board'
              }
            >
              <Lightbulb size={20} strokeWidth={2.25} />
            </button>
            {/* Ascent / Send */}
            <button
              onClick={(e) => { e.stopPropagation(); onSend?.(); }}
              className={`p-2.5 rounded-full transition-colors ${
                liked
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-emerald-100 hover:text-emerald-600'
              }`}
              aria-label="Log ascent"
              title="Log ascent"
            >
              <Mountain size={20} strokeWidth={2.25} />
            </button>
            {/* Save / Bookmark */}
            <button
              onClick={(e) => { e.stopPropagation(); onSave?.(); }}
              className={`p-2.5 rounded-full transition-colors ${
                saved
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-600'
              }`}
              aria-label="Save problem"
              title="Save problem"
            >
              <Bookmark size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        {/* Board — full width, natural 2:3 aspect ratio, no clipping */}
        <div className="bg-neutral-900">
          <div className="max-w-md mx-auto">
            <BoardPreview holds={post.holds || []} className="w-full" />
          </div>
        </div>

        {/* Details — below the board */}
        <div className="p-6 md:p-8 space-y-4">
          <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
            @{post.authorUsername || 'climber'}
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
            {post.name || `Problem #${post.id}`}
          </h2>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full bg-gray-900 text-white text-xs font-black uppercase tracking-widest">
              {post.grade}
            </span>
            {post.angle && (
              <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-widest">
                {post.angle}°
              </span>
            )}
          </div>

          {/* AI Prediction Section */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            {!predictedGrade && !isPredicting && (
              <button
                onClick={handlePredictGrade}
                className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors inline-flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Check AI Prediction
              </button>
            )}

            {isPredicting && (
              <div className="text-sm text-gray-500 font-medium">
                Analyzing route...
              </div>
            )}

            {predictedGrade && (
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                    AI Prediction
                  </span>
                  <button
                    onClick={() => setPredictedGrade(null)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Actual</div>
                    <div className="text-2xl font-black text-gray-900">{post.grade}</div>
                  </div>
                  <div className="text-gray-300">→</div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Predicted</div>
                    <div className={`text-2xl font-black ${
                      predictedGrade === post.grade ? 'text-green-600' : 'text-blue-600'
                    }`}>
                      {predictedGrade}
                    </div>
                  </div>
                </div>
                {predictedGrade === post.grade && (
                  <div className="mt-2 text-xs font-semibold text-green-600">
                    ✓ AI agrees with this grade
                  </div>
                )}
                {predictedGrade !== post.grade && (
                  <div className="mt-2 text-xs font-medium text-gray-600">
                    AI suggests a different difficulty
                  </div>
                )}
              </div>
            )}

            {predictionError && (
              <div className="text-xs font-medium text-red-600">
                {predictionError}
              </div>
            )}
          </div>

          <p className="text-gray-600 text-base leading-relaxed">
            {post.description || 'No description provided.'}
          </p>
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-500 uppercase tracking-widest">
            <Mountain size={14} strokeWidth={2.5} />
            {post.sends || 0} ascents
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullscreenPost;
