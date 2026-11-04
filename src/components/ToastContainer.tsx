import React from 'react';
import { useNotification } from '../context/NotificationContext';

export default function ToastContainer() {
  const { toasts } = useNotification();
  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-sm text-white font-medium bg-emerald-600">
          {t.message}
        </div>
      ))}
    </div>
  );
}
