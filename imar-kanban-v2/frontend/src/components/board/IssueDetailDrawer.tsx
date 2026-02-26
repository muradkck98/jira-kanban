import { useState, useEffect } from 'react';
import {
  Drawer,
  Avatar,
  Input,
  Button,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Tag,
  Upload,
  Image,
  Spin,
} from 'antd';
import {
  UserOutlined,
  DeleteOutlined,
  SendOutlined,
  CloseOutlined,
  LinkOutlined,
  EyeOutlined,
  FieldTimeOutlined,
  FlagOutlined,
  ApartmentOutlined,
  PaperClipOutlined,
  FileOutlined,
} from '@ant-design/icons';
import type { Issue, Comment, Column, Epic, IssueType, Attachment, User } from '../../types';
import { useBoardStore } from '../../stores/boardStore';
import { useAuthStore } from '../../stores/authStore';
import { issueAPI } from '../../api/issues';
import client from '../../api/client';
import dayjs from 'dayjs';
import styles from './IssueDetailDrawer.module.css';

const { TextArea } = Input;

interface Props {
  open: boolean;
  issue: Issue | null;
  projectId: string;
  columns?: Column[];
  onClose: () => void;
  onDeleted?: (issueId: string, columnId: string) => void;
}

const priorityConfig: Record<string, { icon: string; color: string; label: string }> = {
  highest: { icon: '⬆', color: '#FF5630', label: 'En Yüksek' },
  high: { icon: '↑', color: '#FF7452', label: 'Yüksek' },
  medium: { icon: '=', color: '#FFAB00', label: 'Orta' },
  low: { icon: '↓', color: '#36B37E', label: 'Düşük' },
  lowest: { icon: '⬇', color: '#0065FF', label: 'En Düşük' },
};

const issueTypeIcons: Record<string, string> = {
  'Görev': '✅',
  'Hata': '🔴',
  'Hikaye': '📗',
  'Alt Görev': '🔷',
};

export default function IssueDetailDrawer({ open, issue, projectId: _projectId, columns, onClose, onDeleted }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'all'>('all');
  const { signalIssueUpdate } = useBoardStore();
  const { user: currentUser } = useAuthStore();

  const [epics, setEpics] = useState<Epic[]>([]);
  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [allIssues, setAllIssues] = useState<Issue[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [localParentId, setLocalParentId] = useState<string | undefined>(undefined);
  const [localColumnId, setLocalColumnId] = useState<string | undefined>(undefined);
  const [localEpicId, setLocalEpicId] = useState<string | undefined>(undefined);
  // Unified save state
  const [localAssigneeId, setLocalAssigneeId] = useState<string | undefined>(undefined);
  const [localPriority, setLocalPriority] = useState<string>('medium');
  const [localTypeId, setLocalTypeId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const loadAttachments = async (issueId: string) => {
    setAttachmentsLoading(true);
    try {
      const res = await issueAPI.listAttachments(issueId);
      const raw = res.data as any;
      const list: Attachment[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
        ? raw.data
        : [];
      setAttachments(list);
    } catch {
      setAttachments([]);
    } finally {
      setAttachmentsLoading(false);
    }
  };

  // Proje ilişkilendirme verilerini yükle
  useEffect(() => {
    if (!open || !_projectId) return;

    client
      .get(`/projects/${_projectId}/epics`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setEpics(Array.isArray(data) ? data : []);
      })
      .catch(() => setEpics([]));

    client
      .get(`/projects/${_projectId}/issue-types`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setIssueTypes(Array.isArray(data) ? data : []);
      })
      .catch(() => setIssueTypes([]));

    client
      .get(`/projects/${_projectId}/issues`, { params: { includeSubtasks: 'true' } })
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setAllIssues(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllIssues([]));

    client
      .get(`/projects/${_projectId}/members`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        const users = Array.isArray(data)
          ? data.map((m: any) => m.user ?? m).filter(Boolean)
          : [];
        setMembers(users);
      })
      .catch(() => setMembers([]));
  }, [open, _projectId]);

  // Ekleri yükle — drawer açıldığında veya issue değiştiğinde
  useEffect(() => {
    if (!open || !issue?.id) {
      setAttachments([]);
      return;
    }
    loadAttachments(issue.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issue?.id]);

  // Tüm yerel state'i issue prop'undan senkronize et
  useEffect(() => {
    if (issue) {
      setTitleValue(issue.title);
      setDescValue(issue.description || '');
      setLocalParentId(issue.parent_id ?? undefined);
      setLocalColumnId(issue.column_id ?? undefined);
      setLocalEpicId(issue.epic_id ?? undefined);
      setLocalAssigneeId(issue.assignee_id ?? undefined);
      setLocalPriority(issue.priority || 'medium');
      setLocalTypeId(issue.issue_type_id ?? undefined);
    }
  }, [issue]);

  // Yorumları backend'den yükle — drawer açıldığında
  useEffect(() => {
    if (!open || !issue?.id) {
      setComments([]);
      return;
    }
    issueAPI
      .listComments(_projectId, issue.id)
      .then((res) => {
        const d = (res.data as any).data ?? res.data;
        setComments(Array.isArray(d) ? d : []);
      })
      .catch(() => setComments([]));
  }, [open, issue?.id, _projectId]);

  const handleAddComment = async () => {
    if (!issue || !newComment.trim()) return;
    try {
      const res = await issueAPI.createComment(_projectId, issue.id, { content: newComment });
      const saved = (res.data as any).data ?? res.data;
      setComments((prev) => [...prev, saved]);
      setNewComment('');
    } catch {
      message.error('Yorum eklenemedi');
    }
  };

  const handleDelete = async () => {
    if (!issue) return;
    try {
      await issueAPI.delete(_projectId, issue.id);
      signalIssueUpdate();
      message.success(`${issue.issue_key} silindi`);
      onDeleted?.(issue.id, issue.column_id);
      onClose();
    } catch {
      message.error('Silinemedi');
    }
  };

  // Durum değişikliği sadece yerel state'i günceller — Kaydet ile persist edilir
  const handleStatusChange = (newColumnId: string) => {
    setLocalColumnId(newColumnId);
  };

  // Tüm değişiklikleri tek seferinde kaydeden unified save handler
  const handleSaveAll = async () => {
    if (!issue) return;
    setSaving(true);
    try {
      // Değişen alanları topla
      const patch: Record<string, unknown> = {};
      if (titleValue.trim() && titleValue !== issue.title)
        patch.title = titleValue.trim();
      if (descValue !== (issue.description || ''))
        patch.description = descValue;
      if (localPriority !== issue.priority)
        patch.priority = localPriority;
      if (localAssigneeId !== (issue.assignee_id ?? undefined))
        patch.assigneeId = localAssigneeId ?? null;
      if (localTypeId !== (issue.issue_type_id ?? undefined))
        patch.issueTypeId = localTypeId ?? null;
      if (localEpicId !== (issue.epic_id ?? undefined))
        patch.epicId = localEpicId ?? null;
      if (localParentId !== (issue.parent_id ?? undefined))
        patch.parentId = localParentId ?? null;

      // Durum değişikliği /move endpoint'i kullanır
      const statusChanged = localColumnId && localColumnId !== issue.column_id;

      const promises: Promise<unknown>[] = [];
      if (Object.keys(patch).length > 0)
        promises.push(client.patch(`/issues/${issue.id}`, patch));
      if (statusChanged)
        promises.push(issueAPI.move(_projectId, issue.id, { columnId: localColumnId!, position: 0 }));

      await Promise.all(promises);
      signalIssueUpdate();
      message.success('Değişiklikler kaydedildi');
      setEditingTitle(false);
      setEditingDesc(false);
    } catch {
      message.error('Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleUpload = async (file: File) => {
    if (!issue) return;
    setUploadingAttachment(true);
    try {
      await issueAPI.uploadAttachment(issue.id, file);
      await loadAttachments(issue.id);
      message.success('Dosya yüklendi');
    } catch {
      message.error('Yükleme başarısız');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!issue) return;
    try {
      await issueAPI.deleteAttachment(attachmentId);
      await loadAttachments(issue.id);
      message.success('Ek silindi');
    } catch {
      message.error('Silme başarısız');
    }
  };

  if (!issue) return null;

  const typeIcon = issue.issue_type ? issueTypeIcons[issue.issue_type.name] || '📋' : '📋';

  const statusColors: Record<string, string> = {
    'TO DO': '#4BCE97',
    'IN PROGRESS': '#579DFF',
    'IN REVIEW': '#F5CD47',
    'DONE': '#9F8FEF',
  };

  const activities = [
    ...comments.map((c) => ({ type: 'comment' as const, data: c, date: c.created_at })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Kaydedilmemiş değişiklik var mı?
  const isDirty = !!(
    (titleValue.trim() && titleValue !== issue.title) ||
    descValue !== (issue.description || '') ||
    localPriority !== (issue.priority || 'medium') ||
    localAssigneeId !== (issue.assignee_id ?? undefined) ||
    localTypeId !== (issue.issue_type_id ?? undefined) ||
    localEpicId !== (issue.epic_id ?? undefined) ||
    localParentId !== (issue.parent_id ?? undefined) ||
    (localColumnId && localColumnId !== issue.column_id)
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={680}
      closable={false}
      styles={{
        header: { display: 'none' },
        body: { padding: 0, background: '#1D2125', color: '#B6C2CF' },
      }}
    >
      {/* Custom Header */}
      <div className={styles.drawerHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.typeIcon}>{typeIcon}</span>
          <span className={styles.issueKey}>{issue.issue_key}</span>
        </div>
        <div className={styles.headerRight}>
          <Tooltip title="Bağlantıyı kopyala">
            <button className={styles.headerBtn} onClick={() => { navigator.clipboard?.writeText(issue.issue_key); message.success('Kopyalandı'); }}>
              <LinkOutlined />
            </button>
          </Tooltip>
          <Tooltip title="İzle">
            <button className={styles.headerBtn}><EyeOutlined /></button>
          </Tooltip>
          <Popconfirm title="Bu iş öğesini silmek istediğinize emin misiniz?" onConfirm={handleDelete} okText="Sil" cancelText="İptal">
            <Tooltip title="Sil">
              <button className={styles.headerBtn}><DeleteOutlined /></button>
            </Tooltip>
          </Popconfirm>
          <button className={styles.headerBtn} onClick={onClose}><CloseOutlined /></button>
        </div>
      </div>

      <div className={styles.drawerBody}>
        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Title */}
          {editingTitle ? (
            <Input
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={() => setEditingTitle(false)}
              onPressEnter={() => setEditingTitle(false)}
              autoFocus
              className={styles.titleInput}
            />
          ) : (
            <h2 className={styles.issueTitle} onClick={() => setEditingTitle(true)}>
              {titleValue || issue.title}
            </h2>
          )}

          {/* Description */}
          <div className={styles.section}>
            <h4 className={styles.sectionTitle}>Açıklama</h4>
            {editingDesc ? (
              <div>
                <TextArea
                  value={descValue}
                  onChange={(e) => setDescValue(e.target.value)}
                  rows={4}
                  autoFocus
                  className={styles.descInput}
                />
                <div className={styles.descActions}>
                  <Button size="small" onClick={() => { setDescValue(issue.description || ''); setEditingDesc(false); }}>İptal</Button>
                </div>
              </div>
            ) : (
              <div
                className={styles.description}
                onClick={() => setEditingDesc(true)}
              >
                {descValue || 'Açıklama eklemek için tıklayın...'}
              </div>
            )}
          </div>

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className={styles.section}>
              <h4 className={styles.sectionTitle}>Etiketler</h4>
              <div className={styles.labelList}>
                {issue.labels.map((label) => (
                  <span key={label.id} className={styles.label} style={{ background: label.color }}>
                    {label.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Alt Görevler (Subtasks) — Story/Hikaye tipi için ilerleme özeti */}
          {(() => {
            const subtasks = allIssues.filter((i) => i.parent_id === issue.id);
            const typeName = (issue.issue_type?.name || '').toLowerCase();
            const isStoryLike = typeName.includes('story') || typeName.includes('hikaye') || typeName.includes('hikâye') || subtasks.length > 0;
            if (!isStoryLike && subtasks.length === 0) return null;
            const totalSP = subtasks.reduce((sum, i) => sum + (i.story_points ?? 0), 0);
            const doneSP = subtasks.filter((i) => {
              const cat = (i as any).column?.category;
              return cat === 'done';
            }).reduce((sum, i) => sum + (i.story_points ?? 0), 0);
            const doneCount = subtasks.filter((i) => (i as any).column?.category === 'done').length;
            const pct = subtasks.length > 0 ? Math.round((doneCount / subtasks.length) * 100) : 0;
            return (
              <div className={styles.section}>
                <h4 className={styles.sectionTitle}>Alt Görevler</h4>
                {subtasks.length === 0 ? (
                  <span style={{ color: '#5C6573', fontSize: 12 }}>Alt görev yok</span>
                ) : (
                  <>
                    {/* Progress bar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ flex: 1, height: 6, background: '#2C333A', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#36B37E' : '#579DFF', borderRadius: 3, transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#8C9BAB', minWidth: 32, textAlign: 'right' }}>{pct}%</span>
                      <span style={{ fontSize: 11, color: '#5C6573' }}>{doneCount}/{subtasks.length}</span>
                      {totalSP > 0 && <span style={{ fontSize: 11, color: '#FFC400' }}>⚡ {doneSP}/{totalSP} SP</span>}
                    </div>
                    {/* Subtask list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {subtasks.map((sub) => {
                        const subCat = (sub as any).column?.category;
                        const isDone = subCat === 'done';
                        return (
                          <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: '#1D2125', borderRadius: 4, border: '1px solid #2C333A', fontSize: 12 }}>
                            <span style={{ color: isDone ? '#36B37E' : '#5C6573', fontSize: 14 }}>{isDone ? '✓' : '○'}</span>
                            <span style={{ flex: 1, color: isDone ? '#5C6573' : '#B6C2CF', textDecoration: isDone ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub.title}</span>
                            {sub.story_points != null && (
                              <span style={{ fontSize: 10, color: '#FFC400', flexShrink: 0 }}>{sub.story_points} SP</span>
                            )}
                            {(sub as any).column?.name && (
                              <span style={{ fontSize: 10, padding: '1px 6px', background: '#2C333A', borderRadius: 8, color: '#8C9BAB', flexShrink: 0 }}>
                                {(sub as any).column.name}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* Attachments Section */}
          <div className={styles.section}>
            <div className={styles.attachmentHeader}>
              <h4 className={styles.sectionTitle}>Ekler</h4>
              <Upload
                showUploadList={false}
                multiple
                beforeUpload={(file) => {
                  handleUpload(file);
                  return false;
                }}
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
              >
                <Button
                  size="small"
                  icon={<PaperClipOutlined />}
                  loading={uploadingAttachment}
                  className={styles.attachBtn}
                >
                  Ekle
                </Button>
              </Upload>
            </div>

            {(attachmentsLoading || uploadingAttachment) && (
              <div style={{ padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Spin size="small" />
                <span style={{ fontSize: 12, color: '#579DFF' }}>
                  {uploadingAttachment ? 'Yükleniyor...' : 'Ekler yükleniyor...'}
                </span>
              </div>
            )}

            {!attachmentsLoading && (() => {
              const images = attachments.filter((a) => (a as any).is_image || (a as any).isImage);
              const files = attachments.filter((a) => !(a as any).is_image && !(a as any).isImage);

              return (
                <>
                  {images.length > 0 && (
                    <div className={styles.imageGrid}>
                      <Image.PreviewGroup>
                        {images.map((a) => (
                          <div key={a.id} className={styles.imageWrapper}>
                            <Image
                              src={(a as any).url || (a as any).file_path}
                              alt={(a as any).filename}
                              width={90}
                              height={72}
                              style={{ objectFit: 'cover', borderRadius: 4 }}
                            />
                            <Popconfirm
                              title="Bu eki silmek istiyor musunuz?"
                              onConfirm={() => handleDeleteAttachment(a.id)}
                              okText="Sil"
                              cancelText="İptal"
                            >
                              <button className={styles.imageDeleteBtn}>
                                <CloseOutlined />
                              </button>
                            </Popconfirm>
                          </div>
                        ))}
                      </Image.PreviewGroup>
                    </div>
                  )}

                  {files.map((a) => (
                    <div key={a.id} className={styles.fileRow}>
                      <FileOutlined className={styles.fileIcon} />
                      <a
                        href={(a as any).url || (a as any).file_path}
                        target="_blank"
                        rel="noreferrer"
                        className={styles.fileName}
                      >
                        {(a as any).filename}
                      </a>
                      <span className={styles.fileSize}>
                        {formatBytes((a as any).file_size || (a as any).size || 0)}
                      </span>
                      <Popconfirm
                        title="Bu eki silmek istiyor musunuz?"
                        onConfirm={() => handleDeleteAttachment(a.id)}
                        okText="Sil"
                        cancelText="İptal"
                      >
                        <button className={styles.fileDeleteBtn}>
                          <DeleteOutlined />
                        </button>
                      </Popconfirm>
                    </div>
                  ))}

                  {attachments.length === 0 && !uploadingAttachment && (
                    <div className={styles.emptyAttachments}>Henüz ek yok</div>
                  )}
                </>
              );
            })()}
          </div>

          {/* Activity Section */}
          <div className={styles.section}>
            <div className={styles.activityHeader}>
              <h4 className={styles.sectionTitle}>Aktivite</h4>
              <div className={styles.activityTabs}>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'all' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('all')}
                >Tümü</button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'comments' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('comments')}
                >Yorumlar</button>
                <button
                  className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
                  onClick={() => setActiveTab('history')}
                >Geçmiş</button>
              </div>
            </div>

            {/* Comment input */}
            <div className={styles.commentInput}>
              <Avatar size={28} style={{ backgroundColor: '#0052CC', fontSize: 11, flexShrink: 0 }}>
                {(currentUser?.display_name || currentUser?.full_name || 'U')[0]?.toUpperCase()}
              </Avatar>
              <div className={styles.commentInputArea}>
                <TextArea
                  rows={2}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Yorum ekleyin..."
                  onPressEnter={(e) => { if (e.ctrlKey) handleAddComment(); }}
                  className={styles.commentTextArea}
                />
                {newComment.trim() && (
                  <div className={styles.commentActions}>
                    <Button
                      type="primary"
                      size="small"
                      icon={<SendOutlined />}
                      onClick={handleAddComment}
                    >
                      Kaydet
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Activities */}
            <div className={styles.activityList}>
              {activities.length === 0 && (
                <div className={styles.emptyActivity}>Henüz aktivite yok</div>
              )}
              {activities.map((activity) => {
                if (activity.type === 'comment') {
                  const c = activity.data;
                  return (
                    <div key={c.id} className={styles.activityItem}>
                      <Avatar size={28} style={{ backgroundColor: '#0052CC', fontSize: 11, flexShrink: 0 }}>
                        {c.user?.full_name?.[0]?.toUpperCase() || '?'}
                      </Avatar>
                      <div className={styles.activityContent}>
                        <div className={styles.activityMeta}>
                          <span className={styles.activityAuthor}>{c.user?.full_name}</span>
                          <span className={styles.activityTime}>{dayjs(c.created_at).format('DD MMM YYYY HH:mm')}</span>
                        </div>
                        <div className={styles.commentBody}>{c.content}</div>
                      </div>
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>

        {/* Right Sidebar - Details */}
        <div className={styles.sidebar}>
          {/* Status */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Durum</span>
            <Select
              value={localColumnId ?? issue.column_id}
              onChange={handleStatusChange}
              size="small"
              className={styles.statusSelect}
              dropdownStyle={{ background: '#22272B' }}
              style={{ width: '100%' }}
            >
              {columns?.map((col) => (
                <Select.Option key={col.id} value={col.id}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: statusColors[col.name] || '#579DFF',
                    marginRight: 6,
                  }} />
                  {col.name}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Assignee */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Atanan Kişi</span>
            {members.length > 0 ? (
              <Select
                value={localAssigneeId}
                size="small"
                style={{ width: '100%' }}
                placeholder="Kişi seçin"
                allowClear
                dropdownStyle={{ background: '#22272B' }}
                onChange={(val) => setLocalAssigneeId(val ?? undefined)}
              >
                {/* Atanan kişi üye listesinde yoksa fallback seçenek olarak ekle */}
                {localAssigneeId && !members.find((m) => m.id === localAssigneeId) && (
                  <Select.Option key={localAssigneeId} value={localAssigneeId}>
                    <Avatar size={16} style={{ backgroundColor: '#0052CC', fontSize: 8, marginRight: 6 }}>
                      {((issue.assignee as any)?.display_name || issue.assignee?.full_name || '?')[0]?.toUpperCase()}
                    </Avatar>
                    {(issue.assignee as any)?.display_name || issue.assignee?.full_name || localAssigneeId}
                  </Select.Option>
                )}
                {members.map((m) => (
                  <Select.Option key={m.id} value={m.id}>
                    <Avatar size={16} style={{ backgroundColor: '#0052CC', fontSize: 8, marginRight: 6 }}>
                      {(m.display_name || m.full_name || '?')[0]?.toUpperCase()}
                    </Avatar>
                    {m.display_name || m.full_name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <div className={styles.detailValue}>
                {issue.assignee ? (
                  <div className={styles.personCell}>
                    <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 10 }}>
                      {((issue.assignee as any).display_name || issue.assignee.full_name || '?')[0]?.toUpperCase()}
                    </Avatar>
                    <span>{(issue.assignee as any).display_name || issue.assignee.full_name}</span>
                  </div>
                ) : (
                  <div className={styles.personCell}>
                    <Avatar size={24} style={{ backgroundColor: '#2C333A' }} icon={<UserOutlined style={{ fontSize: 12 }} />} />
                    <span className={styles.unassigned}>Atanmamış</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reporter */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Raporlayan</span>
            <div className={styles.detailValue}>
              <div className={styles.personCell}>
                <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 10 }}>
                  {((issue.reporter as any)?.display_name || issue.reporter?.full_name || 'A')[0]?.toUpperCase()}
                </Avatar>
                <span>{(issue.reporter as any)?.display_name || issue.reporter?.full_name || '-'}</span>
              </div>
            </div>
          </div>

          {/* Priority */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}><FlagOutlined /> Öncelik</span>
            <Select
              value={localPriority}
              size="small"
              style={{ width: '100%' }}
              dropdownStyle={{ background: '#22272B' }}
              onChange={(val) => setLocalPriority(val)}
            >
              {Object.entries(priorityConfig).map(([k, v]) => (
                <Select.Option key={k} value={k}>
                  <span style={{ color: v.color, fontWeight: 700, marginRight: 6 }}>{v.icon}</span>
                  {v.label}
                </Select.Option>
              ))}
            </Select>
          </div>

          {/* Story Points */}
          {issue.story_points != null && issue.story_points > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Puan</span>
              <div className={styles.detailValue}>
                <span className={styles.storyPointsBadge}>{issue.story_points}</span>
              </div>
            </div>
          )}

          {/* Type */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Tür</span>
            {issueTypes.length > 0 ? (
              <Select
                value={localTypeId}
                size="small"
                style={{ width: '100%' }}
                placeholder="Tür seçin"
                allowClear
                dropdownStyle={{ background: '#22272B' }}
                onChange={(val) => setLocalTypeId(val ?? undefined)}
              >
                {issueTypes.map((t) => (
                  <Select.Option key={t.id} value={t.id}>
                    <span style={{ marginRight: 6 }}>{t.icon}</span>
                    {t.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <div className={styles.detailValue}>
                {issue.issue_type ? (
                  <>
                    <span>{typeIcon}</span>
                    <span style={{ marginLeft: 6 }}>{issue.issue_type.name}</span>
                  </>
                ) : (
                  <span style={{ color: '#5C6573' }}>—</span>
                )}
              </div>
            )}
          </div>

          {/* Epic */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Epic</span>
            {epics.length > 0 ? (
              <Select
                value={localEpicId}
                size="small"
                style={{ width: '100%' }}
                placeholder="Epic seçin"
                allowClear
                dropdownStyle={{ background: '#22272B' }}
                onChange={(val) => setLocalEpicId(val ?? undefined)}
              >
                {epics.map((epic) => (
                  <Select.Option key={epic.id} value={epic.id}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: epic.color || '#0052CC',
                        marginRight: 6,
                      }}
                    />
                    {epic.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <div className={styles.detailValue}>
                {issue.epic ? (
                  <Tag color={issue.epic.color}>{issue.epic.name}</Tag>
                ) : (
                  <span style={{ color: '#5C6573' }}>—</span>
                )}
              </div>
            )}
          </div>

          {/* Bağlı Hikaye (Story) */}
          {(() => {
            const stories = allIssues.filter((i) => {
              const n = (i.issue_type?.name || '').toLowerCase();
              return n.includes('story') || n.includes('hikaye') || n.includes('hikâye');
            });
            const currentParent = allIssues.find((i) => i.id === localParentId);
            const currentParentIsStory = currentParent
              ? !!(currentParent.issue_type?.name || '').toLowerCase().match(/story|hikaye|hikâye/)
              : false;
            const storyValue = currentParentIsStory ? localParentId : undefined;
            return (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>📗 Bağlı Hikaye</span>
                <Select
                  value={storyValue}
                  size="small"
                  style={{ width: '100%' }}
                  placeholder={stories.length === 0 ? 'Projede hikaye yok' : 'Hikayeye bağla'}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  disabled={stories.length === 0}
                  dropdownStyle={{ background: '#22272B' }}
                  onChange={(val) => setLocalParentId(val ?? undefined)}
                >
                  {stories.filter((i) => i.id !== issue.id).map((i) => (
                    <Select.Option key={i.id} value={i.id} label={`${i.issue_key} ${i.title}`}>
                      <span style={{ color: '#36B37E', marginRight: 4, fontSize: 11 }}>📗</span>
                      <span style={{ color: '#579DFF', marginRight: 6, fontSize: 11, fontWeight: 600 }}>{i.issue_key}</span>
                      {i.title}
                    </Select.Option>
                  ))}
                </Select>
              </div>
            );
          })()}

          {/* Üst Görev (parent) */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}><ApartmentOutlined /> Üst Görev</span>
            <Select
              value={localParentId}
              size="small"
              style={{ width: '100%' }}
              placeholder={allIssues.length === 0 ? 'Proje henüz başka görev içermiyor' : 'Üst görev seçin'}
              allowClear
              showSearch
              optionFilterProp="label"
              disabled={allIssues.filter((i) => i.id !== issue.id).length === 0}
              dropdownStyle={{ background: '#22272B' }}
              onChange={(val) => setLocalParentId(val ?? undefined)}
            >
              {allIssues
                .filter((i) => i.id !== issue.id)
                .map((i) => (
                  <Select.Option
                    key={i.id}
                    value={i.id}
                    label={`${i.issue_key} ${i.title}`}
                  >
                    <span style={{ color: '#579DFF', marginRight: 6, fontSize: 11, fontWeight: 600 }}>{i.issue_key}</span>
                    {i.title}
                  </Select.Option>
                ))}
            </Select>
          </div>

          {/* Sprint */}
          {issue.sprint && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Sprint</span>
              <div className={styles.detailValue}>{issue.sprint.name}</div>
            </div>
          )}

          {/* Dates */}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}><FieldTimeOutlined /> Oluşturulma</span>
            <div className={styles.detailValue}>
              {dayjs(issue.created_at).format('DD MMM YYYY HH:mm')}
            </div>
          </div>

          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Güncellenme</span>
            <div className={styles.detailValue}>
              {dayjs(issue.updated_at).format('DD MMM YYYY HH:mm')}
            </div>
          </div>

          {/* ─── Unified Save Button ─────────────────────────────── */}
          <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #2C333A' }}>
            <Button
              type="primary"
              block
              loading={saving}
              disabled={!isDirty}
              onClick={handleSaveAll}
              style={{
                background: isDirty ? '#0052CC' : undefined,
                fontWeight: 600,
              }}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
