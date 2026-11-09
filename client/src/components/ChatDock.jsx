import { useEffect, useRef, useState } from 'react';

const EMOJIS = ['👏', '🔥', '😂', '😱', '💀', '🤝', '😤', '🏀'];
const MAX_MESSAGES = 60;

/**
 * צ'אט קצר + אימוג'י-תגובות צפות. מופיע בכל המסכים אחרי הכניסה.
 */
export default function ChatDock({ socket, myName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [unread, setUnread] = useState(0);
  const [text, setText] = useState('');
  const [floaters, setFloaters] = useState([]);

  const openRef = useRef(false);
  const listRef = useRef(null);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const onHistory = (list) => setMessages(list.slice(-MAX_MESSAGES));
    const onMessage = (msg) => {
      setMessages((prev) => [...prev, msg].slice(-MAX_MESSAGES));
      if (!openRef.current && msg.from !== myName) setUnread((n) => n + 1);
    };
    const onReaction = (r) => {
      setFloaters((prev) => [...prev.slice(-24), { ...r, left: 8 + Math.random() * 84 }]);
    };

    socket.on('chatHistory', onHistory);
    socket.on('chatMessage', onMessage);
    socket.on('reaction', onReaction);
    socket.emit('requestChat');

    return () => {
      socket.off('chatHistory', onHistory);
      socket.off('chatMessage', onMessage);
      socket.off('reaction', onReaction);
    };
  }, [socket, myName]);

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  const send = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean) return;
    socket.emit('chat', clean);
    setText('');
  };

  return (
    <>
      <div className="floaters" aria-hidden="true">
        {floaters.map((f) => (
          <span
            key={f.id}
            className="floater"
            style={{ left: `${f.left}%` }}
            onAnimationEnd={() => setFloaters((prev) => prev.filter((x) => x.id !== f.id))}
          >
            <span className="floater__emoji">{f.emoji}</span>
            <span className="floater__name">{f.from}</span>
          </span>
        ))}
      </div>

      <div className="dock">
        {open && (
          <section className="dock__panel" aria-label="צ'אט">
            <ul className="dock__list" ref={listRef}>
              {messages.length === 0 && <li className="dock__empty">אין הודעות עדיין. תגידו שלום 👋</li>}
              {messages.map((m) => (
                <li key={m.id} className={`dock__msg ${m.from === myName ? 'dock__msg--me' : ''}`}>
                  <strong>{m.from}</strong>
                  <span>{m.text}</span>
                </li>
              ))}
            </ul>
            <form className="dock__form" onSubmit={send}>
              <input
                className="input"
                value={text}
                maxLength={140}
                onChange={(e) => setText(e.target.value)}
                placeholder="הודעה…"
                aria-label="הודעה לצ'אט"
              />
              <button type="submit" className="btn btn--primary btn--sm" disabled={!text.trim()}>
                שלח
              </button>
            </form>
          </section>
        )}

        <div className="dock__bar">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className="dock__emoji"
              onClick={() => socket.emit('reaction', emoji)}
              aria-label={`תגובה ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--ghost btn--sm dock__toggle"
            onClick={() => {
              setOpen((o) => !o);
              setUnread(0);
            }}
            aria-expanded={open}
          >
            💬 {open ? 'סגור' : 'צ\'אט'}
            {!open && unread > 0 && <span className="dock__badge">{unread}</span>}
          </button>
        </div>
      </div>
    </>
  );
}
