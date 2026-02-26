import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, message, Space } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ProjectOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../stores/authStore';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const onFinish = async (values: { full_name: string; email: string; password: string }) => {
    setLoading(true);
    try {
      await register(values.email, values.password, values.full_name);
      message.success('Kayıt başarılı!');
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
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Card
        style={{ width: 420, borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}
        bordered={false}
      >
        <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
          <div>
            <ProjectOutlined style={{ fontSize: 48, color: '#667eea' }} />
            <Title level={3} style={{ margin: '8px 0 0' }}>
              İMAR Kanban
            </Title>
            <Text type="secondary">Yeni hesap oluşturun</Text>
          </div>

          <Form layout="vertical" onFinish={onFinish} autoComplete="off" size="large">
            <Form.Item
              name="full_name"
              rules={[{ required: true, message: 'Ad soyad zorunludur' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Ad Soyad" />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'E-posta zorunludur' },
                { type: 'email', message: 'Geçerli bir e-posta girin' },
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="E-posta" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Şifre zorunludur' },
                { min: 6, message: 'Şifre en az 6 karakter olmalı' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Şifre" />
            </Form.Item>

            <Form.Item
              name="password_confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Şifreyi tekrar girin' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Şifreler eşleşmiyor'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="Şifre Tekrar" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Kayıt Ol
              </Button>
            </Form.Item>
          </Form>

          <Text>
            Zaten hesabınız var mı?{' '}
            <Link to="/giris">Giriş yapın</Link>
          </Text>
        </Space>
      </Card>
    </div>
  );
}
