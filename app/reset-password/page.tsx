'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertTriangle, Check } from 'lucide-react';
import { dataService } from '@/data/dataService';
import { ApiError } from '@/lib/apiClient';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const missingParams = !uid || !token;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const nextErrors: typeof errors = {};
    if (!newPassword) {
      nextErrors.newPassword = 'New password is required.';
    } else if (newPassword.length < 6) {
      nextErrors.newPassword = 'Password must be at least 6 characters.';
    }
    if (newPassword !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setSubmitting(true);
    try {
      await dataService.confirmPasswordReset(uid, token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 1800);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors({ form: err.body?.detail || err.message || 'This password reset link is invalid or has expired.' });
      } else {
        setErrors({ form: 'Something went wrong. Please request a new reset link.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-card">
        <h1 className="reset-title">Set a new password</h1>
        <p className="reset-subtitle">Choose a new password for your Beacon CRM account.</p>

        {missingParams && (
          <div className="reset-error-banner">
            <AlertTriangle size={16} />
            <span>This reset link is missing required information. Please request a new one.</span>
          </div>
        )}

        {errors.form && (
          <div className="reset-error-banner">
            <AlertTriangle size={16} />
            <span>{errors.form}</span>
          </div>
        )}

        {success ? (
          <div className="reset-success-banner">
            <Check size={16} />
            <span>Password updated. Redirecting to sign in…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="reset-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="reset-input-wrap">
                <Lock size={16} className="reset-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control reset-input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={missingParams}
                />
                <button type="button" className="pw-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.newPassword && <span className="form-error">{errors.newPassword}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <div className="reset-input-wrap">
                <Lock size={16} className="reset-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control reset-input"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={missingParams}
                />
              </div>
              {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
            </div>

            <button type="submit" className={`btn btn-primary reset-submit ${submitting ? 'btn-loading' : ''}`} disabled={submitting || missingParams}>
              {submitting ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}

        <button type="button" className="reset-back-link" onClick={() => router.push('/login')}>Back to sign in</button>
      </div>

      <style>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #0A0C0F;
          font-family: 'Inter', sans-serif;
          padding: 24px;
        }

        .reset-card {
          width: 100%;
          max-width: 400px;
          background: #FFFFFF;
          border-radius: 14px;
          padding: 36px 32px;
        }

        .reset-title {
          font-size: 24px;
          font-weight: 800;
          color: #101828;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }

        .reset-subtitle {
          font-size: 14px;
          color: #667085;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .reset-error-banner {
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
          margin-bottom: 16px;
        }

        .reset-success-banner {
          background: #ECFDF3;
          border: 1px solid #ABEFC6;
          color: #067647;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
        }

        .reset-input-wrap {
          position: relative;
        }

        .reset-input-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #98A2B3;
        }

        .reset-input {
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

        .reset-submit {
          width: 100%;
          margin-top: 8px;
          padding: 13px;
          font-size: 15px;
          font-weight: 700;
        }

        .reset-submit.btn-loading {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .reset-back-link {
          display: block;
          margin: 20px auto 0;
          background: none;
          border: none;
          font-size: 13px;
          font-weight: 600;
          color: #D4262A;
          cursor: pointer;
        }

        .reset-back-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
