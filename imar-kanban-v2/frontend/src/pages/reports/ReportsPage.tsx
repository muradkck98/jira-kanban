import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getAllIssuesForProject, DEMO_BOARDS } from '../../utils/mockData';
import type { Issue } from '../../types';
import dayjs from 'dayjs';
import styles from './ReportsPage.module.css';

type ReportType = 'cycle-time' | 'lead-time' | 'cfd' | 'control-chart' | 'velocity' | 'burndown';

const reportTabs: { key: ReportType; label: string }[] = [
  { key: 'cycle-time', label: 'Döngü Süresi' },
  { key: 'lead-time', label: 'Teslim Süresi' },
  { key: 'cfd', label: 'Kümülatif Akış' },
  { key: 'control-chart', label: 'Kontrol Şeması' },
  { key: 'velocity', label: 'Hız' },
  { key: 'burndown', label: 'Burndown' },
];

export default function ReportsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeReport, setActiveReport] = useState<ReportType>('cycle-time');

  const issues = useMemo(() => projectId ? getAllIssuesForProject(projectId) : [], [projectId]);

  // Generate mock metrics data
  const getColumnName = (issue: Issue): string => {
    if (!projectId) return '-';
    const boards = DEMO_BOARDS[projectId] || [];
    for (const board of boards) {
      for (const col of board.columns || []) {
        if (col.id === issue.column_id) return col.name;
      }
    }
    return '-';
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    issues.forEach((issue) => {
      const col = getColumnName(issue);
      counts[col] = (counts[col] || 0) + 1;
    });
    return counts;
  }, [issues]);

  const totalPoints = useMemo(() => issues.reduce((s, i) => s + (i.story_points || 0), 0), [issues]);

  // Mock cycle time data (days)
  const cycleTimeData = useMemo(() => {
    return issues.map((issue) => ({
      issue,
      cycleTime: Math.round((2 + Math.random() * 8 + (issue.story_points || 2)) * 10) / 10,
      leadTime: Math.round((4 + Math.random() * 12 + (issue.story_points || 2)) * 10) / 10,
    }));
  }, [issues]);

  const avgCycleTime = useMemo(() => {
    if (cycleTimeData.length === 0) return 0;
    return Math.round(cycleTimeData.reduce((s, d) => s + d.cycleTime, 0) / cycleTimeData.length * 10) / 10;
  }, [cycleTimeData]);

  const avgLeadTime = useMemo(() => {
    if (cycleTimeData.length === 0) return 0;
    return Math.round(cycleTimeData.reduce((s, d) => s + d.leadTime, 0) / cycleTimeData.length * 10) / 10;
  }, [cycleTimeData]);

  // CFD data - last 14 days
  const cfdData = useMemo(() => {
    const days: { date: string; todo: number; inProgress: number; inReview: number; done: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day');
      const base = issues.length;
      const done = Math.min(base, Math.round((14 - i) * 0.5 + Math.random() * 2));
      const inReview = Math.min(base - done, Math.round(1 + Math.random() * 2));
      const inProgress = Math.min(base - done - inReview, Math.round(2 + Math.random() * 2));
      const todo = Math.max(0, base - done - inReview - inProgress);
      days.push({ date: date.format('MM/DD'), todo, inProgress, inReview, done });
    }
    return days;
  }, [issues]);

  // Velocity data (sprints)
  const velocityData = [
    { sprint: 'Sprint 1', planned: 21, completed: 18 },
    { sprint: 'Sprint 2', planned: 24, completed: 22 },
    { sprint: 'Sprint 3', planned: 26, completed: totalPoints },
  ];

  // Burndown data
  const burndownData = useMemo(() => {
    const total = totalPoints || 30;
    const days: { day: string; ideal: number; actual: number }[] = [];
    for (let i = 0; i <= 10; i++) {
      const ideal = Math.round(total - (total / 10) * i);
      const actual = i <= 7 ? Math.round(total - (total / 10) * i + (Math.random() * 4 - 1)) : Math.round(total - (total / 10) * i - Math.random() * 3);
      days.push({ day: `Gün ${i}`, ideal: Math.max(0, ideal), actual: Math.max(0, actual) });
    }
    return days;
  }, [totalPoints]);

  // Chart rendering helpers
  const maxCycleTime = Math.max(...cycleTimeData.map((d) => d.cycleTime), 1);
  const maxLeadTime = Math.max(...cycleTimeData.map((d) => d.leadTime), 1);
  const maxCfd = Math.max(...cfdData.map((d) => d.todo + d.inProgress + d.inReview + d.done), 1);
  const maxVelocity = Math.max(...velocityData.flatMap((d) => [d.planned, d.completed]), 1);
  const maxBurndown = Math.max(...burndownData.flatMap((d) => [d.ideal, d.actual]), 1);

  const renderCycleTimeChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Döngü Süresi (Cycle Time)</h3>
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{avgCycleTime}</span>
            <span className={styles.kpiLabel}>Ort. gün</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{Math.min(...cycleTimeData.map(d => d.cycleTime)).toFixed(1)}</span>
            <span className={styles.kpiLabel}>Min gün</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{Math.max(...cycleTimeData.map(d => d.cycleTime)).toFixed(1)}</span>
            <span className={styles.kpiLabel}>Maks gün</span>
          </div>
        </div>
      </div>
      <div className={styles.barChart}>
        {cycleTimeData.map((d, idx) => (
          <div key={idx} className={styles.barItem} title={`${d.issue.issue_key}: ${d.cycleTime} gün`}>
            <div className={styles.barLabel}>{d.issue.issue_key}</div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${(d.cycleTime / maxCycleTime) * 100}%`,
                  background: d.cycleTime > avgCycleTime * 1.5 ? '#E5493A' : d.cycleTime > avgCycleTime ? '#F5CD47' : '#4BCE97',
                }}
              />
            </div>
            <div className={styles.barValue}>{d.cycleTime}g</div>
          </div>
        ))}
        {/* Average line */}
        <div className={styles.avgLine} style={{ left: `${(avgCycleTime / maxCycleTime) * 100}%` }}>
          <span className={styles.avgLineLabel}>Ort: {avgCycleTime}g</span>
        </div>
      </div>
    </div>
  );

  const renderLeadTimeChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Teslim Süresi (Lead Time)</h3>
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{avgLeadTime}</span>
            <span className={styles.kpiLabel}>Ort. gün</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{issues.length}</span>
            <span className={styles.kpiLabel}>Toplam iş</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue}>{totalPoints}</span>
            <span className={styles.kpiLabel}>Toplam puan</span>
          </div>
        </div>
      </div>
      <div className={styles.barChart}>
        {cycleTimeData.map((d, idx) => (
          <div key={idx} className={styles.barItem} title={`${d.issue.issue_key}: ${d.leadTime} gün`}>
            <div className={styles.barLabel}>{d.issue.issue_key}</div>
            <div className={styles.barTrack}>
              <div
                className={styles.barFill}
                style={{
                  width: `${(d.leadTime / maxLeadTime) * 100}%`,
                  background: d.leadTime > avgLeadTime * 1.5 ? '#E5493A' : d.leadTime > avgLeadTime ? '#F5CD47' : '#579DFF',
                }}
              />
            </div>
            <div className={styles.barValue}>{d.leadTime}g</div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderCFDChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Kümülatif Akış Diyagramı (CFD)</h3>
        <div className={styles.legendRow}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#4BCE97' }} /> Tamamlandı</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#F5CD47' }} /> İncelemede</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#579DFF' }} /> Devam Ediyor</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#8C9BAB' }} /> Yapılacak</span>
        </div>
      </div>
      <div className={styles.stackedChart}>
        <div className={styles.yAxis}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.yLabel}>{Math.round((maxCfd / 4) * (4 - i))}</span>
          ))}
        </div>
        <div className={styles.chartArea}>
          {cfdData.map((d, idx) => {
            const total = d.todo + d.inProgress + d.inReview + d.done;
            return (
              <div key={idx} className={styles.stackedBar}>
                <div className={styles.stackedBarInner} style={{ height: `${(total / maxCfd) * 100}%` }}>
                  <div style={{ height: `${(d.done / total) * 100}%`, background: '#4BCE97' }} />
                  <div style={{ height: `${(d.inReview / total) * 100}%`, background: '#F5CD47' }} />
                  <div style={{ height: `${(d.inProgress / total) * 100}%`, background: '#579DFF' }} />
                  <div style={{ height: `${(d.todo / total) * 100}%`, background: '#8C9BAB' }} />
                </div>
                <span className={styles.xLabel}>{d.date}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderControlChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Kontrol Şeması (Control Chart)</h3>
        <div className={styles.kpiRow}>
          <div className={styles.kpi}>
            <span className={styles.kpiValue} style={{ color: '#4BCE97' }}>{avgCycleTime}</span>
            <span className={styles.kpiLabel}>Ortalama</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue} style={{ color: '#F5CD47' }}>{(avgCycleTime * 1.5).toFixed(1)}</span>
            <span className={styles.kpiLabel}>Üst Limit</span>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiValue} style={{ color: '#579DFF' }}>{Math.max(0, avgCycleTime * 0.5).toFixed(1)}</span>
            <span className={styles.kpiLabel}>Alt Limit</span>
          </div>
        </div>
      </div>
      <div className={styles.scatterChart}>
        <div className={styles.yAxis}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.yLabel}>{Math.round((maxCycleTime / 4) * (4 - i))}g</span>
          ))}
        </div>
        <div className={styles.scatterArea}>
          {/* Control lines */}
          <div className={styles.controlLine} style={{ bottom: `${(avgCycleTime / maxCycleTime) * 100}%`, borderColor: '#4BCE97' }}>
            <span className={styles.controlLineLabel} style={{ color: '#4BCE97' }}>Ort</span>
          </div>
          <div className={styles.controlLine} style={{ bottom: `${(avgCycleTime * 1.5 / maxCycleTime) * 100}%`, borderColor: '#F5CD47' }}>
            <span className={styles.controlLineLabel} style={{ color: '#F5CD47' }}>ÜKL</span>
          </div>
          <div className={styles.controlLine} style={{ bottom: `${(avgCycleTime * 0.5 / maxCycleTime) * 100}%`, borderColor: '#579DFF' }}>
            <span className={styles.controlLineLabel} style={{ color: '#579DFF' }}>AKL</span>
          </div>
          {/* Scatter dots */}
          {cycleTimeData.map((d, idx) => {
            const isOutlier = d.cycleTime > avgCycleTime * 1.5 || d.cycleTime < avgCycleTime * 0.5;
            return (
              <div
                key={idx}
                className={`${styles.scatterDot} ${isOutlier ? styles.scatterDotOutlier : ''}`}
                style={{
                  left: `${(idx / (cycleTimeData.length - 1 || 1)) * 95}%`,
                  bottom: `${(d.cycleTime / maxCycleTime) * 100}%`,
                }}
                title={`${d.issue.issue_key}: ${d.cycleTime} gün`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderVelocityChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Hız (Velocity)</h3>
        <div className={styles.legendRow}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#579DFF' }} /> Planlanan</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#4BCE97' }} /> Tamamlanan</span>
        </div>
      </div>
      <div className={styles.groupedBarChart}>
        {velocityData.map((d, idx) => (
          <div key={idx} className={styles.groupedBarItem}>
            <div className={styles.groupedBars}>
              <div
                className={styles.groupedBar}
                style={{ height: `${(d.planned / maxVelocity) * 200}px`, background: '#579DFF' }}
                title={`Planlanan: ${d.planned}`}
              >
                <span className={styles.groupedBarValue}>{d.planned}</span>
              </div>
              <div
                className={styles.groupedBar}
                style={{ height: `${(d.completed / maxVelocity) * 200}px`, background: '#4BCE97' }}
                title={`Tamamlanan: ${d.completed}`}
              >
                <span className={styles.groupedBarValue}>{d.completed}</span>
              </div>
            </div>
            <span className={styles.groupedBarLabel}>{d.sprint}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBurndownChart = () => (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h3 className={styles.chartTitle}>Burndown Chart</h3>
        <div className={styles.legendRow}>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#8C9BAB' }} /> İdeal</span>
          <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#579DFF' }} /> Gerçek</span>
        </div>
      </div>
      <div className={styles.lineChart}>
        <div className={styles.yAxis}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} className={styles.yLabel}>{Math.round((maxBurndown / 4) * (4 - i))}</span>
          ))}
        </div>
        <div className={styles.lineChartArea}>
          {/* SVG lines */}
          <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
            {/* Ideal line */}
            <polyline
              fill="none"
              stroke="#8C9BAB"
              strokeWidth="2"
              strokeDasharray="6,3"
              points={burndownData.map((d, i) => `${(i / (burndownData.length - 1)) * 400},${200 - (d.ideal / maxBurndown) * 200}`).join(' ')}
            />
            {/* Actual line */}
            <polyline
              fill="none"
              stroke="#579DFF"
              strokeWidth="2.5"
              points={burndownData.map((d, i) => `${(i / (burndownData.length - 1)) * 400},${200 - (d.actual / maxBurndown) * 200}`).join(' ')}
            />
            {/* Dots on actual */}
            {burndownData.map((d, i) => (
              <circle
                key={i}
                cx={(i / (burndownData.length - 1)) * 400}
                cy={200 - (d.actual / maxBurndown) * 200}
                r="4"
                fill="#579DFF"
              />
            ))}
          </svg>
          {/* X labels */}
          <div className={styles.xLabels}>
            {burndownData.map((d, i) => (
              <span key={i} className={styles.xLabel}>{d.day}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Summary KPI cards
  const renderSummary = () => (
    <div className={styles.summaryCards}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{issues.length}</div>
        <div className={styles.summaryLabel}>Toplam İş Öğesi</div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{totalPoints}</div>
        <div className={styles.summaryLabel}>Toplam Puan</div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{avgCycleTime}g</div>
        <div className={styles.summaryLabel}>Ort. Döngü Süresi</div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{avgLeadTime}g</div>
        <div className={styles.summaryLabel}>Ort. Teslim Süresi</div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{statusCounts['DONE'] || 0}</div>
        <div className={styles.summaryLabel}>Tamamlanan</div>
      </div>
      <div className={styles.summaryCard}>
        <div className={styles.summaryValue}>{statusCounts['IN PROGRESS'] || 0}</div>
        <div className={styles.summaryLabel}>Devam Eden</div>
      </div>
    </div>
  );

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Raporlar</h1>
      </div>

      {/* Report Tabs */}
      <div className={styles.tabs}>
        {reportTabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeReport === tab.key ? styles.tabActive : ''}`}
            onClick={() => setActiveReport(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary KPIs */}
      {renderSummary()}

      {/* Chart Content */}
      <div className={styles.content}>
        {activeReport === 'cycle-time' && renderCycleTimeChart()}
        {activeReport === 'lead-time' && renderLeadTimeChart()}
        {activeReport === 'cfd' && renderCFDChart()}
        {activeReport === 'control-chart' && renderControlChart()}
        {activeReport === 'velocity' && renderVelocityChart()}
        {activeReport === 'burndown' && renderBurndownChart()}
      </div>
    </div>
  );
}
