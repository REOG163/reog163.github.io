import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AppNotification, ToastMessage, ToastType } from '../types';

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, message: string) => void;
  markAsRead: (id: string) => void;
  clearAll: () => void;
  toasts: ToastMessage[];
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('local_app_notifications');
    if (saved) {
      try { setNotifications(JSON.parse(saved)); } catch (e) { console.error(e); }
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const saveToStorage = (newNotifs: AppNotification[]) => {
    setNotifications(newNotifs);
    localStorage.setItem('local_app_notifications', JSON.stringify(newNotifs));
  };

  const addNotification = (title: string, message: string) => {
    const newNotif: AppNotification = {
      id: Date.now().toString(),
      title,
      message,
      read: false,
      timestamp: new Date().toLocaleTimeString(),
    };
    saveToStorage([newNotif, ...notifications]);
    showToast(title, 'success');

    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message });
    }
  };

  const markAsRead = (id: string) => {
    saveToStorage(notifications.map(n => (n.id === id ? { ...n, read: true } : n)));
  };

  const clearAll = () => saveToStorage([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount: notifications.filter(n => !n.read).length, addNotification, markAsRead, clearAll, toasts }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotification must be used within NotificationProvider');
  return context;
};
