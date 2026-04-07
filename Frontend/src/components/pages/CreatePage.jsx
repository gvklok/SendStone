import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Route } from 'lucide-react';
import InteractiveBoard from '../common/InteractiveBoard';

const API_BASE = process.env.REACT_APP_API_URL;

const CreatePage = ({ onPostProblem, onSaveProblem, user, remixData, onRemixConsumed }) => {
  const [name, setName] = useState(() => remixData?.name || '');
  const [grade, setGrade] = useState(() => remixData?.grade || 'V0');
  const [description, setDescription] = useState(() => remixData?.description || '');
  const [holds, setHolds] = useState(() => remixData?.holds || []);
  const [angle, setAngle] = useState(() => remixData?.angle ?? 40);
  const [boardKey, setBoardKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [predictedGrade, setPredictedGrade] = useState(null);
  const [predictedRaw, setPredictedRaw] = useState(null);
  const [predictedPath, setPredictedPath] = useState([]);
  const [showPath, setShowPath] = useState(false);
  const [boardPreviewActive, setBoardPreviewActive] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const previewTimerRef = useRef(null);

  const resetForm = () => {
    setName('');
    setGrade('V0');
    setDescription('');
    setHolds([]);
    setAngle(40);
    setBoardKey((k) => k + 1);
    setPredictedGrade(null);
    setPredictedRaw(null);
    setPredictedPath([]);
    setShowPath(false);
    onRemixConsumed?.();
  };

  // Check if holds are valid (have proper start and finish)
  const hasValidHolds = () => {
    const greenCount = holds.filter(h => h.color === 'green').length;
    const redCount = holds.filter(h => h.color === 'red').length;
    return greenCount >= 1 && greenCount <= 2 && redCount >= 1 && redCount <= 2;
  };

  // Fire-and-forget LED preview — does not block the UI
  const firePreview = useCallback((currentHolds) => {
    if (currentHolds.length === 0) {
      fetch(`${API_BASE}/hardware/led/off`, { method: 'POST' }).catch(() => {});
    } else {
      fetch(`${API_BASE}/hardware/led/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holds: currentHolds }),
      }).catch(() => {});
    }
  }, []);

  // Auto-update LEDs (debounced 300 ms) whenever holds change while preview is active
  useEffect(() => {
    if (!boardPreviewActive) return;
    clearTimeout(previewTimerRef.current);
    previewTimerRef.current = setTimeout(() => firePreview(holds), 300);
    return () => clearTimeout(previewTimerRef.current);
  }, [holds, boardPreviewActive, firePreview]);

  // Toggle preview on/off
  const handleTogglePreview = () => {
    if (boardPreviewActive) {
      setBoardPreviewActive(false);
      fetch(`${API_BASE}/hardware/led/off`, { method: 'POST' }).catch(() => {});
    } else {
      setBoardPreviewActive(true);
      firePreview(holds);
    }
  };

  // Predict grade using AI
  const handlePredictGrade = async () => {
    if (isPredicting) return;
    setError('');
    setMessage('');
    
    if (holds.length === 0) {
      setError('Add some holds first before predicting grade.');
      return;
    }

    // Validate hold requirements
    const greenCount = holds.filter(h => h.color === 'green').length;
    const redCount = holds.filter(h => h.color === 'red').length;
    if (greenCount < 1 || greenCount > 2) {
      setError('Route must have 1 or 2 start holds (green).');
      return;
    }
    if (redCount < 1 || redCount > 2) {
      setError('Route must have 1 or 2 finish holds (red).');
      return;
    }

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
        setPredictedRaw(data.raw ?? null);
        setPredictedPath(data.path || []);
        setMessage(`AI predicted grade: ${data.suggested_grade.toUpperCase()}`);
      } else if (response.status === 503) {
        setError('ML model is not available. Please check backend setup.');
      } else {
        setError('Failed to predict grade. Is the backend running?');
      }
    } catch (err) {
      setError('Could not connect to backend. Make sure it\'s running on port 8000.');
    } finally {
      setIsPredicting(false);
    }
  };

  // Build payload matching backend API format
  const buildPayload = () => ({
    name: name || 'Untitled Problem',
    difficulty: grade.toLowerCase(),  // Backend expects lowercase "v4" not "V4"
    description,
    holds,  // Already in backend format: [{x, y, color}, ...]
    angle,
    visibility: 'public',
  });

  const handleSave = () => {
    setError('');
    setMessage('');
    if (!user) {
      setError('Log in to save a problem.');
      return;
    }
    const payload = buildPayload();
    onSaveProblem?.(payload);
    setMessage('Problem saved privately to Your Routes.');
    resetForm();
  };

  const handlePost = () => {
    setError('');
    setMessage('');
    if (!user) {
      setError('Log in to post a problem.');
      return;
    }
    // Validate hold requirements
    const greenCount = holds.filter(h => h.color === 'green').length;
    const redCount = holds.filter(h => h.color === 'red').length;
    if (greenCount < 1 || greenCount > 2) {
      setError('Route must have 1 or 2 start holds (green).');
      return;
    }
    if (redCount < 1 || redCount > 2) {
      setError('Route must have 1 or 2 finish holds (red).');
      return;
    }
    const payload = buildPayload();
    onPostProblem?.(payload);
    setMessage('Problem posted to Explore.');
    resetForm();
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0 p-4 md:p-12 bg-neutral-100">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-2xl md:text-5xl font-black mb-5 md:mb-10 text-gray-900 uppercase tracking-wide md:tracking-wider border-l-4 border-blue-500 pl-3 md:pl-4">
          Create Problem
        </h2>

        {remixData && (
          <div className="mb-5 md:mb-8 bg-purple-50 border-l-4 border-purple-500 p-3 md:p-4">
            <p className="text-xs font-black text-purple-900 uppercase tracking-wide">
              Remixing "{remixData.originalName}" — modify and post as your own
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Interactive Board */}
          <InteractiveBoard
            key={boardKey}
            onHoldsChange={setHolds}
            initialHolds={remixData?.holds}
            path={predictedPath}
            showPath={showPath}
            onClear={() => { setName(''); onRemixConsumed?.(); }}
          />

          {/* Problem Details Form */}
          <div className="space-y-5 md:space-y-6">
            <div>
              <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
                Problem Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ENTER PROBLEM NAME"
                className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
                  Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500"
                >
                  {['V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11', 'V12'].map(g => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
                  Angle
                </label>
                <select
                  value={angle}
                  onChange={(e) => setAngle(parseInt(e.target.value))}
                  className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold focus:outline-none focus:border-blue-500"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70].map(a => (
                    <option key={a} value={a}>{a}°</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm md:text-base font-black mb-2 text-gray-900 uppercase tracking-wider">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ADD NOTES OR BETA..."
                className="w-full px-4 py-3 md:py-4 border-2 border-gray-900 bg-white text-gray-900 font-bold placeholder-gray-400 focus:outline-none focus:border-blue-500 h-32"
              />
            </div>

            {/* Board Preview */}
            <div>
              <button
                onClick={handleTogglePreview}
                className={`w-full py-3 md:py-4 font-black uppercase tracking-wider transition-colors border-2 flex items-center justify-center gap-2 ${
                  boardPreviewActive
                    ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-400'
                    : 'bg-white text-gray-900 border-gray-900 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {boardPreviewActive ? 'Preview Active — Click to Stop' : 'Preview on Board'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePredictGrade}
                disabled={isPredicting || !hasValidHolds()}
                className="flex-1 bg-gray-900 text-white py-2 md:py-3 font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors border-2 border-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isPredicting ? 'Analyzing...' : 'Suggest Grade'}
              </button>
            </div>

            {/* Suggested Grade */}
            {predictedGrade && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Suggested
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {predictedGrade}
                    </div>
                    {predictedRaw != null && (
                      <div className="text-xs text-gray-400 font-medium mt-0.5">{predictedRaw.toFixed(2)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {predictedPath.length > 1 && (
                      <button
                        onClick={() => setShowPath(p => !p)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 font-bold uppercase text-xs tracking-wide transition-colors ${
                          showPath
                            ? 'bg-gray-800 text-white hover:bg-gray-700'
                            : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        <Route size={12} strokeWidth={2.25} />
                        {showPath ? 'Hide Path' : 'Show Path'}
                      </button>
                    )}
                    <button
                      onClick={() => setGrade(predictedGrade)}
                      className="px-4 py-1.5 bg-blue-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-blue-500 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="text-xs font-bold text-red-600 uppercase tracking-wide">
                {error}
              </div>
            )}
            {message && (
              <div className="text-xs font-bold text-green-600 uppercase tracking-wide">
                {message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleSave}
                className="w-full bg-gray-900 text-neutral-100 py-4 md:py-5 font-black uppercase tracking-widest hover:bg-gray-800 transition-colors border-2 border-gray-900"
              >
                Save
              </button>
              <button
                onClick={handlePost}
                className="w-full bg-blue-600 text-white py-4 md:py-5 font-black uppercase tracking-widest hover:bg-blue-500 transition-colors border-2 border-blue-600"
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatePage;
