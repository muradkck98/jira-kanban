import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Avatar, Dropdown, Badge, Tooltip, Button } from 'antd';
import {
  SearchOutlined,
  BellOutlined,
  QuestionCircleOutlined,
  SettingOutlined,
  AppstoreOutlined,
  PlusOutlined,
  LogoutOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';
import { useProjectStore } from '../../stores/projectStore';
import styles from './JiraTopNav.module.css';

interface Props {
  onCreateClick: () => void;
}

export default function JiraTopNav({ onCreateClick }: Props) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { projects } = useProjectStore();

  const navItems = [
    { key: 'work', label: 'İşleriniz' },
    { key: 'projects', label: 'Projeler' },
    { key: 'filters', label: 'Filtreler' },
    { key: 'dashboards', label: 'Panolar' },
  ];

  // Projects dropdown
  const projectsMenu = {
    items: [
      {
        key: 'recent-header',
        label: <span style={{ fontSize: 11, fontWeight: 700, color: '#8C9BAB', letterSpacing: '0.04em' }}>EN SON</span>,
        disabled: true,
      },
      ...(projects || []).slice(0, 5).map((p) => ({
        key: p.id,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 3,
              background: 'linear-gradient(135deg, #F87462, #FF5630)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
            }}>{p.key[0]}</div>
            <div>
              <div style={{ fontSize: 13, color: '#B6C2CF' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: '#5E6C84' }}>{p.key}</div>
            </div>
          </div>
        ),
        onClick: () => navigate(`/proje/${p.id}/ozet`),
      })),
      { type: 'divider' as const },
      {
        key: 'view-all',
        label: <span style={{ color: '#579DFF' }}>Tüm projeleri gör</span>,
        onClick: () => navigate('/projeler'),
      },
    ],
  };

  const userMenu = {
    items: [
      {
        key: 'user-info',
        label: (
          <div style={{ padding: '4px 0' }}>
            <div style={{ fontWeight: 600, color: '#DEE4EA' }}>{user?.full_name}</div>
            <div style={{ fontSize: 12, color: '#8C9BAB' }}>{user?.email}</div>
          </div>
        ),
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'profile',
        label: 'Profil',
        icon: <UserOutlined />,
      },
      {
        key: 'logout',
        label: 'Çıkış yap',
        icon: <LogoutOutlined />,
        onClick: () => {
          logout();
          navigate('/giris');
        },
      },
    ],
  };

  // Notifications dropdown
  const notificationsMenu = {
    items: [
      {
        key: 'notif-header',
        label: <span style={{ fontSize: 14, fontWeight: 600, color: '#DEE4EA' }}>Bildirimler</span>,
        disabled: true,
      },
      { type: 'divider' as const },
      {
        key: 'n1',
        label: (
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 13, color: '#B6C2CF' }}>
              <strong>Ahmet Yılmaz</strong> size IMAR-5 atadı
            </div>
            <div style={{ fontSize: 11, color: '#5E6C84', marginTop: 2 }}>5 dakika önce</div>
          </div>
        ),
      },
      {
        key: 'n2',
        label: (
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 13, color: '#B6C2CF' }}>
              <strong>Elif Demir</strong> IMAR-3 hakkında yorum yaptı
            </div>
            <div style={{ fontSize: 11, color: '#5E6C84', marginTop: 2 }}>15 dakika önce</div>
          </div>
        ),
      },
      {
        key: 'n3',
        label: (
          <div style={{ maxWidth: 280 }}>
            <div style={{ fontSize: 13, color: '#B6C2CF' }}>
              Sprint 3 yarın bitiyor
            </div>
            <div style={{ fontSize: 11, color: '#5E6C84', marginTop: 2 }}>1 saat önce</div>
          </div>
        ),
      },
    ],
  };

  return (
    <header className={styles.topNav}>
      {/* Left Section */}
      <div className={styles.leftSection}>
        {/* App Switcher */}
        <button className={styles.iconBtn}>
          <AppstoreOutlined style={{ fontSize: 20 }} />
        </button>

        {/* Logo */}
        <div className={styles.logo} onClick={() => navigate('/')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M11.53 2c0 5.24 4.23 9.47 9.47 9.47v1.06c-5.24 0-9.47 4.23-9.47 9.47h-1.06c0-5.24-4.23-9.47-9.47-9.47v-1.06c5.24 0 9.47-4.23 9.47-9.47h1.06z" fill="#2684FF"/>
          </svg>
          <span className={styles.logoText}>İMAR</span>
        </div>

        {/* Nav Items */}
        <nav className={styles.navItems}>
          {navItems.map((item) => {
            if (item.key === 'projects') {
              return (
                <Dropdown key={item.key} menu={projectsMenu} trigger={['click']} placement="bottomLeft">
                  <button className={styles.navItem}>
                    {item.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                      <path d="M8.292 10.293a1.009 1.009 0 000 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 000-1.419.987.987 0 00-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 00-1.406 0z"/>
                    </svg>
                  </button>
                </Dropdown>
              );
            }
            return (
              <button
                key={item.key}
                className={styles.navItem}
                onClick={() => {
                  if (item.key === 'work') navigate('/');
                }}
              >
                {item.label}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                  <path d="M8.292 10.293a1.009 1.009 0 000 1.419l2.939 2.965c.218.215.5.322.779.322s.556-.107.769-.322l2.93-2.955a1.01 1.01 0 000-1.419.987.987 0 00-1.406 0l-2.298 2.317-2.307-2.327a.99.99 0 00-1.406 0z"/>
                </svg>
              </button>
            );
          })}
        </nav>

        {/* Create Button */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          className={styles.createBtn}
          onClick={onCreateClick}
        >
          Oluştur
        </Button>
      </div>

      {/* Right Section */}
      <div className={styles.rightSection}>
        {searchOpen ? (
          <Input
            autoFocus
            placeholder="Ara..."
            prefix={<SearchOutlined style={{ color: '#8C9BAB' }} />}
            className={styles.searchInput}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onBlur={() => { setSearchOpen(false); setSearchText(''); }}
            style={{ width: 240 }}
            size="middle"
          />
        ) : (
          <Tooltip title="Ara (/)">
            <button className={styles.iconBtn} onClick={() => setSearchOpen(true)}>
              <SearchOutlined style={{ fontSize: 18 }} />
            </button>
          </Tooltip>
        )}

        <Dropdown menu={notificationsMenu} trigger={['click']} placement="bottomRight">
          <Tooltip title="Bildirimler">
            <button className={styles.iconBtn}>
              <Badge count={3} size="small" offset={[-2, 2]}>
                <BellOutlined style={{ fontSize: 18, color: '#8C9BAB' }} />
              </Badge>
            </button>
          </Tooltip>
        </Dropdown>

        <Tooltip title="Yardım">
          <button className={styles.iconBtn}>
            <QuestionCircleOutlined style={{ fontSize: 18 }} />
          </button>
        </Tooltip>

        <Tooltip title="Ayarlar">
          <button className={styles.iconBtn}>
            <SettingOutlined style={{ fontSize: 18 }} />
          </button>
        </Tooltip>

        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
          <Avatar
            size={28}
            style={{
              backgroundColor: '#0052CC',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            {user?.full_name?.[0]?.toUpperCase() || 'U'}
          </Avatar>
        </Dropdown>
      </div>
    </header>
  );
}
