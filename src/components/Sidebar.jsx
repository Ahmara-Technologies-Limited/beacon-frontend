'use client';

import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  PhoneCall,
  CalendarRange,
  LayoutGrid,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  X,
  Building2,
  DollarSign
} from 'lucide-react';
import { TAB_ROUTES } from '../lib/routes';
import { useCrmUI } from '../context/CrmUIContext';

export default function Sidebar({ currentUser, onSignOut }) {
  const pathname = usePathname();
  const router = useRouter();
  const { mobileSidebarOpen: mobileOpen, setMobileSidebarOpen: setMobileOpen } = useCrmUI();

  if (!currentUser) return null;

  // Determine available tabs based on role
  const role = currentUser.role;

  const getGroupedMenuItems = () => {
    const sections = [
      {
        title: 'Overview',
        items: [
          { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['Super Admin', 'Sales Closer', 'Inspection Officer', 'Admin/Doc Officer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'] },
          { id: 'settings', name: 'Settings', icon: Settings, roles: ['Super Admin', 'Sales Closer', 'Inspection Officer', 'Admin/Doc Officer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'] }
        ]
      },
      {
        title: 'Sales & Pipelines',
        items: [
          { 
            id: 'leads', 
            name: role === 'Sales Closer' ? 'My Leads' : role === 'Relationship Manager' ? 'Clients & Referrals' : 'Lead Management', 
            icon: Users, 
            roles: ['Super Admin', 'Sales Closer', 'Admin/Doc Officer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'] 
          },
          { id: 'followup', name: 'Follow Up', icon: PhoneCall, roles: ['Super Admin', 'Sales Closer', 'Relationship Manager', 'General Manager'] },
          { id: 'properties', name: 'Properties', icon: Building2, roles: ['Super Admin', 'Sales Closer', 'Admin/Doc Officer', 'Inspection Officer', 'Relationship Manager', 'Head of Operations', 'General Manager'] },
          { id: 'inspections', name: 'Inspections', icon: CalendarRange, roles: ['Super Admin', 'Sales Closer', 'Inspection Officer', 'Head of Operations', 'Branch Manager', 'General Manager'] },
          { id: 'pipeline', name: 'Pipelines', icon: LayoutGrid, roles: ['Super Admin', 'Sales Closer', 'Relationship Manager', 'Head of Operations', 'Branch Manager', 'General Manager'] },
          { id: 'docHub', name: 'Legal & Finance Hub', icon: DollarSign, roles: ['Super Admin', 'Admin/Doc Officer', 'Head of Operations', 'General Manager'] }
        ]
      },
      {
        title: 'Business Intelligence',
        items: [
          { id: 'reports', name: 'Reports', icon: BarChart3, roles: ['Super Admin', 'Head of Operations', 'Branch Manager', 'General Manager'] }
        ]
      },
      {
        title: 'System Administration',
        items: [
          { id: 'users', name: 'User Management', icon: ClipboardList, roles: ['Super Admin', 'General Manager'] },
          { id: 'roles', name: 'Roles & Permissions', icon: ShieldAlert, roles: ['Super Admin', 'General Manager'] },
          { id: 'audit', name: 'Audit Logs', icon: ShieldAlert, roles: ['Super Admin', 'General Manager'] }
        ]
      }
    ];

    return sections
      .map(section => ({
        ...section,
        items: section.items.filter(item => item.roles.includes(role))
      }))
      .filter(section => section.items.length > 0);
  };

  const groupedSections = getGroupedMenuItems();

  return (
    <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand-container">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="14" fill="#D4262A" />
            <path d="M16 8V24M8 16H24M11.5 11.5L20.5 20.5M20.5 11.5L11.5 20.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
          <span className="sidebar-brand-name">Beacon CRM</span>
        </div>
        {setMobileOpen && (
          <button 
            className="mobile-sidebar-close-btn" 
            onClick={() => setMobileOpen(false)}
            title="Close Menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="sidebar-nav">
        {groupedSections.map(section => (
          <div key={section.title} className="sidebar-nav-group">
            <div className="sidebar-group-title">{section.title}</div>
            <div className="sidebar-group-items">
              {section.items.map(item => {
                const Icon = item.icon;
                const itemPath = TAB_ROUTES[item.id];
                const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      router.push(itemPath);
                      if (setMobileOpen) setMobileOpen(false);
                    }}
                  >
                    <Icon size={20} className="sidebar-icon" />
                    <span>{item.name}</span>
                    {isActive && <div className="active-indicator" />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile-summary">
          <div className="user-avatar">
            {currentUser.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="user-profile-info">
            <span className="user-name">{currentUser.name}</span>
            <span className="user-role">{currentUser.role}</span>
          </div>
        </div>
        
        <button className="sidebar-signout-btn" onClick={() => {
          onSignOut();
          if (setMobileOpen) setMobileOpen(false);
        }}>
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      <style>{`
        .sidebar {
          width: var(--sidebar-width);
          background-color: var(--dark-bg);
          height: 100vh;
          position: fixed;
          left: 0;
          top: 0;
          display: flex;
          flex-direction: column;
          border-right: 1px solid #1A1F26;
          z-index: 100;
        }

        .sidebar-brand-container {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-bottom: 1px solid #1A1F26;
        }

        .sidebar-brand-name {
          color: #FFFFFF;
          font-size: 20px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 24px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .sidebar-nav-group {
          margin-bottom: 20px;
        }

        .sidebar-group-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #64748B;
          font-weight: 700;
          letter-spacing: 0.8px;
          padding: 0 16px 8px 16px;
        }

        .sidebar-group-items {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .sidebar-nav-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: none;
          border: none;
          color: #94A3B8;
          font-size: 14px;
          font-weight: 500;
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: var(--transition-normal);
          text-align: left;
          position: relative;
        }

        .sidebar-nav-item:hover {
          background-color: var(--sidebar-hover-bg);
          color: #FFFFFF;
        }

        .sidebar-nav-item.active {
          background-color: var(--sidebar-active-bg);
          color: #FFFFFF;
          font-weight: 600;
        }

        .sidebar-icon {
          color: inherit;
        }

        .active-indicator {
          position: absolute;
          right: 0;
          top: 8px;
          bottom: 8px;
          width: 3px;
          background-color: #FFFFFF;
          border-radius: 4px 0 0 4px;
        }

        .sidebar-footer {
          padding: 20px 16px;
          border-top: 1px solid #1A1F26;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .user-profile-summary {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          background-color: #D4262A;
          color: #FFFFFF;
          font-weight: 600;
          font-size: 14px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .user-profile-info {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .user-name {
          color: #FFFFFF;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .user-role {
          color: #64748B;
          font-size: 12px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sidebar-signout-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background-color: #FFFFFF;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          padding: 10px;
          color: #D4262A;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: var(--transition-normal);
        }

        .sidebar-signout-btn:hover {
          background-color: #FEF3F2;
          border-color: #FDA29B;
        }

        .mobile-sidebar-close-btn {
          background: none;
          border: none;
          color: #94A3B8;
          cursor: pointer;
          padding: 6px;
          display: none;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          transition: all 0.15s;
        }
        .mobile-sidebar-close-btn:hover {
          background-color: var(--sidebar-hover-bg);
          color: #FFFFFF;
        }

        @media (max-width: 1024px) {
          .sidebar {
            transform: translateX(-100%);
            transition: transform 0.25s ease-in-out;
            box-shadow: 0 0 15px rgba(0, 0, 0, 0.5);
            z-index: 1100;
          }
          .sidebar.mobile-open {
            transform: translateX(0);
          }
          .mobile-sidebar-close-btn {
            display: flex;
          }
        }
      `}</style>
    </aside>
  );
}
