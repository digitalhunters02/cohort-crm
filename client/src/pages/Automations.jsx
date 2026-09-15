import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, Badge, Spinner, Button, Modal, Field, inputCls, IconButton, ConfirmDialog } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';

const EMPTY_FORM = { name: '', trigger_desc: '', action_desc: '', active: true };

export default function Automations() {
  const [automations, setAutomations] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    api.automations().then(setAutomations);
  }, []);

  if (!automations) return <Layout title="Automations"><Spinner /></Layout>;

  function openCreate() {
    setFormError(null);
    setModal({ form: { ...EMPTY_FORM } });
  }

  function updateField(key, value) {
    setModal((m) => ({ ...m, form: { ...m.form, [key]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    const f = modal.form;
    const payload = {
      name: f.name.trim(),
      trigger_desc: f.trigger_desc.trim(),
      action_desc: f.action_desc.trim(),
      active: f.active,
    };
    try {
      const created = await api.createAutomation(payload);
      setAutomations((prev) => [created, ...prev]);
      setModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(a) {
    setTogglingId(a.id);
    try {
      const updated = await api.toggleAutomation(a.id);
      setAutomations((prev) => prev.map((x) => (x.id === a.id ? updated : x)));
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAutomation(deleteTarget.id);
      setAutomations((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout
      title="Automations"
      count={automations.length}
      actions={
        <Button variant="brand" onClick={openCreate}>
          <Icon name="plus" size={15} /> New Automation
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {automations.map((a) => (
          <Card key={a.id} className="p-5 flex items-center gap-4">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: a.active ? '#f4dbdd' : '#f0e8d8', color: a.active ? '#7a2331' : '#a9998c' }}
            >
              <Icon name="zap" size={18} />
            </span>
            <div className="flex-grow min-w-0">
              <div className="font-serif font-semibold text-ink">{a.name}</div>
              <div className="text-xs text-muted mt-1">
                <span className="font-medium text-ink/70">Trigger:</span> {a.trigger_desc}
              </div>
              <div className="text-xs text-muted mt-0.5">
                <span className="font-medium text-ink/70">Action:</span> {a.action_desc}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="text-sm font-serif font-semibold text-ink">{a.runs_30d}</div>
              <div className="text-[11px] text-muted uppercase tracking-wide mb-2">runs / 30d</div>
              <button type="button" onClick={() => handleToggle(a)} disabled={togglingId === a.id}>
                <Badge tone={a.active ? 'green' : 'neutral'}>{a.active ? 'Active' : 'Paused'}</Badge>
              </button>
            </div>
            <IconButton icon="trash" title="Delete" tone="danger" onClick={() => setDeleteTarget(a)} />
          </Card>
        ))}
      </div>

      {modal && (
        <Modal title="New Automation" onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label="Name">
              <input required className={inputCls} value={modal.form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="e.g. Send Tour Confirmation Email" />
            </Field>
            <Field label="Trigger">
              <input required className={inputCls} value={modal.form.trigger_desc} onChange={(e) => updateField('trigger_desc', e.target.value)} placeholder="What starts this automation?" />
            </Field>
            <Field label="Action">
              <input required className={inputCls} value={modal.form.action_desc} onChange={(e) => updateField('action_desc', e.target.value)} placeholder="What happens automatically?" />
            </Field>
            <label className="flex items-center gap-2 text-sm text-ink">
              <input type="checkbox" checked={modal.form.active} onChange={(e) => updateField('active', e.target.checked)} />
              Active
            </label>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Create Automation'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete automation?"
          message={`Remove "${deleteTarget.name}"? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
