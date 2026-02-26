import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Input, Button, Select, Switch, Avatar, Tooltip, message, Spin, Popconfirm } from 'antd';
import {
  SettingOutlined, TeamOutlined, ApartmentOutlined, BellOutlined, WarningOutlined,
  RocketOutlined, DeleteOutlined, PlusOutlined, EditOutlined, SaveOutlined,
  UserAddOutlined, CheckOutlined, CloseOutlined,
} from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import { projectAPI } from '../../api/projects';
import { boardAPI } from '../../api/boards';
import client from '../../api/client';
import type { IssueType, Column } from '../../types';
import styles from './ProjectSettingsPage.module.css';

type TabKey = 'genel' | 'uyeler' | 'is-akisi' | 'is-turleri' | 'bildirimler' | 'tehlikeli';

interface Member {
  id: string;
  user_id: string;
  full_name?: string;
  display_name?: string;
  username?: string;
  email?: string;
  role: 'admin' | 'member' | 'viewer';
}

export default function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject } = useProjectStore();
  const [activeTab, setActiveTab] = useState<TabKey>('genel');

  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [savingGeneral, setSavingGeneral] = useState(false);

  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [addMemberRole, setAddMemberRole] = useState<string>('member');
  const [addingMember, setAddingMember] = useState(false);

  const [boards, setBoards] = useState<any[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [editingColumns, setEditingColumns] = useState<Column[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [savingWorkflow, setSavingWorkflow] = useState(false);

  const [issueTypes, setIssueTypes] = useState<IssueType[]>([]);
  const [issueTypesLoading, setIssueTypesLoading] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editTypeData, setEditTypeData] = useState<Partial<IssueType>>({});
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('');
  const [newTypeColor, setNewTypeColor] = useState('#0052CC');
  const [addingType, setAddingType] = useState(false);

  const [notifAssign, setNotifAssign] = useState(true);
  const [notifComment, setNotifComment] = useState(true);
  const [notifStatus, setNotifStatus] = useState(false);
  const [notifDue, setNotifDue] = useState(true);

  useEffect(() => { if (projectId) fetchProject(projectId); }, [projectId]);
  useEffect(() => {
    if (currentProject) {
      setProjectName(currentProject.name || '');
      setProjectDesc(currentProject.description || '');
    }
  }, [currentProject]);

  useEffect(() => {
    if (activeTab === 'uyeler' && projectId) {
      loadMembers();
      client.get('/users').then((res) => {
        const data = (res.data as any).data ?? res.data;
        setAllUsers(Array.isArray(data) ? data : []);
      }).catch(() => setAllUsers([]));
    }
  }, [activeTab, projectId]);
  useEffect(() => { if (activeTab === 'is-akisi' && projectId) loadBoards(); }, [activeTab, projectId]);
  useEffect(() => { if (activeTab === 'is-turleri' && projectId) loadIssueTypes(); }, [activeTab, projectId]);

  const loadMembers = async () => {
    if (!projectId) return;
    setMembersLoading(true);
    try {
      const res = await client.get(`/projects/${projectId}`);
      const project = (res.data as any).data ?? res.data;
      setMembers((project?.members || []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id || m.userId,
        full_name: m.user?.full_name || m.user?.fullName,
        display_name: m.user?.display_name || m.user?.displayName,
        username: m.user?.username,
        email: m.user?.email,
        role: m.role,
      })));
    } catch { message.error('Üyeler yüklenemedi'); }
    finally { setMembersLoading(false); }
  };

  const loadBoards = async () => {
    if (!projectId) return;
    setWorkflowLoading(true);
    try {
      const res = await boardAPI.listByProject(projectId);
      const data = (res.data as any).data ?? res.data;
      const list = Array.isArray(data) ? data : [];
      setBoards(list);
      if (list.length > 0) {
        setSelectedBoardId(list[0].id);
        await loadColumns(list[0].id);
      }
    } catch { message.error('Panolar yüklenemedi'); }
    finally { setWorkflowLoading(false); }
  };

  const loadColumns = async (boardId: string) => {
    try {
      const res = await boardAPI.getById('', boardId);
      const data = (res.data as any).data ?? res.data;
      const cols: Column[] = (data?.columns || []).sort((a: Column, b: Column) => a.position - b.position);
      setEditingColumns(cols.map((c) => ({ ...c })));
    } catch { message.error('Sütunlar yüklenemedi'); }
  };

  const loadIssueTypes = async () => {
    if (!projectId) return;
    setIssueTypesLoading(true);
    try {
      const res = await client.get(`/projects/${projectId}/issue-types`);
      const data = (res.data as any).data ?? res.data;
      setIssueTypes(Array.isArray(data) ? data : []);
    } catch { message.error('İş türleri yüklenemedi'); }
    finally { setIssueTypesLoading(false); }
  };

  const handleSaveGeneral = async () => {
    if (!projectId) return;
    setSavingGeneral(true);
    try {
      await projectAPI.update(projectId, { name: projectName, description: projectDesc });
      await fetchProject(projectId);
      message.success('Proje ayarları kaydedildi');
    } catch { message.error('Kaydetme başarısız'); }
    finally { setSavingGeneral(false); }
  };

  const handleAddMember = async () => {
    if (!projectId || !selectedUserId) return;
    setAddingMember(true);
    try {
      await projectAPI.addMember(projectId, { user_id: selectedUserId, role: addMemberRole });
      message.success('Üye eklendi');
      setSelectedUserId(null);
      await loadMembers();
    } catch (err: any) { message.error(err?.response?.data?.error || 'Üye eklenemedi'); }
    finally { setAddingMember(false); }
  };

  const handleChangeRole = async (userId: string, role: string) => {
    if (!projectId) return;
    try {
      await projectAPI.updateMemberRole(projectId, userId, role);
      setMembers((prev) => prev.map((m) => (m.user_id === userId ? { ...m, role: role as any } : m)));
      message.success('Rol güncellendi');
    } catch { message.error('Rol güncellenemedi'); }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!projectId) return;
    try {
      await projectAPI.removeMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      message.success('Üye çıkarıldı');
    } catch { message.error('Üye çıkarılamadı'); }
  };

  const handleAddColumn = async () => {
    if (!selectedBoardId) return;
    try {
      await boardAPI.createColumn('', selectedBoardId, { name: 'YENİ ADIM', category: 'in_progress', wip_limit: 0, color: '#579DFF' });
      await loadColumns(selectedBoardId);
      message.success('Sütun eklendi');
    } catch { message.error('Sütun eklenemedi'); }
  };

  const handleSaveWorkflow = async () => {
    if (!selectedBoardId) return;
    setSavingWorkflow(true);
    try {
      for (const col of editingColumns) {
        await boardAPI.updateColumn('', selectedBoardId, col.id, {
          name: col.name, category: col.category, color: col.color, wip_limit: col.wip_limit,
        });
      }
      await boardAPI.reorderColumns('', selectedBoardId, { column_ids: editingColumns.map((c) => c.id) });
      await loadColumns(selectedBoardId);
      message.success('İş akışı güncellendi');
    } catch { message.error('Kaydetme başarısız'); }
    finally { setSavingWorkflow(false); }
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (!selectedBoardId) return;
    try {
      await boardAPI.deleteColumn('', selectedBoardId, columnId);
      await loadColumns(selectedBoardId);
      message.success('Sütun silindi');
    } catch { message.error('Sütun silinemedi'); }
  };

  const handleSaveIssueType = async (id: string) => {
    try {
      await client.patch(`/issue-types/${id}`, editTypeData);
      message.success('İş türü güncellendi');
      setEditingTypeId(null);
      await loadIssueTypes();
    } catch { message.error('Güncelleme başarısız'); }
  };

  const handleAddIssueType = async () => {
    if (!projectId || !newTypeName.trim()) return;
    setAddingType(true);
    try {
      await client.post(`/projects/${projectId}/issue-types`, {
        name: newTypeName, icon: newTypeIcon || '📋', color: newTypeColor,
      });
      message.success('İş türü eklendi');
      setNewTypeName('');
      setNewTypeIcon('');
      await loadIssueTypes();
    } catch { message.error('İş türü eklenemedi'); }
    finally { setAddingType(false); }
  };

  const handleDeleteIssueType = async (id: string) => {
    try {
      await client.delete(`/issue-types/${id}`);
      message.success('İş türü silindi');
      await loadIssueTypes();
    } catch { message.error('Silme başarısız'); }
  };

  const handleArchive = async () => {
    if (!projectId) return;
    try {
      await projectAPI.archive(projectId);
      message.success('Proje arşivlendi');
      navigate('/projeler');
    } catch { message.error('Arşivleme başarısız'); }
  };

  const handleDeleteProject = async () => {
    if (!projectId) return;
    try {
      await projectAPI.delete(projectId);
      message.success('Proje silindi');
      navigate('/projeler');
    } catch { message.error('Silme başarısız'); }
  };

  // ─── Renders ─────────────────────────────────────────────────────────────────

  const renderGenel = () => (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Proje Bilgileri</h3>
      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Proje Adı</label>
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className={styles.input} placeholder="Proje adını girin" />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.label}>Proje Anahtarı</label>
          <Input value={currentProject?.key || ''} className={styles.input} disabled />
          <span className={styles.hint}>Proje anahtarı değiştirilemez</span>
        </div>
        <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
          <label className={styles.label}>Açıklama</label>
          <Input.TextArea value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} className={styles.input} rows={3} placeholder="Proje hakkında kısa bir açıklama" />
        </div>
      </div>
      <div className={styles.infoCard}>
        <div className={styles.infoRow}><span className={styles.infoLabel}>Proje ID</span><code className={styles.infoValue}>{projectId}</code></div>
        <div className={styles.infoRow}><span className={styles.infoLabel}>Proje Anahtarı</span><code className={styles.infoValue}>{currentProject?.key}</code></div>
        <div className={styles.infoRow}><span className={styles.infoLabel}>Toplam Bilet</span><span className={styles.infoValue}>{currentProject?.issue_counter ?? 0}</span></div>
      </div>
      <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveGeneral} loading={savingGeneral} className={styles.saveBtn}>
        Değişiklikleri Kaydet
      </Button>
    </div>
  );

  const renderUyeler = () => (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>Proje Üyeleri ({members.length})</h3>
      </div>
      <div className={styles.addMemberRow}>
        <Select
          showSearch style={{ flex: 1 }} placeholder="Kullanıcı ara (isim veya e-posta)"
          value={selectedUserId} onChange={setSelectedUserId} allowClear
          filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
          options={allUsers.filter((u) => !members.some((m) => m.user_id === u.id)).map((u) => ({
            value: u.id,
            label: `${u.display_name || u.full_name || u.username} (${u.email || u.username})`,
          }))}
        />
        <Select value={addMemberRole} onChange={setAddMemberRole} style={{ width: 130 }}
          options={[{ value: 'admin', label: 'Yönetici' }, { value: 'member', label: 'Üye' }, { value: 'viewer', label: 'Görüntüleyici' }]}
        />
        <Button type="primary" icon={<UserAddOutlined />} onClick={handleAddMember} loading={addingMember} disabled={!selectedUserId}>
          Ekle
        </Button>
      </div>
      {membersLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div className={styles.memberList}>
          {members.map((m) => (
            <div key={m.id} className={styles.memberRow}>
              <Avatar style={{ backgroundColor: '#0052CC', fontSize: 13, flexShrink: 0 }} size={36}>
                {(m.display_name || m.full_name || m.username || '?')[0]?.toUpperCase()}
              </Avatar>
              <div className={styles.memberInfo}>
                <span className={styles.memberName}>{m.display_name || m.full_name || m.username}</span>
                <span className={styles.memberEmail}>{m.email || m.username}</span>
              </div>
              <Select value={m.role} onChange={(val) => handleChangeRole(m.user_id, val)} className={styles.roleSelect} size="small"
                options={[{ value: 'admin', label: 'Yönetici' }, { value: 'member', label: 'Üye' }, { value: 'viewer', label: 'Görüntüleyici' }]}
              />
              <Popconfirm title="Bu üyeyi projeden çıkarmak istediğinize emin misiniz?" onConfirm={() => handleRemoveMember(m.user_id)} okText="Çıkar" cancelText="İptal">
                <Tooltip title="Projeden çıkar">
                  <Button size="small" danger icon={<DeleteOutlined />} className={styles.removeBtn} />
                </Tooltip>
              </Popconfirm>
            </div>
          ))}
          {members.length === 0 && <div style={{ color: '#5C6573', padding: 16, textAlign: 'center' }}>Üye bulunamadı</div>}
        </div>
      )}
      <div className={styles.infoCard} style={{ marginTop: 20 }}>
        <p className={styles.roleDesc}><strong>Yönetici:</strong> Projeyi düzenleyebilir, üye ekleyip çıkarabilir.</p>
        <p className={styles.roleDesc}><strong>Üye:</strong> Bilet oluşturabilir, güncelleyebilir ve atayabilir.</p>
        <p className={styles.roleDesc}><strong>Görüntüleyici:</strong> Sadece görüntüleyebilir.</p>
      </div>
    </div>
  );

  const renderIsAkisi = () => (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>İş Akışı Sütunları</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {boards.length > 1 && (
            <Select value={selectedBoardId} style={{ width: 160 }} size="small"
              onChange={async (val) => { setSelectedBoardId(val); await loadColumns(val); }}
              options={boards.map((b) => ({ value: b.id, label: b.name }))}
            />
          )}
          <Button size="small" icon={<PlusOutlined />} className={styles.addBtn} onClick={handleAddColumn}>
            Sütun Ekle
          </Button>
        </div>
      </div>
      <p className={styles.sectionDesc}>Biletlerin geçtiği sütunları düzenleyin. Ad, kategori ve WIP limiti özelleştirilebilir.</p>
      {workflowLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div className={styles.workflowList}>
          {editingColumns.map((col, idx) => (
            <div key={col.id} className={styles.workflowStep}>
              <span className={styles.stepIndex}>{idx + 1}</span>
              <div className={styles.stepColorDot} style={{ background: col.color || '#579DFF' }} />
              <Input
                value={col.name} className={styles.workflowInput} size="small"
                onChange={(e) => setEditingColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, name: e.target.value } : c)))}
              />
              <Select value={col.category} size="small" className={styles.categorySelect}
                onChange={(val) => setEditingColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, category: val } : c)))}
                options={[{ value: 'todo', label: 'Yapılacak' }, { value: 'in_progress', label: 'Devam Ediyor' }, { value: 'done', label: 'Tamamlandı' }]}
              />
              <Input type="number" min={0} value={col.wip_limit || 0} title="WIP Limiti (0=sınırsız)"
                onChange={(e) => setEditingColumns((prev) => prev.map((c) => (c.id === col.id ? { ...c, wip_limit: parseInt(e.target.value) || 0 } : c)))}
                className={styles.workflowInput} style={{ width: 70 }} size="small" placeholder="WIP"
              />
              <Popconfirm title="Bu sütunu silmek istediğinize emin misiniz?" onConfirm={() => handleDeleteColumn(col.id)} okText="Sil" cancelText="İptal" disabled={editingColumns.length <= 2}>
                <Button size="small" danger icon={<DeleteOutlined />} disabled={editingColumns.length <= 2} />
              </Popconfirm>
            </div>
          ))}
        </div>
      )}
      <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveWorkflow} loading={savingWorkflow} className={styles.saveBtn} disabled={workflowLoading}>
        Kaydet
      </Button>
    </div>
  );

  const renderIsTurleri = () => (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}><h3 className={styles.sectionTitle}>İş Türleri</h3></div>
      <p className={styles.sectionDesc}>Projede kullanılacak iş türlerini yapılandırın.</p>
      {issueTypesLoading ? (
        <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
      ) : (
        <div className={styles.issueTypeList}>
          {issueTypes.map((type) => (
            <div key={type.id} className={styles.issueTypeCard}>
              <div className={styles.issueTypeHeader}>
                <span className={styles.issueTypeIcon}>{type.icon || '📋'}</span>
                {editingTypeId === type.id ? (
                  <>
                    <Input value={editTypeData.name ?? type.name} size="small" style={{ width: 140 }}
                      onChange={(e) => setEditTypeData((d) => ({ ...d, name: e.target.value }))} />
                    <Input value={editTypeData.icon ?? type.icon} size="small" style={{ width: 50, textAlign: 'center', marginLeft: 6 }}
                      onChange={(e) => setEditTypeData((d) => ({ ...d, icon: e.target.value }))} placeholder="emoji" />
                    <Input value={editTypeData.color ?? type.color} size="small" style={{ width: 90, marginLeft: 6 }}
                      onChange={(e) => setEditTypeData((d) => ({ ...d, color: e.target.value }))} placeholder="#color" />
                  </>
                ) : (
                  <span className={styles.issueTypeName} style={{ color: type.color }}>{type.name}</span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {editingTypeId === type.id ? (
                    <>
                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleSaveIssueType(type.id)} />
                      <Button size="small" icon={<CloseOutlined />} onClick={() => setEditingTypeId(null)} />
                    </>
                  ) : (
                    <>
                      <Button size="small" icon={<EditOutlined />}
                        onClick={() => { setEditingTypeId(type.id); setEditTypeData({ name: type.name, icon: type.icon, color: type.color }); }}
                        style={{ background: 'transparent', border: 'none', color: '#8C9BAB' }}
                      />
                      <Popconfirm title="Bu iş türünü silmek istediğinize emin misiniz?" onConfirm={() => handleDeleteIssueType(type.id)} okText="Sil" cancelText="İptal">
                        <Button size="small" icon={<DeleteOutlined />} danger style={{ background: 'transparent', border: 'none' }} />
                      </Popconfirm>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={styles.addTypeRow}>
        <h4 style={{ fontSize: 13, color: '#B6C2CF', margin: '0 0 8px' }}>Yeni Tür Ekle</h4>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <Input value={newTypeIcon} onChange={(e) => setNewTypeIcon(e.target.value)} placeholder="emoji" style={{ width: 60, textAlign: 'center' }} size="small" />
          <Input value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} placeholder="Tür adı" style={{ flex: 1, minWidth: 120 }} size="small" />
          <Input value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} placeholder="#0052CC" style={{ width: 100 }} size="small" />
          <Button type="primary" icon={<PlusOutlined />} size="small" loading={addingType} onClick={handleAddIssueType} disabled={!newTypeName.trim()}>
            Ekle
          </Button>
        </div>
      </div>
    </div>
  );

  const renderBildirimler = () => (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle}>Bildirim Tercihleri</h3>
      <p className={styles.sectionDesc}>Bu projede hangi durumlarda bildirim almak istediğinizi seçin.</p>
      <div className={styles.notifList}>
        {[
          { label: 'Bana atanan biletler', desc: 'Bir bilet size atandığında bildirim alın.', val: notifAssign, set: setNotifAssign },
          { label: 'Yorumlar', desc: 'Takip ettiğiniz biletlere yorum yapıldığında.', val: notifComment, set: setNotifComment },
          { label: 'Durum değişiklikleri', desc: 'Bilet durumu değiştiğinde bildirim alın.', val: notifStatus, set: setNotifStatus },
          { label: 'Bitiş tarihi yaklaşıyor', desc: 'Son tarihe 2 gün kala hatırlatma alın.', val: notifDue, set: setNotifDue },
        ].map((item) => (
          <div key={item.label} className={styles.notifRow}>
            <div className={styles.notifInfo}>
              <span className={styles.notifTitle}>{item.label}</span>
              <span className={styles.notifDesc}>{item.desc}</span>
            </div>
            <Switch checked={item.val} onChange={item.set} />
          </div>
        ))}
      </div>
      <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('Bildirim tercihleri kaydedildi')} className={styles.saveBtn}>
        Kaydet
      </Button>
    </div>
  );

  const renderTehlikeli = () => (
    <div className={styles.tabContent}>
      <h3 className={styles.sectionTitle} style={{ color: '#FF5630' }}>⚠ Tehlikeli Bölge</h3>
      <p className={styles.sectionDesc}>Bu bölgedeki işlemler geri alınamaz. Lütfen dikkatli olun.</p>
      <div className={styles.dangerCard}>
        <div className={styles.dangerInfo}>
          <span className={styles.dangerTitle}>Projeyi Arşivle</span>
          <span className={styles.dangerDesc}>Proje arşive taşınır, biletler korunur ancak aktif listede görünmez.</span>
        </div>
        <Popconfirm
          title={`"${currentProject?.name}" projesini arşivlemek istediğinize emin misiniz?`}
          onConfirm={handleArchive} okText="Arşivle" cancelText="İptal"
        >
          <Button danger>Arşivle</Button>
        </Popconfirm>
      </div>
      <div className={styles.dangerCard} style={{ borderColor: '#FF5630' }}>
        <div className={styles.dangerInfo}>
          <span className={styles.dangerTitle}>Projeyi Sil</span>
          <span className={styles.dangerDesc}>Proje ve tüm içeriği kalıcı olarak silinir. Bu işlem GERİ ALINAMAZ.</span>
        </div>
        <Popconfirm
          title={`"${currentProject?.name}" projesini kalıcı olarak silmek istediğinize emin misiniz?`}
          description="Bu işlem geri alınamaz!"
          onConfirm={handleDeleteProject} okText="Evet, Sil" okButtonProps={{ danger: true }} cancelText="İptal"
        >
          <Button danger type="primary">Projeyi Sil</Button>
        </Popconfirm>
      </div>
    </div>
  );

  const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'genel', label: 'Genel', icon: <SettingOutlined /> },
    { key: 'uyeler', label: 'Üyeler', icon: <TeamOutlined /> },
    { key: 'is-akisi', label: 'İş Akışı', icon: <ApartmentOutlined /> },
    { key: 'is-turleri', label: 'İş Türleri', icon: <RocketOutlined /> },
    { key: 'bildirimler', label: 'Bildirimler', icon: <BellOutlined /> },
    { key: 'tehlikeli', label: 'Tehlikeli Bölge', icon: <WarningOutlined /> },
  ];

  const tabContent: Record<TabKey, React.ReactNode> = {
    genel: renderGenel(),
    uyeler: renderUyeler(),
    'is-akisi': renderIsAkisi(),
    'is-turleri': renderIsTurleri(),
    bildirimler: renderBildirimler(),
    tehlikeli: renderTehlikeli(),
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <SettingOutlined className={styles.pageHeaderIcon} />
        <div>
          <h2 className={styles.pageTitle}>Proje Ayarları</h2>
          <p className={styles.pageSubtitle}>{currentProject?.name || '...'}</p>
        </div>
      </div>
      <div className={styles.layout}>
        <nav className={styles.settingsNav}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`${styles.settingsNavItem} ${activeTab === tab.key ? styles.settingsNavItemActive : ''} ${tab.key === 'tehlikeli' ? styles.settingsNavDanger : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span className={styles.settingsNavIcon}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
        <main className={styles.settingsContent}>{tabContent[activeTab]}</main>
      </div>
    </div>
  );
}
