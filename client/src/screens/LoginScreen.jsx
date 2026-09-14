import React from 'react';
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

      <div className="panel">
        <header className="panel__head">
          <h2 className="panel__title">בחר דמות</h2>
        </header>
        <div className="panel__body stack">
          {errorMsg && (
            <p className="alert alert--danger" role="alert">
              {errorMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', margin: '1rem 0' }}>
            {AVATARS.map((avatar) => (
              <div 
                key={avatar.id} 
                style={{ cursor: 'pointer', textAlign: 'center', transition: 'transform 0.2s', padding: '10px' }}
                onClick={() => onJoin(avatar.name)}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <img 
                  src={avatar.img} 
                  alt={avatar.name} 
                  style={{ 
                    width: '90px', 
                    height: '90px', 
                    objectFit: 'cover', 
                    borderRadius: '50%', 
                    border: '3px solid var(--accent)',
                    backgroundColor: 'var(--surface-hover)'
                  }} 
                  onError={(e) => {
                    // יוצר תמונת גיבוי עם השם במקרה שהקובץ עדיין לא נמצא בתיקיית images
                    e.target.src = `https://ui-avatars.com/api/?name=${avatar.name}&background=random&color=fff&size=90`;
                  }}
                />
                <h3 style={{ margin: '10px 0 0 0', fontSize: '1.1rem' }}>{avatar.name}</h3>
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