import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import LeadManagement from './pages/LeadManagement';
import LeadProfile from './pages/LeadProfile';
import UserManagement from './pages/UserManagement';
import FollowUp from './pages/FollowUp';
import Inspections from './pages/Inspections';
import PipelineTracker from './pages/PipelineTracker';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import LeadModal from './components/LeadModal';
import LogActivityModal from './components/LogActivityModal';
import InspectionModal from './components/InspectionModal';
import RoleManagement from './pages/RoleManagement';
import AuditLogs from './pages/AuditLogs';
import PropertyManagement from './pages/PropertyManagement';
import DocOfficerHub from './pages/DocOfficerHub';
import { initializeDB, db } from './data/mockData';
import { Lock, Mail, Eye, EyeOff, AlertTriangle, Sun, Moon, Building2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('beacon_dark_mode') === 'true';
  });

  const [viewingLeadId, setViewingLeadId] = useState(null);
  const [viewingInspectionId, setViewingInspectionId] = useState(null);
  const [leadProfileOriginTab, setLeadProfileOriginTab] = useState(null);

  const viewLead = (leadId, originTab = null, inspectionId = null) => {
    setViewingLeadId(leadId);
    setViewingInspectionId(inspectionId);
    setLeadProfileOriginTab(originTab || currentTab);
    setCurrentTab('leads');
  };

  const handleBackFromLeadProfile = () => {
    setViewingLeadId(null);
    setViewingInspectionId(null);
    if (leadProfileOriginTab && leadProfileOriginTab !== 'leads') {
      setCurrentTab(leadProfileOriginTab);
    }
    setLeadProfileOriginTab(null);
  };

  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [leadModalId, setLeadModalId] = useState(null);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [activityLeadId, setActivityLeadId] = useState(null);
  const [inspectionModalOpen, setInspectionModalOpen] = useState(false);
  const [inspectionLeadId, setInspectionLeadId] = useState(null);
  const [inspectionId, setInspectionId] = useState(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTime, setLockoutTime] = useState(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Apply dark mode to html element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('beacon_dark_mode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    initializeDB();
    const savedUser = db.getCurrentUser();
    if (savedUser) setCurrentUser(savedUser);
  }, []);

  useEffect(() => {
    if (lockoutTime) {
      const timer = setInterval(() => {
        const remaining = Math.ceil((new Date(lockoutTime) - new Date()) / 1000);
        if (remaining <= 0) { setLockoutTime(null); setFailedAttempts(0); }
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [lockoutTime]);

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError('');

    if (lockoutTime) {
      const remaining = Math.ceil((new Date(lockoutTime) - new Date()) / 1000);
      setLoginError(`Account locked. Retry in ${remaining}s.`);
      return;
    }
    if (!loginEmail || !loginPassword) {
      setLoginError('Both email and password are required.');
      return;
    }

    setLoginLoading(true);
    setTimeout(() => {
      const users = db.getUsers();
      const userMatch = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase());

      if (!userMatch) { recordFailedAttempt(); setLoginError('Incorrect email or password.'); setLoginLoading(false); return; }
      if (userMatch.status === 'Inactive') { setLoginError('Account inactive. Contact your administrator.'); setLoginLoading(false); return; }
      const expectedPassword = userMatch.password || 'password';
      if (loginPassword !== expectedPassword) { recordFailedAttempt(); setLoginError('Incorrect email or password.'); setLoginLoading(false); return; }

      setFailedAttempts(0);
      db.setCurrentUser(userMatch);
      setCurrentUser(userMatch);
      setCurrentTab('dashboard');
      setLoginLoading(false);
    }, 600);
  };

  const recordFailedAttempt = () => {
    const next = failedAttempts + 1;
    setFailedAttempts(next);
    if (next >= 5) {
      setLockoutTime(new Date(Date.now() + 15 * 60 * 1000));
      setLoginError('Account locked for 15 minutes due to too many failed attempts.');
    }
  };

  const handleQuickLogin = (email) => {
    if (lockoutTime) return;
    setLoginEmail(email);
    setLoginPassword('password');
  };

  const handleSignOut = () => {
    localStorage.removeItem('beacon_current_user');
    setCurrentUser(null);
    setViewingLeadId(null);
    setCurrentTab('dashboard');
  };

  const openEditLead = (id) => { setLeadModalId(id); setLeadModalOpen(true); };
  const openLogActivity = (leadId) => { setActivityLeadId(leadId); setActivityModalOpen(true); };
  const openBookInspection = (leadId = null, inspId = null) => { setInspectionLeadId(leadId); setInspectionId(inspId); setInspectionModalOpen(true); };
  const handleSaveAndRedirectToLogActivity = (leadId) => {
    setLeadModalOpen(false);
    setTimeout(() => openLogActivity(leadId), 200);
  };

  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} setCurrentTab={setCurrentTab} setViewingLeadId={(id) => viewLead(id, 'dashboard')} onAddLeadClick={() => openEditLead(null)} onLogActivityClick={openLogActivity} onBookInspectionClick={openBookInspection} onEditLeadClick={openEditLead} />;
      case 'leads':
        if (viewingLeadId) {
          return <LeadProfile leadId={viewingLeadId} inspectionId={viewingInspectionId} onBack={handleBackFromLeadProfile} currentUser={currentUser} onLogActivityClick={openLogActivity} onBookInspectionClick={openBookInspection} onEditLeadClick={openEditLead} />;
        }
        return <LeadManagement currentUser={currentUser} onAddLeadClick={() => openEditLead(null)} onEditLeadClick={openEditLead} setViewingLeadId={(id) => viewLead(id, 'leads')} searchTerm={searchTerm} />;
      case 'properties':
        return <PropertyManagement currentUser={currentUser} />;
      case 'docHub':
        return <DocOfficerHub currentUser={currentUser} />;
      case 'users':
        return <UserManagement currentUser={currentUser} />;
      case 'roles':
        return <RoleManagement currentUser={currentUser} />;
      case 'followup':
        return <FollowUp currentUser={currentUser} setViewingLeadId={(id) => viewLead(id, 'followup')} setCurrentTab={setCurrentTab} />;
      case 'inspections':
        return <Inspections currentUser={currentUser} onBookInspectionClick={() => openBookInspection(null)} onEditInspectionClick={(leadId, inspId) => openBookInspection(leadId, inspId)} setViewingLeadId={(id, inspId) => viewLead(id, 'inspections', inspId)} setCurrentTab={setCurrentTab} />;
      case 'pipeline':
        return <PipelineTracker currentUser={currentUser} setViewingLeadId={(id) => viewLead(id, 'pipeline')} setCurrentTab={setCurrentTab} />;
      case 'reports':
        return <Reports currentUser={currentUser} />;
      case 'settings':
        return <Settings currentUser={currentUser} onUserChange={setCurrentUser} />;
      case 'audit':
        return <AuditLogs currentUser={currentUser} />;
      default:
        return <div>Tab not found.</div>;
    }
  };

  // LOGIN SCREEN
  if (!currentUser) {
    return (
      <div className="login-split-page">
        {/* Left panel — architectural photo */}
        <div className="login-left-panel" style={{ backgroundImage: `url('/login-bg.jpg')` }}>
          <div className="login-left-overlay">
            <div className="login-brand-mark">
              <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
                <rect width="44" height="44" rx="10" fill="#D4262A" />
                <path d="M22 10C15.373 10 10 15.373 10 22C10 28.627 15.373 34 22 34C28.627 34 34 28.627 34 22C34 15.373 28.627 10 22 10Z" fill="white" fillOpacity="0.15" />
                <path d="M14 22H30M22 14V30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M17 17L27 27M27 17L17 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
              </svg>
              <span className="login-brand-name">Beacon</span>
            </div>

            <div className="login-left-content">
              <h1 className="login-panel-headline">The smarter way to manage real estate leads.</h1>
              <p className="login-panel-subtext">
                Track every lead from first contact to final allocation — all in one unified workspace.
              </p>
              <div className="login-panel-stats">
                <div className="panel-stat-item">
                  <span className="panel-stat-value">14</span>
                  <span className="panel-stat-label">Pipeline Stages</span>
                </div>
                <div className="panel-stat-divider" />
                <div className="panel-stat-item">
                  <span className="panel-stat-value">4</span>
                  <span className="panel-stat-label">Role Dashboards</span>
                </div>
                <div className="panel-stat-divider" />
                <div className="panel-stat-item">
                  <span className="panel-stat-value">∞</span>
                  <span className="panel-stat-label">Leads Managed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel — form */}
        <div className="login-right-panel">
          <div className="login-form-container">
            <div className="login-form-header">
              <div className="login-form-brand">
                <svg width="36" height="36" viewBox="0 0 44 44" fill="none">
                  <rect width="44" height="44" rx="10" fill="#D4262A" />
                  <path d="M14 22H30M22 14V30" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M17 17L27 27M27 17L17 27" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
                </svg>
              </div>
              <h2 className="login-form-title">Welcome back</h2>
              <p className="login-form-subtitle">Sign in to your Beacon CRM account to continue.</p>
            </div>

            {loginError && (
              <div className="login-error-banner">
                <AlertTriangle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="login-form">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="login-input-wrap">
                  <Mail size={16} className="login-input-icon" />
                  <input
                    type="email"
                    className="form-control login-input"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    placeholder="closer@beacon.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <div className="login-label-row">
                  <label className="form-label">Password</label>
                  <button type="button" className="forgot-link" onClick={() => alert('Contact your administrator to reset your password.')}>Forgot password?</button>
                </div>
                <div className="login-input-wrap">
                  <Lock size={16} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control login-input"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className={`btn btn-primary login-submit ${loginLoading ? 'btn-loading' : ''}`} disabled={loginLoading}>
                {loginLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="login-quick-access">
              <div className="quick-access-label">Developer Quick Access</div>
              <div className="quick-access-grid">
                <button className="quick-access-btn" onClick={() => handleQuickLogin('gbenga@beacon.com')}>
                  <span className="qa-role-dot qa-gm" />
                  General Manager
                </button>
                <button className="quick-access-btn" onClick={() => handleQuickLogin('hadiza@beacon.com')}>
                  <span className="qa-role-dot qa-ops" />
                  Head of Operations
                </button>
                <button className="quick-access-btn" onClick={() => handleQuickLogin('biyi@beacon.com')}>
                  <span className="qa-role-dot qa-bm" />
                  Branch Manager
                </button>
                <button className="quick-access-btn" onClick={() => handleQuickLogin('remi@beacon.com')}>
                  <span className="qa-role-dot qa-rm" />
                  Relationship Manager
                </button>
                <button className="quick-access-btn" onClick={() => handleQuickLogin('admin@beacon.com')}>
                  <span className="qa-role-dot qa-admin" />
                  Super Admin
                </button>
                <button className="quick-access-btn" onClick={() => handleQuickLogin('closer1@beacon.com')}>
                  <span className="qa-role-dot qa-closer" />
                  Sales Closer
                </button>
              </div>
              <p className="qa-hint">Click a role to pre-fill. Password: <code>password</code></p>
            </div>
          </div>
        </div>

        <style>{`
          .login-split-page {
            display: flex;
            min-height: 100vh;
            font-family: 'Inter', sans-serif;
            background: #0A0C0F;
          }

          .login-left-panel {
            flex: 1.1;
            background-size: cover;
            background-position: center top;
            position: relative;
            display: flex;
            flex-direction: column;
          }

          .login-left-overlay {
            position: absolute;
            inset: 0;
            background: linear-gradient(160deg, rgba(0,0,0,0.78) 0%, rgba(180,20,24,0.22) 60%, rgba(0,0,0,0.85) 100%);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            padding: 40px 48px;
          }

          .login-brand-mark {
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .login-brand-name {
            font-size: 24px;
            font-weight: 800;
            color: white;
            letter-spacing: -0.5px;
          }

          .login-left-content {
            max-width: 480px;
          }

          .login-panel-headline {
            font-size: 36px;
            font-weight: 800;
            color: white;
            line-height: 1.2;
            letter-spacing: -1px;
            margin-bottom: 16px;
          }

          .login-panel-subtext {
            font-size: 16px;
            color: rgba(255,255,255,0.68);
            line-height: 1.6;
            margin-bottom: 40px;
          }

          .login-panel-stats {
            display: flex;
            align-items: center;
            gap: 28px;
          }

          .panel-stat-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .panel-stat-value {
            font-size: 28px;
            font-weight: 800;
            color: white;
          }

          .panel-stat-label {
            font-size: 12px;
            color: rgba(255,255,255,0.55);
            font-weight: 500;
          }

          .panel-stat-divider {
            width: 1px;
            height: 36px;
            background: rgba(255,255,255,0.2);
          }

          .login-right-panel {
            width: 480px;
            background: #FFFFFF;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 40px 32px;
            overflow-y: auto;
          }

          .login-form-container {
            width: 100%;
            max-width: 380px;
          }

          .login-form-header {
            margin-bottom: 32px;
          }

          .login-form-brand {
            margin-bottom: 20px;
          }

          .login-form-title {
            font-size: 26px;
            font-weight: 800;
            color: #101828;
            letter-spacing: -0.6px;
            margin-bottom: 8px;
          }

          .login-form-subtitle {
            font-size: 14px;
            color: #667085;
            line-height: 1.5;
          }

          .login-error-banner {
            background: #FEF3F2;
            border: 1px solid #FDA29B;
            color: #B42318;
            padding: 12px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 20px;
            animation: fadeIn 0.2s ease-out;
          }

          .login-label-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }

          .forgot-link {
            background: none;
            border: none;
            font-size: 13px;
            font-weight: 600;
            color: #D4262A;
            cursor: pointer;
            padding: 0;
          }

          .forgot-link:hover { text-decoration: underline; }

          .login-input-wrap {
            position: relative;
          }

          .login-input-icon {
            position: absolute;
            left: 14px;
            top: 50%;
            transform: translateY(-50%);
            color: #98A2B3;
          }

          .login-input {
            padding-left: 40px !important;
          }

          .pw-toggle {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: #98A2B3;
            cursor: pointer;
            display: flex;
            align-items: center;
            padding: 4px;
          }

          .pw-toggle:hover { color: #344054; }

          .login-submit {
            width: 100%;
            margin-top: 8px;
            padding: 13px;
            font-size: 15px;
            font-weight: 700;
            transition: all 0.2s;
          }

          .login-submit.btn-loading {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .login-quick-access {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #F2F4F7;
          }

          .quick-access-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #98A2B3;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
          }

          .quick-access-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            margin-bottom: 10px;
          }

          .quick-access-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border: 1px solid #E4E7EC;
            border-radius: 8px;
            background: #FAFAFA;
            font-size: 12px;
            font-weight: 600;
            color: #344054;
            cursor: pointer;
            transition: all 0.15s;
            text-align: left;
          }

          .quick-access-btn:hover {
            background: #F2F4F7;
            border-color: #D0D5DD;
          }

          .qa-role-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            flex-shrink: 0;
          }

          .qa-admin { background: #D4262A; }
          .qa-closer { background: #0066CC; }
          .qa-officer { background: #059669; }
          .qa-doc { background: #7C3AED; }
          .qa-rm { background: #3498DB; }
          .qa-ops { background: #E67E22; }
          .qa-bm { background: #1ABC9C; }
          .qa-gm { background: #2C3E50; }

          .qa-hint {
            font-size: 11px;
            color: #98A2B3;
            text-align: center;
          }

          .qa-hint code {
            background: #F2F4F7;
            padding: 1px 6px;
            border-radius: 4px;
            font-size: 11px;
            color: #344054;
          }

          @media (max-width: 900px) {
            .login-left-panel { display: none; }
            .login-right-panel { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        currentUser={currentUser} 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        onSignOut={handleSignOut} 
        mobileOpen={mobileSidebarOpen} 
        setMobileOpen={setMobileSidebarOpen} 
      />

      <div className="main-content">
        <Header
          currentUser={currentUser}
          onUserChange={(user) => setCurrentUser(user)}
          onSearch={(val) => setSearchTerm(val)}
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          setViewingLeadId={(id) => viewLead(id, currentTab)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(d => !d)}
          onMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        <main className="page-wrapper">
          {renderTabContent()}
        </main>
      </div>

      <LeadModal isOpen={leadModalOpen} leadId={leadModalId} onClose={() => setLeadModalOpen(false)} currentUser={currentUser} onSaveComplete={() => setLeadModalOpen(false)} onSaveAndLogActivity={handleSaveAndRedirectToLogActivity} />
      <LogActivityModal isOpen={activityModalOpen} leadId={activityLeadId} onClose={() => setActivityModalOpen(false)} currentUser={currentUser} onSaveComplete={() => setActivityModalOpen(false)} />
      <InspectionModal isOpen={inspectionModalOpen} leadId={inspectionLeadId} inspectionId={inspectionId} onClose={() => setInspectionModalOpen(false)} currentUser={currentUser} onSaveComplete={() => setInspectionModalOpen(false)} />
    </div>
  );
}
