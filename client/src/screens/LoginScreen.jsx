import MusicToggle from '../components/MusicToggle';


export default function LoginScreen({
  onJoin,
  errorMsg,
}) {
  return (
    <div className="app-shell app-shell--narrow">
      <div className="login-topbar">
        <MusicToggle />
      </div>

      <div className="brandmark">
        <div className="brandmark__logo">🏀</div>
        <h1 className="brandmark__name">המכרז</h1>
      </div>

      <div className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <header className="panel__head">
          <h2 className="panel__title">בחר דמות</h2>
        </header>
        <div className="panel__body stack">
          {errorMsg && (
            <p className="alert alert--danger" role="alert">
              {errorMsg}
            </p>
          )}

          <p className="form-note">
            לחץ על הדמות שלך כדי להיכנס למשחק.
            <br />
            כל משתתף יכול לבחור דמות פעם אחת בלבד.
          </p>
        </div>
      </div>
    </div>
  );
}