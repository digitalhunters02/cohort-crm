import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls,
  RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDate, downloadCSV } from '../format.js';
import { INQUIRY_STATUS_TONE, INQUIRY_STATUSES, INQUIRY_SOURCES, GRADES } from '../constants.js';

const EMPTY_FORM = {
  student_name: '', grade_applying_for: GRADES[1], parent_name: '', parent_email: '', parent_phone: '',
  source: INQUIRY_SOURCES[0], status: 'New', owner_user_id: '', notes: '',
};

export default function Inquiries() {
  const [inquiries, setInquiries] = useState(null);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.inquiries().then(setInquiries);
    api.users().then(setUsers);
  }, []);

  if (!inquiries) return <Layout title="Inquiries"><Spinner /></Layout>;

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
        student_name: row.student_name || '', grade_applying_for: row.grade_applying_for || GRADES[1],
        parent_name: row.parent_name || '', parent_email: row.parent_email || '', parent_phone: row.parent_phone || '',
        source: row.source || INQUIRY_SOURCES[0], status: row.status || 'New',
        owner_user_id: row.owner_user_id ?? '', notes: row.notes || '',
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
      student_name: f.student_name.trim(),
      grade_applying_for: f.grade_applying_for,
      parent_name: f.parent_name.trim(),
      parent_email: f.parent_email.trim() || null,
      parent_phone: f.parent_phone.trim() || null,
      source: f.source,
      status: f.status,
      owner_user_id: f.owner_user_id === '' ? null : Number(f.owner_user_id),
      notes: f.notes.trim() || null,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createInquiry(payload);
        setInquiries((prev) => [created, ...prev]);
      } else {
        const updated = await api.updateInquiry(modal.id, payload);
        setInquiries((prev) => prev.map((i) => (i.id === modal.id ? updated : i)));
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
      await api.deleteInquiry(deleteTarget.id);
      setInquiries((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'student', label: 'Prospective Student', render: (r) => <CellName primary={r.student_name} secondary={r.grade_applying_for} avatarName={r.student_name} avatarColor="#79695f" /> },
    { key: 'parent', label: 'Parent / Guardian', render: (r) => <div><div className="text-ink">{r.parent_name}</div><div className="text-xs text-muted">{r.parent_email}</div></div> },
    { key: 'source', label: 'Source' },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={INQUIRY_STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'owner_name', label: 'Owner', render: (r) => r.owner_name || '—' },
    { key: 'created_at', label: 'Received', render: (r) => shortDate(r.created_at) },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Inquiries"
      count={inquiries.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-inquiries.csv', inquiries)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate}>
            <Icon name="plus" size={15} /> New Inquiry
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={inquiries} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Inquiry' : 'Edit Inquiry'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Student Name">
                <input required className={inputCls} value={modal.form.student_name} onChange={(e) => updateField('student_name', e.target.value)} />
              </Field>
              <Field label="Grade Applying For">
                <select className={inputCls} value={modal.form.grade_applying_for} onChange={(e) => updateField('grade_applying_for', e.target.value)}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Parent / Guardian Name">
                <input required className={inputCls} value={modal.form.parent_name} onChange={(e) => updateField('parent_name', e.target.value)} />
              </Field>
              <Field label="Parent Email">
                <input type="email" className={inputCls} value={modal.form.parent_email} onChange={(e) => updateField('parent_email', e.target.value)} />
              </Field>
              <Field label="Parent Phone">
                <input className={inputCls} value={modal.form.parent_phone} onChange={(e) => updateField('parent_phone', e.target.value)} />
              </Field>
              <Field label="Source">
                <select className={inputCls} value={modal.form.source} onChange={(e) => updateField('source', e.target.value)}>
                  {INQUIRY_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select className={inputCls} value={modal.form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {INQUIRY_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Owner">
                <select className={inputCls} value={modal.form.owner_user_id} onChange={(e) => updateField('owner_user_id', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} className={inputCls} value={modal.form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </Field>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Inquiry' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete inquiry?"
          message={`Remove ${deleteTarget.student_name}'s inquiry? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
