import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, Input, Tooltip, Empty, Button, Dropdown, Checkbox, Spin, message, Select } from 'antd';
import {
  SearchOutlined,
  FilterOutlined,
  GroupOutlined,
  MoreOutlined,
  DownloadOutlined,
  CloseOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { issueAPI } from '../../api';
import { useProjectStore } from '../../stores/projectStore';
import IssueDetailDrawer from '../../components/board/IssueDetailDrawer';
import { useBoardStore } from '../../stores/boardStore';
import type { Issue, Column } from '../../types';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import styles from './ListPage.module.css';

// ─── Sabit görsel eşlemeler ───────────────────────────────────────────────────
const issueTypeIconMap: Record<string, string> = {
  task: '✅', görev: '✅', gorev: '✅',
  bug: '🔴', hata: '🔴',
  story: '📗', hikaye: '📗',
  epic: '🚀',
  subtask: '🔷', 'alt görev': '🔷', 'alt gorev': '🔷',
};

function getTypeIcon(issue: Issue): string {
  const name = (issue.issue_type?.name || '').toLowerCase();
  return issueTypeIconMap[name] || '📋';
}

const priorityMeta: Record<string, { icon: string; label: string; color: string }> = {
  highest: { icon: '⬆', label: 'En Yüksek', color: '#FF5630' },
  high:    { icon: '↑', label: 'Yüksek',    color: '#FF7452' },
  medium:  { icon: '—', label: 'Orta',       color: '#FFAB00' },
  low:     { icon: '↓', label: 'Düşük',      color: '#36B37E' },
  lowest:  { icon: '⬇', label: 'En Düşük',  color: '#0065FF' },
};

type GroupByKey = 'none' | 'status' | 'assignee' | 'priority' | 'type';

// ─── Helper: Issue'dan kolon/durum adını al ───────────────────────────────────
function getColName(issue: Issue): string {
  // Backend ISSUE_INCLUDE ile 'column' ilişkisi include ediliyor
  const col = (issue as any).column as { name?: string } | undefined;
  return col?.name || '—';
}

export default function ListPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { currentProject } = useProjectStore();
  const { boards, currentBoard, fetchBoards, signalIssueUpdate, lastIssueUpdate } = useBoardStore();

  const [issues, setIssues]         = useState<Issue[]>([]);
  const [loading, setLoading]       = useState(false);
  const [columns, setColumns]       = useState<Column[]>([]);

  // Drawer
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [drawerOpen, setDrawerOpen]        = useState(false);

  // Search & filter
  const [searchText, setSearchText]         = useState('');
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus]     = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterType, setFilterType]         = useState<string[]>([]);

  // Group
  const [groupBy, setGroupBy] = useState<GroupByKey>('none');

  // Board kolonlarını yükle (drawer için gerekli)
  useEffect(() => {
    if (!projectId) return;
    fetchBoards(projectId);
  }, [projectId, fetchBoards]);

  useEffect(() => {
    if (currentBoard?.columns) {
      setColumns([...currentBoard.columns].sort((a, b) => a.position - b.position));
    } else if (boards.length > 0 && boards[0]?.columns) {
      setColumns([...boards[0].columns].sort((a, b) => a.position - b.position));
    }
  }, [currentBoard, boards]);

  // Issue'ları gerçek API'den çek
  const loadIssues = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await issueAPI.list(projectId, { includeSubtasks: 'true' });
      const raw = (res.data as any).data ?? res.data;
      const list: Issue[] = Array.isArray(raw) ? raw : [];
      setIssues(list);
    } catch {
      message.error('İş kalemleri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // İlk yükleme
  useEffect(() => { loadIssues(); }, [loadIssues]);

  // Aynı oturumda issue güncellenince listeyi yenile
  useEffect(() => {
    if (!lastIssueUpdate) return;
    loadIssues();
  }, [lastIssueUpdate, loadIssues]);

  // 30 saniyede bir yenile — başka kullanıcıların değişikliklerini yakala
  useEffect(() => {
    const interval = setInterval(() => { loadIssues(); }, 30_000);
    return () => clearInterval(interval);
  }, [loadIssues]);

  // Sekme/pencere odaklandığında anında yenile
  useEffect(() => {
    const onVisibility = () => { if (document.visibilityState === 'visible') loadIssues(); };
    window.addEventListener('focus', loadIssues);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', loadIssues);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [loadIssues]);

  // ─── Filtre seçenekleri ────────────────────────────────────────────────────
  const allStatuses = useMemo(() => {
    const set = new Set(issues.map((i) => getColName(i)));
    return Array.from(set).filter(Boolean).sort();
  }, [issues]);

  const allAssignees = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => {
      if (i.assignee) {
        const name = i.assignee.display_name || i.assignee.full_name || '';
        if (name) map.set(i.assignee.id, name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [issues]);

  const allTypes = useMemo(() => {
    const map = new Map<string, string>();
    issues.forEach((i) => {
      if (i.issue_type) map.set(i.issue_type.id, i.issue_type.name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [issues]);

  const allPriorities = ['highest', 'high', 'medium', 'low', 'lowest'];

  // ─── Filtrelenmiş liste ────────────────────────────────────────────────────
  const filteredIssues = useMemo(() => {
    let result = issues;

    if (searchText) {
      const s = searchText.toLowerCase();
      result = result.filter(
        (i) => i.title.toLowerCase().includes(s) || i.issue_key.toLowerCase().includes(s)
      );
    }
    if (filterStatus.length > 0) {
      result = result.filter((i) => filterStatus.includes(getColName(i)));
    }
    if (filterAssignee.length > 0) {
      result = result.filter((i) =>
        i.assignee ? filterAssignee.includes(i.assignee.id) : filterAssignee.includes('unassigned')
      );
    }
    if (filterPriority.length > 0) {
      result = result.filter((i) => filterPriority.includes(i.priority));
    }
    if (filterType.length > 0) {
      result = result.filter((i) => i.issue_type_id && filterType.includes(i.issue_type_id));
    }

    return result;
  }, [issues, searchText, filterStatus, filterAssignee, filterPriority, filterType]);

  const activeFilterCount = filterStatus.length + filterAssignee.length + filterPriority.length + filterType.length;
  const clearFilters = () => {
    setFilterStatus([]);
    setFilterAssignee([]);
    setFilterPriority([]);
    setFilterType([]);
  };

  // ─── Gruplama ──────────────────────────────────────────────────────────────
  const groupedIssues = useMemo(() => {
    if (groupBy === 'none') return { '': filteredIssues };
    const groups: Record<string, Issue[]> = {};
    filteredIssues.forEach((issue) => {
      let key = '';
      if (groupBy === 'status')   key = getColName(issue);
      else if (groupBy === 'assignee') key = issue.assignee?.display_name || issue.assignee?.full_name || 'Atanmadı';
      else if (groupBy === 'priority') key = issue.priority || 'medium';
      else if (groupBy === 'type')     key = issue.issue_type?.name || 'Türsüz';
      if (!groups[key]) groups[key] = [];
      groups[key].push(issue);
    });
    return groups;
  }, [filteredIssues, groupBy]);

  // ─── Excel export ──────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filteredIssues.map((issue) => ({
      'Bilet':       issue.issue_key,
      'Tür':         issue.issue_type?.name || '—',
      'Başlık':      issue.title,
      'Atanan Kişi': issue.assignee?.display_name || issue.assignee?.full_name || 'Atanmadı',
      'Raporlayan':  (issue as any).reporter?.display_name || (issue as any).reporter?.full_name || '—',
      'Öncelik':     priorityMeta[issue.priority]?.label || issue.priority || '—',
      'Durum':       getColName(issue),
      'Oluşturulan': dayjs(issue.created_at).format('DD.MM.YYYY HH:mm'),
      'Güncellendi': dayjs(issue.updated_at).format('DD.MM.YYYY HH:mm'),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'İş Kalemleri');
    const projectName = currentProject?.name || 'proje';
    XLSX.writeFile(wb, `${projectName}-liste-${dayjs().format('YYYY-MM-DD')}.xlsx`);
  };

  // ─── Satır render ──────────────────────────────────────────────────────────
  const renderRows = (list: Issue[]) =>
    list.map((issue) => {
      const colName = getColName(issue);
      const typeIcon = getTypeIcon(issue);
      const pr = priorityMeta[issue.priority] || priorityMeta.medium;
      const isSubtask = !!(issue as any).parent_id;
      const assigneeName = issue.assignee?.display_name || issue.assignee?.full_name || '';
      const reporterName = (issue as any).reporter?.display_name || (issue as any).reporter?.full_name || '';

      return (
        <tr
          key={issue.id}
          className={styles.row}
          onClick={() => { setSelectedIssue(issue); setDrawerOpen(true); }}
          style={{ cursor: 'pointer' }}
        >
          <td className={styles.tdCheckbox} onClick={(e) => e.stopPropagation()}>
            <input type="checkbox" className={styles.checkbox} />
          </td>
          <td>
            <div className={styles.issueCell} style={isSubtask ? { paddingLeft: 20 } : {}}>
              {isSubtask && <span style={{ color: '#00B8D9', fontSize: 10, marginRight: 2 }}>↳</span>}
              <span className={styles.issueTypeIcon}>{typeIcon}</span>
              <span className={styles.issueKey}>{issue.issue_key}</span>
              <span className={styles.issueTitle}>{issue.title}</span>
            </div>
          </td>
          <td>
            {issue.epic ? (
              <Tooltip title={issue.epic.name}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  padding: '1px 8px 1px 5px', borderRadius: 10,
                  border: `1px solid ${issue.epic.color || '#0052CC'}`,
                  fontSize: 11, fontWeight: 600, color: '#B6C2CF',
                  maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: issue.epic.color || '#0052CC', flexShrink: 0, display: 'inline-block' }} />
                  {issue.epic.name}
                </span>
              </Tooltip>
            ) : <span className={styles.unassigned}>—</span>}
          </td>
          <td>
            {assigneeName ? (
              <div className={styles.personCell}>
                <Avatar size={20} style={{ backgroundColor: '#0052CC', fontSize: 9 }}>
                  {assigneeName[0]?.toUpperCase()}
                </Avatar>
                <span>{assigneeName}</span>
              </div>
            ) : (
              <span className={styles.unassigned}>Atanmadı</span>
            )}
          </td>
          <td>
            {reporterName ? (
              <div className={styles.personCell}>
                <Avatar size={20} style={{ backgroundColor: '#FF5630', fontSize: 9 }}>
                  {reporterName[0]?.toUpperCase()}
                </Avatar>
                <span>{reporterName}</span>
              </div>
            ) : <span className={styles.unassigned}>—</span>}
          </td>
          <td>
            <span style={{ color: pr.color, fontWeight: 600, fontSize: 13 }}>
              {pr.icon} {pr.label}
            </span>
          </td>
          <td onClick={(e) => e.stopPropagation()}>
            {columns.length > 0 ? (
              <Select
                size="small"
                value={issue.column_id}
                className={styles.statusSelect}
                dropdownStyle={{ background: '#22272B' }}
                onChange={async (newColId) => {
                  try {
                    await issueAPI.move(projectId!, issue.id, { columnId: newColId, position: 0 });
                    signalIssueUpdate();
                    setIssues((prev) =>
                      prev.map((i) =>
                        i.id === issue.id
                          ? { ...i, column_id: newColId, column: columns.find((c) => c.id === newColId) } as any
                          : i
                      )
                    );
                  } catch {
                    message.error('Durum değiştirilemedi');
                  }
                }}
              >
                {columns.map((col) => (
                  <Select.Option key={col.id} value={col.id}>
                    <span style={{
                      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
                      background: col.color || '#0052CC', marginRight: 5, verticalAlign: 'middle',
                    }} />
                    {col.name}
                  </Select.Option>
                ))}
              </Select>
            ) : (
              <span
                className={styles.statusBadge}
                style={{ background: colName === '—' ? '#333' : '#0052CC' }}
              >
                {colName}
              </span>
            )}
          </td>
          <td>
            <span className={styles.resolution}>Çözülmemiş</span>
          </td>
          <td className={styles.dateCell}>
            {dayjs(issue.created_at).format('DD MMM YYYY HH:mm')}
          </td>
          <td className={styles.dateCell}>
            {dayjs(issue.updated_at).format('DD MMM YYYY HH:mm')}
          </td>
          <td className={styles.dateCell}>
            {dayjs(issue.created_at).add(14, 'day').format('DD MMM YYYY')}
          </td>
          <td onClick={(e) => e.stopPropagation()}>
            <button className={styles.moreBtn}><MoreOutlined /></button>
          </td>
        </tr>
      );
    });

  const groupByMenuItems = [
    { key: 'none',     label: 'Gruplama yok' },
    { key: 'status',   label: 'Duruma göre' },
    { key: 'assignee', label: 'Atanan kişiye göre' },
    { key: 'priority', label: 'Önceliğe göre' },
    { key: 'type',     label: 'Türe göre' },
  ];

  return (
    <div className={styles.page}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Input
            placeholder="Bilet arama"
            prefix={<SearchOutlined style={{ color: '#8C9BAB' }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
            size="small"
            className={styles.searchInput}
          />

          <Button
            size="small"
            icon={<FilterOutlined />}
            className={`${styles.filterBtn} ${activeFilterCount > 0 ? styles.filterBtnActive : ''}`}
            onClick={() => setShowFilterPanel((v) => !v)}
          >
            Filtrele{activeFilterCount > 0 && <span className={styles.filterBadge}>{activeFilterCount}</span>}
          </Button>

          {activeFilterCount > 0 && (
            <Button size="small" icon={<CloseOutlined />} className={styles.filterBtn} onClick={clearFilters} title="Filtreleri temizle" />
          )}

          <Dropdown
            menu={{
              items: groupByMenuItems.map((item) => ({
                key: item.key,
                label: <span style={{ color: groupBy === item.key ? '#579DFF' : undefined }}>{item.label}</span>,
                onClick: () => setGroupBy(item.key as GroupByKey),
              })),
            }}
            trigger={['click']}
          >
            <Button
              size="small"
              icon={<GroupOutlined />}
              className={`${styles.filterBtn} ${groupBy !== 'none' ? styles.filterBtnActive : ''}`}
            >
              Grupla{groupBy !== 'none' && <span className={styles.filterBadge}>{groupByMenuItems.find((g) => g.key === groupBy)?.label}</span>}
            </Button>
          </Dropdown>

          <Tooltip title="Yenile">
            <Button size="small" icon={<ReloadOutlined />} className={styles.filterBtn} onClick={loadIssues} loading={loading} />
          </Tooltip>
        </div>

        <div className={styles.toolbarRight}>
          <Button size="small" icon={<DownloadOutlined />} className={styles.exportBtn} onClick={handleExport}>
            Excel İndir
          </Button>
          <span className={styles.savedFilters} style={{ marginLeft: 12 }}>
            {filteredIssues.length} / {issues.length} bilet
          </span>
        </div>
      </div>

      {/* ── Filter Panel ─────────────────────────────────────────────────── */}
      {showFilterPanel && (
        <div className={styles.filterPanel}>
          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Durum</div>
            {allStatuses.map((s) => (
              <label key={s} className={styles.filterLabel}>
                <Checkbox
                  checked={filterStatus.includes(s)}
                  onChange={(e) => {
                    if (e.target.checked) setFilterStatus((p) => [...p, s]);
                    else setFilterStatus((p) => p.filter((x) => x !== s));
                  }}
                />
                <span className={styles.statusBadge} style={{ background: '#0052CC', marginLeft: 6 }}>{s}</span>
              </label>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Atanan Kişi</div>
            {allAssignees.map(({ id, name }) => (
              <label key={id} className={styles.filterLabel}>
                <Checkbox
                  checked={filterAssignee.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked) setFilterAssignee((p) => [...p, id]);
                    else setFilterAssignee((p) => p.filter((x) => x !== id));
                  }}
                />
                <span style={{ marginLeft: 6 }}>{name}</span>
              </label>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Öncelik</div>
            {allPriorities.map((p) => {
              const pi = priorityMeta[p];
              return (
                <label key={p} className={styles.filterLabel}>
                  <Checkbox
                    checked={filterPriority.includes(p)}
                    onChange={(e) => {
                      if (e.target.checked) setFilterPriority((prev) => [...prev, p]);
                      else setFilterPriority((prev) => prev.filter((x) => x !== p));
                    }}
                  />
                  <span style={{ color: pi.color, marginLeft: 6, fontWeight: 600 }}>
                    {pi.icon} {pi.label}
                  </span>
                </label>
              );
            })}
          </div>

          <div className={styles.filterGroup}>
            <div className={styles.filterGroupTitle}>Tür</div>
            {allTypes.map(({ id, name }) => (
              <label key={id} className={styles.filterLabel}>
                <Checkbox
                  checked={filterType.includes(id)}
                  onChange={(e) => {
                    if (e.target.checked) setFilterType((p) => [...p, id]);
                    else setFilterType((p) => p.filter((x) => x !== id));
                  }}
                />
                <span style={{ marginLeft: 6 }}>{name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spin size="large" />
        </div>
      ) : filteredIssues.length === 0 ? (
        <Empty description="Bilet bulunamadı" style={{ marginTop: 60 }} />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.thCheckbox}><input type="checkbox" className={styles.checkbox} /></th>
                <th>Bilet</th>
                <th style={{ width: 130 }}>Epic</th>
                <th style={{ width: 130 }}>Atanan Kişi</th>
                <th style={{ width: 120 }}>Raporlayan</th>
                <th style={{ width: 110 }}>Öncelik</th>
                <th style={{ width: 130 }}>Durum</th>
                <th style={{ width: 90 }}>Çözüm</th>
                <th style={{ width: 150 }}>Oluşturulan</th>
                <th style={{ width: 150 }}>Güncellendi</th>
                <th style={{ width: 110 }}>Bitiş Tarihi</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedIssues).map(([groupName, groupIssues]) => (
                <GroupSection key={groupName || '__all'} groupName={groupName} groupBy={groupBy} groupIssues={groupIssues} renderRows={renderRows} />
              ))}
            </tbody>
          </table>
          <div className={styles.tableFooter}>
            <span className={styles.countLabel}>{filteredIssues.length} / {issues.length} bilet</span>
          </div>
        </div>
      )}

      {/* ── Issue Detail Drawer ─────────────────────────────────────────────── */}
      {projectId && (
        <IssueDetailDrawer
          open={drawerOpen}
          issue={selectedIssue}
          projectId={projectId}
          columns={columns}
          onClose={() => { setDrawerOpen(false); setSelectedIssue(null); }}
          onDeleted={() => { setDrawerOpen(false); setSelectedIssue(null); loadIssues(); }}
        />
      )}
    </div>
  );
}

// ─── Group bölümü (React Fragment key sorunu için ayrı component) ──────────────
function GroupSection({
  groupName,
  groupBy,
  groupIssues,
  renderRows,
}: {
  groupName: string;
  groupBy: GroupByKey;
  groupIssues: Issue[];
  renderRows: (list: Issue[]) => React.ReactNode;
}) {
  return (
    <>
      {groupBy !== 'none' && groupName && (
        <tr className={styles.groupRow}>
          <td colSpan={12}>
            <span className={styles.groupLabel}>{groupName}</span>
            <span className={styles.groupCount}>{groupIssues.length}</span>
          </td>
        </tr>
      )}
      {renderRows(groupIssues)}
    </>
  );
}
