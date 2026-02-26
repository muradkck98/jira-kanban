import { useMemo, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Spin } from 'antd';
import { getAllIssuesForProject, DEMO_USERS, DEMO_BOARDS } from '../../utils/mockData';
import { epicAPI } from '../../api/epics';
import type { Epic } from '../../types';
import styles from './SummaryPage.module.css';

export default function SummaryPage() {
  const { projectId } = useParams<{ projectId: string }>();

  const issues = useMemo(() => projectId ? getAllIssuesForProject(projectId) : [], [projectId]);

  // Real epics from API
  const [epics, setEpics] = useState<Epic[]>([]);
  const [epicsLoading, setEpicsLoading] = useState(false);
  useEffect(() => {
    if (!projectId) return;
    setEpicsLoading(true);
    epicAPI.list(projectId)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setEpics(Array.isArray(data) ? data : []);
      })
      .catch(() => setEpics([]))
      .finally(() => setEpicsLoading(false));
  }, [projectId]);
  // Column-based counts
  const columnCounts = useMemo(() => {
    const counts: Record<string, number> = { 'To Do': 0, 'In Progress': 0, 'In Review': 0, 'Done': 0 };
    if (!projectId) return counts;
    const boards = DEMO_BOARDS[projectId] || [];
    for (const board of boards) {
      for (const col of board.columns || []) {
        counts[col.name] = (col.issues || []).length;
      }
    }
    return counts;
  }, [projectId]);

  // Priority breakdown
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = { highest: 0, high: 0, medium: 0, low: 0, lowest: 0 };
    issues.forEach((i) => { counts[i.priority] = (counts[i.priority] || 0) + 1; });
    return counts;
  }, [issues]);

  // Issue type breakdown
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((i) => {
      const typeName = i.issue_type?.name || 'Other';
      counts[typeName] = (counts[typeName] || 0) + 1;
    });
    return counts;
  }, [issues]);

  // Assignee workload
  const assigneeCounts = useMemo(() => {
    const counts: Record<string, { name: string; count: number }> = {};
    issues.forEach((i) => {
      const name = i.assignee?.full_name || 'Unassigned';
      const id = i.assignee_id || 'unassigned';
      if (!counts[id]) counts[id] = { name, count: 0 };
      counts[id].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [issues]);

  // Activity feed (mock)
  const activities = useMemo(() => {
    return issues.slice(0, 5).map((issue, idx) => ({
      id: idx,
      user: DEMO_USERS[idx % DEMO_USERS.length],
      action: idx % 3 === 0 ? 'updated status' : idx % 3 === 1 ? 'created' : 'commented on',
      issueKey: issue.issue_key,
      issueTitle: issue.title,
      status: idx % 2 === 0 ? 'YAPILACAKLAR' : 'IN PROGRESS',
      time: 'a few minutes ago',
    }));
  }, [issues]);

  const totalIssues = issues.length;
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  // Donut chart calculations
  const donutData = Object.entries(columnCounts).filter(([, v]) => v > 0);
  const donutColors: Record<string, string> = {
    'TO DO': '#36B37E',
    'IN PROGRESS': '#0052CC',
    'IN REVIEW': '#FF8B00',
    'DONE': '#6554C0',
  };
  let donutOffset = 0;
  const donutRadius = 60;
  const donutCircumference = 2 * Math.PI * donutRadius;

  const priorityColors: Record<string, string> = {
    highest: '#FF5630',
    high: '#FF7452',
    medium: '#FFAB00',
    low: '#36B37E',
    lowest: '#0065FF',
  };

  const typeIcons: Record<string, string> = {
    'Görev': '✅',
    'Hata': '🔴',
    'Hikaye': '📗',
    'Alt Görev': '🔷',
    'Feature': '📋',
  };

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        {/* Status Overview — Donut Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Durum genel bakışı</h3>
            <span className={styles.cardSubtitle}>Biletlerinizin durumunu anlık olarak görün. <a href="#" className={styles.link}>Tüm biletleri görüntüleyin</a></span>
          </div>
          <div className={styles.donutContainer}>
            <svg viewBox="0 0 160 160" className={styles.donutSvg}>
              {donutData.map(([name, value]) => {
                const pct = totalIssues > 0 ? value / totalIssues : 0;
                const dashLength = pct * donutCircumference;
                const currentOffset = donutOffset;
                donutOffset += dashLength;
                return (
                  <circle
                    key={name}
                    cx="80" cy="80" r={donutRadius}
                    fill="none"
                    stroke={donutColors[name] || '#DFE1E6'}
                    strokeWidth="20"
                    strokeDasharray={`${dashLength} ${donutCircumference - dashLength}`}
                    strokeDashoffset={-currentOffset}
                    transform="rotate(-90 80 80)"
                  />
                );
              })}
              <text x="80" y="74" textAnchor="middle" fontSize="28" fontWeight="700" fill="#172B4D">{totalIssues}</text>
              <text x="80" y="94" textAnchor="middle" fontSize="11" fill="#6B778C">Toplam bilet</text>
            </svg>
            <div className={styles.donutLegend}>
              {donutData.map(([name, value]) => (
                <div key={name} className={styles.legendItem}>
                  <span className={styles.legendDot} style={{ background: donutColors[name] || '#DFE1E6' }} />
                  <span className={styles.legendLabel}>{name}: {value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>En son etkinlikleriniz</h3>
            <span className={styles.cardSubtitle}>Alan genelinde neler olduğundan haberdar olun.</span>
          </div>
          <div className={styles.activityList}>
            {activities.map((a) => (
              <div key={a.id} className={styles.activityItem}>
                <Avatar size={28} style={{ backgroundColor: '#0052CC', fontSize: 11, flexShrink: 0 }}>
                  {(a.user.display_name || a.user.full_name || '?')[0]?.toUpperCase()}
                </Avatar>
                <div className={styles.activityContent}>
                  <span className={styles.activityText}>
                    <strong>{a.user.display_name}</strong>,{' '}
                    <span className={styles.activityIssueKey}>{a.issueKey}</span>{' '}
                    {a.action === 'created' && <><span className={styles.activityBadge}>{a.status}</span> oluşturdu</>}
                    {a.action === 'updated status' && <>konusundaki "status" alanını güncellendi</>}
                    {a.action === 'commented on' && <>konusuna yorum ekledi</>}
                  </span>
                  <span className={styles.activityTime}>{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Öncelik dökümü</h3>
            <span className={styles.cardSubtitle}>Biletlerin nasıl önceliklendirildiğini bütünsel olarak görün.</span>
          </div>
          <div className={styles.barChart}>
            {['highest', 'high', 'medium', 'low', 'lowest'].map((p) => (
              <div key={p} className={styles.barRow}>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{
                      width: `${(priorityCounts[p] / maxPriority) * 100}%`,
                      background: priorityColors[p],
                    }}
                  />
                </div>
              </div>
            ))}
            <div className={styles.barLabels}>
              {['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Yok'].map((l) => (
                <span key={l} className={styles.barLabel}>{l}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Issue Types */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>İş türleri</h3>
            <span className={styles.cardSubtitle}>Türlerine göre biletlerin dökümünü alın. <a href="#" className={styles.link}>Tüm biletleri görüntüleyin</a></span>
          </div>
          <table className={styles.typeTable}>
            <thead>
              <tr>
                <th>Tür</th>
                <th>Dağılım</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(typeCounts).map(([name, count]) => {
                const pct = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0;
                return (
                  <tr key={name}>
                    <td>
                      <span className={styles.typeCell}>
                        <span className={styles.typeIcon}>{typeIcons[name] || '📋'}</span>
                        {name}
                      </span>
                    </td>
                    <td>
                      <div className={styles.typePctRow}>
                        <span className={styles.typePct}>{pct}%</span>
                        <div className={styles.typePctBar}>
                          <div className={styles.typePctFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Team Workload */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Takım iş yükü</h3>
            <span className={styles.cardSubtitle}>Takımınızın kapasitesini takip edin.</span>
          </div>
          <table className={styles.workloadTable}>
            <thead>
              <tr>
                <th>Atanan Kişi</th>
                <th>İş dağılımı</th>
              </tr>
            </thead>
            <tbody>
              {assigneeCounts.map((a) => {
                const pct = totalIssues > 0 ? Math.round((a.count / totalIssues) * 100) : 0;
                return (
                  <tr key={a.name}>
                    <td>
                      <div className={styles.assigneeCell}>
                        <Avatar size={24} style={{ backgroundColor: a.name === 'Unassigned' ? '#DFE1E6' : '#0052CC', fontSize: 11 }}>
                          {a.name[0]}
                        </Avatar>
                        <span>{a.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.typePctRow}>
                        <span className={styles.typePct}>{pct}%</span>
                        <div className={styles.typePctBar}>
                          <div className={styles.typePctFill} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Epic Progress — real data */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Epic ilerlemesi</h3>
            <span className={styles.cardSubtitle}>Epiclerinizin tamamlanma durumunu izleyin.</span>
          </div>
          {epicsLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><Spin /></div>
          ) : epics.length === 0 ? (
            <div className={styles.epicEmpty}>
              <div className={styles.epicIcons}>
                <div className={styles.epicBlock} style={{ background: '#172B4D' }} />
                <div className={styles.epicBlock} style={{ background: '#0052CC' }} />
              </div>
              <span style={{ color: '#5C6573', fontSize: 12 }}>Henüz epic yok. Epicler sayfasından oluşturabilirsiniz.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
              {epics.slice(0, 6).map((epic) => {
                const epicIssues = epic.issues || [];
                const total = epicIssues.length;
                const done = epicIssues.filter((i) => i.column?.category === 'done').length;
                const totalSP = epicIssues.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
                const doneSP = epicIssues.filter((i) => i.column?.category === 'done').reduce((sum, i) => sum + (i.story_points ?? 0), 0);
                const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                return (
                  <div key={epic.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: epic.color || '#0052CC', flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#B6C2CF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{epic.name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        {totalSP > 0 && (
                          <span style={{ fontSize: 10, color: '#FFC400' }}>⚡{doneSP}/{totalSP} SP</span>
                        )}
                        <span style={{ fontSize: 11, color: '#8C9BAB' }}>{done}/{total}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? '#36B37E' : '#B6C2CF', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#2C333A', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: pct === 100 ? '#36B37E' : epic.color || '#0052CC',
                        borderRadius: 3,
                        transition: 'width 0.3s ease',
                        minWidth: 0,
                      }} />
                    </div>
                  </div>
                );
              })}
              {epics.length > 6 && (
                <span style={{ fontSize: 11, color: '#5C6573', textAlign: 'center' }}>+{epics.length - 6} epic daha</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
