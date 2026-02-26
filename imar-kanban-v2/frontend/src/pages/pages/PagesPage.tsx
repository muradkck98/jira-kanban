import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Input, Tooltip, message, Spin, Modal, Avatar, Tag, Typography } from 'antd';
import { CopyOutlined, LinkOutlined } from '@ant-design/icons';
import {
  PlusOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
  ShareAltOutlined,
  DeleteOutlined,
  EditOutlined,
  CloseOutlined,
  FileTextOutlined,
  SaveOutlined,
  OrderedListOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
import dayjs from 'dayjs';
import { pagesAPI, type Page } from '../../api/pages';
import styles from './PagesPage.module.css';

export default function PagesPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editEmoji, setEditEmoji] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [sharingLoading, setSharingLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (projectId) loadPages();
  }, [projectId]);

  const loadPages = async () => {
    try {
      setLoading(true);
      const res = await pagesAPI.listByProject(projectId as string, search || undefined);
      const data = (res.data.data || []) as Page[];
      setPages(data);
      if (data.length > 0 && !selectedPage) {
        setSelectedPage(data[0]);
      }
    } catch {
      message.error('Sayfalar yuklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (val: string) => {
    setSearch(val);
    try {
      const res = await pagesAPI.listByProject(projectId as string, val || undefined);
      setPages((res.data.data || []) as Page[]);
    } catch {
      message.error('Arama basarisiz');
    }
  };

  const handleCreate = async () => {
    if (!projectId) return;
    try {
      const res = await pagesAPI.create(projectId, {
        title: 'Yeni Sayfa',
        content: '# Yeni Sayfa\n\nBuraya yazin...',
        emoji: 'doc',
      });
      const newPage = res.data.data as Page;
      setPages(prev => [newPage, ...prev]);
      setSelectedPage(newPage);
      setIsEditing(true);
      setEditTitle(newPage.title);
      setEditContent(newPage.content);
      setEditEmoji(newPage.emoji || '');
    } catch {
      message.error('Sayfa olusturulamadi');
    }
  };

  const handleSelectPage = (page: Page) => {
    if (isEditing) {
      Modal.confirm({
        title: 'Kaydedilmemis Degisiklikler',
        content: 'Degisikliklerinizi kaydetmeden bu sayfadan cikmak istiyor musunuz?',
        okText: 'Cik',
        cancelText: 'Iptal',
        onOk: () => {
          setIsEditing(false);
          setSelectedPage(page);
        },
      });
      return;
    }
    setSelectedPage(page);
    setIsEditing(false);
  };

  const handleEdit = () => {
    if (!selectedPage) return;
    setEditTitle(selectedPage.title);
    setEditContent(selectedPage.content);
    setEditEmoji(selectedPage.emoji || '');
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedPage) return;
    setSaving(true);
    try {
      const res = await pagesAPI.update(selectedPage.id, {
        title: editTitle,
        content: editContent,
        emoji: editEmoji,
      });
      const updated = res.data.data as Page;
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      setSelectedPage(updated);
      setIsEditing(false);
      message.success('Sayfa kaydedildi');
    } catch {
      message.error('Kaydetme basarisiz');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => setIsEditing(false);

  const handleToggleStar = async (page: Page, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await pagesAPI.toggleStar(page.id);
      const updated = res.data.data as Page;
      setPages(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (selectedPage?.id === updated.id) setSelectedPage(updated);
    } catch {
      message.error('Yildizlama basarisiz');
    }
  };

  const handleShare = async (page: Page, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSharingLoading(true);
    try {
      const res = await pagesAPI.generateShareLink(page.id);
      const result = (res.data as any).data ?? res.data;
      // Axios interceptor camelCase→snake_case dönüşümü yapıyor: shareToken → share_token
      const token = result.share_token || result.shareToken;
      if (!token) throw new Error('Token alınamadı');
      const url = window.location.origin + '/share/' + token;
      setShareUrl(url);
      setShareModalOpen(true);
    } catch {
      message.error('Paylaşım bağlantısı oluşturulamadı');
    } finally {
      setSharingLoading(false);
    }
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      message.success('Bağlantı kopyalandı!');
    } catch {
      // Clipboard API başarısız olursa (HTTP ortamı) input seçimi ile fallback
      const input = document.getElementById('share-url-input') as HTMLInputElement;
      if (input) { input.select(); document.execCommand('copy'); }
      message.success('Bağlantı kopyalandı!');
    }
  };

  const handleDelete = async (page: Page, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    Modal.confirm({
      title: 'Sayfayi Sil',
      content: `"${page.title}" sayfasini silmek istediginizden emin misiniz?`,
      okText: 'Sil',
      okType: 'danger',
      cancelText: 'Iptal',
      onOk: async () => {
        try {
          await pagesAPI.remove(page.id);
          const newPages = pages.filter(p => p.id !== page.id);
          setPages(newPages);
          if (selectedPage?.id === page.id) {
            setSelectedPage(newPages.length > 0 ? newPages[0] : null);
            setIsEditing(false);
          }
          message.success('Sayfa silindi');
        } catch {
          message.error('Silme basarisiz');
        }
      },
    });
  };

  const insertMarkdown = (prefix: string, suffix = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = editContent.substring(start, end);
    const newContent =
      editContent.substring(0, start) + prefix + selected + suffix + editContent.substring(end);
    setEditContent(newContent);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  };

  const starredPages = pages.filter(p => p.isStarred);

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <div className={styles.pagesList}>
        <div className={styles.pagesListHeader}>
          <span className={styles.pagesListTitle}>Sayfalar</span>
          <button className={styles.newPageBtn} onClick={handleCreate}>
            <PlusOutlined />
          </button>
        </div>
        <div className={styles.searchWrap}>
          <Input
            className={styles.searchInput}
            placeholder="Sayfa ara..."
            prefix={<SearchOutlined style={{ color: '#5E6C84' }} />}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            allowClear
            size="small"
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin size="small" /></div>
        ) : (
          <div>
            {starredPages.length > 0 && (
              <div className={styles.pagesSection}>
                <div className={styles.pagesSectionTitle}>Yildizlananlar</div>
                {starredPages.map(page => (
                  <PageListItem
                    key={page.id + '_star'}
                    page={page}
                    selected={selectedPage?.id === page.id}
                    onSelect={handleSelectPage}
                  />
                ))}
              </div>
            )}
            <div className={styles.pagesSection}>
              {starredPages.length > 0 && (
                <div className={styles.pagesSectionTitle}>Tum Sayfalar</div>
              )}
              {pages.length === 0 ? (
                <p className={styles.emptyText}>Henuz sayfa yok</p>
              ) : (
                pages.map(page => (
                  <PageListItem
                    key={page.id}
                    page={page}
                    selected={selectedPage?.id === page.id}
                    onSelect={handleSelectPage}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      <Modal
        title={<span><LinkOutlined style={{ marginRight: 8, color: '#579DFF' }} />Sayfa Paylaşım Bağlantısı</span>}
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={[
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyShareUrl}>
            Bağlantıyı Kopyala
          </Button>,
          <Button key="close" onClick={() => setShareModalOpen(false)}>Kapat</Button>,
        ]}
        width={560}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ color: '#8C9BAB', marginBottom: 12, fontSize: 13 }}>
            Bu bağlantıya sahip olan herkes sayfayı görüntüleyebilir.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="share-url-input"
              readOnly
              value={shareUrl}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              style={{
                flex: 1,
                background: '#1D2125',
                border: '1px solid #2C333A',
                borderRadius: 6,
                padding: '6px 10px',
                color: '#579DFF',
                fontSize: 13,
                outline: 'none',
                cursor: 'text',
              }}
            />
          </div>
          <Text style={{ fontSize: 12, color: '#5E6C84', marginTop: 8, display: 'block' }}>
            Bağlantıyı tarayıcıya yapıştırarak paylaşılan sayfayı görüntüleyebilirsiniz.
          </Text>
        </div>
      </Modal>

      {/* Main Content */}
      <div className={styles.docMain}>
        {!selectedPage ? (
          <div className={styles.emptyDoc}>
            <FileTextOutlined style={{ fontSize: 56, color: '#2C333A' }} />
            <span>Bir sayfa secin veya yeni sayfa olusturun</span>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Yeni Sayfa Olustur
            </Button>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className={styles.docToolbar}>
              {isEditing ? (
                <>
                  <div className={styles.formatTools}>
                    <Tooltip title="Kalin">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('**', '**')}><strong>B</strong></button>
                    </Tooltip>
                    <Tooltip title="Italik">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('*', '*')}><em>I</em></button>
                    </Tooltip>
                    <div className={styles.fmtDivider} />
                    <Tooltip title="Baslik 1">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('# ')}>H1</button>
                    </Tooltip>
                    <Tooltip title="Baslik 2">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('## ')}>H2</button>
                    </Tooltip>
                    <Tooltip title="Baslik 3">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('### ')}>H3</button>
                    </Tooltip>
                    <div className={styles.fmtDivider} />
                    <Tooltip title="Madde Listesi">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('- ')}>
                        <UnorderedListOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title="Numarali Liste">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('1. ')}>
                        <OrderedListOutlined />
                      </button>
                    </Tooltip>
                    <div className={styles.fmtDivider} />
                    <Tooltip title="Kod">
                      <button className={styles.fmtBtn} onClick={() => insertMarkdown('`', '`')}>{'</>'}</button>
                    </Tooltip>
                  </div>
                  <div className={styles.docActions}>
                    {saving && <span className={styles.savingStatus}>Kaydediliyor...</span>}
                    <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="small">
                      Kaydet
                    </Button>
                    <Button icon={<CloseOutlined />} onClick={handleCancelEdit} size="small">
                      Iptal
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className={styles.formatTools} />
                  <div className={styles.docActions}>
                    <Tooltip title="Duzenle">
                      <button className={styles.actionBtn} onClick={handleEdit}>
                        <EditOutlined />
                      </button>
                    </Tooltip>
                    <Tooltip title={selectedPage.isStarred ? 'Yildizi Kaldir' : 'Yildizla'}>
                      <button className={styles.actionBtn} onClick={() => handleToggleStar(selectedPage)}>
                        {selectedPage.isStarred
                          ? <StarFilled style={{ color: '#faad14' }} />
                          : <StarOutlined />}
                      </button>
                    </Tooltip>
                    <Tooltip title="Paylaşım Bağlantısı Oluştur">
                      <button
                        className={styles.actionBtn}
                        onClick={() => handleShare(selectedPage)}
                        disabled={sharingLoading}
                        style={{ opacity: sharingLoading ? 0.6 : 1 }}
                      >
                        <ShareAltOutlined spin={sharingLoading} />
                      </button>
                    </Tooltip>
                    <Tooltip title="Sil">
                      <button
                        className={styles.actionBtn + ' ' + styles.actionBtnDanger}
                        onClick={() => handleDelete(selectedPage)}
                      >
                        <DeleteOutlined />
                      </button>
                    </Tooltip>
                  </div>
                </>
              )}
            </div>

            {/* Content */}
            <div className={styles.docContent}>
              {isEditing ? (
                <>
                  <Input
                    className={styles.titleInput}
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    placeholder="Sayfa basligi..."
                    variant="borderless"
                  />
                  <textarea
                    ref={textareaRef}
                    className={styles.markdownEditor}
                    value={editContent}
                    onChange={e => setEditContent(e.target.value)}
                    placeholder="Markdown formatinda yazin..."
                  />
                </>
              ) : (
                <>
                  <div className={styles.docMeta}>
                    <div className={styles.docMetaLeft}>
                      <span className={styles.docEmoji}>{selectedPage.emoji || 'doc'}</span>
                      <h1 className={styles.docTitle}>{selectedPage.title}</h1>
                    </div>
                    {selectedPage.isStarred && (
                      <div className={styles.docMetaTags}>
                        <Tag color="gold" icon={<StarFilled />}>Yildizlandi</Tag>
                      </div>
                    )}
                  </div>
                  <div className={styles.docAuthorRow}>
                    <Avatar size={24} style={{ background: '#579DFF', fontSize: 11 }}>
                      {selectedPage.author?.displayName?.[0] || 'U'}
                    </Avatar>
                    <span className={styles.docAuthorName}>
                      {selectedPage.author?.displayName || 'Bilinmiyor'}
                    </span>
                    <span className={styles.docDate}>
                      {dayjs(selectedPage.updatedAt).format('DD MMM YYYY, HH:mm')}
                    </span>
                  </div>
                  <div
                    className={styles.docRendered}
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedPage.content) }}
                  />
                  <button className={styles.editCta} onClick={handleEdit}>
                    <EditOutlined /> Duzenlemek icin tiklayin
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function PageListItem({
  page,
  selected,
  onSelect,
}: {
  page: Page;
  selected: boolean;
  onSelect: (p: Page) => void;
}) {
  return (
    <button
      className={styles.pageItem + (selected ? ' ' + styles.pageItemActive : '')}
      onClick={() => onSelect(page)}
    >
      <span className={styles.pageItemEmoji}>{page.emoji || 'doc'}</span>
      <span className={styles.pageItemTitle}>{page.title}</span>
    </button>
  );
}

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
