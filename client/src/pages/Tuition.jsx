import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { money, shortDate, downloadCSV } from '../format.js';
import { TUITION_STATUSES, TUITION_STATUS_TONE } from '../constants.js';

const EMPTY_FORM = { family_id: '', term: '2026-2027 Fall', amount_due: '', amount_paid: '', due_date: '', status: 'Pending' };

export default function Tuition() {
  const [invoices, setInvoices] = useState(null);
  const [families, setFamilies] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.invoices().then(setInvoices);
    api.families().then(setFamilies);
  }, []);

  if (!invoices) return <Layout title="Tuition & Billing"><Spinner /></Layout>;

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
        family_id: row.family_id ?? '', term: row.term || '', amount_due: row.amount_due ?? '',
        amount_paid: row.amount_paid ?? '', due_date: row.due_date || '', status: row.status || 'Pending',
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
      family_id: Number(f.family_id),
      term: f.term.trim(),
      amount_due: Number(f.amount_due),
      amount_paid: f.amount_paid === '' ? 0 : Number(f.amount_paid),
      due_date: f.due_date,
      status: f.status,
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createInvoice(payload);
        setInvoices((prev) => [...prev, created].sort((a, b) => a.due_date.localeCompare(b.due_date)));
      } else {
        const updated = await api.updateInvoice(modal.id, payload);
        setInvoices((prev) => prev.map((i) => (i.id === modal.id ? updated : i)));
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
      await api.deleteInvoice(deleteTarget.id);
      setInvoices((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'family', label: 'Family', render: (r) => <CellName primary={r.primary_guardian_name} secondary={r.term} avatarName={r.primary_guardian_name} avatarColor="#a8791f" /> },
    { key: 'amount_due', label: 'Due', align: 'right', render: (r) => money(r.amount_due) },
    { key: 'amount_paid', label: 'Paid', align: 'right', render: (r) => money(r.amount_paid) },
    { key: 'balance', label: 'Balance', align: 'right', render: (r) => money(r.amount_due - r.amount_paid) },
    { key: 'due_date', label: 'Due Date', render: (r) => shortDate(r.due_date) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={TUITION_STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Tuition & Billing"
      count={invoices.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-tuition-invoices.csv', invoices)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate} disabled={families.length === 0}>
            <Icon name="plus" size={15} /> New Invoice
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={invoices} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Tuition Invoice' : 'Edit Invoice'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Family">
                <select required className={inputCls} value={modal.form.family_id} onChange={(e) => updateField('family_id', e.target.value)}>
                  {families.map((f) => <option key={f.id} value={f.id}>{f.primary_guardian_name}</option>)}
                </select>
              </Field>
              <Field label="Term">
                <input required className={inputCls} value={modal.form.term} onChange={(e) => updateField('term', e.target.value)} placeholder="2026-2027 Fall" />
              </Field>
              <Field label="Amount Due ($)">
                <input required type="number" min="0" className={inputCls} value={modal.form.amount_due} onChange={(e) => updateField('amount_due', e.target.value)} />
              </Field>
              <Field label="Amount Paid ($)">
                <input type="number" min="0" className={inputCls} value={modal.form.amount_paid} onChange={(e) => updateField('amount_paid', e.target.value)} />
              </Field>
              <Field label="Due Date">
                <input required type="date" className={inputCls} value={modal.form.due_date} onChange={(e) => updateField('due_date', e.target.value)} />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={modal.form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {TUITION_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Invoice' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete invoice?"
          message={`Remove this ${deleteTarget.term} invoice for ${deleteTarget.primary_guardian_name}? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
