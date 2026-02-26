import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Avatar, Input, Button, Tooltip, Empty } from 'antd';
import { SearchOutlined, UserOutlined, PlusOutlined } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { getAllIssuesForProject, DEMO_SPRINTS } from '../../utils/mockData';
import type { Issue, Sprint } from '../../types';
import styles from './BacklogPage.module.css';

export default function BacklogPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProjectStore();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    // Mock data kullan
    setTimeout(() => {
      setIssues(getAllIssuesForProject(projectId));
      setSprints(DEMO_SPRINTS[projectId] || []);
      setLoading(false);
    }, 150);
  }, [projectId]);

  if (loading) {
    return <div className={styles.loading}><Spin size="large" /></div>;
  }

  // Sprint'e göre issue gruplama
  const sprintIssues = (sprintId: string | null) => {
    let filtered = issues.filter((i) =>
      sprintId ? i.sprint_id === sprintId : !i.sprint_id
    );
    if (searchText) {
      const s = searchText.toLowerCase();
      filtered = filtered.filter(
        (i) => i.title.toLowerCase().includes(s) || i.issue_key.toLowerCase().includes(s)
      );
    }
    return filtered;
  };

  const priorityIcons: Record<string, { icon: string; color: string }> = {
    highest: { icon: '⬆', color: '#FF5630' },
    high: { icon: '↑', color: '#FF7452' },
    medium: { icon: '=', color: '#FFAB00' },
    low: { icon: '↓', color: '#36B37E' },
    lowest: { icon: '⬇', color: '#0065FF' },
  };

  const renderIssueRow = (issue: Issue) => {
    const pr = priorityIcons[issue.priority] || priorityIcons.medium;
    return (
      <div key={issue.id} className={styles.issueRow}>
        <div className={styles.issueLeft}>
          <span className={styles.issueType}>✅</span>
          <span className={styles.issueKey}>{issue.issue_key}</span>
          <span className={styles.issueTitle}>{issue.title}</span>
        </div>
        <div className={styles.issueRight}>
          {issue.labels?.map((l) => (
            <span key={l.id} className={styles.issueLabel} style={{ background: l.color }}>
              {l.name}
            </span>
          ))}
          <Tooltip title={issue.priority}>
            <span style={{ color: pr.color, fontWeight: 700, fontSize: 14 }}>{pr.icon}</span>
          </Tooltip>
          {issue.assignee ? (
            <Tooltip title={issue.assignee.full_name}>
              <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 11 }}>
                {issue.assignee.full_name?.[0]?.toUpperCase()}
              </Avatar>
            </Tooltip>
          ) : (
            <Avatar size={24} style={{ backgroundColor: '#DFE1E6' }} icon={<UserOutlined />} />
          )}
        </div>
      </div>
    );
  };

  const activeSprints = sprints.filter((s) => s.status === 'active');
  const planningSprints = sprints.filter((s) => s.status === 'planning');
  const allSprints = [...activeSprints, ...planningSprints];

  return (
    <div className={styles.backlogPage}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.breadcrumb}>
          <span>Projects</span>
          <span className={styles.sep}>/</span>
          <span>{currentProject?.name}</span>
        </div>
        <h1 className={styles.title}>Backlog</h1>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Search"
          prefix={<SearchOutlined style={{ color: '#6B778C' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{ width: 180 }}
        />
        <Avatar.Group size={28}>
          <Avatar style={{ backgroundColor: '#DFE1E6' }} icon={<UserOutlined />} size={28} />
        </Avatar.Group>
      </div>

      {/* Sprint Sections */}
      {allSprints.map((sprint) => {
        const sIssues = sprintIssues(sprint.id);
        return (
          <div key={sprint.id} className={styles.sprintSection}>
            <div className={styles.sprintHeader}>
              <div className={styles.sprintHeaderLeft}>
                <span className={styles.sprintToggle}>▼</span>
                <span className={styles.sprintName}>{sprint.name}</span>
                <span className={styles.sprintCount}>{sIssues.length} issues</span>
                {sprint.start_date && sprint.end_date && (
                  <span className={styles.sprintDates}>
                    {sprint.start_date} • {sprint.end_date}
                  </span>
                )}
              </div>
              <div className={styles.sprintHeaderRight}>
                {/* Status dots */}
                <div className={styles.statusDots}>
                  <span className={styles.dotGreen}>{sIssues.filter(() => false).length}</span>
                  <span className={styles.dotBlue}>{sIssues.length}</span>
                  <span className={styles.dotGray}>0</span>
                </div>
                {sprint.status === 'planning' && (
                  <Button size="small" type="default">
                    Start sprint
                  </Button>
                )}
                {sprint.status === 'active' && (
                  <Button size="small" type="default">
                    Complete sprint
                  </Button>
                )}
              </div>
            </div>
            <div className={styles.issueList}>
              {sIssues.length === 0 ? (
                <div className={styles.emptyDrop}>
                  Your backlog is empty.
                </div>
              ) : (
                sIssues.map(renderIssueRow)
              )}
            </div>
            <button className={styles.createIssueBtn}>
              <PlusOutlined /> Create issue
            </button>
          </div>
        );
      })}

      {/* Backlog (unassigned to sprint) */}
      <div className={styles.sprintSection}>
        <div className={styles.sprintHeader}>
          <div className={styles.sprintHeaderLeft}>
            <span className={styles.sprintToggle}>▼</span>
            <span className={styles.sprintName}>Backlog</span>
            <span className={styles.sprintCount}>{sprintIssues(null).length} issues</span>
          </div>
        </div>
        <div className={styles.issueList}>
          {sprintIssues(null).length === 0 ? (
            <div className={styles.emptyDrop}>
              Your backlog is empty.
            </div>
          ) : (
            sprintIssues(null).map(renderIssueRow)
          )}
        </div>
        <button className={styles.createIssueBtn}>
          <PlusOutlined /> Create issue
        </button>
      </div>

      {allSprints.length === 0 && sprintIssues(null).length === 0 && (
        <Empty description="Henüz görev yok" style={{ marginTop: 60 }} />
      )}
    </div>
  );
}
