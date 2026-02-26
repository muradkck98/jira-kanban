import { Avatar, Tooltip } from 'antd';
import { Draggable } from '@hello-pangea/dnd';
import type { Issue } from '../../types';
import styles from './IssueCard.module.css';

const issueTypeIcons: Record<string, { icon: string; color: string }> = {
  'Görev': { icon: '✅', color: '#4BADE8' },
  'Hata': { icon: '🔴', color: '#E5493A' },
  'Hikaye': { icon: '📗', color: '#63BA3C' },
  'Alt Görev': { icon: '🔷', color: '#4BADE8' },
};

const priorityIcons: Record<string, { icon: string; color: string }> = {
  highest: { icon: '⬆', color: '#FF5630' },
  high: { icon: '↑', color: '#FF7452' },
  medium: { icon: '=', color: '#FFAB00' },
  low: { icon: '↓', color: '#36B37E' },
  lowest: { icon: '⬇', color: '#0065FF' },
};

interface Props {
  issue: Issue;
  index: number;
  onClick?: (issue: Issue) => void;
}

export default function IssueCard({ issue, index, onClick }: Props) {
  const typeInfo = issue.issue_type ? issueTypeIcons[issue.issue_type.name] : null;
  const priorityInfo = priorityIcons[issue.priority] || priorityIcons.medium;

  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`${styles.card} ${snapshot.isDragging ? styles.cardDragging : ''}`}
          style={provided.draggableProps.style}
          onClick={() => onClick?.(issue)}
        >
          {/* Epic badge + Story tag row */}
          {(issue.epic || (issue.parent && (issue.parent.issue_type?.name || '').toLowerCase().match(/story|hikaye/))) && (
            <div className={styles.badgeRow}>
              {issue.epic && (
                <Tooltip title={`Epic: ${issue.epic.name}`}>
                  <span className={styles.epicBadge} style={{ borderColor: issue.epic.color || '#0052CC' }}>
                    <span className={styles.epicDot} style={{ background: issue.epic.color || '#0052CC' }} />
                    {issue.epic.name}
                  </span>
                </Tooltip>
              )}
              {issue.parent && (issue.parent.issue_type?.name || '').toLowerCase().match(/story|hikaye/) && (
                <Tooltip title={`Story: ${issue.parent.title || issue.parent.issue_key}`}>
                  <span className={styles.storyTag}>
                    📗 {issue.parent.issue_key}
                  </span>
                </Tooltip>
              )}
            </div>
          )}

          {/* Labels */}
          {issue.labels && issue.labels.length > 0 && (
            <div className={styles.labels}>
              {issue.labels.map((label) => (
                <span
                  key={label.id}
                  className={styles.label}
                  style={{ background: label.color || '#DFE1E6' }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <div className={styles.title}>{issue.title}</div>

          {/* Footer */}
          <div className={styles.footer}>
            <div className={styles.footerLeft}>
              {typeInfo && (
                <Tooltip title={issue.issue_type?.name}>
                  <span className={styles.typeIcon}>{typeInfo.icon}</span>
                </Tooltip>
              )}
              <span className={styles.issueKey}>{issue.issue_key}</span>
              <Tooltip title={`Öncelik: ${issue.priority}`}>
                <span style={{ color: priorityInfo.color, fontSize: 14, fontWeight: 700 }}>
                  {priorityInfo.icon}
                </span>
              </Tooltip>
              {issue.story_points != null && issue.story_points > 0 && (
                <span className={styles.storyPoints}>{issue.story_points}</span>
              )}
            </div>
            <div className={styles.footerRight}>
              {issue.assignee ? (
                <Tooltip title={(issue.assignee as any).display_name || issue.assignee.full_name}>
                  <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 11, fontWeight: 600 }}>
                    {((issue.assignee as any).display_name || issue.assignee.full_name || '?')[0]?.toUpperCase()}
                  </Avatar>
                </Tooltip>
              ) : (
                <Avatar size={24} style={{ backgroundColor: '#DFE1E6', fontSize: 11 }}>?</Avatar>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
