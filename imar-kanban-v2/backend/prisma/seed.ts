import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seed başlıyor...');

  // ─── Demo kullanıcılar ────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('demo123', 10);

  const demoUser = await prisma.user.upsert({
    where: { username: 'demo' },
    update: {},
    create: {
      username: 'demo',
      email: 'demo@imar.local',
      fullName: 'Demo Kullanıcı',
      displayName: 'Demo',
      passwordHash,
      authProvider: 'local',
      isActive: true,
    },
  });

  const [ahmet, ayse, mehmet] = await Promise.all([
    prisma.user.upsert({
      where: { username: 'ahmet.yilmaz' },
      update: {},
      create: {
        username: 'ahmet.yilmaz',
        email: 'ahmet@imar.local',
        fullName: 'Ahmet Yılmaz',
        displayName: 'Ahmet Y.',
        passwordHash,
        authProvider: 'local',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { username: 'ayse.kaya' },
      update: {},
      create: {
        username: 'ayse.kaya',
        email: 'ayse@imar.local',
        fullName: 'Ayşe Kaya',
        displayName: 'Ayşe K.',
        passwordHash,
        authProvider: 'local',
        isActive: true,
      },
    }),
    prisma.user.upsert({
      where: { username: 'mehmet.oz' },
      update: {},
      create: {
        username: 'mehmet.oz',
        email: 'mehmet@imar.local',
        fullName: 'Mehmet Öz',
        displayName: 'Mehmet Ö.',
        passwordHash,
        authProvider: 'local',
        isActive: true,
      },
    }),
  ]);
  console.log('✅ Kullanıcılar hazır');

  // ─── Proje 1: İmar Kanban ─────────────────────────────────────────────────
  let existingProject = await prisma.project.findUnique({ where: { key: 'IMAR' } });

  let project: Awaited<ReturnType<typeof prisma.project.create>>;
  let board: Awaited<ReturnType<typeof prisma.board.create>>;
  let todoCol: Awaited<ReturnType<typeof prisma.column.create>>;
  let inProgressCol: Awaited<ReturnType<typeof prisma.column.create>>;
  let reviewCol: Awaited<ReturnType<typeof prisma.column.create>>;
  let doneCol: Awaited<ReturnType<typeof prisma.column.create>>;
  let storyType: Awaited<ReturnType<typeof prisma.issueType.create>>;
  let taskType: Awaited<ReturnType<typeof prisma.issueType.create>>;
  let bugType: Awaited<ReturnType<typeof prisma.issueType.create>>;
  let subtaskType: Awaited<ReturnType<typeof prisma.issueType.create>>;
  let labelFE: Awaited<ReturnType<typeof prisma.label.create>>;
  let labelBE: Awaited<ReturnType<typeof prisma.label.create>>;
  let labelAcil: Awaited<ReturnType<typeof prisma.label.create>>;
  let labelTest: Awaited<ReturnType<typeof prisma.label.create>>;

  if (existingProject) {
    console.log('ℹ️  IMAR projesi zaten var — issue\'lar temizlenip yeniden oluşturuluyor...');
    project = existingProject;

    // Önce parentId referanslarını kaldır (FK kısıtı için)
    await prisma.issue.updateMany({
      where: { projectId: project.id },
      data: { parentId: null, epicId: null },
    });
    // Issue'ları sil
    await prisma.issue.deleteMany({ where: { projectId: project.id } });
    // Epic'leri sil
    await prisma.epic.deleteMany({ where: { projectId: project.id } });
    // Sprint'leri sil
    await prisma.sprint.deleteMany({ where: { projectId: project.id } });
    // Counter sıfırla
    await prisma.project.update({ where: { id: project.id }, data: { issueCounter: 0 } });

    // Mevcut board ve kolonları bul
    const existingBoard = await prisma.board.findFirst({ where: { projectId: project.id } });
    if (!existingBoard) throw new Error('Board bulunamadı');
    board = existingBoard;

    const cols = await prisma.column.findMany({
      where: { boardId: board.id },
      orderBy: { position: 'asc' },
    });
    todoCol = cols[0];
    inProgressCol = cols[1];
    reviewCol = cols[2];
    doneCol = cols[3];

    // Mevcut issue type'ları bul
    const types = await prisma.issueType.findMany({ where: { projectId: project.id } });
    const typeMap = Object.fromEntries(types.map((t) => [t.name, t]));
    storyType = typeMap['Story'];
    taskType = typeMap['Task'];
    bugType = typeMap['Bug'];
    subtaskType = typeMap['Alt Görev'];

    // Mevcut label'ları bul
    const existingLabels = await prisma.label.findMany({ where: { projectId: project.id } });
    const labelMap = Object.fromEntries(existingLabels.map((l) => [l.name, l]));
    labelFE = labelMap['frontend'];
    labelBE = labelMap['backend'];
    labelAcil = labelMap['acil'];
    labelTest = labelMap['test'];
  } else {
    // Sıfırdan oluştur
    project = await prisma.project.create({
      data: {
        name: 'İmar Kanban Projesi',
        key: 'IMAR',
        description: 'Belediye imar süreçleri takip sistemi',
        ownerId: demoUser.id,
      },
    });

    await prisma.projectMember.createMany({
      data: [
        { projectId: project.id, userId: demoUser.id, role: 'admin' },
        { projectId: project.id, userId: ahmet.id, role: 'member' },
        { projectId: project.id, userId: ayse.id, role: 'member' },
        { projectId: project.id, userId: mehmet.id, role: 'member' },
      ],
    });

    const createdTypes = await Promise.all([
      prisma.issueType.create({ data: { projectId: project.id, name: 'Epic', icon: '🚀', color: '#FF8B00' } }),
      prisma.issueType.create({ data: { projectId: project.id, name: 'Story', icon: '📗', color: '#6554C0' } }),
      prisma.issueType.create({ data: { projectId: project.id, name: 'Task', icon: '✅', color: '#0052CC' } }),
      prisma.issueType.create({ data: { projectId: project.id, name: 'Bug', icon: '🔴', color: '#FF5630' } }),
      prisma.issueType.create({ data: { projectId: project.id, name: 'Alt Görev', icon: '🔷', color: '#00B8D9' } }),
    ]);
    storyType = createdTypes[1];
    taskType = createdTypes[2];
    bugType = createdTypes[3];
    subtaskType = createdTypes[4];

    [labelFE, labelBE, labelAcil, labelTest] = await Promise.all([
      prisma.label.create({ data: { projectId: project.id, name: 'frontend', color: '#0052CC' } }),
      prisma.label.create({ data: { projectId: project.id, name: 'backend', color: '#FF5630' } }),
      prisma.label.create({ data: { projectId: project.id, name: 'acil', color: '#FF8B00' } }),
      prisma.label.create({ data: { projectId: project.id, name: 'test', color: '#6554C0' } }),
    ]);

    board = await prisma.board.create({
      data: {
        projectId: project.id,
        name: 'Ana Pano',
        description: 'Varsayılan Kanban panosu',
        analyticsEnabled: true,
      },
    });

    const createdCols = await Promise.all([
      prisma.column.create({ data: { boardId: board.id, name: 'Yapılacak', category: 'todo', position: 0, color: '#DFE1E6' } }),
      prisma.column.create({ data: { boardId: board.id, name: 'Devam Ediyor', category: 'in_progress', position: 1, color: '#579DFF', wipLimit: 5 } }),
      prisma.column.create({ data: { boardId: board.id, name: 'Gözden Geçirme', category: 'in_progress', position: 2, color: '#FFA500' } }),
      prisma.column.create({ data: { boardId: board.id, name: 'Tamamlandı', category: 'done', position: 3, color: '#4BCE97' } }),
    ]);
    todoCol = createdCols[0];
    inProgressCol = createdCols[1];
    reviewCol = createdCols[2];
    doneCol = createdCols[3];
  }

  console.log('✅ Proje, board ve kolonlar hazır');

  // ─── Sprint ───────────────────────────────────────────────────────────────
  const sprint = await prisma.sprint.create({
    data: {
      projectId: project.id,
      name: 'Sprint 1',
      goal: 'MVP özelliklerini tamamla ve dağıtıma hazır hale getir',
      status: 'active',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
    },
  });
  console.log('✅ Sprint oluşturuldu');

  // ─── Epics ────────────────────────────────────────────────────────────────
  const [epicUI, epicBackend, epicTest] = await Promise.all([
    prisma.epic.create({
      data: {
        projectId: project.id,
        name: 'Kullanıcı Arayüzü',
        description: 'Frontend bileşenleri ve kullanıcı deneyimi iyileştirmeleri',
        status: 'active',
        color: '#0052CC',
        startDate: new Date('2026-02-01'),
        targetDate: new Date('2026-02-28'),
      },
    }),
    prisma.epic.create({
      data: {
        projectId: project.id,
        name: 'Backend Servisleri',
        description: 'REST API, kimlik doğrulama ve veri yönetimi servisleri',
        status: 'active',
        color: '#6554C0',
        startDate: new Date('2026-02-01'),
        targetDate: new Date('2026-03-15'),
      },
    }),
    prisma.epic.create({
      data: {
        projectId: project.id,
        name: 'Test & Deployment',
        description: 'Test altyapısı, CI/CD pipeline ve prodüksiyon dağıtımı',
        status: 'planning',
        color: '#36B37E',
        startDate: new Date('2026-03-01'),
        targetDate: new Date('2026-03-31'),
      },
    }),
  ]);
  console.log('✅ 3 Epic oluşturuldu');

  // ─── Issue counter yardımcısı ─────────────────────────────────────────────
  let issueCounter = 0;
  const nextKey = async () => {
    issueCounter++;
    await prisma.project.update({
      where: { id: project.id },
      data: { issueCounter: issueCounter },
    });
    return { issueNumber: issueCounter, issueKey: `IMAR-${issueCounter}` };
  };

  // ─── Hikayeler ve Görevler ────────────────────────────────────────────────
  // Epic 1: Kullanıcı Arayüzü → 3 Story → 2 Task each

  // Story 1: Login & Auth UI
  const s1Key = await nextKey();
  const story1 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s1Key,
      title: 'Login & Auth UI',
      description: 'Kullanıcı giriş, kayıt ve şifre sıfırlama ekranları',
      issueTypeId: storyType.id,
      epicId: epicUI.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 8,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-15'),
      position: 0,
    },
  });
  const t1Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t1Key,
      title: 'Giriş formu tasarımı ve validasyonu',
      description: 'Email/şifre giriş formu, hata mesajları, loading state',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story1.id,
      columnId: doneCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 3,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-10'),
      position: 0,
      labels: { connect: [{ id: labelFE.id }] },
    },
  });
  const t2Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t2Key,
      title: 'JWT token yönetimi ve oturum süreleri',
      description: 'Access/refresh token akışı, otomatik yenileme',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story1.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 5,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-15'),
      position: 1,
      labels: { connect: [{ id: labelFE.id }, { id: labelBE.id }] },
    },
  });

  // Story 2: Dashboard Görünümü
  const s2Key = await nextKey();
  const story2 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s2Key,
      title: 'Dashboard Görünümü',
      description: 'Proje özet panosu, istatistik kartları ve grafikler',
      issueTypeId: storyType.id,
      epicId: epicUI.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 5,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-20'),
      position: 1,
    },
  });
  const t3Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t3Key,
      title: 'KPI kartları ve özet istatistikler',
      description: 'Toplam issue, sprint ilerleme, takım verimliliği kartları',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story2.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 3,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-18'),
      position: 0,
      labels: { connect: [{ id: labelFE.id }] },
    },
  });
  const t4Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t4Key,
      title: 'Grafik ve chart entegrasyonu',
      description: 'Burndown chart, velocity chart, pie chart bileşenleri',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story2.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'low',
      storyPoints: 5,
      assigneeId: mehmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-22'),
      position: 1,
      labels: { connect: [{ id: labelFE.id }] },
    },
  });

  // Story 3: Bildirim Paneli
  const s3Key = await nextKey();
  const story3 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s3Key,
      title: 'Bildirim Paneli',
      description: 'Kullanıcıya yönelik bildirim sistemi ve panel',
      issueTypeId: storyType.id,
      epicId: epicUI.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'low',
      storyPoints: 3,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-25'),
      position: 2,
    },
  });
  const t5Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t5Key,
      title: 'Bildirim listesi ve okundu işaretleme',
      description: 'Bildirim merkezi dropdown, okundu/okunmadı filtresi',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story3.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'low',
      storyPoints: 2,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-22'),
      position: 0,
      labels: { connect: [{ id: labelFE.id }] },
    },
  });
  const t6Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t6Key,
      title: 'Email bildirim şablonları',
      description: 'Görev atama, yorum ve deadline email bildirimleri',
      issueTypeId: taskType.id,
      epicId: epicUI.id,
      parentId: story3.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'lowest',
      storyPoints: 2,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-25'),
      position: 1,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });

  console.log('✅ Epic "Kullanıcı Arayüzü" altındaki story ve task\'lar oluşturuldu');

  // Epic 2: Backend Servisleri → 3 Story → 2 Task each

  // Story 4: REST API Altyapısı
  const s4Key = await nextKey();
  const story4 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s4Key,
      title: 'REST API Altyapısı',
      description: 'NestJS ile tam kapsamlı REST API, DTO validasyonu, Swagger dökümantasyonu',
      issueTypeId: storyType.id,
      epicId: epicBackend.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'highest',
      storyPoints: 13,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-15'),
      position: 0,
    },
  });
  const t7Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t7Key,
      title: 'Issue CRUD endpoint\'leri',
      description: 'GET, POST, PATCH, DELETE /issues endpoint\'leri ve DTO\'ları',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story4.id,
      columnId: doneCol.id,
      sprintId: sprint.id,
      priority: 'highest',
      storyPoints: 5,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-10'),
      position: 0,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });
  const t8Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t8Key,
      title: 'Swagger API dökümantasyonu',
      description: 'Tüm endpoint\'leri Swagger/OpenAPI ile belgele',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story4.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 3,
      assigneeId: mehmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-15'),
      position: 1,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });

  // Story 5: JWT Auth Servisi
  const s5Key = await nextKey();
  const story5 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s5Key,
      title: 'JWT Auth Servisi',
      description: 'Kimlik doğrulama, yetkilendirme ve oturum yönetimi',
      issueTypeId: storyType.id,
      epicId: epicBackend.id,
      columnId: doneCol.id,
      sprintId: sprint.id,
      priority: 'highest',
      storyPoints: 5,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-10'),
      position: 1,
    },
  });
  const t9Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t9Key,
      title: 'JWT access/refresh token üretimi',
      description: 'Güvenli token üretimi, imzalama ve doğrulama',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story5.id,
      columnId: doneCol.id,
      sprintId: sprint.id,
      priority: 'highest',
      storyPoints: 3,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-08'),
      position: 0,
      labels: { connect: [{ id: labelBE.id }, { id: labelAcil.id }] },
    },
  });
  const t10Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t10Key,
      title: 'Refresh token rotasyonu ve geçersiz kılma',
      description: 'Token yenileme endpoint\'i, logout ve blacklist yönetimi',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story5.id,
      columnId: doneCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 3,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-10'),
      position: 1,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });

  // Story 6: Dosya Yönetimi
  const s6Key = await nextKey();
  const story6 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s6Key,
      title: 'Dosya Yönetimi Servisi',
      description: 'MinIO ile dosya yükleme, indirme ve önizleme altyapısı',
      issueTypeId: storyType.id,
      epicId: epicBackend.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 8,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-20'),
      position: 2,
    },
  });
  const t11Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t11Key,
      title: 'MinIO entegrasyonu ve dosya yükleme',
      description: 'MinIO bucket yapılandırması, çoklu format desteği',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story6.id,
      columnId: inProgressCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 5,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-17'),
      position: 0,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });
  const t12Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t12Key,
      title: 'Dosya önizleme ve thumbnail üretimi',
      description: 'Görsel küçük resim, PDF önizleme API\'si',
      issueTypeId: taskType.id,
      epicId: epicBackend.id,
      parentId: story6.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 3,
      assigneeId: mehmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-20'),
      position: 1,
      labels: { connect: [{ id: labelBE.id }, { id: labelFE.id }] },
    },
  });

  console.log('✅ Epic "Backend Servisleri" altındaki story ve task\'lar oluşturuldu');

  // Epic 3: Test & Deployment → 3 Story → 2 Task each

  // Story 7: Unit Test Suite
  const s7Key = await nextKey();
  const story7 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s7Key,
      title: 'Unit Test Suite',
      description: 'Servis ve controller katmanları için kapsamlı unit testler',
      issueTypeId: storyType.id,
      epicId: epicTest.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 5,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-10'),
      position: 0,
    },
  });
  const t13Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t13Key,
      title: 'Issues service unit testleri',
      description: 'CRUD operasyonları, validasyon ve hata senaryoları',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story7.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 3,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-08'),
      position: 0,
      labels: { connect: [{ id: labelTest.id }, { id: labelBE.id }] },
    },
  });
  const t14Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t14Key,
      title: 'Auth ve board controller testleri',
      description: 'JWT guard, board CRUD ve permission testleri',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story7.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 3,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-10'),
      position: 1,
      labels: { connect: [{ id: labelTest.id }] },
    },
  });

  // Story 8: Entegrasyon Testleri
  const s8Key = await nextKey();
  const story8 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s8Key,
      title: 'Entegrasyon Testleri',
      description: 'E2E API testleri ve bileşen entegrasyon testleri',
      issueTypeId: storyType.id,
      epicId: epicTest.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 8,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-20'),
      position: 1,
    },
  });
  const t15Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t15Key,
      title: 'Supertest ile E2E API test senaryoları',
      description: 'Issue, board, sprint endpoint\'leri için E2E testler',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story8.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 5,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-15'),
      position: 0,
      labels: { connect: [{ id: labelTest.id }, { id: labelBE.id }] },
    },
  });
  const t16Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t16Key,
      title: 'Frontend bileşen entegrasyon testleri',
      description: 'Board, drawer ve form bileşenleri için React Testing Library testleri',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story8.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'low',
      storyPoints: 5,
      assigneeId: mehmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-20'),
      position: 1,
      labels: { connect: [{ id: labelTest.id }, { id: labelFE.id }] },
    },
  });

  // Story 9: CI/CD Pipeline
  const s9Key = await nextKey();
  const story9 = await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...s9Key,
      title: 'CI/CD Pipeline',
      description: 'GitHub Actions ile otomatik test, build ve deployment pipeline\'ı',
      issueTypeId: storyType.id,
      epicId: epicTest.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 13,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-31'),
      position: 2,
    },
  });
  const t17Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t17Key,
      title: 'GitHub Actions workflow dosyaları',
      description: 'Test, lint ve build adımları için CI workflow',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story9.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 5,
      assigneeId: demoUser.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-25'),
      position: 0,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });
  const t18Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...t18Key,
      title: 'Docker image build ve registry push',
      description: 'Otomatik Docker image build, tag ve container registry\'ye push',
      issueTypeId: taskType.id,
      epicId: epicTest.id,
      parentId: story9.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 3,
      assigneeId: ahmet.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-03-28'),
      position: 1,
      labels: { connect: [{ id: labelBE.id }] },
    },
  });

  console.log('✅ Epic "Test & Deployment" altındaki story ve task\'lar oluşturuldu');

  // ─── Bağımsız Bug\'lar ────────────────────────────────────────────────────
  const b1Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...b1Key,
      title: 'Drag & drop sonrası kolon sayıları güncellenmıyor',
      description: 'Issue sürüklendiğinde kaynak kolonun WIP sayısı doğru güncellenmiyor',
      issueTypeId: bugType.id,
      columnId: reviewCol.id,
      sprintId: sprint.id,
      priority: 'high',
      storyPoints: 2,
      assigneeId: mehmet.id,
      reporterId: ahmet.id,
      dueDate: new Date('2026-02-12'),
      position: 0,
      labels: { connect: [{ id: labelFE.id }, { id: labelAcil.id }] },
    },
  });

  const b2Key = await nextKey();
  await prisma.issue.create({
    data: {
      projectId: project.id, boardId: board.id,
      ...b2Key,
      title: 'Epic silindi sonrası board\'da eski badge kalmaya devam ediyor',
      description: 'Epic silinince board\'u yenilemeden eski epic badge görünmekte',
      issueTypeId: bugType.id,
      columnId: todoCol.id,
      sprintId: sprint.id,
      priority: 'medium',
      storyPoints: 1,
      assigneeId: ayse.id,
      reporterId: demoUser.id,
      dueDate: new Date('2026-02-18'),
      position: 1,
      labels: { connect: [{ id: labelFE.id }] },
    },
  });

  console.log(`✅ Toplam ${issueCounter} issue oluşturuldu (9 Story + 18 Task + 2 Bug)`);

  // ─── Proje 2: Akıllı Şehir ───────────────────────────────────────────────
  const existingProject2 = await prisma.project.findUnique({ where: { key: 'ASP' } });
  if (!existingProject2) {
    const project2 = await prisma.project.create({
      data: {
        name: 'Akıllı Şehir Platformu',
        key: 'ASP',
        description: 'Şehir altyapısı izleme ve yönetim sistemi',
        ownerId: ahmet.id,
      },
    });

    await prisma.projectMember.createMany({
      data: [
        { projectId: project2.id, userId: ahmet.id, role: 'admin' },
        { projectId: project2.id, userId: demoUser.id, role: 'member' },
      ],
    });

    const board2 = await prisma.board.create({
      data: { projectId: project2.id, name: 'Sprint Panosu', description: 'Akıllı şehir sprint panosu' },
    });

    const col2todo = await prisma.column.create({ data: { boardId: board2.id, name: 'Yapılacak', category: 'todo', position: 0 } });
    const col2done = await prisma.column.create({ data: { boardId: board2.id, name: 'Tamamlandı', category: 'done', position: 1 } });

    await prisma.issueType.createMany({
      data: [
        { projectId: project2.id, name: 'Task', icon: '✅', color: '#0052CC' },
        { projectId: project2.id, name: 'Bug', icon: '🔴', color: '#FF5630' },
      ],
    });
    const types2 = await prisma.issueType.findMany({ where: { projectId: project2.id } });

    await prisma.project.update({ where: { id: project2.id }, data: { issueCounter: 1 } });
    await prisma.issue.create({
      data: {
        projectId: project2.id, boardId: board2.id, columnId: col2todo.id,
        issueNumber: 1, issueKey: 'ASP-1',
        title: 'IoT sensör entegrasyonu',
        description: 'Trafik ve hava kalitesi sensörlerini platforma bağla',
        priority: 'high', position: 0,
        reporterId: ahmet.id, assigneeId: demoUser.id,
        issueTypeId: types2[0]?.id, storyPoints: 13,
      },
    });

    await prisma.project.update({ where: { id: project2.id }, data: { issueCounter: 2 } });
    await prisma.issue.create({
      data: {
        projectId: project2.id, boardId: board2.id, columnId: col2done.id,
        issueNumber: 2, issueKey: 'ASP-2',
        title: 'Dashboard tasarımı',
        description: 'Şehir geneli izleme paneli',
        priority: 'medium', position: 0,
        reporterId: ahmet.id, assigneeId: ayse.id,
        issueTypeId: types2[0]?.id, storyPoints: 8,
      },
    });

    console.log('✅ 2. proje oluşturuldu:', project2.name);
  } else {
    console.log('ℹ️  ASP projesi zaten var, atlanıyor.');
  }

  console.log('\n🎉 Seed tamamlandı!');
  console.log('─────────────────────────────────────────────────');
  console.log('Hiyerarşi: 3 Epic → 9 Story → 18 Task + 2 Bug');
  console.log('─────────────────────────────────────────────────');
  console.log('Giriş bilgileri:');
  console.log('  Kullanıcı adı: demo   Şifre: demo123');
  console.log('─────────────────────────────────────────────────');
}

main()
  .catch((e) => {
    console.error('❌ Seed hatası:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
