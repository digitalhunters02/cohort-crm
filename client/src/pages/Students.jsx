import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDate, downloadCSV } from '../format.js';
import { STUDENT_STATUSES, STUDENT_STATUS_TONE, GRADES } from '../constants.js';

const EMPTY_FORM = { name: '', grade: GRADES[1], homeroom: '', family_id: '', enrollment_date: '', status: 'Active' };

export default function Students() {
  const [students, setStudents] = useState(null);
  const [families, setFamilies] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.students().then(setStudents);
    api.families().then(setFamilies);
  }, []);

  if (!students) return <Layout title="Students"><Spinner /></Layout>;

  function openCreate() {
    setFormError(null);
    setModal({ mode: 'create', form: { ...EMPTY_FORM, family_id: families[0]?.id ?? '' } });
  }

  function openEdit(row) {
    setFormError(null);
    setModal({
      mode: 'edit',
      id: row.id,
      form: {
        name: row.name || '', grade: row.grade || GRADES[1], homeroom: row.homeroom || '',
        family_id: row.family_id ?? '', enrollment_date: row.enrollment_date || '', status: row.status || 'Active',
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
      name: f.name.trim(),
      grade: f.grade,
      homeroom: f.homeroom.trim() || null,
      family_id: Number(f.family_id),
      enrollment_date: f.enrollment_date || null,
      status: f.status,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createStudent(payload);
        setStudents((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        const updated = await api.updateStudent(modal.id, payload);
        setStudents((prev) => prev.map((s) => (s.id === modal.id ? updated : s)));
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
      await api.deleteStudent(deleteTarget.id);
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'name', label: 'Student', render: (r) => <CellName primary={r.name} secondary={r.grade} avatarName={r.name} avatarColor="#3f7a3a" /> },
    { key: 'homeroom', label: 'Homeroom', render: (r) => r.homeroom || '—' },
    { key: 'family', label: 'Family', render: (r) => r.primary_guardian_name || '—' },
    { key: 'enrollment_date', label: 'Enrolled', render: (r) => shortDate(r.enrollment_date) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={STUDENT_STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Students"
      count={students.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-students.csv', students)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate} disabled={families.length === 0}>
            <Icon name="plus" size={15} /> New Student
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={students} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Student' : 'Edit Student'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Student Name">
                <input required className={inputCls} value={modal.form.name} onChange={(e) => updateField('name', e.target.value)} />
              </Field>
              <Field label="Grade">
                <select className={inputCls} value={modal.form.grade} onChange={(e) => updateField('grade', e.target.value)}>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="Homeroom">
                <input className={inputCls} value={modal.form.homeroom} onChange={(e) => updateField('homeroom', e.target.value)} />
              </Field>
              <Field label="Family">
                <select required className={inputCls} value={modal.form.family_id} onChange={(e) => updateField('family_id', e.target.value)}>
                  {families.map((f) => <option key={f.id} value={f.id}>{f.primary_guardian_name}</option>)}
                </select>
              </Field>
              <Field label="Enrollment Date">
                <input type="date" className={inputCls} value={modal.form.enrollment_date} onChange={(e) => updateField('enrollment_date', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={modal.form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Student' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete student?"
          message={`Remove ${deleteTarget.name} from the student roster? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
