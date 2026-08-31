'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Check, FileText } from 'lucide-react';
import { dataService } from '@/data/dataService';
import { ApiError } from '@/lib/apiClient';

interface PortalState {
  leadName: string;
  propertyInterest: string | null;
  status: string;
  applicationData: Record<string, string> | null;
}

export default function ApplicationFormPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';

  const [loading, setLoading] = useState(!!token);
  const [loadError, setLoadError] = useState<string | null>(token ? null : 'This link is invalid.');
  const [portal, setPortal] = useState<PortalState | null>(null);

  const [form, setForm] = useState({ legalName: '', employment: '', nokName: '', nokPhone: '', unitDetails: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    dataService.getApplicationFormPortal(token)
      .then((data: PortalState) => {
        if (cancelled) return;
        setPortal(data);
        setForm((prev) => ({
          ...prev,
          legalName: data.leadName || '',
          unitDetails: data.propertyInterest ? `${data.propertyInterest} - Unit TBD` : '',
        }));
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(err instanceof ApiError ? (err.body?.detail || err.message) : 'This link is invalid or has expired.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!form.legalName.trim() || !form.nokName.trim() || !form.nokPhone.trim()) {
      setSubmitError('Please fill in your full legal name and next of kin details.');
      return;
    }
    setSubmitting(true);
    try {
      await dataService.submitApplicationFormPortal(token, form);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? (err.body?.detail || err.message) : 'Could not submit your form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-card">
        <div className="portal-brand">Beacon Corporate Realty</div>
        <h1 className="portal-title">Client Application Form</h1>

        {loading ? (
          <p className="portal-subtitle">Loading your form…</p>
        ) : loadError ? (
          <div className="portal-error-banner">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
          </div>
        ) : submitted || portal?.status === 'Submitted' || portal?.status === 'Approved' ? (
          <div className="portal-success-banner">
            <Check size={16} />
            <span>Thank you, {portal?.leadName}. Your application form has been received and is being reviewed by our team.</span>
          </div>
        ) : (
          <>
            <p className="portal-subtitle">
              Hi {portal?.leadName}, please complete the details below to proceed with your purchase{portal?.propertyInterest ? ` of ${portal.propertyInterest}` : ''}.
            </p>

            {submitError && (
              <div className="portal-error-banner">
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="portal-form">
              <div className="form-group">
                <label className="form-label">Full Legal Name *</label>
                <input type="text" className="form-control" value={form.legalName} onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Employment Status</label>
                <input type="text" className="form-control" placeholder="e.g. Entrepreneur, Corporate" value={form.employment} onChange={(e) => setForm((p) => ({ ...p, employment: e.target.value }))} />
              </div>
              <div className="portal-form-row">
                <div className="form-group">
                  <label className="form-label">Next of Kin Name *</label>
                  <input type="text" className="form-control" value={form.nokName} onChange={(e) => setForm((p) => ({ ...p, nokName: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Next of Kin Phone *</label>
                  <input type="text" className="form-control" value={form.nokPhone} onChange={(e) => setForm((p) => ({ ...p, nokPhone: e.target.value }))} required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Property Interest Spec</label>
                <input type="text" className="form-control" value={form.unitDetails} onChange={(e) => setForm((p) => ({ ...p, unitDetails: e.target.value }))} />
              </div>

              <button type="submit" className="btn btn-primary portal-submit" disabled={submitting}>
                <FileText size={16} />
                {submitting ? 'Submitting…' : 'Submit Application Form'}
              </button>
            </form>
          </>
        )}
      </div>

      <style>{`
        .portal-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0A0C0F;
          font-family: 'Inter', sans-serif;
          padding: 24px;
        }
        .portal-card {
          width: 100%;
          max-width: 520px;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 36px 32px;
        }
        .portal-brand {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #D4262A;
          margin-bottom: 8px;
        }
        .portal-title {
          font-size: 22px;
          font-weight: 800;
          color: #101828;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }
        .portal-subtitle {
          font-size: 14px;
          color: #667085;
          line-height: 1.5;
          margin-bottom: 20px;
        }
        .portal-error-banner, .portal-success-banner {
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }
        .portal-error-banner {
          background: #FEF3F2;
          border: 1px solid #FDA29B;
          color: #B42318;
        }
        .portal-success-banner {
          background: #ECFDF3;
          border: 1px solid #ABEFC6;
          color: #067647;
        }
        .portal-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        .portal-submit {
          width: 100%;
          margin-top: 8px;
          padding: 13px;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        @media (max-width: 480px) {
          .portal-form-row { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
