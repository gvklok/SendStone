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

  const resetForm = () => {
    setName('');
    setGrade('V0');
    setDescription('');
    setHolds([]);
    setAngle(40);
    setBoardKey((k) => k + 1);
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
