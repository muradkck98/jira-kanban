import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Spin, Empty, Avatar } from 'antd';
import { SearchOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useProjectStore } from '../../stores/projectStore';
import CreateProjectModal from '../../components/common/CreateProjectModal';
import styles from './ProjectListPage.module.css';

export default function ProjectListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [starred, setStarred] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { projects, loading, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const toggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setStarred((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredProjects = projects.filter((p) => {
    if (!searchText) return true;
    const s = searchText.toLowerCase();
    return p.name.toLowerCase().includes(s) || p.key.toLowerCase().includes(s);
  });

  const starredProjects = filteredProjects.filter((p) => starred.has(p.id));
  const otherProjects = filteredProjects.filter((p) => !starred.has(p.id));

  if (loading && projects.length === 0) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Projects</h1>
        <Button type="primary" onClick={() => setShowCreate(true)}>
          Create project
        </Button>
      </div>

      <div className={styles.toolbar}>
        <Input
          placeholder="Search projects"
          prefix={<SearchOutlined style={{ color: '#6B778C' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          style={{ width: 240 }}
          size="middle"
        />
      </div>

      {filteredProjects.length === 0 ? (
        <Empty
          description="No projects found"
          style={{ marginTop: 80 }}
        />
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Name</th>
                <th style={{ width: 100 }}>Key</th>
                <th style={{ width: 120 }}>Type</th>
                <th style={{ width: 100 }}>Lead</th>
              </tr>
            </thead>
            <tbody>
              {/* Starred */}
              {starredProjects.length > 0 && (
                <tr className={styles.sectionRow}>
                  <td colSpan={5}>
                    <span className={styles.sectionLabel}>STARRED</span>
                  </td>
                </tr>
              )}
              {starredProjects.map((project) => (
                <tr
                  key={project.id}
                  className={styles.row}
                  onClick={() => navigate(`/proje/${project.id}/pano/default`)}
                >
                  <td>
                    <button
                      className={styles.starBtn}
                      onClick={(e) => toggleStar(e, project.id)}
                    >
                      <StarFilled style={{ color: '#FFAB00' }} />
                    </button>
                  </td>
                  <td>
                    <div className={styles.projectCell}>
                      <div className={styles.projectAvatar}>
                        {project.key[0]}
                      </div>
                      <span className={styles.projectName}>{project.name}</span>
                    </div>
                  </td>
                  <td><span className={styles.keyBadge}>{project.key}</span></td>
                  <td><span className={styles.typeBadge}>Software</span></td>
                  <td>
                    <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 11 }}>
                      {project.owner?.full_name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </td>
                </tr>
              ))}

              {/* Recent */}
              {otherProjects.length > 0 && (
                <tr className={styles.sectionRow}>
                  <td colSpan={5}>
                    <span className={styles.sectionLabel}>
                      {starredProjects.length > 0 ? 'RECENT' : 'ALL PROJECTS'}
                    </span>
                  </td>
                </tr>
              )}
              {otherProjects.map((project) => (
                <tr
                  key={project.id}
                  className={styles.row}
                  onClick={() => navigate(`/proje/${project.id}/pano/default`)}
                >
                  <td>
                    <button
                      className={styles.starBtn}
                      onClick={(e) => toggleStar(e, project.id)}
                    >
                      <StarOutlined style={{ color: '#C1C7D0' }} />
                    </button>
                  </td>
                  <td>
                    <div className={styles.projectCell}>
                      <div className={styles.projectAvatar}>
                        {project.key[0]}
                      </div>
                      <span className={styles.projectName}>{project.name}</span>
                    </div>
                  </td>
                  <td><span className={styles.keyBadge}>{project.key}</span></td>
                  <td><span className={styles.typeBadge}>Software</span></td>
                  <td>
                    <Avatar size={24} style={{ backgroundColor: '#0052CC', fontSize: 11 }}>
                      {project.owner?.full_name?.[0]?.toUpperCase() || 'U'}
                    </Avatar>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
