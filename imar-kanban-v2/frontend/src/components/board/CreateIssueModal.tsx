import { Form, Input, Modal, Select, Upload, Button, message, DatePicker } from 'antd';
import { PaperClipOutlined, CloseOutlined, FileOutlined } from '@ant-design/icons';
import { useBoardStore } from '../../stores/boardStore';
import { useProjectStore } from '../../stores/projectStore';
import { issueAPI } from '../../api';
import client from '../../api/client';
import type { APIResponse, Column, Epic, Issue, IssueType, Label, User } from '../../types';
import { useEffect, useState } from 'react';

const { TextArea } = Input;

interface Props {
  open: boolean;
  projectId: string;
  columns: Column[];
  defaultColumnId?: string;
  /** If set, only issue types whose name contains one of these strings (case-insensitive) are shown */
  allowedTypeNames?: string[];
  /** If set, pre-select the issue type whose name contains this string (case-insensitive) */
  defaultIssueTypeName?: string;
  onClose: () => void;
  onCreated?: (issue: Issue) => void;
}

/** Helper: issue type name helpers */
const isTypeName = (name: string, ...keywords: string[]) =>
  keywords.some((kw) => name.toLowerCase().includes(kw.toLowerCase()));

export default function CreateIssueModal({ open, projectId, columns, defaultColumnId, allowedTypeNames, defaultIssueTypeName, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const addIssueToBoard = useBoardStore((s) => s.addIssueToBoard);
  const signalIssueUpdate = useBoardStore((s) => s.signalIssueUpdate);
  const { currentBoard } = useBoardStore();
  const { currentProject, projects } = useProjectStore();

  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [epics, setEpics] = useState<Epic[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [labelsList, setLabelsList] = useState<Label[]>([]);
  const [parentIssues, setParentIssues] = useState<Issue[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(undefined);

  // Proje verilerini yükle
  useEffect(() => {
    if (!open || !projectId) return;

    // Issue type'larını yükle
    client
      .get<APIResponse<IssueType[]>>(`/projects/${projectId}/issue-types`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        let types: IssueType[] = Array.isArray(data) ? data : [];
        if (allowedTypeNames && allowedTypeNames.length > 0) {
          types = types.filter((t) =>
            allowedTypeNames.some((allowed) => t.name.toLowerCase().includes(allowed.toLowerCase()))
          );
        }
        setIssueTypes(types);
        if (defaultIssueTypeName) {
          const match = types.find((t) => {
            const tLow = t.name.toLowerCase();
            const dLow = defaultIssueTypeName.toLowerCase();
            return tLow.includes(dLow) || dLow.includes(tLow);
          });
          if (match) {
            form.setFieldValue('issue_type_id', match.id);
            setSelectedTypeId(match.id);
          }
        }
      })
      .catch(() => setIssueTypes([]));

    // Epic'leri yükle
    client
      .get<APIResponse<Epic[]>>(`/projects/${projectId}/epics`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setEpics(Array.isArray(data) ? data : []);
      })
      .catch(() => setEpics([]));

    // Proje üyelerini yükle (atanan kişi için)
    client
      .get<APIResponse<{ user: User }[]>>(`/projects/${projectId}/members`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        const members: { user: User }[] = Array.isArray(data) ? data : [];
        setUsers(members.map((m) => m.user).filter(Boolean));
      })
      .catch(() => setUsers([]));

    // Etiketleri yükle
    client
      .get<APIResponse<Label[]>>(`/projects/${projectId}/labels`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setLabelsList(Array.isArray(data) ? data : []);
      })
      .catch(() => setLabelsList([]));

    // Üst görev/hikaye olarak kullanılabilecek issue'ları yükle
    client
      .get<APIResponse<Issue[]>>(`/projects/${projectId}/issues`)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setParentIssues(Array.isArray(data) ? data : []);
      })
      .catch(() => setParentIssues([]));
  }, [open, projectId]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const project = currentProject || projects.find((p) => p.id === projectId);
      const boardId = currentBoard?.id;

      const res = await issueAPI.create(projectId, {
        projectId,
        boardId,
        columnId: values.column_id,
        title: values.title,
        description: values.description,
        priority: values.priority || 'medium',
        storyPoints: values.story_points,
        assigneeId: values.assignee_id,
        issueTypeId: values.issue_type_id,
        epicId: values.epic_id,
        parentId: values.parent_id,
        labelIds: values.label_ids || [],
        dueDate: values.due_date ? values.due_date.toISOString() : undefined,
      } as any);

      const issue: Issue = res.data.data as Issue;

      if (project && 'issue_counter' in project) {
        (project as any).issue_counter = (project.issue_counter || 0) + 1;
      }

      addIssueToBoard(issue);

      // Seçili dosyaları yükle
      if (pendingFiles.length > 0) {
        setUploading(true);
        for (const file of pendingFiles) {
          try {
            await issueAPI.uploadAttachment(issue.id, file);
          } catch {
            // non-critical — issue oluşturuldu, sadece bu dosya yüklenemedi
          }
        }
        setUploading(false);
      }

      signalIssueUpdate(); // notify EpicsPage and other reactive components
      onCreated?.(issue);
      message.success(`${issue.issue_key} oluşturuldu`);
      form.resetFields();
      setPendingFiles([]);
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return;
      console.error('Issue oluşturma hatası:', err);
      message.error('Görev oluşturulamadı');
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setPendingFiles([]);
    setSelectedTypeId(undefined);
    onClose();
  };

  // Seçili type bilgileri
  const selectedType = issueTypes.find((t) => t.id === selectedTypeId);
  const selectedTypeName = selectedType?.name || '';

  const isSubtask = isTypeName(selectedTypeName, 'subtask', 'alt görev', 'alt gorev');
  const isTask = !isSubtask && isTypeName(selectedTypeName, 'görev', 'gorev', 'task');

  // Hikaye-tipi issue'lar (Task için Üst Hikaye seçimi)
  const storyIssues = parentIssues.filter((i) =>
    isTypeName(i.issue_type?.name || '', 'story', 'hikaye', 'hikâye')
  );

  // Subtask için üst görev (story olmayan, subtask olmayan issue'lar)
  const nonSubtaskIssues = parentIssues.filter((i) => {
    const typeName = i.issue_type?.name || '';
    return !isTypeName(typeName, 'subtask', 'alt görev', 'alt gorev');
  });

  return (
    <Modal
      title={defaultIssueTypeName ? `${defaultIssueTypeName} Oluştur` : 'Görev Oluştur'}
      open={open}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="Oluştur"
      cancelText="İptal"
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ column_id: defaultColumnId, priority: 'medium' }}
        style={{ marginTop: 16 }}
        onValuesChange={(changed) => {
          if ('issue_type_id' in changed) setSelectedTypeId(changed.issue_type_id);
        }}
      >
        {/* Görev Türü */}
        {issueTypes.length > 0 && (
          <Form.Item name="issue_type_id" label="Görev Türü">
            <Select placeholder="Tür seçin" allowClear>
              {issueTypes.map((t) => (
                <Select.Option key={t.id} value={t.id}>
                  <span style={{ marginRight: 6 }}>{t.icon}</span>
                  {t.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Başlık */}
        <Form.Item
          name="title"
          label="Başlık"
          rules={[{ required: true, message: 'Başlık zorunludur' }]}
        >
          <Input placeholder="Ne yapılacak?" />
        </Form.Item>

        {/* Açıklama */}
        <Form.Item name="description" label="Açıklama">
          <TextArea rows={3} placeholder="Açıklama ekleyin..." />
        </Form.Item>

        {/* Durum */}
        <Form.Item
          name="column_id"
          label="Durum"
          rules={[{ required: true, message: 'Durum zorunludur' }]}
        >
          <Select placeholder="Durum seçin">
            {columns.map((col) => (
              <Select.Option key={col.id} value={col.id}>
                {col.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Atanan Kişi */}
        {users.length > 0 && (
          <Form.Item name="assignee_id" label="Atanan Kişi">
            <Select placeholder="Kişi seçin (opsiyonel)" allowClear showSearch optionFilterProp="label">
              {users.map((u) => (
                <Select.Option
                  key={u.id}
                  value={u.id}
                  label={u.display_name || u.full_name || u.username || ''}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      background: '#0052CC',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 600,
                      marginRight: 8,
                    }}
                  >
                    {(u.display_name || u.full_name || u.username || '?')[0]?.toUpperCase()}
                  </span>
                  {u.display_name || u.full_name || u.username}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Öncelik */}
        <Form.Item name="priority" label="Öncelik">
          <Select>
            <Select.Option value="highest">⬆ En Yüksek</Select.Option>
            <Select.Option value="high">↑ Yüksek</Select.Option>
            <Select.Option value="medium">= Orta</Select.Option>
            <Select.Option value="low">↓ Düşük</Select.Option>
            <Select.Option value="lowest">⬇ En Düşük</Select.Option>
          </Select>
        </Form.Item>

        {/* Epic bağlantısı — Story veya Task için */}
        {epics.length > 0 && !isSubtask && (
          <Form.Item name="epic_id" label="Epic">
            <Select placeholder="Epic seçin (opsiyonel)" allowClear>
              {epics.map((epic) => (
                <Select.Option key={epic.id} value={epic.id}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 2,
                      background: epic.color || '#0052CC',
                      marginRight: 8,
                    }}
                  />
                  {epic.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Üst Hikaye — sadece Task (Görev) seçiliyken göster */}
        {isTask && storyIssues.length > 0 && (
          <Form.Item name="parent_id" label="Üst Hikaye">
            <Select
              placeholder="Bağlanacak hikayeyi seçin (opsiyonel)"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {storyIssues.map((issue) => (
                <Select.Option
                  key={issue.id}
                  value={issue.id}
                  label={`${issue.issue_key} ${issue.title}`}
                >
                  <span style={{ color: '#36B37E', marginRight: 6, fontSize: 11, fontWeight: 600 }}>
                    📗 {issue.issue_key}
                  </span>
                  {issue.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Üst Görev — sadece Alt Görev (Subtask) seçiliyken göster */}
        {isSubtask && nonSubtaskIssues.length > 0 && (
          <Form.Item
            name="parent_id"
            label="Üst Görev"
            rules={[{ required: true, message: 'Alt görev için üst görev seçimi zorunludur' }]}
          >
            <Select
              placeholder="Bağlanacak üst görevi seçin"
              allowClear
              showSearch
              optionFilterProp="label"
            >
              {nonSubtaskIssues.map((issue) => (
                <Select.Option
                  key={issue.id}
                  value={issue.id}
                  label={`${issue.issue_key} ${issue.title}`}
                >
                  <span style={{ color: '#579DFF', marginRight: 6, fontSize: 11 }}>
                    {issue.issue_key}
                  </span>
                  {issue.title}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Story Points */}
        <Form.Item name="story_points" label="Story Point">
          <Select placeholder="Yok" allowClear>
            {[1, 2, 3, 5, 8, 13, 21].map((sp) => (
              <Select.Option key={sp} value={sp}>
                {sp}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        {/* Bitiş Tarihi */}
        <Form.Item name="due_date" label="Bitiş Tarihi">
          <DatePicker style={{ width: '100%' }} placeholder="Bitiş tarihi seçin (opsiyonel)" />
        </Form.Item>

        {/* Etiketler */}
        {labelsList.length > 0 && (
          <Form.Item name="label_ids" label="Etiketler">
            <Select mode="multiple" placeholder="Etiket seçin (opsiyonel)" allowClear optionFilterProp="label">
              {labelsList.map((lbl) => (
                <Select.Option key={lbl.id} value={lbl.id} label={lbl.name}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: lbl.color || '#DFE1E6',
                      marginRight: 8,
                    }}
                  />
                  {lbl.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        )}

        {/* Dosya Ekleri */}
        <Form.Item label="Dosya / Görsel Ekle">
          <Upload
            multiple
            showUploadList={false}
            beforeUpload={(file) => {
              setPendingFiles((prev) => [...prev, file]);
              return false;
            }}
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
          >
            <Button icon={<PaperClipOutlined />} size="small">
              Dosya Seç
            </Button>
          </Upload>

          {pendingFiles.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pendingFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '4px 8px',
                    background: '#22272B',
                    borderRadius: 4,
                    border: '1px solid #2C333A',
                  }}
                >
                  <FileOutlined style={{ color: '#579DFF', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: '#B6C2CF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: 11, color: '#5E6C84', flexShrink: 0 }}>
                    {f.size < 1024 * 1024
                      ? `${(f.size / 1024).toFixed(1)} KB`
                      : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingFiles((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#5E6C84',
                      cursor: 'pointer',
                      padding: '0 2px',
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <CloseOutlined />
                  </button>
                </div>
              ))}
            </div>
          )}
          {uploading && (
            <div style={{ fontSize: 12, color: '#579DFF', marginTop: 4 }}>
              Dosyalar yükleniyor...
            </div>
          )}
        </Form.Item>
      </Form>
    </Modal>
  );
}
