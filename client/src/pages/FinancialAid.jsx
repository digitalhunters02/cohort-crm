import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import {
  Card, Table, CellName, Badge, Spinner, Button, Modal, Field, inputCls, RowActions, ConfirmDialog,
} from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { money, downloadCSV } from '../format.js';
import { AID_STATUSES, AID_STATUS_TONE, AID_PROGRAMS } from '../constants.js';

const EMPTY_FORM = { family_id: '', program: AID_PROGRAMS[0], amount_awarded: '', status: 'Under Review', academic_year: '2026-2027' };

export default function FinancialAid() {
  const [records, setRecords] = useState(null);
  const [families, setFamilies] = useState([]);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  useEffect(() => {
    api.financialAid().then(setRecords);
    api.families().then(setFamilies);
  }, []);

  if (!records) return <Layout title="Financial Aid"><Spinner /></Layout>;

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
        family_id: row.family_id ?? '', program: row.program || AID_PROGRAMS[0],
        amount_awarded: row.amount_awarded ?? '', status: row.status || 'Under Review', academic_year: row.academic_year || '2026-2027',
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
      program: f.program,
      amount_awarded: f.amount_awarded === '' ? null : Number(f.amount_awarded),
      status: f.status,
      academic_year: f.academic_year.trim(),
    };
    try {
      if (modal.mode === 'create') {
        const created = await api.createFinancialAid(payload);
        setRecords((prev) => [created, ...prev]);
      } else {
        const updated = await api.updateFinancialAid(modal.id, payload);
        setRecords((prev) => prev.map((r) => (r.id === modal.id ? updated : r)));
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
      await api.deleteFinancialAid(deleteTarget.id);
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const cols = [
    { key: 'family', label: 'Family', render: (r) => <CellName primary={r.primary_guardian_name} secondary={r.academic_year} avatarName={r.primary_guardian_name} avatarColor="#71578f" /> },
    { key: 'program', label: 'Program' },
    { key: 'amount_awarded', label: 'Amount Awarded', align: 'right', render: (r) => money(r.amount_awarded) },
    { key: 'status', label: 'Status', render: (r) => <Badge tone={AID_STATUS_TONE[r.status] || 'neutral'}>{r.status}</Badge> },
    { key: 'actions', label: '', align: 'right', render: (r) => <RowActions onEdit={() => openEdit(r)} onDelete={() => setDeleteTarget(r)} /> },
  ];

  return (
    <Layout
      title="Financial Aid"
      count={records.length}
      actions={
        <>
          <Button variant="outline" onClick={() => downloadCSV('cohort-financial-aid.csv', records)}>
            <Icon name="download" size={14} /> Export
          </Button>
          <Button variant="brand" onClick={openCreate} disabled={families.length === 0}>
            <Icon name="plus" size={15} /> New Aid Record
          </Button>
        </>
      }
    >
      <Card>
        <Table cols={cols} rows={records} />
      </Card>

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Financial Aid Record' : 'Edit Financial Aid Record'} onClose={() => setModal(null)} wide>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Family">
                <select required className={inputCls} value={modal.form.family_id} onChange={(e) => updateField('family_id', e.target.value)}>
                  {families.map((f) => <option key={f.id} value={f.id}>{f.primary_guardian_name}</option>)}
                </select>
              </Field>
              <Field label="Program">
                <select className={inputCls} value={modal.form.program} onChange={(e) => updateField('program', e.target.value)}>
                  {AID_PROGRAMS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Amount Awarded ($)">
                <input type="number" min="0" className={inputCls} value={modal.form.amount_awarded} onChange={(e) => updateField('amount_awarded', e.target.value)} />
              </Field>
              <Field label="Academic Year">
                <input required className={inputCls} value={modal.form.academic_year} onChange={(e) => updateField('academic_year', e.target.value)} placeholder="2026-2027" />
              </Field>
              <Field label="Status">
                <select className={inputCls} value={modal.form.status} onChange={(e) => updateField('status', e.target.value)}>
                  {AID_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            {formError && <div className="text-xs text-rose bg-roseTint border border-rose/30 rounded-lg px-3 py-2">{formError}</div>}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" type="button" onClick={() => setModal(null)} disabled={saving}>Cancel</Button>
              <Button variant="brand" type="submit" disabled={saving}>{saving ? 'Saving…' : modal.mode === 'create' ? 'Create Record' : 'Save Changes'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete financial aid record?"
          message={`Remove this ${deleteTarget.program} record for ${deleteTarget.primary_guardian_name}? This can't be undone.`}
          error={deleteError}
          busy={deleting}
          onCancel={() => { setDeleteTarget(null); setDeleteError(null); }}
          onConfirm={handleDelete}
        />
      )}
    </Layout>
  );
}
