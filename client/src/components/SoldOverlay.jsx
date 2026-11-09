import PlayerAvatar from './PlayerAvatar';
import Confetti from './Confetti';

/**
 * שכבת "נמכר!" — מופיעה לכמה שניות אחרי כל סגירת מכרז, עם קונפטי.
 * info = { id, playerName, winnerName, price, photo, playerRating }
 */
export default function SoldOverlay({ info }) {
  if (!info) return null;

  return (
    <div className="sold" role="status" aria-live="polite">
      <Confetti seed={info.id ?? 0} />

      <div className="sold__card">
        <div className="sold__stamp">נמכר!</div>
        <div className="sold__photo">
          <PlayerAvatar player={{ name: info.playerName, photo: info.photo }} />
        </div>
        <div className="sold__name">{info.playerName}</div>
        <div className="sold__line">
          נחתם על ידי <strong>{info.winnerName}</strong>
        </div>
        <div className="sold__price tnum">${info.price}</div>
      </div>
    </div>
  );
}
