import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, CardHead, Kpi, Spinner, Button } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import HBars from '../components/charts/HBars.jsx';
import ColBars from '../components/charts/ColBars.jsx';
import { money, downloadCSV } from '../format.js';
import { STAGE_COLORS, STAGES } from '../constants.js';

const SOURCE_COLORS = { Website: '#3a6a94', Referral: '#7a2331', 'School Fair': '#a8791f', 'Open House': '#3f7a3a', Other: '#71578f' };
const TUITION_STATUS_COLORS = { Paid: '#3f7a3a', Partial: '#b8862e', Overdue: '#c0475a', Pending: '#8b8478' };
const AID_STATUS_COLORS = { 'Under Review': '#b8862e', Awarded: '#3f7a3a', Denied: '#c0475a' };

export default function Reports() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.reports().then(setData);
  }, []);

  if (!data) return <Layout title="Reports"><Spinner /></Layout>;

  const funnelItems = STAGES.map((s) => {
    const row = data.funnelByStage.find((r) => r.stage === s) || { count: 0 };
    return { label: s, value: row.count, display: String(row.count), color: STAGE_COLORS[s] };
  });

  const tuitionByStatusItems = data.tuitionByStatus.map((t) => ({
    label: t.status, value: t.count, display: `${t.count} inv.`, color: TUITION_STATUS_COLORS[t.status] || '#a9998c',
  }));

  const inquiriesBySourceItems = data.inquiriesBySource.map((s) => ({
    label: s.source, value: s.count, color: SOURCE_COLORS[s.source] || '#a9998c',
  }));

  const aidByStatusItems = data.aidByStatus.map((a) => ({
    label: a.status, value: a.count, display: money(a.total_awarded, true), color: AID_STATUS_COLORS[a.status] || '#a9998c',
  }));

  const studentsByGradeItems = data.studentsByGrade.map((g) => ({
    label: g.grade, value: g.count, color: '#7a2331',
  }));

  const conversionRate = data.enrollmentConversion.inquiries > 0
    ? Math.round((data.enrollmentConversion.enrolled / data.enrollmentConversion.inquiries) * 100)
    : 0;
  const outstanding = data.tuitionSummary.total_due - data.tuitionSummary.total_paid;

  const exports = [
    { key: 'funnel', label: 'Funnel by Stage', rows: data.funnelByStage },
    { key: 'tuition-by-status', label: 'Tuition by Status', rows: data.tuitionByStatus },
    { key: 'inquiries-by-source', label: 'Inquiries by Source', rows: data.inquiriesBySource },
    { key: 'aid-by-status', label: 'Financial Aid by Status', rows: data.aidByStatus },
  ];

  return (
    <Layout title="Reports">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        <Kpi label="Inquiry → Enrollment" value={`${conversionRate}%`} sub={`${data.enrollmentConversion.enrolled} enrolled of ${data.enrollmentConversion.inquiries} inquiries`} tone="brand" icon="trendingUp" />
        <Kpi label="Tuition Collected" value={money(data.tuitionSummary.total_paid, true)} sub={`of ${money(data.tuitionSummary.total_due, true)} billed`} tone="green" icon="dollar" />
        <Kpi label="Tuition Outstanding" value={money(outstanding, true)} tone="rose" icon="clock" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <Card>
          <CardHead title="Admissions Funnel by Stage" />
          <div className="p-5">
            <ColBars items={funnelItems} height={200} />
          </div>
        </Card>
        <Card>
          <CardHead title="Enrollment by Grade" />
          <div className="p-5">
            <HBars items={studentsByGradeItems} />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <Card>
          <CardHead title="Tuition Collected vs. Outstanding" />
          <div className="p-5">
            <HBars items={tuitionByStatusItems} />
          </div>
        </Card>
        <Card>
          <CardHead title="Inquiries by Source" />
          <div className="p-5">
            <HBars items={inquiriesBySourceItems} />
          </div>
        </Card>
        <Card>
          <CardHead title="Financial Aid by Status" />
          <div className="p-5">
            <HBars items={aidByStatusItems} />
          </div>
        </Card>
      </div>

      <Card>
        <CardHead title="Export Report Data" sub="Download the underlying summary tables as CSV" />
        <div className="p-5 flex flex-wrap gap-2">
          {exports.map((exp) => (
            <Button key={exp.key} variant="outline" size="sm" onClick={() => downloadCSV(`cohort-report-${exp.key}.csv`, exp.rows)}>
              <Icon name="download" size={13} /> {exp.label}
            </Button>
          ))}
        </div>
      </Card>
    </Layout>
  );
}
