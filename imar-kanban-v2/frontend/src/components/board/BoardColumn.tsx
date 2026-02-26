import { Droppable } from '@hello-pangea/dnd';
import { EllipsisOutlined, WarningFilled } from '@ant-design/icons';
import { Tooltip } from 'antd';
import type { Column, Issue } from '../../types';
import IssueCard from './IssueCard';
import styles from './BoardColumn.module.css';

interface Props {
  column: Column;
  issues: Issue[];
  onIssueClick?: (issue: Issue) => void;
  onAddIssue?: (columnId: string) => void;
}

export default function BoardColumn({ column, issues, onIssueClick, onAddIssue }: Props) {
  const sortedIssues = [...issues].sort((a, b) => a.position - b.position);
  const isOverWip = column.wip_limit > 0 && issues.length > column.wip_limit;
  const isAtWip = column.wip_limit > 0 && issues.length === column.wip_limit;

  return (
    <div className={`${styles.column} ${isOverWip ? styles.columnOverWip : ''}`}>
      {/* Column Header — Jira tarzı */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.columnName}>{column.name.toUpperCase()}</span>
          <span className={`${styles.count} ${isOverWip ? styles.countOverWip : isAtWip ? styles.countAtWip : ''}`}>
            {issues.length}
            {column.wip_limit > 0 && (
              <span className={styles.wipLimit}> / {column.wip_limit}</span>
            )}
          </span>
          {isOverWip && (
            <Tooltip title={`WIP limiti aşıldı! Maksimum ${column.wip_limit} iş öğesi olmalıdır.`}>
              <WarningFilled className={styles.wipWarning} />
            </Tooltip>
          )}
        </div>
        <button className={styles.moreBtn}>
          <EllipsisOutlined />
        </button>
      </div>

      {/* WIP limit progress bar */}
      {column.wip_limit > 0 && (
        <div className={styles.wipBar}>
          <div
            className={`${styles.wipBarFill} ${isOverWip ? styles.wipBarOver : isAtWip ? styles.wipBarFull : ''}`}
            style={{ width: `${Math.min((issues.length / column.wip_limit) * 100, 100)}%` }}
          />
        </div>
      )}

      {/* Droppable Area */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${styles.cardList} ${snapshot.isDraggingOver ? styles.cardListDragOver : ''} ${isOverWip && snapshot.isDraggingOver ? styles.cardListDragOverWip : ''}`}
          >
            {sortedIssues.map((issue, index) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                index={index}
                onClick={onIssueClick}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      {/* Create button */}
      <button
        className={styles.createBtn}
        onClick={() => onAddIssue?.(column.id)}
      >
        + Oluştur
      </button>
    </div>
  );
}
