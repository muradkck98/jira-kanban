import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ProjectOutlined,
  CodeOutlined,
  SettingOutlined,
  PlusOutlined,
  BarChartOutlined,
  FileTextOutlined,
  FormOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { Project } from '../../types';
import styles from './ProjectSidebar.module.css';

interface Props {
  project: Project | null;
}

export default function ProjectSidebar({ project }: Props) {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const location = useLocation();

  if (!project) return null;

  const currentPath = location.pathname;

  const menuItems = [
    {
      key: 'summary',
      label: 'Özet',
      icon: <BarChartOutlined />,
      path: `/proje/${projectId}/ozet`,
    },
    {
      key: 'board',
      label: 'Pano',
      icon: <AppstoreOutlined />,
      path: `/proje/${projectId}/pano/default`,
    },
    {
      key: 'list',
      label: 'Liste',
      icon: <UnorderedListOutlined />,
      path: `/proje/${projectId}/liste`,
    },
    {
      key: 'backlog',
      label: 'Backlog',
      icon: <CodeOutlined />,
      path: `/proje/${projectId}/backlog`,
    },
    {
      key: 'epics',
      label: 'Epicler',
      icon: <RocketOutlined />,
      path: `/proje/${projectId}/epicler`,
    },
    {
      key: 'pages',
      label: 'Sayfalar',
      icon: <FileTextOutlined />,
      path: `/proje/${projectId}/sayfalar`,
    },
    {
      key: 'forms',
      label: 'Formlar',
      icon: <FormOutlined />,
      path: `/proje/${projectId}/formlar`,
    },
    {
      key: 'add-item',
      label: 'Öğe ekle',
      icon: <PlusOutlined />,
      path: `/proje/${projectId}/ogeekle`,
    },
    { key: 'divider-1', type: 'divider' },
    {
      key: 'settings',
      label: 'Proje ayarları',
      icon: <SettingOutlined />,
      path: `/proje/${projectId}/ayarlar`,
    },
  ];

  const isActive = (path: string) => {
    if (!path) return false;
    // Pano için özel kontrol: /pano/default veya /pano/... aktif sayılsın
    if (path.includes('/pano/')) return currentPath.includes('/pano/');
    return currentPath.startsWith(path);
  };

  return (
    <aside className={styles.sidebar}>
      {/* Project Header */}
      <div className={styles.projectHeader}>
        <div className={styles.projectIcon}>
          <ProjectOutlined style={{ fontSize: 16, color: '#fff' }} />
        </div>
        <div className={styles.projectInfo}>
          <div className={styles.projectName}>{project.name}</div>
          <div className={styles.projectType}>Yazılım projesi</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        {menuItems.map((item) => {
          if (item.type === 'divider') {
            return <div key={item.key} className={styles.divider} />;
          }
          return (
            <button
              key={item.key}
              className={`${styles.navItem} ${isActive(item.path!) ? styles.navItemActive : ''}`}
              onClick={() => {
                if (item.path) navigate(item.path);
              }}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
