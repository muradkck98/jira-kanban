import { useState, useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import JiraTopNav from './JiraTopNav';
import ProjectSidebar from './ProjectSidebar';
import CreateProjectModal from '../common/CreateProjectModal';
import { useProjectStore } from '../../stores/projectStore';
import styles from './AppLayout.module.css';

export default function AppLayout() {
  const [showCreateProject, setShowCreateProject] = useState(false);
  const { projectId } = useParams();
  const { currentProject, fetchProject, fetchProjects } = useProjectStore();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId, fetchProject]);

  const isProjectPage = !!projectId;

  return (
    <div className={styles.appLayout}>
      <JiraTopNav onCreateClick={() => setShowCreateProject(true)} />

      <div className={styles.mainArea}>
        {isProjectPage && (
          <ProjectSidebar project={currentProject} />
        )}

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>

      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </div>
  );
}
