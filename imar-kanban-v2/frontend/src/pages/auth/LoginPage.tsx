import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, ProjectOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const onFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      await login(values.username, values.password);
      message.success('Giriş başarılı!');
      navigate('/');
    } catch (err: unknown) {
      const error = err as Error;
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0052CC 0%, #172B4D 100%)',
      }}
    >
      <Card
        style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', background: '#22272B', border: '1px solid #2C333A' }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <ProjectOutlined style={{ fontSize: 48, color: '#579DFF' }} />
            <Title level={3} style={{ margin: '8px 0 0', color: '#DEE4EA' }}>
              İMAR Kanban
            </Title>
            <Text style={{ color: '#8C9BAB' }}>Proje yönetim sistemine giriş yapın</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Kullanıcı adı zorunludur' }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#579DFF' }} />}
                placeholder="Kullanıcı adı"
                style={{ background: '#1D2125', borderColor: '#2C333A', color: '#DEE4EA' }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Şifre zorunludur' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#579DFF' }} />}
                placeholder="Şifre"
                style={{ background: '#1D2125', borderColor: '#2C333A', color: '#DEE4EA' }}
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block size="large">
                Giriş Yap
              </Button>
            </Form.Item>
          </Form>

          <Text style={{ color: '#8C9BAB' }}>
            Hesabınız yok mu?{' '}
            <Link to="/kayit" style={{ color: '#579DFF' }}>Kayıt olun</Link>
          </Text>
        </Space>
      </Card>
    </div>
  );
}
