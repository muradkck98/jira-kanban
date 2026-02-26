import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Spin, Tag, Tooltip, message, Select, Popconfirm } from 'antd';
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { epicAPI } from '../../api/epics';
import { issueAPI } from '../../api/issues';
import type { Epic, EpicIssueRef, Issue } from '../../types';
import IssueDetailDrawer from '../../components/board/IssueDetailDrawer';
import styles from './EpicDetailPage.module.css';

const PRIORITY_COLORS: Record<string, string> = {
  highest: '#FF5630',
  high: '#FF7452',
  medium: '#FFC400',
  low: '#2684FF',
  lowest: '#8993A4',
};

const PRIORITY_LABELS: Record<string, string> = {
  highest: 'En Yüksek',
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
  lowest: 'En Düşük',
};

const STATUS_OPTIONS = [
  { value: 'planning', label: 'Planlama' },
  { value: 'active', label: 'Aktif' },
  { value: 'on_hold', label: 'Beklemede' },
  { value: 'completed', label: 'Tamamlandı' },
];

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  active: { bg: '#1C3329', color: '#36B37E' },
  planning: { bg: '#1D2633', color: '#579DFF' },
  completed: { bg: '#1C3329', color: '#36B37E' },
  on_hold: { bg: '#2E1A00', color: '#FF8B00' },
};

export default function EpicDetailPage() {
  const { projectId, epicId } = useParams<{ projectId: string; epicId: string }>();
  const navigate = useNavigate();

  const [epic, setEpic] = useState<Epic | null>(null);
  const [loading, setLoading] = useState(true);

  // Inline edit state
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);

  // Drawer for child tasks
  const [drawerIssue, setDrawerIssue] = useState<Issue | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const openIssueDrawer = async (issueId: string) => {
    if (!projectId) return;
    try {
      const res = await issueAPI.getById(projectId, issueId);
      const data = (res.data as any).data ?? res.data;
      setDrawerIssue(data);
      setDrawerOpen(true);
    } catch {
      message.error('Görev yüklenemedi');
    }
  };

  const load = useCallback(async () => {
    if (!epicId) return;
    setLoading(true);
    try {
      const res = await epicAPI.getById(epicId);
      const data = (res.data as any).data ?? res.data;
      setEpic(data);
    } catch {
      message.error('Epic yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [epicId]);

  useEffect(() => { load(); }, [load]);

  const issues: EpicIssueRef[] = epic?.issues || [];
  const total = issues.length;
  const doneCount = issues.filter((i) => i.column?.category === 'done').length;
  const totalSP = issues.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
  const doneSP = issues
    .filter((i) => i.column?.category === 'done')
    .reduce((sum, i) => sum + (i.story_points ?? 0), 0);
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const handleStatusChange = async (val: string) => {
    if (!epicId || !epic) return;
    setSavingStatus(true);
    try {
      await epicAPI.update(epicId, { status: val });
      setEpic((prev) => prev ? { ...prev, status: val } : prev);
      message.success('Durum güncellendi');
    } catch {
      message.error('Durum güncellenemedi');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleSaveName = async () => {
    if (!epicId || !nameDraft.trim()) return;
    try {
      await epicAPI.update(epicId, { name: nameDraft.trim() });
      setEpic((prev) => prev ? { ...prev, name: nameDraft.trim() } : prev);
      setEditingName(false);
      message.success('Ad güncellendi');
    } catch {
      message.error('Ad güncellenemedi');
    }
  };

  const handleDelete = async () => {
    if (!epicId) return;
    try {
      await epicAPI.delete(epicId);
      message.success('Epic silindi');
      navigate(`/proje/${projectId}/epicler`);
    } catch {
      message.error('Epic silinemedi');
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <Spin size="large" />
      </div>
    );
  }

  if (!epic) {
    return (
      <div className={styles.loadingPage}>
        <p style={{ color: '#5C6573' }}>Epic bulunamadı.</p>
        <Button onClick={() => navigate(`/proje/${projectId}/epicler`)}>Geri dön</Button>
      </div>
    );
  }

  const statusStyle = STATUS_STYLES[epic.status] || STATUS_STYLES.planning;

  return (
    <div className={styles.page}>
      {/* Back button */}
      <button className={styles.backBtn} onClick={() => navigate(`/proje/${projectId}/epicler`)}>
        <ArrowLeftOutlined /> Epicler
      </button>

      {/* Epic header */}
      <div className={styles.epicHeader} style={{ borderLeft: `4px solid ${epic.color || '#0052CC'}` }}>
        <div className={styles.epicHeaderTop}>
          <div className={styles.colorDot} style={{ background: epic.color || '#0052CC' }} />

          {editingName ? (
            <div className={styles.nameEditRow}>
              <input
                className={styles.nameInput}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                autoFocus
              />
              <Button size="small" type="primary" icon={<SaveOutlined />} onClick={handleSaveName} />
              <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingName(false)} />
            </div>
          ) : (
            <div className={styles.nameRow}>
              <h1 className={styles.epicName}>{epic.name}</h1>
              <Tooltip title="Adı düzenle">
                <Button
                  size="small"
                  icon={<EditOutlined />}
                  className={styles.editNameBtn}
                  onClick={() => { setNameDraft(epic.name); setEditingName(true); }}
                />
              </Tooltip>
            </div>
          )}

          <div className={styles.headerActions}>
            <Select
              value={epic.status || 'planning'}
              onChange={handleStatusChange}
              loading={savingStatus}
              size="small"
              className={styles.statusSelect}
              options={STATUS_OPTIONS}
              style={{
                minWidth: 120,
                '--status-bg': statusStyle.bg,
                '--status-color': statusStyle.color,
              } as React.CSSProperties}
            />
            <Popconfirm
              title="Bu epici silmek istediğinize emin misiniz?"
              description="Bağlı görevlerin epic bağlantısı kaldırılacak."
              onConfirm={handleDelete}
              okText="Sil"
              cancelText="İptal"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger>Sil</Button>
            </Popconfirm>
          </div>
        </div>

        {epic.description && (
          <p className={styles.epicDesc}>{epic.description}</p>
        )}

        {(epic.start_date || epic.target_date) && (
          <div className={styles.epicDates}>
            <CalendarOutlined />
            <span>
              {epic.start_date ? dayjs(epic.start_date).format('DD MMM YYYY') : '—'}
              {' → '}
              {epic.target_date ? dayjs(epic.target_date).format('DD MMM YYYY') : '—'}
            </span>
          </div>
        )}
      </div>

      {/* Progress summary */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Toplam Görev</span>
          <span className={styles.summaryValue}>{total}</span>
        </div>
        <div className={styles.summaryCard}>
          <CheckCircleOutlined style={{ color: '#36B37E' }} />
          <span className={styles.summaryLabel}>Tamamlanan</span>
          <span className={styles.summaryValue} style={{ color: '#36B37E' }}>{doneCount}</span>
        </div>
        {totalSP > 0 && (
          <>
            <div className={styles.summaryCard}>
              <ThunderboltOutlined style={{ color: '#FFC400' }} />
              <span className={styles.summaryLabel}>Toplam SP</span>
              <span className={styles.summaryValue}>{totalSP}</span>
            </div>
            <div className={styles.summaryCard}>
              <ThunderboltOutlined style={{ color: '#36B37E' }} />
              <span className={styles.summaryLabel}>Tamamlanan SP</span>
              <span className={styles.summaryValue} style={{ color: '#36B37E' }}>{doneSP}</span>
            </div>
          </>
        )}
        <div className={`${styles.summaryCard} ${styles.summaryCardWide}`}>
          <span className={styles.summaryLabel}>Tamamlanma Oranı</span>
          <div className={styles.summaryProgressRow}>
            <div className={styles.progressBg}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${pct}%`,
                  background: pct === 100 ? '#36B37E' : epic.color || '#0052CC',
                }}
              />
            </div>
            <span className={styles.progressPct}>{pct}%</span>
          </div>
        </div>
      </div>

      {/* Child tasks table */}
      <div className={styles.tasksSection}>
        <h3 className={styles.tasksSectionTitle}>
          Görevler
          <span className={styles.taskCount}>{total}</span>
        </h3>

        {total === 0 ? (
          <div className={styles.emptyTasks}>
            Bu epice bağlı görev bulunmuyor.
          </div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHeader}>
              <span className={styles.colKey}>Anahtar</span>
              <span className={styles.colTitle}>Başlık</span>
              <span className={styles.colType}>Tür</span>
              <span className={styles.colAssignee}>Atanan</span>
              <span className={styles.colPriority}>Öncelik</span>
              <span className={styles.colStatus}>Durum</span>
              <span className={styles.colSP}>SP</span>
            </div>
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={styles.tableRow}
                onClick={() => openIssueDrawer(issue.id)}
              >
                <span className={styles.colKey}>{issue.issue_key}</span>
                <span className={styles.colTitle}>{issue.title}</span>
                <span className={styles.colType}>
                  {issue.issue_type ? (
                    <Tag
                      style={{
                        background: 'transparent',
                        border: `1px solid ${issue.issue_type.color || '#3B4754'}`,
                        color: issue.issue_type.color || '#B6C2CF',
                        fontSize: 11,
                      }}
                    >
                      {issue.issue_type.icon} {issue.issue_type.name}
                    </Tag>
                  ) : '—'}
                </span>
                <span className={styles.colAssignee}>
                  {issue.assignee
                    ? (issue.assignee.display_name || issue.assignee.id.slice(0, 8))
                    : <span style={{ color: '#5C6573' }}>Atanmamış</span>}
                </span>
                <span className={styles.colPriority}>
                  {issue.priority ? (
                    <span style={{ color: PRIORITY_COLORS[issue.priority] || '#8C9BAB', fontSize: 12 }}>
                      ● {PRIORITY_LABELS[issue.priority] || issue.priority}
                    </span>
                  ) : '—'}
                </span>
                <span className={styles.colStatus}>
                  {issue.column ? (
                    <span
                      className={styles.statusChip}
                      style={{
                        background: issue.column.category === 'done' ? '#1C3329' : issue.column.category === 'in_progress' ? '#1D2B1D' : '#2C333A',
                        color: issue.column.category === 'done' ? '#36B37E' : issue.column.category === 'in_progress' ? '#579DFF' : '#8C9BAB',
                      }}
                    >
                      {issue.column.name}
                    </span>
                  ) : '—'}
                </span>
                <span className={styles.colSP}>
                  {issue.story_points != null ? issue.story_points : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Issue detail drawer (reuse existing) */}
      <IssueDetailDrawer
        open={drawerOpen}
        issue={drawerIssue}
        projectId={projectId || ''}
        onClose={() => { setDrawerOpen(false); setDrawerIssue(null); load(); }}
        onDeleted={() => { setDrawerOpen(false); setDrawerIssue(null); load(); }}
      />
    </div>
  );
}
