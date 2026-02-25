import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

const ProfilePage = ({
  user,
  onSignOut,
  onUpdateProfilePhoto,
  onUpdateEmail,
  onDeleteAccount,
  theme = 'light',
  onToggleTheme,
  textSize = 'small',
  onToggleTextSize,
  sidebarPinned = false,
  onToggleSidebarPinned,
}) => {
  const displayName = user?.name || 'Climber';
  const username = user?.username || 'climber';
  const photo = user?.photoData || null;

  const [emailDraft, setEmailDraft] = useState(user?.email || '');
  const [photoFileName, setPhotoFileName] = useState('No file chosen');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setEmailDraft(user?.email || '');
  }, [user?.email]);

  const setFeedback = ({ ok, text }) => {
    if (ok) {
      setMessage(text);
      setError('');
    } else {
      setError(text);
      setMessage('');
    }
  };

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhotoFileName('No file chosen');
      return;
    }
    setPhotoFileName(file.name);
    setBusy(true);
    const result = await onUpdateProfilePhoto?.(file);
    setBusy(false);
    if (result?.ok) {
      setFeedback({ ok: true, text: 'Profile picture updated.' });
    } else {
      setFeedback({ ok: false, text: result?.error || 'Failed to update profile picture.' });
    }
  };

  const handleSaveEmail = async () => {
    if (!emailDraft.trim()) {
      setFeedback({ ok: false, text: 'Email cannot be empty.' });
      return;
    }
    setBusy(true);
    const result = await onUpdateEmail?.(emailDraft.trim());
    setBusy(false);
    if (result?.ok) {
      const suffix = result.authUpdated ? '' : ' (Auth email update may require admin check.)';
      setFeedback({ ok: true, text: `Email updated.${suffix}` });
    } else {
      setFeedback({ ok: false, text: result?.error || 'Failed to update email.' });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = window.prompt('Type "delete" to permanently delete your account.');
    if (confirmText !== 'delete') {
      setFeedback({ ok: false, text: 'Account deletion cancelled.' });
      return;
    }
    setBusy(true);
    const result = await onDeleteAccount?.();
    setBusy(false);
    if (!result?.ok) {
      setFeedback({ ok: false, text: result?.error || 'Failed to delete account.' });
    }
  };

  return (
    <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
      <div className="bg-neutral-900 text-neutral-100 p-12 md:p-20 text-center">
        <div className="w-28 h-28 md:w-40 md:h-40 bg-neutral-800 border-4 border-neutral-700 mx-auto mb-4 md:mb-6 flex items-center justify-center overflow-hidden">
          {photo ? (
            <img src={photo} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <User size={56} className="md:w-24 md:h-24" strokeWidth={2.5} />
          )}
        </div>
        <h2 className="text-3xl md:text-5xl font-black mb-2 uppercase tracking-widest">
          {displayName}
        </h2>
        <p className="text-neutral-400 font-bold tracking-wider text-base md:text-xl">@{username}</p>
      </div>

      <div className="p-6 md:p-12 bg-neutral-100 max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-black uppercase tracking-wider text-gray-800 mb-2 text-center">Change Profile Picture</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <input
                id="profile-photo-input"
                type="file"
                accept="image/*"
                onChange={handlePhotoFile}
                disabled={busy}
                className="hidden"
              />
              <label
                htmlFor="profile-photo-input"
                className={`px-4 py-2 border-2 border-gray-700 rounded-md text-sm font-semibold ${
                  busy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-100'
                }`}
              >
                Choose File
              </label>
              <span className="text-sm text-gray-600">{photoFileName}</span>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-black uppercase tracking-wider text-gray-800 mb-2 text-center">Accessibility</p>
            <div className="flex w-full max-w-sm rounded-md border-2 border-gray-900 overflow-hidden mx-auto mb-3">
              <button
                onClick={() => theme !== 'dark' && onToggleTheme?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dark Mode
              </button>
              <button
                onClick={() => theme !== 'light' && onToggleTheme?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  theme === 'light' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Light Mode
              </button>
            </div>
            <div className="flex w-full max-w-sm rounded-md border-2 border-gray-900 overflow-hidden mx-auto">
              <button
                onClick={() => textSize !== 'large' && onToggleTextSize?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  textSize === 'large' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Bigger Text
              </button>
              <button
                onClick={() => textSize !== 'small' && onToggleTextSize?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  textSize === 'small' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Smaller Text
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-black uppercase tracking-wider text-gray-800 mb-2 text-center">Sidebar Behavior</p>
            <div className="flex w-full max-w-sm rounded-md border-2 border-gray-900 overflow-hidden mx-auto">
              <button
                onClick={() => !sidebarPinned && onToggleSidebarPinned?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  sidebarPinned ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Pin Sidebar Menu
              </button>
              <button
                onClick={() => sidebarPinned && onToggleSidebarPinned?.()}
                disabled={busy}
                className={`flex-1 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                  !sidebarPinned ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-100'
                }`}
              >
                Use Slide-Out Menu
              </button>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <p className="text-sm font-black uppercase tracking-wider text-gray-800 mb-2 text-center">Account Information</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <input
                type="email"
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                disabled={busy}
                className="flex-1 border-2 border-gray-300 rounded-md px-3 py-2 font-semibold"
                placeholder="Email"
              />
              <button
                onClick={handleSaveEmail}
                disabled={busy}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Email
              </button>
            </div>
          </div>

          {message && <div className="text-sm font-semibold text-green-700">{message}</div>}
          {error && <div className="text-sm font-semibold text-red-700">{error}</div>}

          <button
            onClick={onSignOut}
            disabled={busy}
            className="w-full bg-red-500 text-white py-4 font-black uppercase tracking-widest hover:bg-red-600 transition-colors rounded-lg"
          >
            Log Out
          </button>

          <button
            onClick={handleDeleteAccount}
            disabled={busy}
            className="w-full bg-red-800 text-white py-4 font-black uppercase tracking-widest hover:bg-red-900 transition-colors rounded-lg"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
