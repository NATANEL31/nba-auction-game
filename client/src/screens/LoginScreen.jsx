import MusicToggle from '../components/MusicToggle';

export default function LoginScreen({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onJoin,
  errorMsg,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onJoin();
  };

  return (
    <div className="app-shell app-shell--narrow">
      <div className="login-topbar">
        <MusicToggle />
      </div>

      <div className="brandmark">
        <div className="brandmark__logo">🏀</div>
        <h1 className="brandmark__name">המכרז</h1>
        <p className="brandmark__tagline">אנא זכור: דגמת מרובה לא דגמת כלל</p>
      </div>

      <form className="panel" onSubmit={handleSubmit}>
        <header className="panel__head">
          <h2 className="panel__title">כניסה למשחק</h2>
        </header>
        <div className="panel__body stack">
        {errorMsg && (
          <p className="alert alert--danger" role="alert">
            {errorMsg}
          </p>
        )}

        <div className="field">
          <label className="field__label" htmlFor="username">
            שם משתמש
          </label>
          <input
            id="username"
            className="input"
            type="text"
            autoComplete="username"
            placeholder="איך קוראים לך?"
            value={username}
            onChange={(e) => onUsernameChange(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">
            סיסמה
          </label>
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            placeholder="••••••"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn--primary btn--lg btn--block">
          הכנס למשחק
        </button>

        <p className="form-note">
          בפעם הראשונה המערכת תשמור את הסיסמה.
          <br />
          מאותו רגע, רק אתה תוכל להתחבר לשם הזה.
        </p>
        </div>
      </form>
    </div>
  );
}
