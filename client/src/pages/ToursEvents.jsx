import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, Badge, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { shortDate, downloadCSV } from '../format.js';
import { TOUR_TYPES, TOUR_TYPE_TONE } from '../constants.js';

const EMPTY_FORM = { type: TOUR_TYPES[0], title: '', date: '', capacity: '', attendees_count: '', location: '', notes: '' };

export default function ToursEvents() {
  const [tours, setTours] = useState(null);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.tours().then(setTours);
  }, []);

  if (!tours) return <Layout title="Tours & Events"><Spinner /></Layout>;

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
        type: row.type || TOUR_TYPES[0], title: row.title || '', date: row.date || '',
        capacity: row.capacity ?? '', attendees_count: row.attendees_count ?? '', location: row.location || '', notes: row.notes || '',
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
      type: f.type,
      title: f.title.trim(),
      date: f.date,
      capacity: f.capacity === '' ? null : Number(f.capacity),
      attendees_count: f.attendees_count === '' ? 0 : Number(f.attendees_count),
      location: f.location.trim() || null,
      notes: f.notes.trim() || null,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createTour(payload);
        setTours((prev) => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)));
      } else {
        const updated = await api.updateTour(modal.id, payload);
        setTours((prev) => prev.map((t) => (t.id === modal.id ? updated : t)));
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
      await api.deleteTour(deleteTarget.id);
      setTours((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'title', label: 'Event', render: (r) => <div><div className="text-sm font-medium text-ink">{r.title}</div><div className="text-xs text-muted">{r.location || 'Location TBD'}</div></div> },
    { key: 'type', label: 'Type', render: (r) => <Badge tone={TOUR_TYPE_TONE[r.type] || 'neutral'}>{r.type}</Badge> },
    { key: 'date', label: 'Date', render: (r) => shortDate(r.date) },
    { key: 'attendance', label: 'Registered', render: (r) => `${r.attendees_count} / ${r.capacity ?? '—'}` },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Tours & Events"
      count={tours.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-tours-events.csv', tours)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate}>
            <Icon name="plus" size={15} /> New Event
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={tours} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Tour / Event' : 'Edit Tour / Event'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Title">
                <input required className={inputCls} value={modal.form.title} onChange={(e) => updateField('title', e.target.value)} />
              </Field>
              <Field label="Type">
                <select className={inputCls} value={modal.form.type} onChange={(e) => updateField('type', e.target.value)}>
                  {TOUR_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Date">
                <input required type="date" className={inputCls} value={modal.form.date} onChange={(e) => updateField('date', e.target.value)} />
              </Field>
              <Field label="Location">
                <input className={inputCls} value={modal.form.location} onChange={(e) => updateField('location', e.target.value)} />
              </Field>
              <Field label="Capacity">
                <input type="number" min="0" className={inputCls} value={modal.form.capacity} onChange={(e) => updateField('capacity', e.target.value)} />
              </Field>
              <Field label="Attendees Registered">
                <input type="number" min="0" className={inputCls} value={modal.form.attendees_count} onChange={(e) => updateField('attendees_count', e.target.value)} />
              </Field>
            </div>
            <Field label="Notes">
              <textarea rows={3} className={inputCls} value={modal.form.notes} onChange={(e) => updateField('notes', e.target.value)} />
            </Field>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Event' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete event?"
          message={`Remove "${deleteTarget.title}"? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
