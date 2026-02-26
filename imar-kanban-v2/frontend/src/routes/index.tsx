import { createBrowserRouter } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AppLayout from '../components/layout/AppLayout';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ProjectListPage from '../pages/projects/ProjectListPage';
import BoardPage from '../pages/board/BoardPage';
import BacklogPage from '../pages/backlog/BacklogPage';
import SummaryPage from '../pages/summary/SummaryPage';
import ListPage from '../pages/list/ListPage';
import CreateProjectWizard from '../pages/create-project/CreateProjectWizard';
import FormsPage from '../pages/forms/FormsPage';
import PagesPage from '../pages/pages/PagesPage';
import ProjectSettingsPage from '../pages/settings/ProjectSettingsPage';
import OgeEklePage from '../pages/ogeekle/OgeEklePage';
import SharePage from '../pages/share/SharePage';
import EpicsPage from '../pages/epics/EpicsPage';
import EpicDetailPage from '../pages/epics/EpicDetailPage';

export const router = createBrowserRouter([
  {
    path: '/giris',
    element: <LoginPage />,
  },
  {
    path: '/kayit',
    element: <RegisterPage />,
  },
  {
    path: '/yeni-proje',
    element: <CreateProjectWizard />,
  },
  {
    // Paylaşım sayfası — giriş gerektirmez
    path: '/share/:token',
    element: <SharePage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <AppLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <ProjectListPage />,
      },
      {
        path: 'projeler',
        element: <ProjectListPage />,
      },
      {
        path: 'proje/:projectId/ozet',
        element: <SummaryPage />,
      },
      {
        path: 'proje/:projectId/liste',
        element: <ListPage />,
      },
      {
        path: 'proje/:projectId/pano/:boardId',
        element: <BoardPage />,
      },
      {
        path: 'proje/:projectId/backlog',
        element: <BacklogPage />,
      },
      {
        path: 'proje/:projectId/formlar',
        element: <FormsPage />,
      },
      {
        path: 'proje/:projectId/sayfalar',
        element: <PagesPage />,
      },
      {
        path: 'proje/:projectId/sayfalar/:pageId',
        element: <PagesPage />,
      },
      {
        path: 'proje/:projectId/ayarlar',
        element: <ProjectSettingsPage />,
      },
      {
        path: 'proje/:projectId/ogeekle',
        element: <OgeEklePage />,
      },
      {
        path: 'proje/:projectId/epicler',
        element: <EpicsPage />,
      },
      {
        path: 'proje/:projectId/epicler/:epicId',
        element: <EpicDetailPage />,
      },
    ],
  },
]);
