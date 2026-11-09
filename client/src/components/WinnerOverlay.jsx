import Confetti from './Confetti';

/**
 * הכרזת הזוכה אחרי ההצבעה. info = { id, winnerName, votes, voters, tie }
 */
export default function WinnerOverlay({ info }) {
  if (!info) return null;

  return (
    <div className="sold sold--winner" role="status" aria-live="polite">
      <Confetti seed={info.id ?? 0} count={70} />

      <div className="sold__card">
        <div className="sold__stamp">🏆 הזוכה</div>
        <div className="sold__crown" aria-hidden="true">
          👑
        </div>
        <div className="sold__name">{info.winnerName}</div>
        <div className="sold__line">
          {info.votes} מתוך {info.voters} קולות
        </div>
        {info.tie && (
          <div className="sold__line">תיקו — הוכרע לפי סכום דירוגי החמישייה</div>
        )}
      </div>
    </div>
  );
}
