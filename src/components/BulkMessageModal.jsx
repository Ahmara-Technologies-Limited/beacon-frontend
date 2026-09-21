import React, { useEffect, useMemo, useState } from 'react';
import { X, MessageSquare, Send, AlertTriangle, Info } from 'lucide-react';
import { dataService } from '../data/dataService';
import { notifySuccess, notifyError } from '../lib/toast';
import { useResetOnChange } from '../lib/useResetOnChange';

// Composing a bulk SMS or WhatsApp to the selected leads.
//
// The things this screen exists to prevent, in order of how bad they look to
// a client:
//
//   1. "Hi {{first_name}}" going out literally - so there is a live preview
//      against a real recipient, not a description of one.
//   2. Messaging someone who asked not to be - opted-out leads are counted
//      out before sending, and named.
//   3. A send nobody can undo, sent by accident - the button says how many
//      people will receive it, and the count excludes the skips.
//   4. A surprise bill - SMS is charged per 160-character segment, so the
//      segment count and the resulting message total are shown up front.

const MERGE_FIELDS = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{name}}', label: 'Full name' },
  { token: '{{property}}', label: 'Property interest' },
  { token: '{{closer}}', label: 'Assigned closer' },
];

const GSM_SEGMENT = 160;
const UNICODE_SEGMENT = 70;

const renderPreview = (template, lead) => {
  if (!lead) return template;
  const first = (lead.name || 'there').split(' ')[0];
  return template
    .replace(/\{\{\s*first_name\s*\}\}/g, first)
    .replace(/\{\{\s*name\s*\}\}/g, lead.name || 'there')
    .replace(/\{\{\s*property\s*\}\}/g, lead.propertyInterest || 'our estates')
    .replace(/\{\{\s*closer\s*\}\}/g, lead.closerName || 'our team');
};

export default function BulkMessageModal({ isOpen, onClose, leads, onSent }) {
  const [channel, setChannel] = useState('SMS');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null);
  const [result, setResult] = useState(null);

  // Opening the modal clears the previous send's result during render rather
  // than in an effect, so a re-opened composer never paints the last
  // campaign's summary for a frame first.
  useResetOnChange(isOpen, () => setResult(null));

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    dataService
      .getMessagingStatus()
      .then((info) => !cancelled && setProviderInfo(info))
      .catch(() => !cancelled && setProviderInfo(null));
    return () => { cancelled = true; };
  }, [isOpen]);

  // Worked out here rather than on the server so the sender sees who is
  // excluded *before* committing, not in a report afterwards.
  const { receiving, skipped } = useMemo(() => {
    const has = (lead) =>
      channel === 'WhatsApp' ? !!(lead.whatsapp || lead.phone) : !!lead.phone;
    const receiving = [];
    const skipped = [];
    for (const lead of leads) {
      if (lead.messagingOptOut) skipped.push({ lead, reason: 'opted out' });
      else if (!has(lead)) skipped.push({ lead, reason: 'no number on file' });
      else receiving.push(lead);
    }
    return { receiving, skipped };
  }, [leads, channel]);

  const preview = renderPreview(body, receiving[0] || leads[0]);
  const segmentSize = preview.isAscii === false ? UNICODE_SEGMENT : (/^[\x00-\x7F]*$/.test(preview) ? GSM_SEGMENT : UNICODE_SEGMENT);
  const segments = Math.max(1, Math.ceil(preview.length / segmentSize));

  if (!isOpen) return null;

  const insertField = (token) => setBody((prev) => `${prev}${token}`);

  const handleSend = async () => {
    if (isSending) return;
    if (!body.trim()) {
      notifyError(null, 'Write the message before sending.');
      return;
    }
    if (receiving.length === 0) {
      notifyError(null, 'None of the selected leads can receive this message.');
      return;
    }

    setIsSending(true);
    try {
      const campaign = await dataService.sendBulkMessage({
        channel,
        body: body.trim(),
        leadIds: receiving.map((lead) => lead.id),
      });
      setResult(campaign);
      notifySuccess(`${campaign.sent} message${campaign.sent === 1 ? '' : 's'} sent.`);
      if (typeof onSent === 'function') onSent(campaign);
    } catch (err) {
      notifyError(err, 'Could not send these messages.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h3 className="modal-title">
            <MessageSquare size={18} style={{ verticalAlign: '-3px', marginRight: '8px' }} />
            {/* Once sent, the selection behind this modal has been cleared,
                so the count comes from the campaign rather than from a
                selection that no longer exists. */}
            {result
              ? `${result.channel} sent`
              : `Message ${leads.length} lead${leads.length === 1 ? '' : 's'}`}
          </h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {result ? (
            <div className="bulk-result">
              <div className="bulk-result-counts">
                <div><strong>{result.sent}</strong><span>sent</span></div>
                <div className={result.failed ? 'bad' : ''}><strong>{result.failed}</strong><span>failed</span></div>
                <div><strong>{result.skipped}</strong><span>skipped</span></div>
              </div>
              {result.recipients?.some((r) => r.status === 'Failed') && (
                <ul className="bulk-result-errors">
                  {result.recipients
                    .filter((r) => r.status === 'Failed')
                    .slice(0, 8)
                    .map((r) => (
                      <li key={r.id}>
                        <strong>{r.lead_name}:</strong> {r.error}
                      </li>
                    ))}
                </ul>
              )}
              <p className="bulk-result-note">
                Each message sent is on that lead&apos;s activity timeline.
              </p>
            </div>
          ) : (
            <>
              {providerInfo && !providerInfo.live && (
                <div className="bulk-warning">
                  <AlertTriangle size={16} />
                  <span>
                    No messaging provider is configured, so nothing will actually reach
                    anyone - messages are written to the server log instead. Everything
                    else on this screen works exactly as it will in production.
                  </span>
                </div>
              )}

              <div className="channel-picker">
                {['SMS', 'WhatsApp'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`channel-option ${channel === option ? 'active' : ''}`}
                    onClick={() => setChannel(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>

              {channel === 'WhatsApp' && (
                <div className="bulk-note">
                  <Info size={14} />
                  <span>
                    WhatsApp requires the text to match a template Meta has approved
                    beforehand. Free-form wording is only delivered to people who
                    messaged you in the last 24 hours.
                  </span>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Message</label>
                <textarea
                  className="form-control"
                  rows={5}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Hi {{first_name}}, we have an update on {{property}}..."
                />
                <div className="merge-field-row">
                  <span>Insert:</span>
                  {MERGE_FIELDS.map((field) => (
                    <button
                      key={field.token}
                      type="button"
                      className="merge-chip"
                      onClick={() => insertField(field.token)}
                    >
                      {field.label}
                    </button>
                  ))}
                </div>
              </div>

              {body.trim() && (
                <div className="message-preview">
                  <span className="message-preview-label">
                    Preview for {receiving[0]?.name || leads[0]?.name}
                  </span>
                  <p>{preview}</p>
                  {channel === 'SMS' && (
                    <span className="message-preview-meta">
                      {preview.length} characters · {segments} segment{segments === 1 ? '' : 's'} ·{' '}
                      {segments * receiving.length} message{segments * receiving.length === 1 ? '' : 's'} billed
                    </span>
                  )}
                </div>
              )}

              <div className="recipient-summary">
                <div>
                  <strong>{receiving.length}</strong> will receive this
                </div>
                {skipped.length > 0 && (
                  <details>
                    <summary>{skipped.length} skipped</summary>
                    <ul>
                      {skipped.slice(0, 10).map(({ lead, reason }) => (
                        <li key={lead.id}>
                          {lead.name} — {reason}
                        </li>
                      ))}
                      {skipped.length > 10 && <li>and {skipped.length - 10} more</li>}
                    </ul>
                  </details>
                )}
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          {result ? (
            <button className="btn btn-primary" onClick={onClose}>Done</button>
          ) : (
            <>
              <button className="btn" onClick={onClose} disabled={isSending}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={isSending || receiving.length === 0}
              >
                <Send size={15} />
                <span>
                  {isSending
                    ? 'Sending…'
                    : `Send to ${receiving.length} lead${receiving.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        .channel-picker { display: flex; gap: 8px; margin-bottom: 16px; }

        .channel-option {
          flex: 1;
          padding: 10px;
          border: 1px solid var(--border-color);
          border-radius: var(--radius-sm);
          background: none;
          font: inherit;
          font-weight: 600;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .channel-option.active {
          border-color: var(--primary-red);
          background: rgba(212,38,42,0.06);
          color: var(--primary-red);
        }

        .bulk-warning,
        .bulk-note {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 14px;
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          line-height: 1.55;
          margin-bottom: 16px;
        }

        .bulk-warning { background: #FFFAEB; border: 1px solid #FEC84B; color: #B54708; }
        .bulk-note { background: var(--color-grey-bg); color: var(--text-secondary); }
        .bulk-warning svg, .bulk-note svg { flex-shrink: 0; margin-top: 2px; }

        .merge-field-row {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 6px;
          margin-top: 8px;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .merge-chip {
          border: 1px solid var(--border-color);
          background: none;
          border-radius: 20px;
          padding: 3px 10px;
          font: inherit;
          font-size: 11.5px;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .merge-chip:hover { border-color: var(--primary-red); color: var(--primary-red); }

        .message-preview {
          background: var(--color-grey-bg);
          border-radius: var(--radius-sm);
          padding: 14px;
          margin-bottom: 16px;
        }

        .message-preview-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.4px;
          color: var(--text-secondary);
        }

        .message-preview p {
          margin: 8px 0;
          font-size: 13.5px;
          line-height: 1.55;
          color: var(--text-primary);
          white-space: pre-wrap;
        }

        .message-preview-meta { font-size: 11.5px; color: var(--text-secondary); }

        .recipient-summary {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: wrap;
          font-size: 13px;
          color: var(--text-secondary);
          border-top: 1px solid var(--border-color);
          padding-top: 14px;
        }

        .recipient-summary strong { color: var(--text-primary); font-size: 15px; }
        .recipient-summary details { font-size: 12.5px; }
        .recipient-summary summary { cursor: pointer; color: #B54708; }
        .recipient-summary ul { margin: 8px 0 0; padding-left: 18px; line-height: 1.7; }

        .bulk-result-counts { display: flex; gap: 28px; margin-bottom: 16px; }
        .bulk-result-counts div { display: flex; flex-direction: column; }
        .bulk-result-counts strong { font-size: 24px; font-weight: 800; color: var(--text-primary); }
        .bulk-result-counts div.bad strong { color: var(--primary-red); }
        .bulk-result-counts span { font-size: 12px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.4px; }

        .bulk-result-errors { font-size: 12.5px; color: var(--text-secondary); line-height: 1.7; padding-left: 18px; }
        .bulk-result-note { font-size: 12.5px; color: var(--text-secondary); font-style: italic; margin-top: 12px; }
      `}</style>
    </div>
  );
}
