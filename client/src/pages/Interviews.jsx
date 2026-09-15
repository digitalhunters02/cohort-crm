import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDateTime, downloadCSV } from '../format.js';
import { INTERVIEW_STATUSES, INTERVIEW_STATUS_TONE } from '../constants.js';

const EMPTY_FORM = { applicant_id: '', interviewer_user_id: '', scheduled_at: '', status: 'Scheduled', notes: '' };

export default function Interviews() {
  const [interviews, setInterviews] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.interviews().then(setInterviews);
    api.applicants().then(setApplicants);
    api.users().then(setUsers);
  }, []);

  if (!interviews) return <Layout title="Interviews"><Spinner /></Layout>;

  function openCreate() {
    setFormError(null);
    setModal({ mode: 'create', form: { ...EMPTY_FORM, applicant_id: applicants[0]?.id ?? '' } });
  }

  function openEdit(row) {
    setFormError(null);
    setModal({
      mode: 'edit',
      id: row.id,
      form: {
        applicant_id: row.applicant_id ?? '', interviewer_user_id: row.interviewer_user_id ?? '',
        scheduled_at: (row.scheduled_at || '').replace(' ', 'T'), status: row.status || 'Scheduled', notes: row.notes || '',
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
      applicant_id: Number(f.applicant_id),
      interviewer_user_id: f.interviewer_user_id === '' ? null : Number(f.interviewer_user_id),
      scheduled_at: f.scheduled_at.replace('T', ' '),
      status: f.status,
      notes: f.notes.trim() || null,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createInterview(payload);
        setInterviews((prev) => [...prev, created].sort((a, b) => a.scheduled_at.localeCompare(b.scheduled_at)));
      } else {
        const updated = await api.updateInterview(modal.id, payload);
        setInterviews((prev) => prev.map((iv) => (iv.id === modal.id ? updated : iv)));
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
      await api.deleteInterview(deleteTarget.id);
      setInterviews((prev) => prev.filter((iv) => iv.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'applicant', label: 'Applicant', render: (r) => <CellName primary={r.applicant_name} secondary={r.grade_applying_for} avatarName={r.applicant_name} avatarColor="#71578f" /> },
    { key: 'interviewer', label: 'Interviewer', render: (r) => r.interviewer_name || 'Unassigned' },
    { key: 'scheduled_at', label: 'Scheduled', render: (r) => shortDateTime(r.scheduled_at) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={INTERVIEW_STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Interviews"
      count={interviews.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-interviews.csv', interviews)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate} disabled={applicants.length === 0}>
            <Icon name="plus" size={15} /> New Interview
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={interviews} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Interview' : 'Edit Interview'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Applicant">
                <select required className={inputCls} value={modal.form.applicant_id} onChange={(e) => updateField('applicant_id', e.target.value)}>
                  {applicants.map((a) => <option key={a.id} value={a.id}>{a.student_name} &middot; {a.grade_applying_for}</option>)}
                </select>
              </Field>
              <Field label="Interviewer">
                <select className={inputCls} value={modal.form.interviewer_user_id} onChange={(e) => updateField('interviewer_user_id', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Scheduled At">
                <input required type="datetime-local" className={inputCls} value={modal.form.scheduled_at} onChange={(e) => updateField('scheduled_at', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={modal.form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {INTERVIEW_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} className={inputCls} value={modal.form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </Field>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Interview' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete interview?"
          message={`Remove the interview with ${deleteTarget.applicant_name}? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
