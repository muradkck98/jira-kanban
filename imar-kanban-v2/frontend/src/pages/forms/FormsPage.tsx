import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Input, Select, Button, Upload, message, Tag, Tooltip, Spin } from 'antd';
import {
  SendOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  FormOutlined,
  BugOutlined,
  ThunderboltOutlined,
  CheckSquareOutlined,
  BookOutlined,
  RocketOutlined,
  ReloadOutlined,
  PaperClipOutlined,
  FileImageOutlined,
  FileOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { formsAPI, type FormSubmission } from '../../api/forms';
import { usersAPI, type UserProfile } from '../../api/users';
import { uploadsAPI } from '../../api/uploads';
import styles from './FormsPage.module.css';

const { TextArea } = Input;
const { Option } = Select;

const issueTypeOptions = [
  { key: 'bug', label: 'Hata (Bug)', color: '#FF5630', icon: <BugOutlined /> },
  { key: 'feature', label: 'Ozellik Istegi', color: '#36B37E', icon: <ThunderboltOutlined /> },
  { key: 'task', label: 'Gorev', color: '#0052CC', icon: <CheckSquareOutlined /> },
  { key: 'story', label: 'Story', color: '#6554C0', icon: <BookOutlined /> },
  { key: 'improvement', label: 'Iyilestirme', color: '#FF8B00', icon: <RocketOutlined /> },
];

const priorityOptions = [
  { key: 'highest', label: 'En Yuksek', color: '#FF5630' },
  { key: 'high', label: 'Yuksek', color: '#FF7452' },
  { key: 'medium', label: 'Orta', color: '#FFAB00' },
  { key: 'low', label: 'Dusuk', color: '#36B37E' },
];

// Parse description to extract attachments
function parseSubmissionDesc(desc: string) {
  const SEP = '\n\n---\n**Ekler:**\n';
  const idx = desc.indexOf(SEP);
  if (idx === -1) return { text: desc, attachments: [] as Array<{ name: string; url: string; isImage: boolean }> };
  const text = desc.substring(0, idx);
  const section = desc.substring(idx + SEP.length);
  const attachments: Array<{ name: string; url: string; isImage: boolean }> = [];
  for (const line of section.split('\n')) {
    const img = line.match(/^!\[(.+?)\]\((.+?)\)$/);
    if (img) { attachments.push({ name: img[1], url: img[2], isImage: true }); continue; }
    const file = line.match(/^\[(.+?)\]\((.+?)\)$/);
    if (file) { attachments.push({ name: file[1], url: file[2], isImage: false }); }
  }
  return { text, attachments };
}

type TabKey = 'form' | 'submissions';

export default function FormsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('form');
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const [formType, setFormType] = useState('bug');
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formAssignee, setFormAssignee] = useState<string | undefined>(undefined);
  const [titleError, setTitleError] = useState(false);
  const [descError, setDescError] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  useEffect(() => {
    if (projectId) {
      loadSubmissions();
      loadUsers();
      loadPendingCount();
    }
  }, [projectId]);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await formsAPI.listByProject(projectId as string);
      setSubmissions((res.data.data || []) as FormSubmission[]);
    } catch {
      message.error('Basvurular yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await usersAPI.list();
      setUsers((res.data.data || []) as UserProfile[]);
    } catch {
      // ignore
    }
  };

  const loadPendingCount = async () => {
    try {
      const res = await formsAPI.getPendingCount(projectId as string);
      setPendingCount((res.data.data as { count: number })?.count || 0);
    } catch {
      // ignore
    }
  };

  const handleSubmit = async () => {
    let hasError = false;
    if (!formTitle.trim()) { setTitleError(true); hasError = true; }
    else setTitleError(false);
    if (!formDesc.trim()) { setDescError(true); hasError = true; }
    else setDescError(false);
    if (hasError) { message.error('Lutfen zorunlu alanlari doldurun'); return; }

    setSubmitting(true);
    try {
      // Dosyalar varsa önce MinIO'ya yükle, URL'leri açıklamaya ekle
      let attachmentSuffix = '';
      if (pendingFiles.length > 0) {
        const lines: string[] = [];
        for (const file of pendingFiles) {
          try {
            const res = await uploadsAPI.uploadTemp(file);
            const data = (res.data as any).data ?? res.data;
            if (data.is_image || data.isImage) {
              lines.push(`![${file.name}](${data.url})`);
            } else {
              lines.push(`[${file.name}](${data.url})`);
            }
          } catch {
            // non-critical
          }
        }
        if (lines.length > 0) {
          attachmentSuffix = '\n\n---\n**Ekler:**\n' + lines.join('\n');
        }
      }

      await formsAPI.create(projectId as string, {
        issueTypeKey: formType,
        title: formTitle,
        description: formDesc + attachmentSuffix,
        priority: formPriority,
        assigneeId: formAssignee,
      });
      setSubmitSuccess(true);
      setFormTitle('');
      setFormDesc('');
      setFormPriority('medium');
      setFormType('bug');
      setFormAssignee(undefined);
      setPendingFiles([]);
      await loadSubmissions();
      await loadPendingCount();
      setTimeout(() => setSubmitSuccess(false), 4000);
    } catch {
      message.error('Basvuru gonderilemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async (id: string) => {
    try {
      await formsAPI.accept(id);
      message.success('Basvuru kabul edildi ve issue olusturuldu');
      await loadSubmissions();
      await loadPendingCount();
    } catch {
      message.error('Islem basarisiz');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await formsAPI.reject(id);
      message.success('Basvuru reddedildi');
      await loadSubmissions();
      await loadPendingCount();
    } catch {
      message.error('Islem basarisiz');
    }
  };

  const getTypeIcon = (key: string) => {
    const opt = issueTypeOptions.find(o => o.key === key);
    return opt ? opt.icon : <FormOutlined />;
  };

  const getTypeColor = (key: string) => {
    const opt = issueTypeOptions.find(o => o.key === key);
    return opt ? opt.color : '#579DFF';
  };

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderLeft}>
          <FormOutlined className={styles.pageHeaderIcon} />
          <div>
            <h2 className={styles.pageTitle}>Basvuru Formu</h2>
            <p className={styles.pageSubtitle}>Proje ekibine basvuru gonderin veya gelen basvurulari inceleyin</p>
          </div>
        </div>
        <div className={styles.pageHeaderRight}>
          <div className={styles.tabBtns}>
            <button
              className={styles.tabBtn + (activeTab === 'form' ? ' ' + styles.tabBtnActive : '')}
              onClick={() => setActiveTab('form')}
            >
              <FormOutlined /> Basvuru Gonder
            </button>
            <button
              className={styles.tabBtn + (activeTab === 'submissions' ? ' ' + styles.tabBtnActive : '')}
              onClick={() => setActiveTab('submissions')}
            >
              Basvurular
              {pendingCount > 0 && <span className={styles.pendingBadge}>{pendingCount}</span>}
            </button>
          </div>
          <Tooltip title="Yenile">
            <Button icon={<ReloadOutlined />} onClick={() => { loadSubmissions(); loadPendingCount(); }} />
          </Tooltip>
        </div>
      </div>

      {/* Form Tab */}
      {activeTab === 'form' && (
        <div className={styles.formWrapper}>
          {submitSuccess ? (
            <div className={styles.successScreen}>
              <CheckCircleOutlined className={styles.successIcon} />
              <h3 className={styles.successTitle}>Basvurunuz Alindi</h3>
              <p className={styles.successDesc}>
                Basvurunuz basariyla gonderildi. Proje ekibi inceledikten sonra sizinle iletisime gececektir.
              </p>
              <div className={styles.successActions}>
                <Button type="primary" onClick={() => setSubmitSuccess(false)}>
                  Yeni Basvuru Gonder
                </Button>
                <Button onClick={() => setActiveTab('submissions')}>
                  Basvurulari Goruntule
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.formCard}>
              <div className={styles.formCardHeader}>
                <span className={styles.formCardIcon}>
                  <FormOutlined style={{ color: '#579DFF', fontSize: 24 }} />
                </span>
                <h3 className={styles.formCardTitle}>Yeni Basvuru</h3>
              </div>

              {/* Issue Type */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Basvuru Tipi</label>
                <div className={styles.typeGrid}>
                  {issueTypeOptions.map(opt => (
                    <div
                      key={opt.key}
                      className={styles.typeCard}
                      style={formType === opt.key ? {
                        borderColor: opt.color,
                        background: opt.color + '18',
                      } : {}}
                      onClick={() => setFormType(opt.key)}
                    >
                      <span className={styles.typeCardIcon} style={{ color: opt.color }}>{opt.icon}</span>
                      <span className={styles.typeCardLabel}>{opt.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Priority + Assignee */}
              <div className={styles.fieldRow}>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.fieldLabel}>Oncelik</label>
                  <Select
                    className={styles.fieldSelect}
                    value={formPriority}
                    onChange={setFormPriority}
                  >
                    {priorityOptions.map(o => (
                      <Option key={o.key} value={o.key}>
                        <span style={{ color: o.color }}>{o.label}</span>
                      </Option>
                    ))}
                  </Select>
                </div>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.fieldLabel}>Atanacak Kisi</label>
                  <Select
                    className={styles.fieldSelect}
                    value={formAssignee}
                    onChange={setFormAssignee}
                    allowClear
                    placeholder="Secin..."
                  >
                    {users.map(u => (
                      <Option key={u.id} value={u.id}>{u.displayName}</Option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Title */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Baslik <span className={styles.required}>*</span>
                </label>
                <Input
                  className={styles.fieldInput + (titleError ? ' ' + styles.fieldInputError : '')}
                  value={formTitle}
                  onChange={e => { setFormTitle(e.target.value); if (e.target.value.trim()) setTitleError(false); }}
                  placeholder="Sorunu kisaca aciklayin..."
                  maxLength={200}
                />
                {titleError && <span className={styles.errorMsg}>Baslik zorunludur</span>}
              </div>

              {/* Description */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                  Aciklama <span className={styles.required}>*</span>
                </label>
                <TextArea
                  className={styles.fieldInput + (descError ? ' ' + styles.fieldInputError : '')}
                  value={formDesc}
                  onChange={e => { setFormDesc(e.target.value); if (e.target.value.trim()) setDescError(false); }}
                  rows={6}
                  placeholder="Sorunu detaylica anlatin. Adimlar, beklenen/gerceklesen davranis, ekran goruntuleri vs."
                />
                {descError && <span className={styles.errorMsg}>Aciklama zorunludur</span>}
              </div>

              {/* Dosya / Görsel Ekle */}
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Dosya / Görsel Ekle (opsiyonel)</label>
                <Upload
                  multiple
                  showUploadList={false}
                  beforeUpload={(file) => {
                    setPendingFiles((prev) => [...prev, file]);
                    return false;
                  }}
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                >
                  <Button icon={<PaperClipOutlined />}>Dosya Seç</Button>
                </Upload>

                {pendingFiles.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {pendingFiles.map((f, i) => {
                      const isImg = f.type.startsWith('image/');
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 10px',
                            background: '#1D2125',
                            borderRadius: 6,
                            border: '1px solid #2C333A',
                          }}
                        >
                          {isImg
                            ? <FileImageOutlined style={{ color: '#579DFF', fontSize: 16, flexShrink: 0 }} />
                            : <FileOutlined style={{ color: '#579DFF', fontSize: 16, flexShrink: 0 }} />
                          }
                          <span style={{ flex: 1, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                              padding: '2px 4px',
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          >
                            <CloseOutlined />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={submitting}
                onClick={handleSubmit}
                className={styles.submitBtn}
              >
                Basvuruyu Gonder
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === 'submissions' && (
        <div className={styles.submissionsWrapper}>
          <div className={styles.submissionsHeader}>
            <span className={styles.submissionsCount}>
              {submissions.length} basvuru ({pendingCount} beklemede)
            </span>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => { loadSubmissions(); loadPendingCount(); }}>
              Yenile
            </Button>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
          ) : submissions.length === 0 ? (
            <div className={styles.emptySubmissions}>
              <FormOutlined style={{ fontSize: 40, color: '#3D4B57' }} />
              <span>Henuz basvuru yok</span>
            </div>
          ) : (
            <div className={styles.submissionsList}>
              {submissions.map(s => (
                <div
                  key={s.id}
                  className={
                    styles.submissionCard +
                    (s.status === 'accepted' ? ' ' + styles.statusAcceptedCard : '') +
                    (s.status === 'rejected' ? ' ' + styles.statusRejectedCard : '')
                  }
                >
                  <div className={styles.submissionLeft}>
                    <span className={styles.submissionTypeIcon} style={{ color: getTypeColor(s.issueTypeKey) }}>
                      {getTypeIcon(s.issueTypeKey)}
                    </span>
                    <div className={styles.submissionInfo}>
                      <span className={styles.submissionTitle}>{s.title}</span>
                      {(() => {
                        const { text, attachments: atts } = parseSubmissionDesc(s.description);
                        return (
                          <>
                            <span className={styles.submissionDesc}>{text}</span>
                            {atts.length > 0 && (
                              <div className={styles.attachStrip}>
                                {atts.filter(a => a.isImage).slice(0, 4).map((a, i) => (
                                  <img
                                    key={i}
                                    src={a.url}
                                    alt={a.name}
                                    className={styles.attachThumb}
                                    onClick={() => window.open(a.url, '_blank')}
                                  />
                                ))}
                                {atts.filter(a => !a.isImage).map((a, i) => (
                                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className={styles.attachFileLink}>
                                    <FileOutlined /> {a.name}
                                  </a>
                                ))}
                                {atts.filter(a => a.isImage).length > 4 && (
                                  <span className={styles.attachMore}>+{atts.filter(a => a.isImage).length - 4}</span>
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}
                      <div className={styles.submissionMeta}>
                        <span className={styles.submissionBy}>
                          {s.submittedBy?.displayName || 'Anonim'}
                        </span>
                        <span className={styles.submissionDate}>
                          {dayjs(s.createdAt).format('DD.MM.YYYY HH:mm')}
                        </span>
                        <Tag color="default" style={{ fontSize: 10 }}>{s.priority}</Tag>
                      </div>
                    </div>
                  </div>
                  <div className={styles.submissionRight}>
                    {s.status === 'pending' && (
                      <>
                        <span className={styles.statusPending}>
                          <ClockCircleOutlined /> Bekliyor
                        </span>
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                          onClick={() => handleAccept(s.id)}>
                          Kabul
                        </Button>
                        <Button size="small" danger icon={<CloseCircleOutlined />}
                          onClick={() => handleReject(s.id)}>
                          Reddet
                        </Button>
                      </>
                    )}
                    {s.status === 'accepted' && (
                      <span className={styles.statusAccepted}>
                        <CheckCircleOutlined /> Kabul Edildi
                      </span>
                    )}
                    {s.status === 'rejected' && (
                      <span className={styles.statusRejected}>
                        <CloseCircleOutlined /> Reddedildi
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
