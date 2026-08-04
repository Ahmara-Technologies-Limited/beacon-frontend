'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, X, Check, Eye, Sun, Moon, Menu } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { useAuth } from '../context/AuthContext';
import { useCrmUI } from '../context/CrmUIContext';

export default function Header() {
  const router = useRouter();
  const { currentUser, login } = useAuth();
  const { darkMode, toggleDarkMode, mobileSidebarOpen, setMobileSidebarOpen, setSearchTerm } = useCrmUI();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [users, setUsers] = useState([]);
  const notificationRef = useRef(null);

  useEffect(() => {
    // Get notifications and all users for role switcher
    dataService.getNotifications().then(setNotifications);
    setUsers(db.getUsers());

    // Listen for custom database changes (like added activity logs or reassigned leads)
    const handleStorageChange = () => {
      dataService.getNotifications().then(setNotifications);
    };
    window.addEventListener('storage', handleStorageChange);
    // Custom check timer for updates within same window
    const interval = setInterval(() => {
      dataService.getNotifications().then(setNotifications);
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const visibleNotifications = notifications.filter(n => !n.recipientId || n.recipientId === currentUser?.id);
  const unreadCount = visibleNotifications.filter(n => !n.read).length;

  const handleNotificationClick = async (n) => {
    await dataService.markNotificationRead(n.id);
    setNotifications(await dataService.getNotifications());
    setShowNotifications(false);

    if (n.link) {
      if (n.link.startsWith('/leads/')) {
        const leadId = n.link.split('/').pop();
        router.push(`/leads/${leadId}`);
      } else if (n.link === '/follow-ups') {
        router.push('/followup');
      }
    }
  };

  const handleMarkAllRead = async () => {
    await dataService.markAllNotificationsRead();
    setNotifications(await dataService.getNotifications());
  };

  const handleDismissAll = async () => {
    await dataService.dismissAllNotifications();
    setNotifications([]);
  };

  const handleDismiss = async (e, id) => {
    e.stopPropagation();
    await dataService.dismissNotification(id);
    setNotifications(await dataService.getNotifications());
  };

  const handleRoleChange = (e) => {
    const selectedUserId = e.target.value;
    const selectedUser = users.find(u => u.id === selectedUserId);
    if (selectedUser) {
      login(selectedUser);
      // Reset to dashboard to avoid permission mismatch on role switch
      router.push('/dashboard');
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-trigger"
          onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          title="Open Menu"
        >
          <Menu size={20} />
        </button>
        {/* Role Switcher Widget for Testing */}
        <div className="role-switcher-container">
          <label htmlFor="role-select" className="role-switcher-label">Acting User:</label>
          <select 
            id="role-select" 
            className="role-switcher-select" 
            value={currentUser?.id || ""} 
            onChange={handleRoleChange}
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="header-right">
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search leads by name, phone..."
            className="search-input"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <button
          className="dark-mode-toggle-btn"
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <div className="notification-bell-container" ref={notificationRef}>
          <button 
            className="notification-bell-btn" 
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={22} />
            {unreadCount > 0 && (
              <span className="notification-badge">{unreadCount}</span>
            )}
          </button>

          {showNotifications && (
            <div className="notifications-dropdown">
              <div className="notifications-dropdown-header">
                <span className="dropdown-title">Notifications</span>
                <div className="dropdown-actions">
                  <button className="dropdown-action-btn" onClick={handleMarkAllRead}>
                    Mark all read
                  </button>
                  <span className="separator">•</span>
                  <button className="dropdown-action-btn" onClick={handleDismissAll}>
                    Clear all
                  </button>
                </div>
              </div>

              <div className="notifications-list">
                {visibleNotifications.length === 0 ? (
                  <div className="empty-notifications">
                    <span>No notifications yet.</span>
                  </div>
                ) : (
                  visibleNotifications.map(n => (
                    <div 
                      key={n.id} 
                      className={`notification-item ${n.read ? 'read' : 'unread'}`}
                      onClick={() => handleNotificationClick(n)}
                    >
                      <div className="notification-dot" />
                      <div className="notification-content">
                        <p className="notification-message">{n.message}</p>
                        <span className="notification-time">
                          {new Date(n.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(n.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                      <button 
                        className="notification-dismiss"
                        onClick={(e) => handleDismiss(e, n.id)}
                        title="Dismiss notification"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .app-header {
          height: var(--header-height);
          background-color: var(--card-bg);
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 32px;
          position: sticky;
          top: 0;
          z-index: 90;
        }

        .dark-mode-toggle-btn {
          background: none;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--text-secondary);
          transition: all 0.2s;
          flex-shrink: 0;
        }

        .dark-mode-toggle-btn:hover {
          background: var(--color-grey-bg);
          color: var(--text-primary);
          border-color: var(--text-secondary);
        }

        .header-left {
          display: flex;
          align-items: center;
          min-width: 0;
          flex-shrink: 1;
        }

        .role-switcher-container {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--color-grey-bg);
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          min-width: 0;
        }

        .role-switcher-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          white-space: nowrap;
        }

        .role-switcher-select {
          background: transparent;
          border: none;
          outline: none;
          font-size: 13px;
          font-weight: 700;
          color: var(--primary-red);
          cursor: pointer;
          min-width: 0;
          max-width: 220px;
          text-overflow: ellipsis;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 20px;
          flex-shrink: 0;
        }

        .search-container {
          position: relative;
          width: 320px;
          max-width: 100%;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-placeholder);
        }

        .search-input {
          width: 100%;
          padding: 9px 14px 9px 40px;
          border-radius: 20px;
          border: 1px solid var(--border-color);
          font-size: 14px;
          outline: none;
          background-color: var(--color-grey-bg);
          color: var(--text-primary);
          transition: var(--transition-normal);
        }

        .search-input:focus {
          border-color: var(--primary-red-light-border);
          background-color: var(--card-bg);
          box-shadow: 0px 0px 0px 4px var(--primary-red-light);
        }

        .notification-bell-container {
          position: relative;
        }

        .notification-bell-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px;
          border-radius: 50%;
          position: relative;
          transition: var(--transition-normal);
        }

        .notification-bell-btn:hover {
          background-color: #F9FAFB;
          color: var(--text-primary);
        }

        .notification-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background-color: var(--primary-red);
          color: #FFFFFF;
          font-size: 10px;
          font-weight: 700;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #FFFFFF;
        }

        .notifications-dropdown {
          position: absolute;
          right: 0;
          top: 45px;
          width: 380px;
          background-color: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-lg);
          display: flex;
          flex-direction: column;
          z-index: 200;
          max-height: 480px;
          animation: slideUp 0.15s ease-out;
        }

        .notifications-dropdown-header {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .dropdown-title {
          font-weight: 600;
          font-size: 15px;
          color: var(--text-primary);
        }

        .dropdown-actions {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
        }

        .dropdown-action-btn {
          background: none;
          border: none;
          color: var(--primary-red);
          font-weight: 500;
          cursor: pointer;
        }

        .dropdown-action-btn:hover {
          text-decoration: underline;
        }

        .separator {
          color: var(--text-placeholder);
        }

        .notifications-list {
          overflow-y: auto;
          flex: 1;
        }

        .empty-notifications {
          padding: 40px 20px;
          text-align: center;
          color: var(--text-secondary);
          font-size: 14px;
        }

        .notification-item {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          position: relative;
          transition: var(--transition-normal);
        }

        .notification-item:hover {
          background-color: #F9FAFB;
        }

        .notification-item.unread {
          background-color: rgba(212, 38, 42, 0.02);
        }

        .notification-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--primary-red);
          margin-top: 6px;
          flex-shrink: 0;
        }

        .notification-item.read .notification-dot {
          background-color: transparent;
        }

        .notification-content {
          flex: 1;
          min-width: 0;
        }

        .notification-message {
          font-size: 13px;
          color: var(--text-primary);
          font-weight: 500;
          margin-bottom: 4px;
          line-height: 1.4;
        }

        .notification-item.unread .notification-message {
          font-weight: 600;
        }

        .notification-time {
          font-size: 11px;
          color: var(--text-secondary);
        }

        .notification-dismiss {
          background: none;
          border: none;
          color: var(--text-placeholder);
          cursor: pointer;
          opacity: 0;
          transition: var(--transition-normal);
          padding: 4px;
          border-radius: 4px;
        }

        .notification-item:hover .notification-dismiss {
          opacity: 1;
        }

        .notification-dismiss:hover {
          background-color: var(--border-color);
          color: var(--text-primary);
        }

        @media (max-width: 1024px) {
          .app-header {
            padding: 0 16px;
          }
          .role-switcher-label {
            display: none;
          }
          .search-container {
            width: 220px;
          }
        }

        @media (max-width: 640px) {
          .app-header {
            gap: 8px;
          }
          .header-right {
            gap: 10px;
          }
          .search-container {
            width: 120px;
          }
          .search-input {
            padding-left: 34px;
          }
          .notifications-dropdown {
            width: calc(100vw - 24px);
            right: -12px;
          }
        }
      `}</style>
    </header>
  );
}
