'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { registerConfirmHandler } from '../lib/confirm';

// Mounted once, globally (app/layout.tsx). Renders whatever confirmation
// request confirmDialog() last dispatched, resolving its promise with the
// user's choice. See src/lib/confirm.js for the calling side.
export default function ConfirmDialogHost() {
  const [request, setRequest] = useState(null);

  useEffect(() => {
    return registerConfirmHandler((req) => setRequest(req));
  }, []);

  if (!request) return null;

  const respond = (result) => {
    request.resolve(result);
    setRequest(null);
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 2000 }} onClick={() => respond(false)}>
      <div className="modal-content" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {request.danger && <AlertTriangle size={18} className="alert-text-red" />}
            {request.title}
          </h3>
        </div>
        {request.message && (
          <div className="modal-body">
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
              {request.message}
            </p>
          </div>
        )}
        <div className="modal-footer">
          <button className="btn" onClick={() => respond(false)} autoFocus>
            {request.cancelLabel}
          </button>
          <button className={`btn ${request.danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => respond(true)}>
            {request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
