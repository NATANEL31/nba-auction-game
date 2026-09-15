import MusicToggle from '../components/MusicToggle';

const AVATARS = [
  { id: 'galco', name: 'גלכו', img: '/images/galco.png' },
  { id: 'shirazi', name: 'שיראזי', img: '/images/shirazi.png' },
  { id: 'natanel', name: 'צאולקר', img: '/images/natanel.png' },
];

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
        <p className="brandmark__tagline">אנא זכור: דגמת מרובה לא דגמת כלל</p>
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

          {/* תצוגת הבלוקים (קלפים) */}
          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', margin: '1rem 0' }}>
            {AVATARS.map((avatar) => (
              <div 
                key={avatar.id} 
                className="panel" // נותן לבלוק את הרקע והמסגרת של האפליקציה
                style={{ 
                  cursor: 'pointer', 
                  textAlign: 'center', 
                  transition: 'transform 0.2s, box-shadow 0.2s', 
                  padding: '12px',
                  width: '160px', 
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={() => onJoin(avatar.name)}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 10px 20px rgba(0,0,0,0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '';
                }}
              >
                <img 
                  src={avatar.img} 
                  alt={avatar.name} 
                  style={{ 
                    width: '100%', 
                    height: '200px', // גובה המלבן
                    objectFit: 'contain', // מבטיח שכל התמונה תיכנס ללא חיתוך
                    borderRadius: '8px', 
                    backgroundColor: 'var(--surface-hover)', // רקע עדין למקרה שהתמונה קטנה מדי
                    marginBottom: '12px'
                  }} 
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${avatar.name}&background=random&color=fff&size=200`;
                  }}
                />
                <h3 style={{ margin: '0', fontSize: '1.2rem', color: 'var(--text)' }}>{avatar.name}</h3>
              </div>
            ))}
          </div>

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