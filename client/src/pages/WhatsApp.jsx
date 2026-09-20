import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Avatar, Badge, Button, Spinner } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDateTime } from '../format.js';

function phoneInitials(phone) {
  return (phone || '?').replace(/\D/g, '').slice(-2) || '?';
}

export default function WhatsApp() {
  const [status, setStatus] = useState(null); // { connected, displayPhone } | null while loading
  const [conversations, setConversations] = useState(null);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [thread, setThread] = useState(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const threadEndRef = useRef(null);

  const loadConversations = () => {
    api.whatsappConversations().then((rows) => {
      setConversations(rows);
      setSelectedPhone((prev) => prev || (rows[0] && rows[0].contact_phone) || null);
    });
  };

  useEffect(() => {
    api.whatsappStatus().then((s) => {
      setStatus(s);
      if (s.connected) loadConversations();
    });
  }, []);

  useEffect(() => {
    if (!selectedPhone) return;
    api.whatsappConversation(selectedPhone).then(setThread).catch(() => setThread([]));
  }, [selectedPhone]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ block: 'end' });
  }, [thread]);

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim() || !selectedPhone) return;
    setSending(true);
    setError(null);
    try {
      await api.whatsappSend(selectedPhone, draft.trim());
      setDraft('');
      const [t] = await Promise.all([
        api.whatsappConversation(selectedPhone),
      ]);
      setThread(t);
      loadConversations();
    } catch (err) {
      setError(err.message || 'Could not send that message.');
    } finally {
      setSending(false);
    }
  }

  if (status === null) {
    return (
      <Layout title="WhatsApp">
        <Spinner />
      </Layout>
    );
  }

  if (!status.connected) {
    return (
      <Layout title="WhatsApp">
        <div className="flex flex-col items-center justify-center text-center gap-3 py-24 max-w-md mx-auto">
          <span className="w-12 h-12 rounded-xl bg-wash border border-line flex items-center justify-center text-muted">
            <Icon name="whatsapp" size={22} />
          </span>
          <h2 className="font-serif text-lg font-semibold text-ink">WhatsApp isn't connected yet</h2>
          <p className="text-sm text-muted">
            Connect the school's shared WhatsApp Business number in Settings to start sending and receiving
            messages here.
          </p>
          <Link to="/settings">
            <Button variant="brand">Go to Settings</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="WhatsApp" count={conversations ? conversations.length : undefined} flush>
      <div className="flex h-full min-h-0">
        <div className="w-[280px] flex-shrink-0 border-r border-line flex flex-col min-h-0 bg-surface">
          <div className="px-4 py-3 border-b border-lineSoft flex items-center gap-2 flex-shrink-0">
            <Badge tone="green">Connected</Badge>
            <span className="text-xs text-muted truncate">{status.displayPhone}</span>
          </div>
          <div className="flex-grow min-h-0 overflow-y-auto">
            {conversations === null ? (
              <Spinner />
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-sm text-muted text-center">
                No conversations yet. Messages sent to your WhatsApp number will show up here.
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.contact_phone}
                  type="button"
                  onClick={() => setSelectedPhone(c.contact_phone)}
                  className={`w-full text-left flex items-center gap-2.5 px-4 py-3 border-b border-lineSoft transition-colors ${
                    selectedPhone === c.contact_phone ? 'bg-wash' : 'hover:bg-wash/60'
                  }`}
                >
                  <Avatar name={phoneInitials(c.contact_phone)} size={32} />
                  <div className="min-w-0 flex-grow">
                    <div className="text-sm font-medium text-ink truncate">{c.contact_phone}</div>
                    <div className="text-xs text-muted truncate">
                      {c.direction === 'out' ? 'You: ' : ''}
                      {c.body}
                    </div>
                  </div>
                  <div className="text-[10.5px] text-faint flex-shrink-0 self-start">{shortDateTime(c.created_at)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="flex-grow min-w-0 flex flex-col min-h-0">
          {!selectedPhone ? (
            <div className="flex-grow flex items-center justify-center text-sm text-muted">
              Select a conversation to view messages.
            </div>
          ) : (
            <>
              <div className="px-5 py-3 border-b border-line flex items-center gap-2.5 flex-shrink-0">
                <Avatar name={phoneInitials(selectedPhone)} size={32} />
                <div>
                  <div className="text-sm font-medium text-ink">{selectedPhone}</div>
                  <div className="text-xs text-muted">WhatsApp</div>
                </div>
              </div>
              <div className="flex-grow min-h-0 overflow-y-auto px-5 py-4 flex flex-col gap-2.5">
                {thread === null ? (
                  <Spinner />
                ) : (
                  thread.map((m) => (
                    <div key={m.id} className={`flex ${m.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[70%] rounded-xl px-3.5 py-2 text-sm ${
                          m.direction === 'out' ? 'bg-brand text-white' : 'bg-wash text-ink border border-line'
                        }`}
                      >
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={`text-[10px] mt-1 ${m.direction === 'out' ? 'text-white/70' : 'text-faint'}`}>
                          {shortDateTime(m.created_at)}
                          {m.direction === 'out' && m.status ? ` · ${m.status}` : ''}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={threadEndRef} />
              </div>
              <form onSubmit={handleSend} className="px-5 py-3 border-t border-line flex-shrink-0 flex flex-col gap-2">
                {error && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{error}</div>}
                <div className="flex items-center gap-2">
                  <input
                    className="flex-grow text-sm border border-line rounded-lg px-3 py-2 bg-white text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-brand/30"
                    placeholder="Type a message…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={sending}
                  />
                  <Button variant="brand" type="submit" disabled={sending || !draft.trim()}>
                    <Icon name="send" size={14} /> {sending ? 'Sending…' : 'Send'}
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
