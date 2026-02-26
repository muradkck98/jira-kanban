import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Tooltip } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { getAllIssuesForProject, DEMO_BOARDS } from '../../utils/mockData';
import type { Issue } from '../../types';
import dayjs from 'dayjs';
import styles from './CalendarPage.module.css';

const issueTypeIcons: Record<string, string> = {
  'Görev': '✅',
  'Hata': '🔴',
  'Hikaye': '📗',
  'Alt Görev': '🔷',
};

const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

export default function CalendarPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [currentDate, setCurrentDate] = useState(dayjs());

  const issues = useMemo(() => projectId ? getAllIssuesForProject(projectId) : [], [projectId]);

  // Create a map of issues by date
  const issuesByDate = useMemo(() => {
    const map: Record<string, Issue[]> = {};
    issues.forEach((issue, idx) => {
      // Distribute issues across the month for demo
      const created = dayjs(issue.created_at);
      const date = created.isAfter(currentDate.startOf('month')) && created.isBefore(currentDate.endOf('month'))
        ? created
        : currentDate.startOf('month').add((idx * 3 + 2) % 28, 'day');
      const key = date.format('YYYY-MM-DD');
      if (!map[key]) map[key] = [];
      map[key].push(issue);
    });
    return map;
  }, [issues, currentDate]);

  // Get column name for status coloring
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

  // Calendar grid calculation
  const monthStart = currentDate.startOf('month');
  const monthEnd = currentDate.endOf('month');
  const startDay = monthStart.day() === 0 ? 6 : monthStart.day() - 1; // Monday-based
  const totalDays = monthEnd.date();
  const today = dayjs();

  // Create grid cells
  const cells: { date: dayjs.Dayjs | null; isCurrentMonth: boolean }[] = [];
  // Previous month fill
  for (let i = startDay - 1; i >= 0; i--) {
    cells.push({ date: monthStart.subtract(i + 1, 'day'), isCurrentMonth: false });
  }
  // Current month
  for (let d = 1; d <= totalDays; d++) {
    cells.push({ date: monthStart.add(d - 1, 'day'), isCurrentMonth: true });
  }
  // Next month fill
  const remaining = 42 - cells.length; // 6 rows * 7 days
  for (let i = 1; i <= remaining; i++) {
    cells.push({ date: monthEnd.add(i, 'day'), isCurrentMonth: false });
  }

  return (
    <div className={styles.page}>
      {/* Calendar Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.navBtn} onClick={() => setCurrentDate((d) => d.subtract(1, 'month'))}>
            <LeftOutlined />
          </button>
          <h2 className={styles.monthTitle}>
            {MONTH_NAMES[currentDate.month()]} {currentDate.year()}
          </h2>
          <button className={styles.navBtn} onClick={() => setCurrentDate((d) => d.add(1, 'month'))}>
            <RightOutlined />
          </button>
          <button className={styles.todayBtn} onClick={() => setCurrentDate(dayjs())}>
            Bugün
          </button>
        </div>
      </div>

      {/* Day Headers */}
      <div className={styles.dayHeaders}>
        {DAY_NAMES.map((d) => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className={styles.grid}>
        {cells.map((cell, idx) => {
          if (!cell.date) return <div key={idx} className={styles.cell} />;
          const dateKey = cell.date.format('YYYY-MM-DD');
          const dayIssues = issuesByDate[dateKey] || [];
          const isToday = cell.date.isSame(today, 'day');

          return (
            <div
              key={idx}
              className={`${styles.cell} ${!cell.isCurrentMonth ? styles.cellOtherMonth : ''} ${isToday ? styles.cellToday : ''}`}
            >
              <div className={`${styles.cellDate} ${isToday ? styles.cellDateToday : ''}`}>
                {cell.date.date()}
              </div>
              <div className={styles.cellIssues}>
                {dayIssues.slice(0, 3).map((issue) => {
                  const colName = getColumnName(issue);
                  const color = statusColors[colName] || '#579DFF';
                  const typeIcon = issue.issue_type ? issueTypeIcons[issue.issue_type.name] || '📋' : '📋';
                  return (
                    <Tooltip key={issue.id} title={`${issue.issue_key}: ${issue.title}`}>
                      <div className={styles.issueChip} style={{ borderLeftColor: color }}>
                        <span className={styles.chipIcon}>{typeIcon}</span>
                        <span className={styles.chipTitle}>{issue.title}</span>
                        {issue.assignee && (
                          <Avatar size={16} style={{ backgroundColor: '#0052CC', fontSize: 8, flexShrink: 0 }}>
                            {(issue.assignee.display_name || issue.assignee.full_name || '?')[0]?.toUpperCase()}
                          </Avatar>
                        )}
                      </div>
                    </Tooltip>
                  );
                })}
                {dayIssues.length > 3 && (
                  <span className={styles.moreCount}>+{dayIssues.length - 3} daha</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
