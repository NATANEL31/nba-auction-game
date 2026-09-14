/**
 * יציאה יזומה מהמשחק — תמיד מבקשת אישור לפני שמנתקת.
 */
export default function LeaveButton({ onLeave, inGame = true }) {
  const handleClick = () => {
    const message = inGame
      ? 'בטוח שברצונך לצאת מהמשחק? הקבוצה שלך תימחק והמכרז ימשיך בלעדיך.'
      : 'בטוח שברצונך לצאת מהחדר?';

    if (window.confirm(message)) {
      onLeave();
    }
  };

  return (
    <button
      type="button"
      className="btn btn--ghost btn--sm"
      onClick={handleClick}
    >
      🚪 יציאה
    </button>
  );
}
