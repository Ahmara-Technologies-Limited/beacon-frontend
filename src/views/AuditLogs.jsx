import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Trash2, X } from 'lucide-react';
import { db } from '../data/mockData';
import { dataService } from '../data/dataService';
import { getPollInterval } from '../lib/demoMode';
import { usePolling } from '../lib/usePolling';
import { confirmDialog } from '../lib/confirm';
import { notifySuccess, notifyError } from '../lib/toast';
import Pagination, { paginate } from '../components/Pagination';

const PAGE_SIZE = 25;

export default function AuditLogs({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  const loadLogs = async () => {
    try {
      setLogs(await dataService.getAuditLogs());
    } catch (err) {
      notifyError(err, 'Could not load audit logs.');
    }
  };

  usePolling(loadLogs, getPollInterval(2000));

  const handleClearLogs = async () => {
    const confirmed = await confirmDialog({
      title: 'Clear all audit logs?',
      message: 'This permanently clears all system audit logs. This action is irreversible.',
      confirmLabel: 'Clear Logs',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await dataService.clearAuditLogs();
      await dataService.logAudit("Cleared all system audit logs.");
      await loadLogs();
      notifySuccess('Audit logs cleared.');
    } catch (err) {
      notifyError(err, 'Could not clear audit logs.');
    }
  };

  const getFilteredLogs = () => {
    const query = searchQuery.toLowerCase().trim();
    if (query === '') return logs;
    return logs.filter(log =>
      (log.user || '').toLowerCase().includes(query) ||
      (log.action || '').toLowerCase().includes(query) ||
      (log.ipAddress || '').toLowerCase().includes(query)
    );
  };

  const filteredLogs = getFilteredLogs();
  const pagedLogs = paginate(filteredLogs, page, PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  return (
    <div className="audit-logs-page">
      <div className="breadcrumbs">
        <span>Home</span>
        <span className="breadcrumb-separator">&gt;</span>
        <span className="breadcrumb-active">Audit Logs</span>
      </div>

      <div className="page-header-row">
        <div>
          <h1 className="page-title">System Audit Logs</h1>
          <p className="page-subtitle">Review security events, user session switches, setting changes, and administrative actions.</p>
        </div>
        {currentUser.role === 'Super Admin' && (
          <button className="btn btn-danger btn-icon" onClick={handleClearLogs}>
            <Trash2 size={16} />
            <span>Clear Logs</span>
          </button>
        )}
      </div>

      <div className="user-toolbar card" style={{ marginBottom: '24px' }}>
        <div className="toolbar-search">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search logs by user, action details, or IP address..." 
            className="form-control"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '200px' }}>Date & Time</th>
              <th style={{ width: '220px' }}>User Profile</th>
              <th>Action Description</th>
              <th style={{ width: '150px' }}>IP Address</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={4} className="empty-table-state">
                  No system audit logs found matching your query.
                </td>
              </tr>
            ) : (
              pagedLogs.map(log => (
                <tr key={log.id} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: '500' }}>
                    {new Date(log.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="avatar-sm" style={{ width: 26, height: 26, fontSize: 10 }}>
                        {(log.user || 'System').split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </div>
                      <span style={{ fontSize: '13px', fontWeight: '600' }}>{log.user || 'System'}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '13.5px', color: 'var(--text-primary)' }}>
                    {log.action}
                  </td>
                  <td style={{ fontSize: '12.5px', fontFamily: 'monospace' }}>
                    {log.ipAddress}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <Pagination page={page} pageSize={PAGE_SIZE} totalItems={filteredLogs.length} onPageChange={setPage} />
      </div>
    </div>
  );
}
