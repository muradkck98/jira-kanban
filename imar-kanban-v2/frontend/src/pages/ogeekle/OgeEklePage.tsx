import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Spin } from 'antd';
import { useBoardStore } from '../../stores/boardStore';
import CreateIssueModal from '../../components/board/CreateIssueModal';
import type { Column } from '../../types';
import styles from './OgeEklePage.module.css';

const itemTypes = [
  {
    key: 'epic',
    icon: '🚀',
    color: '#6554C0',
    label: 'Epic',
    badge: 'BÜYÜK KAPSAM',
    badgeColor: '#6554C0',
    description: 'Büyük özellik veya ana iş grubu',
    detail: 'Epic birden fazla Story içerir. Uzun vadeli hedefleri ve geniş kapsamlı işleri temsil eder.',
    examples: ['"Kullanıcı Yönetim Sistemi"', '"Harita Görüntüleme Modülü"', '"Ödeme Entegrasyonu"'],
  },
  {
    key: 'story',
    icon: '📗',
    color: '#36B37E',
    label: 'Story',
    badge: 'KULLANICI ODAKLI',
    badgeColor: '#36B37E',
    description: 'Kullanıcı bakış açısından yazılmış özellik',
    detail:
      'Story genelde şu formatta yazılır: "Bir kullanıcı olarak … yapabilmek istiyorum." Epic\'i parçalara böler ve sprint içinde tamamlanabilir büyüklükte olmalıdır.',
    examples: [
      '"Bir kullanıcı olarak sisteme giriş yapabilmek istiyorum."',
      '"Bir yönetici olarak üye ekleyip çıkarabilmek istiyorum."',
    ],
  },
  {
    key: 'task',
    icon: '✅',
    color: '#0052CC',
    label: 'Task',
    badge: 'TEKNİK',
    badgeColor: '#0052CC',
    description: 'Teknik veya operasyonel iş',
    detail:
      'Task doğrudan bir kullanıcı özelliği olmak zorunda değildir. Altyapı, refactor veya ops işleri için kullanılır.',
    examples: ['"Sunucu kurulumu"', '"Veritabanı migrasyonu"', '"CI/CD pipeline oluştur"'],
  },
  {
    key: 'bug',
    icon: '🔴',
    color: '#FF5630',
    label: 'Hata (Bug)',
    badge: 'HATA',
    badgeColor: '#FF5630',
    description: 'Yazılımda tespit edilen beklenmedik davranış',
    detail:
      'Mevcut bir özelliğin yanlış veya eksik çalıştığını bildirmek için kullanılır. Tekrar üretme adımları ve beklenen/gerçek davranış ile birlikte tanımlanmalıdır.',
    examples: ['"Login butonu çalışmıyor"', '"API 500 hatası veriyor"', '"Mobilde layout bozuk"'],
  },
  {
    key: 'subtask',
    icon: '🔷',
    color: '#00B8D9',
    label: 'Alt Görev',
    badge: 'ALT ÖĞE',
    badgeColor: '#00B8D9',
    description: 'Story veya Task altında daha küçük iş parçası',
    detail:
      'Alt Görev bir Story veya Task\'ın daha küçük, bağımsız olarak tamamlanabilir parçasıdır. Ana bilete bağlı kalır.',
    examples: ['"Login formu UI"', '"Login API entegrasyonu"', '"Login birim testleri"'],
  },
];

export default function OgeEklePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { boards, currentBoard, fetchBoards } = useBoardStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTypeName, setSelectedTypeName] = useState<string>('');
  const [columns, setColumns] = useState<Column[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  // Boards ve kolonları yükle
  useEffect(() => {
    if (!projectId) return;
    setLoadingBoards(true);
    fetchBoards(projectId).finally(() => setLoadingBoards(false));
  }, [projectId, fetchBoards]);

  // currentBoard veya boards değişince kolonları güncelle
  useEffect(() => {
    if (currentBoard?.columns) {
      setColumns([...currentBoard.columns].sort((a, b) => a.position - b.position));
    } else if (boards.length > 0 && boards[0].columns) {
      setColumns([...boards[0].columns].sort((a, b) => a.position - b.position));
    }
  }, [currentBoard, boards]);

  const handleSelect = (_typeKey: string, typeLabel: string) => {
    setSelectedTypeName(typeLabel);
    setModalOpen(true);
  };

  if (!projectId) return null;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h2 className={styles.title}>Öğe Ekle</h2>
        <p className={styles.subtitle}>
          Projeye eklemek istediğiniz öğe türünü seçin. Her tür farklı bir iş parçasını temsil eder.
        </p>
      </div>

      {loadingBoards && columns.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <Spin size="large" />
        </div>
      ) : (
        <div className={styles.grid}>
          {itemTypes.map((type) => (
            <button
              key={type.key}
              className={styles.card}
              onClick={() => handleSelect(type.key, type.label)}
              style={{ '--accent': type.color } as React.CSSProperties}
            >
              <div className={styles.cardTop}>
                <span className={styles.cardIcon}>{type.icon}</span>
                <span
                  className={styles.cardBadge}
                  style={{ background: type.badgeColor + '22', color: type.badgeColor, border: `1px solid ${type.badgeColor}44` }}
                >
                  {type.badge}
                </span>
              </div>

              <h3 className={styles.cardLabel} style={{ color: type.color }}>
                {type.label}
              </h3>
              <p className={styles.cardDescription}>{type.description}</p>
              <p className={styles.cardDetail}>{type.detail}</p>

              <div className={styles.examplesBox}>
                <span className={styles.examplesTitle}>Örnekler:</span>
                {type.examples.map((ex, i) => (
                  <span key={i} className={styles.exampleItem}>
                    {ex}
                  </span>
                ))}
              </div>

              <div className={styles.cardFooter}>
                <span className={styles.createBtn} style={{ color: type.color }}>
                  + {type.label} Oluştur →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Görev oluşturma modali */}
      <CreateIssueModal
        open={modalOpen}
        projectId={projectId}
        columns={columns}
        defaultColumnId={columns[0]?.id}
        defaultIssueTypeName={selectedTypeName}
        onClose={() => setModalOpen(false)}
        onCreated={() => setModalOpen(false)}
      />
    </div>
  );
}
