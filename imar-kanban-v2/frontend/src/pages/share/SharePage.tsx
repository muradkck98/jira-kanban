import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spin, Button } from 'antd';
import { HomeOutlined, FileTextOutlined } from '@ant-design/icons';
import { pagesAPI, type Page } from '../../api/pages';

function renderMarkdown(md: string): string {
  if (!md) return '';
  return md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="ol-item">$1</li>')
    .replace(/^---$/gm, '<hr />')
    .replace(/\n/g, '<br />');
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    pagesAPI
      .getByShareToken(token)
      .then((res) => {
        const data = (res.data as any).data ?? res.data;
        setPage(data as Page);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div style={containerStyle}>
        <FileTextOutlined style={{ fontSize: 56, color: '#3D4B57', marginBottom: 16 }} />
        <h2 style={{ color: '#B6C2CF', margin: '0 0 8px' }}>Sayfa Bulunamadı</h2>
        <p style={{ color: '#5E6C84', margin: '0 0 24px' }}>
          Bu paylaşım bağlantısı geçersiz veya süresi dolmuş olabilir.
        </p>
        <Link to="/">
          <Button type="primary" icon={<HomeOutlined />}>Ana Sayfaya Dön</Button>
        </Link>
      </div>
    );
  }

  const authorName = (page as any).author?.display_name || (page as any).author?.displayName || 'Bilinmiyor';
  const updatedAt = (page as any).updated_at || (page as any).updatedAt;

  return (
    <div style={{ background: '#1D2125', minHeight: '100vh', padding: '0 0 60px' }}>
      {/* Top bar */}
      <div style={{
        background: '#22272B',
        borderBottom: '1px solid #2C333A',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileTextOutlined style={{ color: '#579DFF', fontSize: 18 }} />
          <span style={{ color: '#B6C2CF', fontWeight: 600, fontSize: 15 }}>Paylaşılan Sayfa</span>
        </div>
        <Link to="/">
          <Button size="small" icon={<HomeOutlined />} style={{ background: 'transparent', borderColor: '#2C333A', color: '#8C9BAB' }}>
            Uygulamaya Giriş Yap
          </Button>
        </Link>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '40px auto', padding: '0 24px' }}>
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 32, marginRight: 12 }}>{page.emoji || '📄'}</span>
        </div>
        <h1 style={{ color: '#B6C2CF', fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>
          {page.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32, color: '#5E6C84', fontSize: 13 }}>
          <span>Yazar: <span style={{ color: '#8C9BAB' }}>{authorName}</span></span>
          {updatedAt && (
            <span>
              Son güncelleme:{' '}
              <span style={{ color: '#8C9BAB' }}>
                {new Date(updatedAt).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </span>
            </span>
          )}
        </div>
        <div
          style={{
            color: '#B6C2CF',
            lineHeight: 1.8,
            fontSize: 15,
          }}
          className="share-content"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
        />
      </div>

      {/* Inline styles for rendered content */}
      <style>{`
        .share-content h1 { font-size: 24px; color: #B6C2CF; margin: 24px 0 12px; }
        .share-content h2 { font-size: 20px; color: #B6C2CF; margin: 20px 0 10px; }
        .share-content h3 { font-size: 17px; color: #B6C2CF; margin: 16px 0 8px; }
        .share-content strong { color: #C7D1DB; }
        .share-content code { background: #2C333A; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 13px; color: #57D9A3; }
        .share-content hr { border: none; border-top: 1px solid #2C333A; margin: 24px 0; }
        .share-content li { margin: 4px 0; padding-left: 8px; }
      `}</style>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: '#1D2125',
  color: '#B6C2CF',
};
