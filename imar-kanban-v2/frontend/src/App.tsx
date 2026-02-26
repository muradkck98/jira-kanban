import { useEffect, useState } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme as antTheme, Spin } from 'antd';
import trTR from 'antd/locale/tr_TR';
import { router } from './routes';
import { authAPI } from './api';

// Demo kullanıcı bilgileri
const DEMO_USER = {
  username: 'demo',
  password: 'demo123',
  fullName: 'Demo Kullanıcı',
  email: 'demo@imar.local',
};

async function ensureLoggedIn(): Promise<void> {
  // Zaten token varsa kontrol et
  const existingToken = localStorage.getItem('token');
  if (existingToken) {
    try {
      await authAPI.me();
      return; // Token geçerli
    } catch {
      localStorage.removeItem('token');
    }
  }

  // Önce login dene
  try {
    const res = await authAPI.login({ username: DEMO_USER.username, password: DEMO_USER.password });
    const { token } = (res.data as any).data || res.data;
    if (token) {
      localStorage.setItem('token', token);
      return;
    }
  } catch {
    // Login başarısız, register dene
  }

  // Register dene
  try {
    const res = await authAPI.register(DEMO_USER);
    const { token } = (res.data as any).data || res.data;
    if (token) {
      localStorage.setItem('token', token);
      return;
    }
  } catch (err) {
    console.error('Auto-login başarısız:', err);
  }
}

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureLoggedIn().finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#1D2125',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <ConfigProvider
      locale={trTR}
      theme={{
        algorithm: antTheme.darkAlgorithm,
        token: {
          colorPrimary: '#579DFF',
          colorLink: '#579DFF',
          colorSuccess: '#4BCE97',
          colorWarning: '#F5CD47',
          colorError: '#F87462',
          borderRadius: 3,
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
          fontSize: 14,
          colorText: '#B6C2CF',
          colorTextSecondary: '#8C9BAB',
          colorBgContainer: '#22272B',
          colorBgElevated: '#282E33',
          colorBorder: '#2C333A',
          colorBgLayout: '#1D2125',
        },
        components: {
          Button: {
            borderRadius: 3,
            controlHeight: 32,
          },
          Input: {
            borderRadius: 3,
            colorBgContainer: '#22272B',
          },
          Card: {
            borderRadius: 3,
          },
          Modal: {
            colorBgElevated: '#282E33',
          },
          Drawer: {
            colorBgElevated: '#282E33',
          },
        },
      }}
    >
      <AntApp>
        <RouterProvider router={router} />
      </AntApp>
    </ConfigProvider>
  );
}

export default App;
