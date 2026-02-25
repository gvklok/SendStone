import React, { useState } from 'react';
import InteractiveBoard from '../common/InteractiveBoard';

const CreatePage = ({ onPostProblem, onSaveProblem, user }) => {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('V0');
  const [description, setDescription] = useState('');
  const [holds, setHolds] = useState([]);
  const [angle, setAngle] = useState(40);
  const [boardKey, setBoardKey] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [predictedGrade, setPredictedGrade] = useState(null);
  const [isLightingBoard, setIsLightingBoard] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);

  const resetForm = () => {
    setName('');
    setGrade('V0');
    setDescription('');
    setHolds([]);
    setAngle(40);
    setBoardKey((k) => k + 1);
    setPredictedGrade(null);
  };

  // Check if holds are valid (have proper start and finish)
  const hasValidHolds = () => {
    const greenCount = holds.filter(h => h.color === 'green').length;
    const redCount = holds.filter(h => h.color === 'red').length;
    return greenCount >= 1 && greenCount <= 2 && redCount >= 1 && redCount <= 2;
  };

  // Light up the board with current holds
  const handleLightBoard = async () => {
    setError('');
    setMessage('');
    
    if (holds.length === 0) {
      setError('Add some holds first before lighting up the board.');
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

    setIsLightingBoard(true);
    try {
      const response = await fetch('http://localhost:8000/hardware/led/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holds }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(`Board lit up with ${data.hold_count} holds!`);
      } else {
        setError('Failed to light up board. Is the backend running?');
      }
    } catch (err) {
      setError('Could not connect to backend. Make sure it\'s running on port 8000.');
    } finally {
      setIsLightingBoard(false);
    }
  };

  // Predict grade using AI
  const handlePredictGrade = async () => {
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
      const response = await fetch('http://localhost:8000/ml/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ holds, angle }),
      });

      if (response.ok) {
        const data = await response.json();
        setPredictedGrade(data.suggested_grade.toUpperCase()); // "v4" -> "V4"
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
        
        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Interactive Board */}
          <InteractiveBoard
            key={boardKey}
            onHoldsChange={setHolds}
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
                onClick={handleLightBoard}
                disabled={isLightingBoard || !hasValidHolds()}
                className="w-full bg-white text-gray-900 py-3 md:py-4 font-black uppercase tracking-wider hover:bg-gray-50 transition-colors border-2 border-gray-900 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                {isLightingBoard ? 'Loading...' : 'Preview on Board'}
              </button>
            </div>

            {/* Suggested Grade */}
            {predictedGrade && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1">
                      Suggested
                    </div>
                    <div className="text-2xl font-black text-gray-900">
                      {predictedGrade}
                    </div>
                  </div>
                  <button
                    onClick={() => setGrade(predictedGrade)}
                    className="px-4 py-2 bg-blue-600 text-white font-bold uppercase text-xs tracking-wider hover:bg-blue-500 transition-colors"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                onClick={handlePredictGrade}
                disabled={isPredicting || !hasValidHolds()}
                className="w-full bg-gray-900 text-white py-2 md:py-3 font-bold uppercase tracking-wide hover:bg-gray-800 transition-colors border-2 border-gray-900 disabled:opacity-40 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isPredicting ? 'Analyzing...' : 'Suggest Grade'}
              </button>
            </div>

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
