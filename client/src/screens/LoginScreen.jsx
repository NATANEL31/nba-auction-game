import { useState } from 'react';
import MusicToggle from '../components/MusicToggle';

export default function LoginScreen({ onJoin, errorMsg }) {
  const [username, setUsername] = useState(() => localStorage.getItem('michrazUsername') || '');

  const handleJoin = (e) => {
    e.preventDefault(); // מונע ריענון של העמוד בלחיצה על אנטר
    if (username.trim() !== '') {
      localStorage.setItem('michrazUsername', username.trim());
      onJoin(username.trim());
    }
  };

  return (
    <div className="app-shell app-shell--narrow">
      <div className="login-topbar">
        <MusicToggle />
      </div>

      <div className="brandmark">
        <div className="brandmark__logo">🏀</div>
        <h1 className="brandmark__name">המכרז</h1>
      </div>

      <div className="panel" style={{ maxWidth: '400px', margin: '0 auto' }}>
        <header className="panel__head">
          <h2 className="panel__title">כניסה למשחק</h2>
        </header>
        <div className="panel__body stack">
          {errorMsg && (
            <p className="alert alert--danger" role="alert">
              {errorMsg}
            </p>
          )}

          <form onSubmit={handleJoin} className="stack">
            <div className="field">
              <label className="field__label" htmlFor="username">
                שם שחקן
              </label>
              <input
                id="username"
                type="text"
                className="input"
                placeholder="איך קוראים לך?"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="off"
              />
            </div>

            <button type="submit" className="btn btn--primary btn--lg btn--block">
              הכנס לזירה
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}