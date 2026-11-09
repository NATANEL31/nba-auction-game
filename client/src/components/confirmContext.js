import { createContext, useContext } from 'react';

export const ConfirmContext = createContext(null);

/**
 * מחליף את window.confirm:
 *   const confirm = useConfirm();
 *   if (await confirm({ title, message, confirmText, tone: 'danger' })) { ... }
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm חייב להיות בתוך ConfirmProvider');
  return ctx;
}
