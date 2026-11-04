import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

export default function Header() {
  const { user, login, logout } = useAuth();
  const { notifications, unreadCount, markAsRead, clearAll } = useNotification();
  const [showPanel, setShowPanel] = useState(false);
  const [inputVal, setInputVal] = useState('');

  return (
    <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-gray-900 border-b dark:border-gray-800 shadow-sm">
      <h1 className="text-xl font-bold text-gray-800 dark:text-white">Astro App</h1>

      <div className="flex items-center gap-4 relative">
        {/* 通知中心 */}
        <div className="relative">
          <button onClick={() => setShowPanel(!showPanel)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 relative">
            🔔
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {showPanel && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl z-50 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-sm dark:text-white">系统通知</span>
                <button onClick={clearAll} className="text-xs text-blue-500 hover:underline">清空</button>
              </div>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-4">暂无通知</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} onClick={() => markAsRead(n.id)} className={`p-2 rounded-lg text-xs cursor-pointer ${n.read ? 'bg-gray-50 text-gray-400' : 'bg-blue-50 text-blue-900 font-medium'}`}>
                      <div className="font-bold">{n.title}</div>
                      <div>{n.message}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* 用户登录状态 */}
        {user ? (
          <div className="flex items-center gap-3">
            <img src={user.avatar} alt="avatar" className="w-8 h-8 rounded-full bg-gray-200" />
            <span className="text-sm font-medium dark:text-gray-200">{user.username}</span>
            <button onClick={logout} className="text-xs px-3 py-1.5 bg-gray-100 rounded-lg">退出</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input type="text" placeholder="输入用户名..." value={inputVal} onChange={e => setInputVal(e.target.value)} className="px-3 py-1.5 text-sm border rounded-lg dark:bg-gray-800 dark:text-white" />
            <button onClick={() => inputVal && login(inputVal)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg">登录</button>
          </div>
        )}
      </div>
    </header>
  );
}
