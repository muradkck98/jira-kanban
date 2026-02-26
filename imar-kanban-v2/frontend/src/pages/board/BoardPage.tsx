import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin, Avatar, Input, Tooltip, Empty, message } from 'antd';
import { SearchOutlined, UserOutlined } from '@ant-design/icons';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { useBoardStore } from '../../stores/boardStore';
import { useProjectStore } from '../../stores/projectStore';
import BoardColumn from '../../components/board/BoardColumn';
import CreateIssueModal from '../../components/board/CreateIssueModal';
import IssueDetailDrawer from '../../components/board/IssueDetailDrawer';
import type { Issue } from '../../types';
import styles from './BoardPage.module.css';

export default function BoardPage() {
  const { projectId, boardId } = useParams<{ projectId: string; boardId: string }>();
  const [showCreateIssue, setShowCreateIssue] = useState(false);
  const [createColumnId, setCreateColumnId] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showIssueDetail, setShowIssueDetail] = useState(false);
  const [searchText, setSearchText] = useState('');

  const { currentBoard, loading, fetchBoards, fetchBoard, optimisticMove, moveIssue, removeIssueFromBoard, lastIssueUpdate } =
    useBoardStore();
  const { currentProject } = useProjectStore();

  // İlk yükleme
  useEffect(() => {
    if (!projectId) return;
    if (boardId === 'default') {
      fetchBoards(projectId).then(() => {
        const boards = useBoardStore.getState().boards;
        if (boards.length > 0) fetchBoard(projectId, boards[0].id);
      });
    } else if (boardId) {
      fetchBoard(projectId, boardId);
    }
  }, [projectId, boardId, fetchBoards, fetchBoard]);

  // Aynı oturumda issue güncellenince board'u yenile (drawer Kaydet vb.)
  useEffect(() => {
    if (!projectId || !lastIssueUpdate) return;
    if (boardId && boardId !== 'default') {
      fetchBoard(projectId, boardId);
    } else {
      const boards = useBoardStore.getState().boards;
      if (boards.length > 0) fetchBoard(projectId, boards[0].id);
    }
  }, [lastIssueUpdate, projectId, boardId, fetchBoard]);

  // 30 saniyede bir yenile — başka kullanıcıların değişikliklerini yakala
  useEffect(() => {
    if (!projectId) return;
    const doRefresh = () => {
      if (boardId && boardId !== 'default') {
        fetchBoard(projectId, boardId);
      } else {
        const boards = useBoardStore.getState().boards;
        if (boards.length > 0) fetchBoard(projectId, boards[0].id);
      }
    };
    const interval = setInterval(doRefresh, 30_000);
    return () => clearInterval(interval);
  }, [projectId, boardId, fetchBoard]);

  // Sekme/pencere odaklandığında anında yenile
  useEffect(() => {
    const doRefresh = () => {
      if (!projectId) return;
      if (boardId && boardId !== 'default') {
        fetchBoard(projectId, boardId);
      } else {
        const boards = useBoardStore.getState().boards;
        if (boards.length > 0) fetchBoard(projectId, boards[0].id);
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') doRefresh(); };
    window.addEventListener('focus', doRefresh);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', doRefresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projectId, boardId, fetchBoard]);

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !projectId || !currentBoard?.columns) return;
    const { source, destination, draggableId } = result;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    // WIP limit check
    const targetColumn = currentBoard.columns.find((c) => c.id === destination.droppableId);
    if (targetColumn && targetColumn.wip_limit > 0 && source.droppableId !== destination.droppableId) {
      const currentCount = (targetColumn.issues || []).length;
      if (currentCount >= targetColumn.wip_limit) {
        message.warning({
          content: `⚠️ "${targetColumn.name}" kolonunun WIP limiti (${targetColumn.wip_limit}) aşılacak!`,
          duration: 3,
        });
      }
    }

    optimisticMove(draggableId, source.droppableId, destination.droppableId, destination.index);
    moveIssue(projectId, draggableId, {
      columnId: destination.droppableId,
      position: destination.index,
    });
  };

  const handleAddIssue = (columnId: string) => {
    setCreateColumnId(columnId);
    setShowCreateIssue(true);
  };

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(issue);
    setShowIssueDetail(true);
  };

  const handleIssueDeleted = (issueId: string, columnId: string) => {
    removeIssueFromBoard(issueId, columnId);
  };

  if (loading && !currentBoard) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  if (!currentBoard) {
    return <Empty description="Pano bulunamadı" style={{ marginTop: 80 }} />;
  }

  const columns = currentBoard.columns
    ? [...currentBoard.columns].sort((a, b) => a.position - b.position)
    : [];

  // Search filter
  const filterIssues = (issues: Issue[] | undefined) => {
    if (!issues) return [];
    if (!searchText) return issues;
    const s = searchText.toLowerCase();
    return issues.filter(
      (i) =>
        i.title.toLowerCase().includes(s) ||
        i.issue_key.toLowerCase().includes(s)
    );
  };

  return (
    <div className={styles.boardPage}>
      {/* Board Header — Jira style */}
      <div className={styles.boardHeader}>
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink}>Projeler</span>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbLink}>{currentProject?.name || 'Proje'}</span>
        </div>
        <h1 className={styles.boardTitle}>{currentBoard.name}</h1>
      </div>

      {/* Board Toolbar — Jira style */}
      <div className={styles.toolbar}>
        <Input
          placeholder="Ara"
          prefix={<SearchOutlined style={{ color: '#6B778C' }} />}
          className={styles.searchInput}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="small"
          style={{ width: 180 }}
        />

        {/* Member Avatars */}
        <div className={styles.avatarGroup}>
          <Avatar.Group size={30}>
            <Tooltip title="Atanmamış">
              <Avatar style={{ backgroundColor: '#DFE1E6' }} icon={<UserOutlined />} size={30} />
            </Tooltip>
          </Avatar.Group>
        </div>
      </div>

      {/* Board Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className={styles.columnsContainer}>
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              issues={filterIssues(column.issues)}
              onIssueClick={handleIssueClick}
              onAddIssue={handleAddIssue}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Create Issue Modal — Pano'da sadece Task, Bug ve Alt Görev */}
      {projectId && (
        <CreateIssueModal
          open={showCreateIssue}
          projectId={projectId}
          columns={columns}
          defaultColumnId={createColumnId}
          allowedTypeNames={['task', 'bug', 'subtask', 'alt görev', 'alt gorev', 'gorev', 'görev', 'hata']}
          onClose={() => setShowCreateIssue(false)}
        />
      )}

      {/* Issue Detail Drawer */}
      {projectId && (
        <IssueDetailDrawer
          open={showIssueDetail}
          issue={selectedIssue}
          projectId={projectId}
          columns={columns}
          onClose={() => {
            setShowIssueDetail(false);
            setSelectedIssue(null);
          }}
          onDeleted={handleIssueDeleted}
        />
      )}
    </div>
  );
}
