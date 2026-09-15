import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Avatar, Spinner, Dot, Button, Modal, Field, inputCls, IconButton, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDate } from '../format.js';
import { STAGE_COLORS, STAGES, GRADES } from '../constants.js';

const EMPTY_FORM = {
  inquiry_id: '', student_name: '', grade_applying_for: GRADES[1], parent_name: '', parent_email: '',
  parent_phone: '', stage: 'Inquiry', owner_user_id: '', application_date: '', decision_date: '', notes: '',
};

export default function Pipeline() {
  const [applicants, setApplicants] = useState(null);
  const [users, setUsers] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.applicants().then(setApplicants);
    api.users().then(setUsers);
    api.inquiries().then(setInquiries);
  }, []);

  function handleStageChange(applicant, stage) {
    setApplicants((prev) => prev.map((a) => (a.id === applicant.id ? { ...a, stage } : a)));
    api.setApplicantStage(applicant.id, stage).catch(() => {
      setApplicants((prev) => prev.map((a) => (a.id === applicant.id ? { ...a, stage: applicant.stage } : a)));
    });
  }

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
        inquiry_id: row.inquiry_id ?? '', student_name: row.student_name || '', grade_applying_for: row.grade_applying_for || GRADES[1],
        parent_name: row.parent_name || '', parent_email: row.parent_email || '', parent_phone: row.parent_phone || '',
        stage: row.stage || 'Inquiry', owner_user_id: row.owner_user_id ?? '',
        application_date: row.application_date || '', decision_date: row.decision_date || '', notes: row.notes || '',
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
      inquiry_id: f.inquiry_id === '' ? null : Number(f.inquiry_id),
      student_name: f.student_name.trim(),
      grade_applying_for: f.grade_applying_for,
      parent_name: f.parent_name.trim(),
      parent_email: f.parent_email.trim() || null,
      parent_phone: f.parent_phone.trim() || null,
      stage: f.stage,
      owner_user_id: f.owner_user_id === '' ? null : Number(f.owner_user_id),
      application_date: f.application_date || null,
      decision_date: f.decision_date || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createApplicant(payload);
        setApplicants((prev) => [created, ...prev]);
      } else {
        const updated = await api.updateApplicant(modal.id, payload);
        setApplicants((prev) => prev.map((a) => (a.id === modal.id ? updated : a)));
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
      await api.deleteApplicant(deleteTarget.id);
      setApplicants((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  if (!applicants) return <Layout title="Pipeline"><Spinner /></Layout>;

  return (
    <Layout
      title="Pipeline"
      count={applicants.length}
      flush
      actions={
        <Button variant="brand" onClick={openCreate}>
          <Icon name="plus" size={15} /> New Applicant
        </Button>
      }
    >
      <div className="h-full flex gap-4 px-6 py-5 overflow-x-auto">
        {STAGES.map((stage) => {
          const stageApplicants = applicants.filter((a) => a.stage === stage);
          return (
            <div key={stage} className="flex flex-col h-full min-h-0 w-72 flex-shrink-0">
              <div className="flex items-center gap-2 px-1 pb-3 flex-shrink-0">
                <Dot color={STAGE_COLORS[stage]} size={9} />
                <span className="text-sm font-semibold text-ink">{stage}</span>
                <span className="text-xs text-muted bg-wash border border-line rounded-full px-2 py-0.5 ml-auto">
                  {stageApplicants.length}
                </span>
              </div>
              <div className="flex-grow min-h-0 overflow-y-auto flex flex-col gap-2.5 pr-1 pb-4">
                {stageApplicants.map((a) => (
                  <Card key={a.id} className="p-3.5">
                    <div className="flex items-start gap-2.5 mb-2.5">
                      <Avatar name={a.owner_name || a.student_name} color={a.owner_color || '#79695f'} size={26} />
                      <div className="min-w-0 flex-grow">
                        <div className="text-sm font-medium text-ink truncate">{a.student_name}</div>
                        <div className="text-xs text-muted truncate">{a.grade_applying_for} &middot; {a.parent_name}</div>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <IconButton icon="edit" title="Edit" onClick={() => openEdit(a)} />
                        <IconButton icon="trash" title="Delete" tone="danger" onClick={() => setDeleteTarget(a)} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted mb-2.5">
                      <span>{a.application_date ? `Applied ${shortDate(a.application_date)}` : 'No application on file'}</span>
                    </div>
                    <select
                      value={a.stage}
                      onChange={(e) => handleStageChange(a, e.target.value)}
                      className="w-full text-xs border border-line rounded-md px-2 py-1.5 bg-wash text-ink font-medium"
                    >
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Card>
                ))}
                {stageApplicants.length === 0 && (
                  <div className="text-xs text-muted text-center py-8 border border-dashed border-line rounded-lg">
                    No applicants
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Applicant' : 'Edit Applicant'} onClose={() => setModal(null)} wide>
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
              <Field label="Stage">
                <select className={inputCls} value={modal.form.stage} onChange={(e) => updateField('stage', e.target.value)}>
                  {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Owner">
                <select className={inputCls} value={modal.form.owner_user_id} onChange={(e) => updateField('owner_user_id', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
              <Field label="Linked Inquiry">
                <select className={inputCls} value={modal.form.inquiry_id} onChange={(e) => updateField('inquiry_id', e.target.value)}>
                  <option value="">None</option>
                  {inquiries.map((i) => <option key={i.id} value={i.id}>{i.student_name}</option>)}
                </select>
              </Field>
              <Field label="Application Date">
                <input type="date" className={inputCls} value={modal.form.application_date} onChange={(e) => updateField('application_date', e.target.value)} />
              </Field>
              <Field label="Decision Date">
                <input type="date" className={inputCls} value={modal.form.decision_date} onChange={(e) => updateField('decision_date', e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} className={inputCls} value={modal.form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </Field>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Applicant' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete applicant?"
          message={`Remove ${deleteTarget.student_name} from the pipeline? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
