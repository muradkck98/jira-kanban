import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Tooltip, Input, Button } from 'antd';
import { UserOutlined, SearchOutlined, SettingOutlined, MoreOutlined } from '@ant-design/icons';
import { getAllIssuesForProject, DEMO_BOARDS } from '../../utils/mockData';
import type { Issue } from '../../types';
import dayjs from 'dayjs';
import styles from './TimelinePage.module.css';

const issueTypeIcons: Record<string, string> = {
  'Görev': '✅',
  'Hata': '🔴',
  'Hikaye': '📗',
  'Alt Görev': '🔷',
};

export default function TimelinePage() {
  const { projectId } = useParams<{ projectId: string }>();

  const issues = useMemo(() => projectId ? getAllIssuesForProject(projectId) : [], [projectId]);

  // Month-based timeline (6 months)
  const today = dayjs();
  const startMonth = today.subtract(1, 'month').startOf('month');
  const months: { label: string; days: number; month: dayjs.Dayjs }[] = [];
  for (let m = 0; m < 6; m++) {
    const month = startMonth.add(m, 'month');
    months.push({
      label: month.format('MMMM'),
      days: month.daysInMonth(),
      month,
    });
  }
  const totalDays = months.reduce((sum, m) => sum + m.days, 0);
  const dayWidth = 6; // narrower for month view

  // Calculate pixel offset for a date
  const getPixelOffset = (date: dayjs.Dayjs): number => {
    let offset = 0;
    for (const m of months) {
      if (date.isBefore(m.month)) break;
      if (date.isBefore(m.month.add(1, 'month'))) {
        offset += date.diff(m.month, 'day') * dayWidth;
        break;
      }
      offset += m.days * dayWidth;
    }
    return offset;
  };

  const todayOffset = getPixelOffset(today);

  // Assign each issue a timeline position
  const issueTimeline = useMemo(() => {
    return issues.map((issue, idx) => {
      const created = dayjs(issue.created_at);
      const start = created.isAfter(startMonth) ? created : startMonth.add((idx * 3) % 28, 'day');
      const duration = (issue.story_points || 3) * 3;
      const end = start.add(duration, 'day');
      return { issue, start, end };
    });
  }, [issues, startMonth]);

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

  const statusColors: Record<string, string> = {
    'TO DO': '#4BCE97',
    'IN PROGRESS': '#579DFF',
    'IN REVIEW': '#F5CD47',
    'DONE': '#9F8FEF',
  };

  return (
    <div className={styles.page}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Zaman çizelgesini ..."
            prefix={<SearchOutlined style={{ color: '#8C9BAB' }} />}
            size="small"
            className={styles.searchInput}
            style={{ width: 180 }}
          />
          <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 10 }}>A</Avatar>
          <Button size="small" className={styles.filterBtn}>Durum kategorisi <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M8.292 10.293a1.009 1.009 0 000 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 000-1.419.987.987 0 00-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 00-1.406 0z"/></svg></Button>
        </div>
        <div className={styles.toolbarRight}>
          <button className={styles.iconBtn}><SettingOutlined /></button>
          <button className={styles.iconBtn}><MoreOutlined /></button>
        </div>
      </div>

      <div className={styles.timelineContainer}>
        {/* Left panel: issue list */}
        <div className={styles.issuePanel}>
          <div className={styles.issuePanelHeader}>
            <span>Bilet</span>
          </div>
          {issueTimeline.map(({ issue }) => {
            const typeIcon = issue.issue_type ? issueTypeIcons[issue.issue_type.name] || '📋' : '📋';
            return (
              <div key={issue.id} className={styles.issueRow}>
                <span className={styles.typeIcon}>{typeIcon}</span>
                <span className={styles.issueTitle}>{issue.title}</span>
                {issue.assignee ? (
                  <Tooltip title={issue.assignee.display_name || issue.assignee.full_name}>
                    <Avatar size={20} style={{ backgroundColor: '#0052CC', fontSize: 9, flexShrink: 0 }}>
                      {(issue.assignee.display_name || issue.assignee.full_name || '?')[0]?.toUpperCase()}
                    </Avatar>
                  </Tooltip>
                ) : (
                  <Avatar size={20} style={{ backgroundColor: '#2C333A', flexShrink: 0 }} icon={<UserOutlined style={{ fontSize: 10 }} />} />
                )}
              </div>
            );
          })}

          {/* Add issue row */}
          <div className={styles.addIssueRow}>
            <span className={styles.addIcon}>⚡</span>
            <span className={styles.addText}>Ne yapılmalı?</span>
            <Avatar size={20} style={{ backgroundColor: '#2C333A', flexShrink: 0 }} icon={<UserOutlined style={{ fontSize: 10 }} />} />
          </div>
        </div>

        {/* Right panel: Gantt */}
        <div className={styles.ganttPanel}>
          {/* Month headers */}
          <div className={styles.ganttHeader}>
            {months.map((m, mi) => (
              <div key={mi} className={styles.monthHeader} style={{ width: m.days * dayWidth }}>
                {m.label}
              </div>
            ))}
          </div>

          {/* Body */}
          <div className={styles.ganttBody} style={{ width: totalDays * dayWidth }}>
            {/* Today line */}
            <div className={styles.todayLine} style={{ left: todayOffset }} />

            {/* Month grid lines */}
            {(() => {
              let offset = 0;
              return months.map((m, mi) => {
                const x = offset;
                offset += m.days * dayWidth;
                return <div key={mi} className={styles.monthGrid} style={{ left: x, width: m.days * dayWidth }} />;
              });
            })()}

            {/* Bars */}
            {issueTimeline.map(({ issue, start, end }) => {
              const left = getPixelOffset(start);
              const width = Math.max(getPixelOffset(end) - left, dayWidth * 2);
              const colName = getColumnName(issue);
              const color = statusColors[colName] || '#579DFF';
              return (
                <div key={issue.id} className={styles.barRow}>
                  <Tooltip title={`${issue.issue_key}: ${issue.title}`}>
                    <div
                      className={styles.ganttBar}
                      style={{ left, width, background: color }}
                    >
                      <span className={styles.barLabel}>{issue.title}</span>
                    </div>
                  </Tooltip>
                </div>
              );
            })}

            {/* Empty add row */}
            <div className={styles.barRow} />
          </div>
        </div>
      </div>

      {/* Bottom controls */}
      <div className={styles.bottomBar}>
        <div className={styles.viewControls}>
          <button className={styles.viewBtn}>Bugün</button>
          <button className={styles.viewBtn}>Hafta</button>
          <button className={`${styles.viewBtn} ${styles.viewBtnActive}`}>Ay</button>
          <button className={styles.viewBtn}>Üç Ay</button>
        </div>
      </div>
    </div>
  );
}
