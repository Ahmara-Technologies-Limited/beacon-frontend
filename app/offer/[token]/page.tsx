'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle, Check, FileSignature } from 'lucide-react';
import { dataService } from '@/data/dataService';
import { ApiError } from '@/lib/apiClient';
import { formatCurrency } from '@/lib/format';

interface OfferTerms {
  property?: string;
  regularPrice?: string | number;
  discount?: string | number;
  netPrice?: string | number;
  depositPercentage?: string | number;
  deposit?: string | number;
  months?: string | number;
  installmentVal?: string | number;
}

interface PortalState {
  leadName: string;
  propertyInterest: string | null;
  status: string;
  terms: OfferTerms | null;
  signature: string | null;
  signedDate: string | null;
}

export default function OfferLetterPortalPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token || '';

  const [loading, setLoading] = useState(!!token);
  const [loadError, setLoadError] = useState<string | null>(token ? null : 'This link is invalid.');
  const [portal, setPortal] = useState<PortalState | null>(null);

  const [signature, setSignature] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    dataService.getOfferLetterPortal(token)
      .then((data: PortalState) => {
        if (!cancelled) setPortal(data);
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
    if (!signature.trim()) {
      setSubmitError('Please type your full legal name to sign.');
      return;
    }
    if (!agree) {
      setSubmitError('You must check the box confirming you agree to the terms.');
      return;
    }
    setSubmitting(true);
    try {
      await dataService.acceptOfferLetterPortal(token, { signature, agree });
      setAccepted(true);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? (err.body?.detail || err.message) : 'Could not process your acceptance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const terms = portal?.terms || {};
  const alreadyAccepted = portal?.status === 'Accepted';

  return (
    <div className="portal-page">
      <div className="portal-card">
        <div className="portal-brand">Beacon Corporate Realty</div>
        <h1 className="portal-title">Letter of Offer</h1>

        {loading ? (
          <p className="portal-subtitle">Loading your offer letter…</p>
        ) : loadError ? (
          <div className="portal-error-banner">
            <AlertTriangle size={16} />
            <span>{loadError}</span>
          </div>
        ) : accepted || alreadyAccepted ? (
          <div className="portal-success-banner">
            <Check size={16} />
            <span>
              Thank you, {portal?.leadName}. Your acceptance has been recorded
              {portal?.signature ? ` (signed by ${portal.signature})` : ''}. Our team will be in touch to proceed with payment.
            </span>
          </div>
        ) : (
          <>
            <p className="portal-subtitle">
              Hi {portal?.leadName}, please review the terms below and sign to confirm your commitment.
            </p>

            <div className="portal-terms-box">
              <div className="portal-terms-row"><span>Property</span><strong>{terms.property || portal?.propertyInterest || '—'}</strong></div>
              <div className="portal-terms-row"><span>Regular Price</span><strong>{formatCurrency(terms.regularPrice)}</strong></div>
              {Number(terms.discount) > 0 && (
                <div className="portal-terms-row"><span>Discount</span><strong>-{formatCurrency(terms.discount)}</strong></div>
              )}
              <div className="portal-terms-row"><span>Net Price</span><strong>{formatCurrency(terms.netPrice)}</strong></div>
              <div className="portal-terms-row"><span>Deposit ({terms.depositPercentage || 0}%)</span><strong>{formatCurrency(terms.deposit)}</strong></div>
              <div className="portal-terms-row"><span>Payment Tenor</span><strong>{terms.months || 0} months</strong></div>
              <div className="portal-terms-row"><span>Monthly Installment</span><strong>{formatCurrency(terms.installmentVal)}</strong></div>
            </div>

            <div className="portal-legal-text">
              <strong>TERMS OF SALES ACQUISITION:</strong> Subject to complete contract execution, the client agrees to
              purchase the property described above under the stated terms. Payments must follow the defined schedule.
              Defaulting for 2 consecutive periods leads to provisional allocation withdrawal.
            </div>

            {submitError && (
              <div className="portal-error-banner">
                <AlertTriangle size={16} />
                <span>{submitError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="portal-form">
              <div className="form-group">
                <label className="form-label">Signature (Type Your Full Legal Name) *</label>
                <input type="text" className="form-control" placeholder="e.g. Tunde Bakare" value={signature} onChange={(e) => setSignature(e.target.value)} required />
              </div>
              <label className="portal-checkbox-row">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I have read and agree to the terms of this offer letter.</span>
              </label>

              <button type="submit" className="btn btn-primary portal-submit" disabled={submitting}>
                <FileSignature size={16} />
                {submitting ? 'Submitting…' : 'Accept & Sign Offer Letter'}
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
        .portal-terms-box {
          background: #F9FAFB;
          border: 1px solid #E5E7EB;
          border-radius: 8px;
          padding: 14px 16px;
          margin-bottom: 16px;
        }
        .portal-terms-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #344054;
          padding: 5px 0;
        }
        .portal-terms-row + .portal-terms-row {
          border-top: 1px dashed #E5E7EB;
        }
        .portal-legal-text {
          background: white;
          border: 1px solid #E5E7EB;
          border-radius: 6px;
          padding: 12px;
          font-size: 12px;
          color: #374151;
          line-height: 1.6;
          margin-bottom: 16px;
        }
        .portal-checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 13px;
          color: #344054;
          margin: 8px 0 16px;
          cursor: pointer;
        }
        .portal-submit {
          width: 100%;
          padding: 13px;
          font-size: 15px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}
