import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Button, message, Select, Tag } from 'antd';
import {
  CheckOutlined,
  PlusOutlined,
  CloseOutlined,
  UserAddOutlined,
  RocketOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import styles from './CreateProjectWizard.module.css';

const { Option } = Select;

interface IssueTypeOption {
  key: string;
  name: string;
  description: string;
  icon: string;
  iconColor: string;
}

interface InvitedMember {
  email: string;
  role: 'admin' | 'member' | 'viewer';
}

const ISSUE_TYPE_OPTIONS: IssueTypeOption[] = [
  {
    key: 'epic',
    name: 'Epic 🚀',
    description: 'Büyük özellik veya ana iş grubu. Birden fazla Story içerir.',
    icon: '🚀',
    iconColor: '#6554C0',
  },
  {
    key: 'story',
    name: 'Story',
    description: "Kullanıcı bakış açısından yazılmış özellik. Örn: \"Bir kullanıcı olarak giriş yapabilmek istiyorum.\"",
    icon: '📗',
    iconColor: '#36B37E',
  },
  {
    key: 'task',
    name: 'Task',
    description: 'Teknik veya operasyonel iş. Sunucu kurulumu, kod refactor vb.',
    icon: '✅',
    iconColor: '#0052CC',
  },
  {
    key: 'bug',
    name: 'Bug',
    description: 'Yazılımda tespit edilen hata veya beklenmedik davranış.',
    icon: '🔴',
    iconColor: '#FF5630',
  },
];

const DEFAULT_STATUSES = ['To Do', 'In Progress', 'In Review', 'Done'];

export default function CreateProjectWizard() {
  const navigate = useNavigate();
  const createProject = useProjectStore((s) => s.createProject);

  const [step, setStep] = useState(1);

  // Step 1: İş türleri
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['epic', 'story', 'task', 'bug'])
  );

  // Step 2: İş akışı
  const [statuses, setStatuses] = useState<string[]>([...DEFAULT_STATUSES]);

  // Step 3: Proje adı
  const [projectName, setProjectName] = useState('');
  const [projectKey, setProjectKey] = useState('');

  // Step 4: Ekip davet
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const toggleType = (key: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleStatusChange = (index: number, value: string) => {
    setStatuses((prev) => prev.map((s, i) => (i === index ? value : s)));
  };

  const removeStatus = (index: number) => {
    if (statuses.length <= 2) return;
    setStatuses((prev) => prev.filter((_, i) => i !== index));
  };

  const addStatus = () => {
    setStatuses((prev) => [...prev, '']);
  };

  const handleNameChange = (value: string) => {
    setProjectName(value);
    const key = value
      .toUpperCase()
      .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ü/g, 'U')
      .replace(/Ş/g, 'S').replace(/Ç/g, 'C').replace(/Ğ/g, 'G')
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6);
    setProjectKey(key);
  };

  const addInvite = () => {
    if (!inviteEmail.trim()) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      message.warning('Geçerli bir e-posta adresi girin.');
      return;
    }
    if (invitedMembers.find((m) => m.email === inviteEmail)) {
      message.warning('Bu e-posta zaten eklendi.');
      return;
    }
    setInvitedMembers((prev) => [...prev, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
  };

  const removeInvite = (email: string) => {
    setInvitedMembers((prev) => prev.filter((m) => m.email !== email));
  };

  const handleFinish = async () => {
    if (!projectName.trim() || !projectKey.trim()) {
      message.warning('Proje adı ve anahtarı zorunludur.');
      return;
    }
    try {
      const project = await createProject({
        name: projectName,
        key: projectKey,
        description: '',
      });
      if (invitedMembers.length > 0) {
        message.success(`Proje oluşturuldu! ${invitedMembers.length} kişiye davet gönderildi.`);
      } else {
        message.success('Proje oluşturuldu!');
      }
      navigate(`/proje/${project.id}/pano/default`);
    } catch {
      message.error('Proje oluşturulamadı.');
    }
  };

  const previewColumns = statuses.filter(Boolean).map((s) => s.toUpperCase());

  const stepLabels = ['İş Türleri', 'İş Akışı', 'Proje Adı', 'Ekip'];

  return (
    <div className={styles.wizardPage}>
      {/* Logo */}
      <div className={styles.logoRow}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path
            d="M11.53 2c0 5.24 4.23 9.47 9.47 9.47v1.06c-5.24 0-9.47 4.23-9.47 9.47h-1.06c0-5.24-4.23-9.47-9.47-9.47v-1.06c5.24 0 9.47-4.23 9.47-9.47h1.06z"
            fill="#2684FF"
          />
        </svg>
        <span className={styles.logoText}>İMAR</span>
      </div>

      {/* Step Bar */}
      <div className={styles.stepBar}>
        {stepLabels.map((label, idx) => (
          <div key={idx} className={styles.stepBarItem}>
            <div
              className={`${styles.stepCircle} ${step > idx + 1 ? styles.stepCircleDone : step === idx + 1 ? styles.stepCircleActive : ''}`}
            >
              {step > idx + 1 ? <CheckOutlined /> : idx + 1}
            </div>
            <span className={`${styles.stepBarLabel} ${step === idx + 1 ? styles.stepBarLabelActive : ''}`}>
              {label}
            </span>
            {idx < stepLabels.length - 1 && (
              <div className={`${styles.stepBarLine} ${step > idx + 1 ? styles.stepBarLineDone : ''}`} />
            )}
          </div>
        ))}
      </div>

      <div className={styles.wizardContent}>
        {/* Sol: Form */}
        <div className={styles.formSide}>

          {/* ── STEP 1: İş Türleri ── */}
          {step === 1 && (
            <>
              <h1 className={styles.stepTitle}>Hangi iş türlerini kullanacaksınız?</h1>
              <p className={styles.stepSubtitle}>
                Bunlar projenizdeki iş parçalarının temel yapı taşlarıdır.
              </p>
              <div className={styles.typeList}>
                {ISSUE_TYPE_OPTIONS.map((t) => (
                  <button
                    key={t.key}
                    className={`${styles.typeOption} ${selectedTypes.has(t.key) ? styles.typeOptionSelected : ''}`}
                    onClick={() => toggleType(t.key)}
                  >
                    <span className={styles.typeIcon}>{t.icon}</span>
                    <div className={styles.typeInfo}>
                      <div className={styles.typeName}>{t.name}</div>
                      <div className={styles.typeDesc}>{t.description}</div>
                    </div>
                    {selectedTypes.has(t.key) && (
                      <CheckOutlined className={styles.typeCheck} />
                    )}
                  </button>
                ))}
              </div>
              <p className={styles.note}>Sonradan değiştirebilirsiniz.</p>
              <Button type="primary" size="large" className={styles.nextBtn} onClick={() => setStep(2)}>
                İleri
              </Button>
            </>
          )}

          {/* ── STEP 2: İş Akışı ── */}
          {step === 2 && (
            <>
              <h1 className={styles.stepTitle}>İşleri nasıl takip edeceksiniz?</h1>
              <p className={styles.stepSubtitle}>
                Biletler tamamlandıkça bu aşamalardan geçer.
              </p>
              <div className={styles.statusList}>
                {statuses.map((status, idx) => (
                  <div key={idx} className={styles.statusRow}>
                    <Input
                      value={status}
                      onChange={(e) => handleStatusChange(idx, e.target.value)}
                      className={styles.statusInput}
                      placeholder={`Adım ${idx + 1}`}
                    />
                    <button className={styles.removeStatusBtn} onClick={() => removeStatus(idx)}>
                      <CloseOutlined />
                    </button>
                  </div>
                ))}
                <button className={styles.addStatusBtn} onClick={addStatus}>
                  <PlusOutlined /> Adım ekle
                </button>
              </div>
              <p className={styles.note}>Sonradan değiştirebilirsiniz.</p>
              <div className={styles.btnRow}>
                <Button size="large" onClick={() => setStep(1)}>Geri</Button>
                <Button type="primary" size="large" onClick={() => setStep(3)}>İleri</Button>
              </div>
            </>
          )}

          {/* ── STEP 3: Proje Adı ── */}
          {step === 3 && (
            <>
              <h1 className={styles.stepTitle}>Projeye isim verin</h1>
              <p className={styles.stepSubtitle}>
                Projeniz için bir ad ve kısa anahtar seçin.
              </p>
              <div className={styles.nameForm}>
                <label className={styles.formLabel}>Proje Adı <span style={{ color: '#FF5630' }}>*</span></label>
                <Input
                  value={projectName}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="örn. İMAR Kanban Projesi"
                  size="large"
                />
                <label className={styles.formLabel} style={{ marginTop: 16 }}>
                  Proje Anahtarı <span style={{ color: '#FF5630' }}>*</span>
                </label>
                <Input
                  value={projectKey}
                  onChange={(e) =>
                    setProjectKey(
                      e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
                    )
                  }
                  placeholder="örn. IMAR"
                  size="large"
                  addonAfter={<span style={{ color: '#8C9BAB', fontSize: 11 }}>Bilet numarasında kullanılır: {projectKey || 'PRJKT'}-1</span>}
                />
              </div>
              <div className={styles.btnRow}>
                <Button size="large" onClick={() => setStep(2)}>Geri</Button>
                <Button
                  type="primary"
                  size="large"
                  disabled={!projectName.trim() || !projectKey.trim()}
                  onClick={() => setStep(4)}
                >
                  İleri
                </Button>
              </div>
            </>
          )}

          {/* ── STEP 4: Ekip Davet ── */}
          {step === 4 && (
            <>
              <h1 className={styles.stepTitle}>
                <TeamOutlined style={{ marginRight: 10, color: '#579DFF' }} />
                Ekibinizi davet edin
              </h1>
              <p className={styles.stepSubtitle}>
                E-posta adresleri ile ekip üyelerini projeye davet edin. Sonradan da ekleyebilirsiniz.
              </p>

              <div className={styles.inviteRow}>
                <Input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="kullanici@sirket.com"
                  onPressEnter={addInvite}
                  className={styles.inviteInput}
                />
                <Select
                  value={inviteRole}
                  onChange={(v) => setInviteRole(v)}
                  className={styles.roleSelect}
                >
                  <Option value="admin">Yönetici</Option>
                  <Option value="member">Üye</Option>
                  <Option value="viewer">Görüntüleyici</Option>
                </Select>
                <Button type="primary" icon={<UserAddOutlined />} onClick={addInvite}>
                  Ekle
                </Button>
              </div>

              {invitedMembers.length > 0 && (
                <div className={styles.invitedList}>
                  {invitedMembers.map((m) => (
                    <div key={m.email} className={styles.invitedRow}>
                      <span className={styles.invitedEmail}>{m.email}</span>
                      <Tag color={m.role === 'admin' ? 'blue' : m.role === 'viewer' ? 'default' : 'green'}>
                        {m.role === 'admin' ? 'Yönetici' : m.role === 'viewer' ? 'Görüntüleyici' : 'Üye'}
                      </Tag>
                      <button
                        className={styles.removeInviteBtn}
                        onClick={() => removeInvite(m.email)}
                      >
                        <CloseOutlined />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <p className={styles.note}>
                {invitedMembers.length === 0
                  ? 'Şimdilik atlayabilirsiniz. Proje Ayarları > Üyeler bölümünden sonra da davet edebilirsiniz.'
                  : `${invitedMembers.length} kişi davet edilecek.`}
              </p>

              <div className={styles.btnRow}>
                <Button size="large" onClick={() => setStep(3)}>Geri</Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={handleFinish}
                  className={styles.nextBtn}
                >
                  Projeyi Oluştur
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Sağ: Önizleme */}
        <div className={styles.previewSide}>
          <div className={styles.previewCard}>
            <div className={styles.previewHeader}>
              <div className={styles.previewProjectName}>{projectName || 'Proje Adı'}</div>
              <div className={styles.previewTabs}>
                <span className={styles.previewTabActive}>Pano</span>
                <span className={styles.previewTab}>Liste</span>
                <span className={styles.previewTab}>Backlog</span>
              </div>
            </div>
            {step >= 2 ? (
              <div className={styles.previewBoard}>
                {previewColumns.map((col) => (
                  <div key={col} className={styles.previewColumn}>
                    <div className={styles.previewColHeader}>{col}</div>
                    <div className={styles.previewCardPlaceholder} />
                    <div className={styles.previewCardPlaceholder} />
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.previewList}>
                {ISSUE_TYPE_OPTIONS.filter((t) => selectedTypes.has(t.key)).map((t, i) => (
                  <div key={i} className={styles.previewListRow}>
                    <span className={styles.previewListIcon}>{t.icon}</span>
                    <div className={styles.previewListBar} />
                    <div className={styles.previewListBarShort} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dots */}
      <div className={styles.stepIndicator}>
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`${styles.stepDot} ${step >= s ? styles.stepDotActive : ''}`}
          />
        ))}
      </div>
    </div>
  );
}
