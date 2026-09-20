import { useEffect, useRef, useState } from 'react';
import api, { BASE } from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, CardHead, Avatar, Badge, Spinner, Button, Field, Modal, inputCls } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { downloadCSV } from '../format.js';

const PROFILE_KEY = 'cohort-school-profile';
const NOTIFS_KEY = 'cohort-notifications';
const LOGO_KEY = 'cohort-logo';

const DEFAULT_PROFILE = {
  name: 'Ashford Preparatory Academy',
  tagline: 'Cultivating Scholars, Leaders & Global Citizens Since 1987',
  address: '480 Blue Ridge Parkway, Asheville, NC 28804',
  phone: '(828) 555-0100',
  gradeRange: 'Kindergarten – 12th Grade',
  enrollment: '542 students enrolled for 2026-2027',
};

const DEFAULT_NOTIFS = {
  newInquiry: true,
  interviewReminders: true,
  overdueTuition: true,
  weeklyDigest: false,
};

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore write failures (private mode, quota, etc.)
  }
}

function WhatsAppConnectForm({ onCancel, onSubmit, busy, error }) {
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const webhookUrl = `${BASE}/integrations/whatsapp/webhook`;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          phoneNumberId: phoneNumberId.trim(),
          accessToken: accessToken.trim(),
          businessAccountId: businessAccountId.trim(),
          verifyToken: verifyToken.trim(),
        });
      }}
      className="flex flex-col gap-4"
    >
      {error && (
        <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{error}</div>
      )}
      <Field label="Phone Number ID">
        <input
          required
          autoFocus
          className={inputCls}
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          placeholder="1029384756"
        />
      </Field>
      <Field label="Access Token">
        <input
          required
          type="password"
          className={inputCls}
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="EAAG..."
        />
      </Field>
      <Field label="WhatsApp Business Account ID (optional)">
        <input
          className={inputCls}
          value={businessAccountId}
          onChange={(e) => setBusinessAccountId(e.target.value)}
          placeholder="1029384756"
        />
      </Field>
      <Field label="Verify Token (optional — pick any value and reuse it in Meta's console)">
        <input
          className={inputCls}
          value={verifyToken}
          onChange={(e) => setVerifyToken(e.target.value)}
          placeholder="my-secret-token"
        />
      </Field>
      <div className="text-xs text-muted leading-relaxed bg-wash border border-line rounded-lg px-3 py-2">
        In Meta's developer console (WhatsApp &rarr; Configuration), paste this as the callback URL:
        <div className="font-mono text-ink break-all mt-1">{webhookUrl}</div>
      </div>
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" type="button" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="brand" type="submit" disabled={busy}>{busy ? 'Connecting…' : 'Connect'}</Button>
      </div>
    </form>
  );
}

export default function Settings() {
  const [users, setUsers] = useState(null);

  const [whatsapp, setWhatsapp] = useState({ connected: false, displayPhone: null });
  const [whatsappBusy, setWhatsappBusy] = useState(false);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [whatsappError, setWhatsappError] = useState(null);

  const [profile, setProfile] = useState(() => loadJSON(PROFILE_KEY, DEFAULT_PROFILE));
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [profileSaved, setProfileSaved] = useState(false);

  const [notifs, setNotifs] = useState(() => loadJSON(NOTIFS_KEY, DEFAULT_NOTIFS));
  const [logo, setLogo] = useState(() => {
    try {
      return localStorage.getItem(LOGO_KEY) || null;
    } catch {
      return null;
    }
  });
  const [exporting, setExporting] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.users().then(setUsers);
  }, []);

  const refreshWhatsappStatus = () => {
    api.whatsappStatus().then(setWhatsapp).catch(() => {});
  };

  useEffect(refreshWhatsappStatus, []);

  async function toggleWhatsapp() {
    if (whatsapp.connected) {
      setWhatsappBusy(true);
      try {
        await api.whatsappDisconnect();
        refreshWhatsappStatus();
      } catch (e) {
        setWhatsappError(e.message || "Couldn't disconnect WhatsApp");
      } finally {
        setWhatsappBusy(false);
      }
    } else {
      setWhatsappError(null);
      setWhatsappModalOpen(true);
    }
  }

  async function submitWhatsapp(data) {
    setWhatsappBusy(true);
    setWhatsappError(null);
    try {
      await api.whatsappConnect(data);
      refreshWhatsappStatus();
      setWhatsappModalOpen(false);
    } catch (e) {
      setWhatsappError(e.message || "Couldn't connect WhatsApp");
    } finally {
      setWhatsappBusy(false);
    }
  }

  function toggleNotif(key) {
    setNotifs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveJSON(NOTIFS_KEY, next);
      return next;
    });
  }

  function startEditProfile() {
    setProfileDraft(profile);
    setEditingProfile(true);
    setProfileSaved(false);
  }

  function saveProfile(e) {
    e.preventDefault();
    setProfile(profileDraft);
    saveJSON(PROFILE_KEY, profileDraft);
    setEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  function handleLogoPick(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setLogo(dataUrl);
      try {
        localStorage.setItem(LOGO_KEY, dataUrl);
      } catch {
        // ignore
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleExport(key, fetcher) {
    setExporting(key);
    try {
      const rows = await fetcher();
      downloadCSV(`cohort-${key}.csv`, rows);
    } finally {
      setExporting(null);
    }
  }

  const EXPORTS = [
    { key: 'inquiries', label: 'Inquiries', fetcher: api.inquiries },
    { key: 'applicants', label: 'Applicants', fetcher: api.applicants },
    { key: 'tours-events', label: 'Tours & Events', fetcher: api.tours },
    { key: 'interviews', label: 'Interviews', fetcher: api.interviews },
    { key: 'students', label: 'Students', fetcher: api.students },
    { key: 'families', label: 'Families', fetcher: api.families },
    { key: 'tuition-invoices', label: 'Tuition Invoices', fetcher: api.invoices },
    { key: 'financial-aid', label: 'Financial Aid', fetcher: api.financialAid },
  ];

  const NOTIF_ITEMS = [
    { key: 'newInquiry', label: 'New inquiry submitted' },
    { key: 'interviewReminders', label: 'Interview reminders (3 days out)' },
    { key: 'overdueTuition', label: 'Tuition invoice goes overdue' },
    { key: 'weeklyDigest', label: 'Weekly admissions digest' },
  ];

  if (!users) return <Layout title="Settings"><Spinner /></Layout>;

  return (
    <Layout title="Settings">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHead
            title="School Profile"
            action={
              !editingProfile && (
                <div className="flex items-center gap-2">
                  {profileSaved && <span className="text-xs text-teal font-medium">Saved</span>}
                  <Button variant="outline" size="sm" onClick={startEditProfile}>
                    <Icon name="edit" size={13} /> Edit Profile
                  </Button>
                </div>
              )
            }
          />
          {!editingProfile ? (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="sm:col-span-2">
                <div className="text-xs text-muted uppercase tracking-wide mb-1">School Name</div>
                <div className="text-ink font-medium">{profile.name}</div>
              </div>
              <div className="sm:col-span-2">
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Tagline</div>
                <div className="text-ink font-medium">{profile.tagline}</div>
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Address</div>
                <div className="text-ink font-medium">{profile.address}</div>
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Phone</div>
                <div className="text-ink font-medium">{profile.phone}</div>
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Grade Range</div>
                <div className="text-ink font-medium">{profile.gradeRange}</div>
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wide mb-1">Current Enrollment</div>
                <div className="text-ink font-medium">{profile.enrollment}</div>
              </div>
            </div>
          ) : (
            <form onSubmit={saveProfile} className="p-5 flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="School Name" className="sm:col-span-2">
                  <input className={inputCls} value={profileDraft.name} onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))} />
                </Field>
                <Field label="Tagline" className="sm:col-span-2">
                  <input className={inputCls} value={profileDraft.tagline} onChange={(e) => setProfileDraft((p) => ({ ...p, tagline: e.target.value }))} />
                </Field>
                <Field label="Address">
                  <input className={inputCls} value={profileDraft.address} onChange={(e) => setProfileDraft((p) => ({ ...p, address: e.target.value }))} />
                </Field>
                <Field label="Phone">
                  <input className={inputCls} value={profileDraft.phone} onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))} />
                </Field>
                <Field label="Grade Range">
                  <input className={inputCls} value={profileDraft.gradeRange} onChange={(e) => setProfileDraft((p) => ({ ...p, gradeRange: e.target.value }))} />
                </Field>
                <Field label="Current Enrollment">
                  <input className={inputCls} value={profileDraft.enrollment} onChange={(e) => setProfileDraft((p) => ({ ...p, enrollment: e.target.value }))} />
                </Field>
              </div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setEditingProfile(false)}>Cancel</Button>
                <Button variant="brand" type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </Card>

        <Card>
          <CardHead title="School Logo" sub="Shown across the admissions portal" />
          <div className="p-5 flex flex-col items-center gap-3">
            {logo ? (
              <img src={logo} alt="School logo" className="w-20 h-20 rounded-xl object-cover border border-line" />
            ) : (
              <div className="w-20 h-20 rounded-xl border border-dashed border-line flex items-center justify-center text-faint">
                <Icon name="image" size={22} />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoPick} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Icon name="image" size={13} /> {logo ? 'Change Logo' : 'Upload Logo'}
            </Button>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <Card className="lg:col-span-2">
          <CardHead title="Team" sub="Admissions & enrollment staff" />
          <div className="divide-y divide-lineSoft">
            {users.map((u) => (
              <div key={u.id} className="px-5 py-3 flex items-center gap-3">
                <Avatar name={u.name} color={u.color} size={32} />
                <div className="min-w-0 flex-grow">
                  <div className="text-sm font-medium text-ink truncate">{u.name}</div>
                  <div className="text-xs text-muted truncate">{u.email}</div>
                </div>
                <Badge tone="neutral">{u.role}</Badge>
              </div>
            ))}
            {users.length === 0 && <div className="px-5 py-6 text-sm text-muted text-center">No staff on file.</div>}
          </div>
        </Card>

        <Card>
          <CardHead title="Notifications" sub="Saved to this browser" />
          <div className="p-5 flex flex-col gap-3">
            {NOTIF_ITEMS.map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 text-sm text-ink">
                <span>{item.label}</span>
                <input type="checkbox" checked={!!notifs[item.key]} onChange={() => toggleNotif(item.key)} />
              </label>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <CardHead title="Integrations" sub="Connect shared, whole-school tools" />
        <div className="px-5 pb-5 flex items-center gap-3 pt-4">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: whatsapp.connected ? '#1FAF54' : '#f0e8d8', color: whatsapp.connected ? '#fff' : '#6d6255' }}
          >
            <Icon name="whatsapp" size={17} />
          </span>
          <div className="min-w-0 flex-grow">
            <div className="text-sm font-medium text-ink">WhatsApp Business</div>
            <div className="text-xs text-muted truncate">
              {whatsapp.connected ? whatsapp.displayPhone : 'Not connected — paste credentials from Meta’s developer console'}
            </div>
          </div>
          {whatsapp.connected ? (
            <button type="button" onClick={whatsappBusy ? undefined : toggleWhatsapp} title="Click to disconnect">
              <Badge tone="green">{whatsappBusy ? '…' : 'Connected'}</Badge>
            </button>
          ) : (
            <Button variant="outline" size="sm" onClick={toggleWhatsapp} disabled={whatsappBusy}>
              {whatsappBusy ? '…' : 'Connect'}
            </Button>
          )}
        </div>
      </Card>

      <Card className="mt-5">
        <CardHead title="Data Export" sub="Download any of Cohort's core records as CSV" />
        <div className="p-5 flex flex-wrap gap-2">
          {EXPORTS.map((exp) => (
            <Button key={exp.key} variant="outline" size="sm" onClick={() => handleExport(exp.key, exp.fetcher)} disabled={exporting === exp.key}>
              <Icon name="download" size={13} /> {exporting === exp.key ? 'Exporting…' : exp.label}
            </Button>
          ))}
        </div>
      </Card>

      {whatsappModalOpen && (
        <Modal
          title="Connect WhatsApp Business"
          sub="One shared number for the whole school"
          onClose={() => setWhatsappModalOpen(false)}
        >
          <WhatsAppConnectForm
            onCancel={() => setWhatsappModalOpen(false)}
            onSubmit={submitWhatsapp}
            busy={whatsappBusy}
            error={whatsappError}
          />
        </Modal>
      )}
    </Layout>
  );
}
