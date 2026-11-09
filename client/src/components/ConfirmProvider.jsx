import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfirmContext } from './confirmContext';

export default function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);
  const cancelRef = useRef(null);

  const confirm = useCallback(
    (options) =>
      new Promise((resolve) => {
        resolveRef.current?.(false); // דיאלוג קודם שנשאר פתוח נסגר כ"ביטול"
        resolveRef.current = resolve;
        setDialog({
          title: 'אישור',
          confirmText: 'אישור',
          cancelText: 'ביטול',
          tone: 'primary',
          ...options,
        });
      }),
    [],
  );

  const close = useCallback((result) => {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setDialog(null);
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;
    cancelRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="modal" onMouseDown={(e) => e.target === e.currentTarget && close(false)}>
          <div className="modal__card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
            <h2 className="modal__title" id="confirm-title">
              {dialog.title}
            </h2>
            {dialog.message && <p className="modal__message">{dialog.message}</p>}
            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" ref={cancelRef} onClick={() => close(false)}>
                {dialog.cancelText}
              </button>
              <button
                type="button"
                className={`btn btn--${dialog.tone === 'danger' ? 'danger' : 'primary'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
