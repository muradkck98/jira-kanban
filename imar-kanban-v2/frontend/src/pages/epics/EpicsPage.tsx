import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Modal, Form, Input, DatePicker, Select, Popconfirm,
  message, Spin, Empty, Tooltip, Tag,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, RightOutlined, CalendarOutlined,
  ReloadOutlined, TagOutlined, EditOutlined, DownOutlined, RightOutlined as RightChevron,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { epicAPI } from '../../api/epics';
import { issueAPI } from '../../api/issues';
import { labelAPI } from '../../api/labels';
import client from '../../api/client';
import { useBoardStore } from '../../stores/boardStore';
import CreateIssueModal from '../../components/board/CreateIssueModal';
import type { APIResponse, Epic, Issue, Label, Column } from '../../types';
import styles from './EpicsPage.module.css';

const EPIC_COLORS = ['#0052CC', '#6554C0', '#00875A', '#FF5630', '#FF8B00', '#36B37E', '#00B8D9', '#974F0C'];
const LABEL_COLORS = ['#0052CC', '#6554C0', '#36B37E', '#FF5630', '#FF8B00', '#00B8D9', '#97A0AF', '#974F0C'];

const STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  planning: 'Planlama',
  completed: 'Tamamlandı',
  on_hold: 'Beklemede',
};

// Kept for backward compatibility (not used in render path anymore)
// Epic progress is now computed from allIssues for accurate task-level tracking

const isStoryType = (issue: Issue) => {
  const name = (issue.issue_type?.name || '').toLowerCase();
  return name.includes('story') || name.includes('hikaye') || name.includes('hikâye');
};

export default function EpicsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentBoard, lastIssueUpdate } = useBoardStore();

  // ─── Data state ──────────────────────────────────────────────────
  const [epics, setEpics] = useState<Epic[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [columns, setColumns] = useState<Column[]>(currentBoard?.columns || []);
  const [loading, setLoading] = useState(false);
  const [issuesLoading, setIssuesLoading] = useState(false);

  // ─── Epic create ─────────────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form] = Form.useForm();
  const [selectedColor, setSelectedColor] = useState(EPIC_COLORS[0]);

  // ─── Story create ─────────────────────────────────────────────────
  const [storyCreateOpen, setStoryCreateOpen] = useState(false);

  // ─── Story expand ─────────────────────────────────────────────────
  const [expandedStoryIds, setExpandedStoryIds] = useState<Set<string>>(new Set());

  // ─── Labels ────────────────────────────────────────────────────────
  const [labelsList, setLabelsList] = useState<Label[]>([]);
  const [labelManagerOpen, setLabelManagerOpen] = useState(false);
  const [labelForm] = Form.useForm();
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editLabelName, setEditLabelName] = useState('');
  const [editLabelColor, setEditLabelColor] = useState(LABEL_COLORS[0]);
  const [newLabelColor, setNewLabelColor] = useState(LABEL_COLORS[0]);

  // ─── Data loaders ─────────────────────────────────────────────────
  const loadEpics = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await epicAPI.list(projectId);
      const data = (res.data as any).data ?? res.data;
      setEpics(Array.isArray(data) ? data : []);
    } catch {
      message.error('Epicler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadAllIssues = useCallback(async () => {
    if (!projectId) return;
    setIssuesLoading(true);
    try {
      const res = await issueAPI.list(projectId, { includeSubtasks: 'true' });
      const raw = (res.data as any).data ?? res.data;
      setAllIssues(Array.isArray(raw) ? raw : []);
    } catch {
      // silently fail
    } finally {
      setIssuesLoading(false);
    }
  }, [projectId]);

  const loadLabels = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await labelAPI.list(projectId);
      const data = (res.data as any).data ?? res.data;
      setLabelsList(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    }
  }, [projectId]);

  // ─── Initial load + reactive reload on any issue mutation ──────────
  useEffect(() => {
    loadEpics();
    loadAllIssues();
    loadLabels();
  }, [lastIssueUpdate, loadEpics, loadAllIssues, loadLabels]);

  // Auto-refresh when window regains focus (e.g. coming back from board)
  useEffect(() => {
    const refresh = () => { loadEpics(); loadAllIssues(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') refresh(); };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadEpics, loadAllIssues]);

  // 30 saniyede bir yenile — başka kullanıcıların değişikliklerini yakala
  useEffect(() => {
    const interval = setInterval(() => {
      loadEpics();
      loadAllIssues();
    }, 30_000);
    return () => clearInterval(interval);
  }, [loadEpics, loadAllIssues]);

  // Load columns for CreateIssueModal
  useEffect(() => {
    if (!projectId) return;
    if (currentBoard?.columns?.length) {
      setColumns(currentBoard.columns);
      return;
    }
    client.get<APIResponse<{ id: string }[]>>(`/projects/${projectId}/boards`)
      .then(async (res) => {
        const boards = (res.data as any).data ?? res.data;
        const first = Array.isArray(boards) && boards[0];
        if (first?.id) {
          const bRes = await client.get<APIResponse<{ columns: Column[] }>>(`/boards/${first.id}`);
          const bData = (bRes.data as any).data ?? bRes.data;
          if (bData?.columns) setColumns(bData.columns);
        }
      })
      .catch(() => {});
  }, [projectId, currentBoard]);

  // ─── Derived ────────────────────────────────────────────────────────
  const stories = allIssues.filter(isStoryType);

  const storyTaskProgress = (storyId: string) => {
    const tasks = allIssues.filter((i) => i.parent_id === storyId);
    const done = tasks.filter((i) => (i as any).column?.category === 'done').length;
    const totalSP = tasks.reduce((s, i) => s + (i.story_points ?? 0), 0);
    const doneSP = tasks.filter((i) => (i as any).column?.category === 'done').reduce((s, i) => s + (i.story_points ?? 0), 0);
    return { tasks, done, total: tasks.length, totalSP, doneSP };
  };

  /**
   * Compute epic completion % by traversing the full task hierarchy using allIssues.
   * Epic → Stories (via epic_id) → Tasks (via parent_id).
   * Uses tasks if they exist; falls back to stories for epics with no task children.
   */
  const epicProgressFromAllIssues = (epicId: string) => {
    const stories = allIssues.filter((i) => i.epic_id === epicId);
    const storyIds = new Set(stories.map((s) => s.id));
    const tasks = allIssues.filter((i) => i.parent_id && storyIds.has(i.parent_id));
    const items = tasks.length > 0 ? tasks : stories;
    const total = items.length;
    const isDone = (i: Issue) => (i as any).column?.category === 'done';
    const done = items.filter(isDone).length;
    const totalSP = items.reduce((s, i) => s + (i.story_points ?? 0), 0);
    const doneSP = items.filter(isDone).reduce((s, i) => s + (i.story_points ?? 0), 0);
    return { total, done, totalSP, doneSP, hasTaskLevel: tasks.length > 0 };
  };

  const toggleStory = (id: string) => {
    setExpandedStoryIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ─── Epic create handlers ──────────────────────────────────────────
  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (!projectId) return;
      setCreating(true);
      await epicAPI.create(projectId, {
        name: values.name,
        description: values.description,
        color: selectedColor,
        start_date: values.start_date ? values.start_date.toISOString() : undefined,
        target_date: values.target_date ? values.target_date.toISOString() : undefined,
      });
      message.success('Epic oluşturuldu');
      setCreateOpen(false);
      form.resetFields();
      setSelectedColor(EPIC_COLORS[0]);
      loadEpics();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Epic oluşturulamadı');
    } finally {
      setCreating(false);
    }
  };

  // ─── Label handlers ────────────────────────────────────────────────
  const handleCreateLabel = async () => {
    try {
      const values = await labelForm.validateFields();
      if (!projectId) return;
      await labelAPI.create(projectId, { name: values.name, color: newLabelColor });
      message.success('Etiket oluşturuldu');
      labelForm.resetFields();
      setNewLabelColor(LABEL_COLORS[0]);
      loadLabels();
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error('Etiket oluşturulamadı');
    }
  };

  const handleUpdateLabel = async (id: string) => {
    try {
      await labelAPI.update(id, { name: editLabelName, color: editLabelColor });
      message.success('Etiket güncellendi');
      setEditingLabelId(null);
      loadLabels();
    } catch {
      message.error('Etiket güncellenemedi');
    }
  };

  const handleDeleteLabel = async (id: string) => {
    try {
      await labelAPI.delete(id);
      message.success('Etiket silindi');
      loadLabels();
    } catch {
      message.error('Etiket silinemedi');
    }
  };

  const startEditLabel = (lbl: Label) => {
    setEditingLabelId(lbl.id);
    setEditLabelName(lbl.name);
    setEditLabelColor(lbl.color || LABEL_COLORS[0]);
  };

  // ─── Render helpers ────────────────────────────────────────────────
  const columnCategoryToStatus = (cat?: string) => {
    if (cat === 'done') return styles.status_completed;
    if (cat === 'in_progress') return styles.status_active;
    return styles.status_planning;
  };

  const getColumnName = (issue: Issue) => (issue as any).column?.name || (issue as any).column?.category || 'Yapılacak';

  return (
    <div className={styles.page}>
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Epicler & Hikayeler</h2>
          <span className={styles.subtitle}>Epic ve story bazlı ilerlemeyi takip edin</span>
        </div>
        <div className={styles.headerRight}>
          <Tooltip title="Yenile">
            <Button
              icon={<ReloadOutlined />}
              onClick={() => { loadEpics(); loadAllIssues(); }}
              className={styles.reloadBtn}
            />
          </Tooltip>
          <Button
            icon={<TagOutlined />}
            onClick={() => { setLabelManagerOpen(true); loadLabels(); }}
            className={styles.labelBtn}
          >
            Etiketler
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => setStoryCreateOpen(true)}
            className={styles.storyBtn}
            disabled={columns.length === 0}
          >
            Yeni Hikaye
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateOpen(true)}
            className={styles.createBtn}
          >
            Yeni Epic
          </Button>
        </div>
      </div>

      {/* ─── Epics Section ───────────────────────────────────────── */}
      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionDot} style={{ background: '#6554C0' }} />
          Epicler
          <span className={styles.sectionCount}>{epics.length}</span>
        </h3>

        {loading ? (
          <div className={styles.loadingCenter}><Spin /></div>
        ) : epics.length === 0 ? (
          <Empty description="Henüz epic yok" image={Empty.PRESENTED_IMAGE_SIMPLE} className={styles.empty} />
        ) : (
          <div className={styles.cardGrid}>
            {epics.map((epic) => {
              const { total, done, totalSP, doneSP, hasTaskLevel } = epicProgressFromAllIssues(epic.id);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div
                  key={epic.id}
                  className={styles.epicCard}
                  style={{ borderLeft: `4px solid ${epic.color || '#0052CC'}` }}
                  onClick={() => navigate(`/proje/${projectId}/epicler/${epic.id}`)}
                >
                  <div className={styles.cardHeader}>
                    <div className={styles.cardColorDot} style={{ background: epic.color || '#0052CC' }} />
                    <span className={styles.cardName}>{epic.name}</span>
                    <div className={styles.cardActions}>
                      {epic.status && (
                        <span className={`${styles.statusBadge} ${styles[`status_${epic.status}`]}`}>
                          {STATUS_LABELS[epic.status] || epic.status}
                        </span>
                      )}
                      <Popconfirm
                        title="Bu epici silmek istediğinize emin misiniz?"
                        onConfirm={(e) => { e?.stopPropagation(); epicAPI.delete(epic.id).then(() => { message.success('Epic silindi'); loadEpics(); }).catch(() => message.error('Silinemedi')); }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Sil"
                        cancelText="İptal"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className={styles.deleteBtn}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Popconfirm>
                    </div>
                  </div>

                  {epic.description && (
                    <p className={styles.cardDesc}>{epic.description}</p>
                  )}

                  <div className={styles.cardMeta}>
                    {(epic.start_date || epic.target_date) && (
                      <span className={styles.metaItem}>
                        <CalendarOutlined />
                        {epic.start_date ? dayjs(epic.start_date).format('DD MMM') : '?'}
                        {' → '}
                        {epic.target_date ? dayjs(epic.target_date).format('DD MMM') : '?'}
                      </span>
                    )}
                    <span className={styles.metaItem}>{total} {hasTaskLevel ? 'görev' : 'hikaye'}</span>
                    {totalSP > 0 && <span className={styles.metaItem}>{doneSP}/{totalSP} SP</span>}
                  </div>

                  <div className={styles.progressWrap}>
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

                  <div className={styles.cardFooter}>
                    <span className={styles.viewDetail}>
                      Detay <RightOutlined style={{ fontSize: 10 }} />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Stories Section ─────────────────────────────────────── */}
      <section className={styles.section} style={{ marginTop: 32 }}>
        <h3 className={styles.sectionTitle}>
          <span className={styles.sectionDot} style={{ background: '#00875A' }} />
          Hikayeler (Story)
          <span className={styles.sectionCount}>{stories.length}</span>
        </h3>

        {issuesLoading ? (
          <div className={styles.loadingCenter}><Spin /></div>
        ) : stories.length === 0 ? (
          <Empty description="Henüz hikaye (story) yok" image={Empty.PRESENTED_IMAGE_SIMPLE} className={styles.empty} />
        ) : (
          <div className={styles.storyList}>
            {stories.map((story) => {
              const { tasks, done, total, totalSP, doneSP } = storyTaskProgress(story.id);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const statusCat = (story as any).column?.category as string | undefined;
              const isExpanded = expandedStoryIds.has(story.id);

              return (
                <div key={story.id} className={styles.storyBlock}>
                  {/* Story header row */}
                  <div
                    className={`${styles.storyRow} ${isExpanded ? styles.storyRowExpanded : ''}`}
                    onClick={() => toggleStory(story.id)}
                  >
                    {/* Expand icon */}
                    <span className={styles.expandIcon}>
                      {isExpanded ? <DownOutlined /> : <RightChevron />}
                    </span>

                    {/* Epic color dot */}
                    {story.epic && (
                      <span
                        className={styles.epicDot}
                        style={{ background: story.epic.color || '#6554C0' }}
                        title={story.epic.name}
                      />
                    )}

                    <div className={styles.storyKey}>📗 {story.issue_key}</div>
                    <div className={styles.storyTitle}>{story.title}</div>

                    {/* Assignee */}
                    {story.assignee && (
                      <div className={styles.storyAssignee} title={story.assignee.display_name || story.assignee.full_name || ''}>
                        {(story.assignee.display_name || story.assignee.full_name || '?')[0]?.toUpperCase()}
                      </div>
                    )}

                    <div className={styles.storyStatus}>
                      <span className={`${styles.statusBadge} ${columnCategoryToStatus(statusCat)}`}>
                        {getColumnName(story)}
                      </span>
                    </div>

                    {story.story_points != null && (
                      <div className={styles.storySP}>{story.story_points} SP</div>
                    )}

                    {/* Task progress */}
                    <div className={styles.storyProgress}>
                      {total > 0 ? (
                        <>
                          <div className={styles.progressBg} style={{ width: 80 }}>
                            <div
                              className={styles.progressFill}
                              style={{ width: `${pct}%`, background: pct === 100 ? '#36B37E' : '#00875A' }}
                            />
                          </div>
                          <span className={styles.progressPct}>{done}/{total}</span>
                          {totalSP > 0 && <span className={styles.progressPct} style={{ color: '#5C6573' }}>{doneSP}/{totalSP}SP</span>}
                        </>
                      ) : (
                        <span className={styles.noTasks}>görev yok</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded task list */}
                  {isExpanded && (
                    <div className={styles.taskList}>
                      {tasks.length === 0 ? (
                        <div className={styles.taskEmpty}>Bu hikayeye bağlı görev bulunmuyor</div>
                      ) : (
                        tasks.map((task) => {
                          const taskCat = (task as any).column?.category as string | undefined;
                          return (
                            <div key={task.id} className={styles.taskRow}>
                              <span className={styles.taskIcon}>{task.issue_type?.icon || '✅'}</span>
                              <span className={styles.taskKey}>{task.issue_key}</span>
                              <span className={styles.taskTitle}>{task.title}</span>
                              {task.assignee && (
                                <span className={styles.taskAssignee} title={task.assignee.display_name || task.assignee.full_name || ''}>
                                  {(task.assignee.display_name || task.assignee.full_name || '?')[0]?.toUpperCase()}
                                </span>
                              )}
                              <span className={`${styles.statusBadge} ${styles.taskStatusBadge} ${columnCategoryToStatus(taskCat)}`}>
                                {getColumnName(task)}
                              </span>
                              {task.story_points != null && (
                                <span className={styles.taskSP}>{task.story_points} SP</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ─── Create Epic Modal ───────────────────────────────────── */}
      <Modal
        open={createOpen}
        title="Yeni Epic Oluştur"
        onCancel={() => { setCreateOpen(false); form.resetFields(); }}
        onOk={handleCreate}
        confirmLoading={creating}
        okText="Oluştur"
        cancelText="İptal"
        className={styles.modal}
      >
        <Form form={form} layout="vertical" className={styles.form}>
          <Form.Item name="name" label="Epic Adı" rules={[{ required: true, message: 'Epic adı gerekli' }]}>
            <Input placeholder="Epic adını girin" />
          </Form.Item>
          <Form.Item name="description" label="Açıklama">
            <Input.TextArea rows={3} placeholder="Epic açıklaması (opsiyonel)" />
          </Form.Item>
          <Form.Item label="Renk">
            <div className={styles.colorPicker}>
              {EPIC_COLORS.map((c) => (
                <div
                  key={c}
                  className={`${styles.colorSwatch} ${selectedColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </Form.Item>
          <div className={styles.dateRow}>
            <Form.Item name="start_date" label="Başlangıç Tarihi" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="Başlangıç" />
            </Form.Item>
            <Form.Item name="target_date" label="Hedef Tarih" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} placeholder="Hedef" />
            </Form.Item>
          </div>
          <Form.Item name="status" label="Durum" initialValue="planning">
            <Select
              options={[
                { value: 'planning', label: 'Planlama' },
                { value: 'active', label: 'Aktif' },
                { value: 'on_hold', label: 'Beklemede' },
                { value: 'completed', label: 'Tamamlandı' },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* ─── Create Story Modal ──────────────────────────────────── */}
      {storyCreateOpen && columns.length > 0 && (
        <CreateIssueModal
          open={storyCreateOpen}
          projectId={projectId!}
          columns={columns}
          defaultColumnId={columns[0]?.id}
          defaultIssueTypeName="Story"
          allowedTypeNames={['Story', 'Hikaye', 'Hikâye']}
          onClose={() => setStoryCreateOpen(false)}
          onCreated={() => { setStoryCreateOpen(false); loadAllIssues(); }}
        />
      )}

      {/* ─── Label Manager Modal ─────────────────────────────────── */}
      <Modal
        open={labelManagerOpen}
        title="🏷️ Etiket Yönetimi"
        onCancel={() => { setLabelManagerOpen(false); setEditingLabelId(null); }}
        footer={null}
        width={520}
        className={styles.modal}
      >
        {/* Existing labels */}
        <div className={styles.labelList}>
          {labelsList.length === 0 ? (
            <div className={styles.taskEmpty}>Henüz etiket yok. Aşağıdan yeni etiket ekleyin.</div>
          ) : (
            labelsList.map((lbl) => (
              <div key={lbl.id} className={styles.labelRow}>
                {editingLabelId === lbl.id ? (
                  /* Edit mode */
                  <div className={styles.labelEditRow}>
                    <div className={styles.colorPickerSmall}>
                      {LABEL_COLORS.map((c) => (
                        <div
                          key={c}
                          className={`${styles.colorSwatchSm} ${editLabelColor === c ? styles.colorSwatchActive : ''}`}
                          style={{ background: c }}
                          onClick={() => setEditLabelColor(c)}
                        />
                      ))}
                    </div>
                    <Input
                      size="small"
                      value={editLabelName}
                      onChange={(e) => setEditLabelName(e.target.value)}
                      onPressEnter={() => handleUpdateLabel(lbl.id)}
                      style={{ flex: 1 }}
                    />
                    <Button size="small" type="primary" onClick={() => handleUpdateLabel(lbl.id)}>Kaydet</Button>
                    <Button size="small" onClick={() => setEditingLabelId(null)}>İptal</Button>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <Tag
                      color={lbl.color || '#0052CC'}
                      style={{ marginRight: 0, fontSize: 12 }}
                    >
                      {lbl.name}
                    </Tag>
                    <div className={styles.labelActions}>
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEditLabel(lbl)}
                        className={styles.labelActionBtn}
                      />
                      <Popconfirm
                        title="Bu etiketi silmek istediğinize emin misiniz?"
                        onConfirm={() => handleDeleteLabel(lbl.id)}
                        okText="Sil"
                        cancelText="İptal"
                        placement="left"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          className={styles.labelActionBtn}
                        />
                      </Popconfirm>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Add new label */}
        <div className={styles.labelAddSection}>
          <div className={styles.labelAddTitle}>Yeni Etiket Ekle</div>
          <Form form={labelForm} layout="vertical" className={styles.form}>
            <Form.Item name="name" rules={[{ required: true, message: 'Etiket adı gerekli' }]} style={{ marginBottom: 8 }}>
              <Input placeholder="Etiket adı" />
            </Form.Item>
          </Form>
          <div className={styles.labelColorRow}>
            <span className={styles.labelColorLabel}>Renk:</span>
            <div className={styles.colorPickerSmall}>
              {LABEL_COLORS.map((c) => (
                <div
                  key={c}
                  className={`${styles.colorSwatchSm} ${newLabelColor === c ? styles.colorSwatchActive : ''}`}
                  style={{ background: c }}
                  onClick={() => setNewLabelColor(c)}
                />
              ))}
            </div>
            {newLabelColor && (
              <Tag color={newLabelColor} style={{ marginLeft: 8 }}>Önizleme</Tag>
            )}
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateLabel}
            style={{ marginTop: 12, width: '100%' }}
          >
            Etiket Ekle
          </Button>
        </div>
      </Modal>
    </div>
  );
}
