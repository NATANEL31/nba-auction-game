import { useConfirm } from './confirmContext';

/**
 * יציאה יזומה מהמשחק — תמיד מבקשת אישור לפני שמנתקת.
 */
export default function LeaveButton({ onLeave, inGame = true }) {
  const confirm = useConfirm();

  const handleClick = async () => {
    const ok = await confirm({
      title: inGame ? 'לצאת מהמשחק?' : 'לצאת מהחדר?',
      message: inGame
        ? 'הקבוצה שלך תימחק והמכרז ימשיך בלעדיך.'
        : 'תחזור למסך הכניסה.',
      confirmText: 'יציאה',
      tone: 'danger',
    });
    if (ok) onLeave();
  };

  return (
    <button type="button" className="btn btn--ghost btn--sm" onClick={handleClick}>
      🚪 יציאה
    </button>
  );
}
