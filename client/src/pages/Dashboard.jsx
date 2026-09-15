import { useEffect, useState } from 'react';
import api from '../api.js';
import Layout from '../components/Layout.jsx';
import { Card, CardHead, Kpi, Spinner, Badge } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import ColBars from '../components/charts/ColBars.jsx';
import { money, shortDate, shortDateTime } from '../format.js';
import { STAGE_COLORS, STAGES, STAGE_TONE, ACTIVITY_ICON, TOUR_TYPE_TONE } from '../constants.js';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.dashboard().then(setData);
  }, []);

  if (!data) return <Layout title="Dashboard"><Spinner /></Layout>;

  const pipelineItems = STAGES.map((s) => {
    const row = data.pipelineByStage.find((r) => r.stage === s) || { count: 0 };
    return { label: s, value: row.count, display: String(row.count), color: STAGE_COLORS[s] };
  });

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <Kpi label="Open Inquiries" value={data.openInquiries.count} sub="Not yet converted or closed" tone="blue" icon="mail" />
        <Kpi label="Applicants in Pipeline" value={data.inPipeline.count} sub="Active admissions funnel" tone="brand" icon="kanban" />
        <Kpi label="Tours This Week" value={data.toursThisWeek.count} sub="Scheduled visits & events" tone="teal" icon="calendar" />
        <Kpi label="Enrolled Students" value={data.enrolledStudents.count} sub="Currently active" tone="green" icon="graduationCap" />
        <Kpi label="Overdue Tuition" value={money(data.overdueTuition.total, true)} sub={`${data.overdueTuition.count} invoice(s)`} tone="rose" icon="dollar" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHead title="Admissions Funnel" sub="Applicants by stage, all time" />
          <div className="p-5">
            <ColBars items={pipelineItems} height={220} />
          </div>
        </Card>

        <Card>
          <CardHead title="Upcoming Interviews" sub="Next scheduled admissions interviews" />
          <div className="divide-y divide-lineSoft">
            {data.upcomingInterviews.map((iv) => (
              <div key={iv.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink truncate">{iv.applicant_name}</span>
                  <span className="text-xs text-muted flex-shrink-0">{shortDateTime(iv.scheduled_at)}</span>
                </div>
                <div className="text-xs text-muted mt-0.5">
                  {iv.grade_applying_for} &middot; {iv.interviewer_name || 'Unassigned'}
                </div>
              </div>
            ))}
            {data.upcomingInterviews.length === 0 && (
              <div className="px-5 py-6 text-sm text-muted text-center">No interviews scheduled.</div>
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-5">
        <Card className="lg:col-span-2">
          <CardHead title="Recent Activity" sub="Latest logged calls, emails, and notes" />
          <div className="divide-y divide-lineSoft">
            {data.recentActivity.map((a) => (
              <div key={a.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-wash flex items-center justify-center text-muted flex-shrink-0">
                  <Icon name={ACTIVITY_ICON[a.type] || 'clipboardList'} size={15} />
                </span>
                <div className="min-w-0 flex-grow">
                  <div className="text-sm font-medium text-ink truncate">{a.subject}</div>
                  <div className="text-xs text-muted truncate">{a.owner_name || 'Unassigned'} &middot; {a.related_type || 'general'}</div>
                </div>
                <div className="text-xs text-muted flex-shrink-0">{shortDate(a.occurred_at)}</div>
              </div>
            ))}
            {data.recentActivity.length === 0 && (
              <div className="px-5 py-6 text-sm text-muted text-center">No activity logged yet.</div>
            )}
          </div>
        </Card>

        <Card>
          <CardHead title="Upcoming Tours & Events" />
          <div className="divide-y divide-lineSoft">
            {data.upcomingTours.map((t) => (
              <div key={t.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-ink truncate">{t.title}</span>
                  <Badge tone={TOUR_TYPE_TONE[t.type] || 'neutral'}>{t.type}</Badge>
                </div>
                <div className="text-xs text-muted">{shortDate(t.date)} &middot; {t.attendees_count}/{t.capacity ?? '—'} registered</div>
              </div>
            ))}
            {data.upcomingTours.length === 0 && (
              <div className="px-5 py-6 text-sm text-muted text-center">No upcoming tours.</div>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
}
