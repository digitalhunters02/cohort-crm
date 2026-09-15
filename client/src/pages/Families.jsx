import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { downloadCSV } from '../format.js';

const EMPTY_FORM = { primary_guardian_name: '', secondary_guardian_name: '', email: '', phone: '', address: '', notes: '' };

export default function Families() {
  const [families, setFamilies] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.families().then(setFamilies);
  }, []);

  if (!families) return <Layout title="Families"><Spinner /></Layout>;

  function openCreate() {
    setFormError(null);
    setModal({ mode: 'create', form: { ...EMPTY_FORM } });
  }

  function openEdit(row) {
    setFormError(null);
    setModal({
      mode: 'edit',
      id: row.id,
      form: {
        primary_guardian_name: row.primary_guardian_name || '', secondary_guardian_name: row.secondary_guardian_name || '',
        email: row.email || '', phone: row.phone || '', address: row.address || '', notes: row.notes || '',
      },
    });
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
      primary_guardian_name: f.primary_guardian_name.trim(),
      secondary_guardian_name: f.secondary_guardian_name.trim() || null,
      email: f.email.trim() || null,
      phone: f.phone.trim() || null,
      address: f.address.trim() || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createFamily(payload);
        setFamilies((prev) => [...prev, created].sort((a, b) => a.primary_guardian_name.localeCompare(b.primary_guardian_name)));
      } else {
        const updated = await api.updateFamily(modal.id, payload);
        setFamilies((prev) => prev.map((f) => (f.id === modal.id ? updated : f)));
      }
      setModal(null);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteFamily(deleteTarget.id);
      setFamilies((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'family', label: 'Guardians', render: (r) => <CellName primary={r.primary_guardian_name} secondary={r.secondary_guardian_name} avatarName={r.primary_guardian_name} avatarColor="#3a6a94" /> },
    { key: 'email', label: 'Email', render: (r) => r.email || '—' },
    { key: 'phone', label: 'Phone', render: (r) => r.phone || '—' },
    { key: 'address', label: 'Address', render: (r) => r.address || '—' },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Families"
      count={families.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-families.csv', families)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate}>
            <Icon name="plus" size={15} /> New Family
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={families} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Family' : 'Edit Family'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Primary Guardian">
                <input required className={inputCls} value={modal.form.primary_guardian_name} onChange={(e) => updateField('primary_guardian_name', e.target.value)} />
              </Field>
              <Field label="Secondary Guardian">
                <input className={inputCls} value={modal.form.secondary_guardian_name} onChange={(e) => updateField('secondary_guardian_name', e.target.value)} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} value={modal.form.email} onChange={(e) => updateField('email', e.target.value)} />
              </Field>
              <Field label="Phone">
                <input className={inputCls} value={modal.form.phone} onChange={(e) => updateField('phone', e.target.value)} />
              </Field>
            </div>
            <Field label="Address">
              <input className={inputCls} value={modal.form.address} onChange={(e) => updateField('address', e.target.value)} />
            </Field>
            <Field label="Notes">
              <textarea rows={3} className={inputCls} value={modal.form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </Field>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Family' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete family?"
          message={`Remove the ${deleteTarget.primary_guardian_name} family record? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
