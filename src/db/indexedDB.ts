import {
  SchoolClass,
  Student,
  Teacher,
  Subject,
  Question,
  ExamSetting,
  ExamSession,
  ExamResult,
  AppSettings,
  ActivityLog,
} from '../types';
import { hashPassword } from '../utils/auth';

const DB_NAME = 'SMPN3Kertek_EUjianDB';
const DB_VERSION = 1;

export const STORES = {
  CLASSES: 'classes',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  SUBJECTS: 'subjects',
  QUESTIONS: 'questions',
  EXAM_SETTINGS: 'examSettings',
  EXAM_SESSIONS: 'examSessions',
  EXAM_RESULTS: 'examResults',
  APP_SETTINGS: 'appSettings',
  ACTIVITY_LOGS: 'activityLogs',
} as const;

let dbInstance: IDBDatabase | null = null;

export async function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Classes
      if (!db.objectStoreNames.contains(STORES.CLASSES)) {
        db.createObjectStore(STORES.CLASSES, { keyPath: 'id' });
      }

      // Students
      if (!db.objectStoreNames.contains(STORES.STUDENTS)) {
        const studentStore = db.createObjectStore(STORES.STUDENTS, { keyPath: 'id' });
        studentStore.createIndex('classId', 'classId', { unique: false });
        studentStore.createIndex('nisn', 'nisn', { unique: false });
      }

      // Teachers
      if (!db.objectStoreNames.contains(STORES.TEACHERS)) {
        const teacherStore = db.createObjectStore(STORES.TEACHERS, { keyPath: 'id' });
        teacherStore.createIndex('username', 'username', { unique: true });
      }

      // Subjects
      if (!db.objectStoreNames.contains(STORES.SUBJECTS)) {
        const subjectStore = db.createObjectStore(STORES.SUBJECTS, { keyPath: 'id' });
        subjectStore.createIndex('code', 'code', { unique: false });
      }

      // Questions
      if (!db.objectStoreNames.contains(STORES.QUESTIONS)) {
        const qStore = db.createObjectStore(STORES.QUESTIONS, { keyPath: 'id' });
        qStore.createIndex('subjectId', 'subjectId', { unique: false });
        qStore.createIndex('assessmentType', 'assessmentType', { unique: false });
      }

      // Exam Settings
      if (!db.objectStoreNames.contains(STORES.EXAM_SETTINGS)) {
        const examStore = db.createObjectStore(STORES.EXAM_SETTINGS, { keyPath: 'id' });
        examStore.createIndex('subjectId', 'subjectId', { unique: false });
        examStore.createIndex('status', 'status', { unique: false });
      }

      // Exam Sessions
      if (!db.objectStoreNames.contains(STORES.EXAM_SESSIONS)) {
        const sessionStore = db.createObjectStore(STORES.EXAM_SESSIONS, { keyPath: 'id' });
        sessionStore.createIndex('studentId', 'studentId', { unique: false });
        sessionStore.createIndex('examId', 'examId', { unique: false });
      }

      // Exam Results
      if (!db.objectStoreNames.contains(STORES.EXAM_RESULTS)) {
        const resultStore = db.createObjectStore(STORES.EXAM_RESULTS, { keyPath: 'id' });
        resultStore.createIndex('studentId', 'studentId', { unique: false });
        resultStore.createIndex('examId', 'examId', { unique: false });
        resultStore.createIndex('classId', 'classId', { unique: false });
        resultStore.createIndex('subjectId', 'subjectId', { unique: false });
      }

      // App Settings
      if (!db.objectStoreNames.contains(STORES.APP_SETTINGS)) {
        db.createObjectStore(STORES.APP_SETTINGS, { keyPath: 'id' });
      }

      // Activity Logs
      if (!db.objectStoreNames.contains(STORES.ACTIVITY_LOGS)) {
        const logStore = db.createObjectStore(STORES.ACTIVITY_LOGS, { keyPath: 'id' });
        logStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

// Generic CRUD operations
export async function getAllFromStore<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getByIdFromStore<T>(storeName: string, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function putToStore<T>(storeName: string, item: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function putBatchToStore<T>(storeName: string, items: T[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    items.forEach((item) => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteFromStore(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function deleteBatchFromStore(storeName: string, ids: string[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Activity logging helper
export async function logActivity(
  actor: string,
  role: 'admin' | 'guru' | 'siswa' | 'system',
  action: string,
  details: string
): Promise<void> {
  try {
    const log: ActivityLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      timestamp: new Date().toISOString(),
      actor,
      role,
      action,
      details,
    };
    await putToStore(STORES.ACTIVITY_LOGS, log);
  } catch (err) {
    console.warn('Failed to log activity:', err);
  }
}

// Default App Settings
export const DEFAULT_APP_SETTINGS: AppSettings = {
  schoolName: 'SMP NEGERI 3 KERTEK',
  schoolSubtext: 'Kabupaten Wonosobo, Jawa Tengah',
  npsn: '20306789',
  address: 'Jl. Kertek - Selomerto Km. 2, Kertek, Wonosobo, Jawa Tengah 56371',
  headmasterName: 'Drs. H. Bambang Setiawan, M.Pd.',
  academicYear: '2026/2027',
  semester: 'Ganjil',
  defaultExamDuration: 60,
  defaultPassingGrade: 75,
  enableCameraMonitoring: true,
  allowCameraBypassForTroubleshooting: true,
  strictFullscreenMode: true,
  theme: 'light',

  customLogoUrl: '',
  useDefaultLogo: true,
  frontpageTitle: 'PLATFORM E-UJIAN SMP NEGERI 3 KERTEK',
  frontpageSubtitle: 'Platform Asesmen dan Evaluasi Pembelajaran Digital',
  frontpageBadge: 'Sistem ANBK Digital',
  backgroundTheme: 'gradient-blue',
  customBackgroundImageUrl: '',
  backgroundOverlayOpacity: 60,
};

// Seed initial demo data for SMP Negeri 3 Kertek
export async function seedInitialData(force = false): Promise<void> {
  await openDB();
  const existingClasses = await getAllFromStore<SchoolClass>(STORES.CLASSES);
  if (existingClasses.length > 0 && !force) {
    return; // Already initialized
  }

  // 1. Classes
  const defaultClasses: SchoolClass[] = [
    { id: 'cls_7a', name: 'VII A', gradeLevel: '7', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_7b', name: 'VII B', gradeLevel: '7', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_7c', name: 'VII C', gradeLevel: '7', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_8a', name: 'VIII A', gradeLevel: '8', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_8b', name: 'VIII B', gradeLevel: '8', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_9a', name: 'IX A', gradeLevel: '9', createdAt: '2026-07-15T08:00:00Z' },
    { id: 'cls_9b', name: 'IX B', gradeLevel: '9', createdAt: '2026-07-15T08:00:00Z' },
  ];
  await putBatchToStore(STORES.CLASSES, defaultClasses);

  // 2. Students
  const defaultStudents: Student[] = [
    // VII A
    { id: 'std_01', nisn: '0098123401', name: 'Ahmad Faiz Al-Faruq', classId: 'cls_7a', className: 'VII A', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_02', nisn: '0098123402', name: 'Annisa Nurul Ramadhani', classId: 'cls_7a', className: 'VII A', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_03', nisn: '0098123403', name: 'Bagus Tri Wibowo', classId: 'cls_7a', className: 'VII A', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_04', nisn: '0098123404', name: 'Dewi Lestari Kusuma', classId: 'cls_7a', className: 'VII A', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_05', nisn: '0098123405', name: 'Fajar Nugraha', classId: 'cls_7a', className: 'VII A', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    // VII B
    { id: 'std_06', nisn: '0098123406', name: 'Gita Maharani Putri', classId: 'cls_7b', className: 'VII B', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_07', nisn: '0098123407', name: 'Hafiz Aditya Pratama', classId: 'cls_7b', className: 'VII B', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_08', nisn: '0098123408', name: 'Indah Permatasari', classId: 'cls_7b', className: 'VII B', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
    // VIII A
    { id: 'std_09', nisn: '0087123409', name: 'Muhammad Rizky Saputra', classId: 'cls_8a', className: 'VIII A', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_10', nisn: '0087123410', name: 'Nabila Zahra Syahrani', classId: 'cls_8a', className: 'VIII A', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
    // IX A
    { id: 'std_11', nisn: '0076123411', name: 'Rangga Arya Sena', classId: 'cls_9a', className: 'IX A', gender: 'L', status: 'aktif', createdAt: '2026-07-16' },
    { id: 'std_12', nisn: '0076123412', name: 'Siti Rahmawati', classId: 'cls_9a', className: 'IX A', gender: 'P', status: 'aktif', createdAt: '2026-07-16' },
  ];
  await putBatchToStore(STORES.STUDENTS, defaultStudents);

  // 3. Teachers
  const teacherPasswordHash = await hashPassword('guru123');
  const defaultTeachers: Teacher[] = [
    {
      id: 'tch_01',
      nip: '198205122008011005',
      name: 'Triyono, S.Pd., M.Kom.',
      username: 'triyono',
      passwordHash: teacherPasswordHash,
      subjectIds: ['sbj_infor'],
      classIds: ['cls_7a', 'cls_7b', 'cls_7c', 'cls_8a', 'cls_9a'],
      status: 'aktif',
      createdAt: '2026-07-10',
    },
    {
      id: 'tch_02',
      nip: '197908232005012011',
      name: 'Endang Purwaningsih, S.Pd.',
      username: 'endang',
      passwordHash: teacherPasswordHash,
      subjectIds: ['sbj_ipa'],
      classIds: ['cls_7a', 'cls_7b', 'cls_8a'],
      status: 'aktif',
      createdAt: '2026-07-10',
    },
    {
      id: 'tch_03',
      nip: '198503142010011009',
      name: 'Agus Priyanto, S.Pd.',
      username: 'agus',
      passwordHash: teacherPasswordHash,
      subjectIds: ['sbj_mtk'],
      classIds: ['cls_7a', 'cls_7b', 'cls_8a', 'cls_9a'],
      status: 'aktif',
      createdAt: '2026-07-10',
    },
    {
      id: 'tch_04',
      nip: '198901012014022003',
      name: 'Wahyu Hidayat, S.Pd.',
      username: 'wahyu',
      passwordHash: teacherPasswordHash,
      subjectIds: ['sbj_indo'],
      classIds: ['cls_7a', 'cls_7b', 'cls_7c'],
      status: 'aktif',
      createdAt: '2026-07-10',
    },
  ];
  await putBatchToStore(STORES.TEACHERS, defaultTeachers);

  // 4. Subjects
  const defaultSubjects: Subject[] = [
    { id: 'sbj_infor', code: 'INF-7', name: 'Informatika', teacherId: 'tch_01', teacherName: 'Triyono, S.Pd., M.Kom.', status: 'aktif', createdAt: '2026-07-10' },
    { id: 'sbj_ipa', code: 'IPA-7', name: 'Ilmu Pengetahuan Alam (IPA)', teacherId: 'tch_02', teacherName: 'Endang Purwaningsih, S.Pd.', status: 'aktif', createdAt: '2026-07-10' },
    { id: 'sbj_mtk', code: 'MTK-7', name: 'Matematika', teacherId: 'tch_03', teacherName: 'Agus Priyanto, S.Pd.', status: 'aktif', createdAt: '2026-07-10' },
    { id: 'sbj_indo', code: 'BIN-7', name: 'Bahasa Indonesia', teacherId: 'tch_04', teacherName: 'Wahyu Hidayat, S.Pd.', status: 'aktif', createdAt: '2026-07-10' },
    { id: 'sbj_bing', code: 'ENG-7', name: 'Bahasa Inggris', status: 'aktif', createdAt: '2026-07-10' },
    { id: 'sbj_ppkn', code: 'PKN-7', name: 'Pendidikan Pancasila', status: 'aktif', createdAt: '2026-07-10' },
  ];
  await putBatchToStore(STORES.SUBJECTS, defaultSubjects);

  // 5. Questions (Bank Soal SMPN 3 Kertek)
  const defaultQuestions: Question[] = [
    // Informatika - Asesmen Sumatif 1
    {
      id: 'qst_inf_01',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VII C'],
      type: 'pilihan_ganda',
      questionText: 'Komponen perangkat keras komputer yang berfungsi sebagai "otak" pemrosesan seluruh instruksi dan perhitungan logika data adalah...',
      options: [
        { key: 'A', text: 'Central Processing Unit (CPU)' },
        { key: 'B', text: 'Random Access Memory (RAM)' },
        { key: 'C', text: 'Hard Disk Drive (HDD)' },
        { key: 'D', text: 'Power Supply Unit (PSU)' },
      ],
      correctAnswer: 'A',
      weight: 10,
      discussion: 'CPU (Central Processing Unit) berperan sebagai unit pemrosesan pusat yang mengeksekusi instruksi program.',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_inf_02',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VII C'],
      type: 'pilihan_ganda',
      questionText: 'Manakah di bawah ini yang tergolong perangkat input (masukan) pada sistem komputer?',
      options: [
        { key: 'A', text: 'Monitor dan Speaker' },
        { key: 'B', text: 'Keyboard, Mouse, dan Scanner' },
        { key: 'C', text: 'Printer dan Proyektor' },
        { key: 'D', text: 'Harddisk dan Flashdisk' },
      ],
      correctAnswer: 'B',
      weight: 10,
      discussion: 'Keyboard, mouse, dan scanner berfungsi memasukkan data atau sinyal kontrol ke dalam komputer.',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_inf_03',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VII C'],
      type: 'benar_salah',
      questionText: 'Sistem operasi komputer seperti Microsoft Windows atau Linux termasuk dalam kategori perangkat lunak aplikasi pengolah kata.',
      options: [
        { key: 'A', text: 'Benar' },
        { key: 'B', text: 'Salah' },
      ],
      correctAnswer: 'B',
      weight: 10,
      discussion: 'Salah. Sistem operasi adalah perangkat lunak sistem (system software), sedangkan pengolah kata seperti Microsoft Word adalah perangkat lunak aplikasi.',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_inf_04',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VII C'],
      type: 'pilihan_ganda',
      questionText: 'Di era digital saat ini, etika penggunaan internet sangat penting. Istilah yang merujuk pada tata krama dan sopan santun dalam berkomunikasi melalui internet disebut...',
      options: [
        { key: 'A', text: 'Cybercrime' },
        { key: 'B', text: 'Netiket (Network Etiquette)' },
        { key: 'C', text: 'Copyright' },
        { key: 'D', text: 'Firewall' },
      ],
      correctAnswer: 'B',
      weight: 10,
      discussion: 'Netiket adalah singkatan dari network etiquette, yaitu etika dan kesantunan dalam berinteraksi di dunia maya.',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_inf_05',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VII C'],
      type: 'uraian',
      questionText: 'Jelaskan perbedaan mendasar antara memori primer (RAM) dan penyimpanan sekunder (SSD/Harddisk) dalam sistem komputer!',
      options: [],
      correctAnswer: 'RAM bersifat volatile (data hilang saat mati listrik) dan berkecepatan tinggi untuk eksekusi program. Storage sekunder bersifat non-volatile untuk menyimpan file secara permanen.',
      weight: 20,
      scoringRubric: 'Maksimal 20 poin: Menjelaskan sifat volatile RAM (8 poin), sifat non-volatile storage sekunder (8 poin), serta fungsi kecepatan akses dan penyimpanan file (4 poin).',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },

    // IPA - Asesmen Sumatif 1
    {
      id: 'qst_ipa_01',
      subjectId: 'sbj_ipa',
      subjectName: 'Ilmu Pengetahuan Alam (IPA)',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VIII A'],
      type: 'pilihan_ganda',
      questionText: 'Besaran pokok dalam Sistem Internasional (SI) yang memiliki satuan Kelvin adalah...',
      options: [
        { key: 'A', text: 'Panjang' },
        { key: 'B', text: 'Suhu' },
        { key: 'C', text: 'Massa' },
        { key: 'D', text: 'Kuat Arus Listrik' },
      ],
      correctAnswer: 'B',
      weight: 10,
      discussion: 'Satuan SI untuk suhu adalah Kelvin (K).',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_ipa_02',
      subjectId: 'sbj_ipa',
      subjectName: 'Ilmu Pengetahuan Alam (IPA)',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VIII A'],
      type: 'pilihan_ganda',
      questionText: 'Peristiwa perubahan wujud zat dari padat langsung menjadi gas tanpa melalui fase cair disebut...',
      options: [
        { key: 'A', text: 'Menguap' },
        { key: 'B', text: 'Menyublim' },
        { key: 'C', text: 'Mengkristal' },
        { key: 'D', text: 'Mengembun' },
      ],
      correctAnswer: 'B',
      weight: 10,
      discussion: 'Menyublim adalah perubahan wujud dari padat langsung menjadi gas, contohnya kapur barus.',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
    {
      id: 'qst_ipa_03',
      subjectId: 'sbj_ipa',
      subjectName: 'Ilmu Pengetahuan Alam (IPA)',
      assessmentType: 'Asesmen Sumatif 1',
      targetClasses: ['VII A', 'VII B', 'VIII A'],
      type: 'uraian',
      questionText: 'Sebutkan 3 ciri makhluk hidup serta jelaskan mengapa tumbuhan dapat dikategorikan sebagai makhluk hidup meskipun tidak berpindah tempat layaknya hewan!',
      options: [],
      correctAnswer: 'Ciri: bernapas, peka terhadap rangsang, memerlukan nutrisi, tumbuh & berkembang, bereproduksi. Tumbuhan bergerak pasif (tropisme/nasti) menuju cahaya atau air dan melakukan fotosintesis.',
      weight: 20,
      scoringRubric: 'Maks 20 poin: 3 ciri makhluk hidup tepat (9 poin), penjelasan gerak pasif tumbuhan (6 poin), penjelasan metabolisme/fotosintesis (5 poin).',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-01',
    },
  ];
  await putBatchToStore(STORES.QUESTIONS, defaultQuestions);

  // 6. Exam Settings (Active scheduled exams)
  const defaultExams: ExamSetting[] = [
    {
      id: 'exm_01',
      title: 'Asesmen Sumatif 1 Informatika - Perangkat Keras & Komputasi',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      targetClassIds: ['cls_7a', 'cls_7b', 'cls_7c'],
      targetClassNames: ['VII A', 'VII B', 'VII C'],
      teacherId: 'tch_01',
      teacherName: 'Triyono, S.Pd., M.Kom.',
      examDate: '2026-10-28',
      startTime: '07:30',
      durationMinutes: 45,
      randomizeQuestions: false,
      randomizeOptions: false,
      maxAttempts: 1,
      passingScore: 75,
      status: 'aktif',
      totalQuestions: 5,
      createdAt: '2026-10-20',
    },
    {
      id: 'exm_02',
      title: 'Asesmen Sumatif 1 IPA - Besaran, Satuan & Wujud Zat',
      subjectId: 'sbj_ipa',
      subjectName: 'Ilmu Pengetahuan Alam (IPA)',
      assessmentType: 'Asesmen Sumatif 1',
      targetClassIds: ['cls_7a', 'cls_7b', 'cls_8a'],
      targetClassNames: ['VII A', 'VII B', 'VIII A'],
      teacherId: 'tch_02',
      teacherName: 'Endang Purwaningsih, S.Pd.',
      examDate: '2026-10-29',
      startTime: '08:00',
      durationMinutes: 60,
      randomizeQuestions: false,
      randomizeOptions: false,
      maxAttempts: 1,
      passingScore: 75,
      status: 'aktif',
      totalQuestions: 3,
      createdAt: '2026-10-20',
    },
    {
      id: 'exm_03',
      title: 'Asesmen Sumatif 2 Informatika - Algoritma Dasar',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 2',
      targetClassIds: ['cls_7a', 'cls_7b'],
      targetClassNames: ['VII A', 'VII B'],
      teacherId: 'tch_01',
      teacherName: 'Triyono, S.Pd., M.Kom.',
      examDate: '2026-11-15',
      startTime: '09:00',
      durationMinutes: 45,
      randomizeQuestions: true,
      randomizeOptions: true,
      maxAttempts: 1,
      passingScore: 75,
      status: 'draft',
      totalQuestions: 4,
      createdAt: '2026-10-21',
    },
  ];
  await putBatchToStore(STORES.EXAM_SETTINGS, defaultExams);

  // 7. Seed completed sample result for student Bagus Tri Wibowo & Ahmad Faiz to illustrate recap and grading
  const defaultResults: ExamResult[] = [
    {
      id: 'res_demo_01',
      sessionId: 'ses_demo_01',
      examId: 'exm_01',
      studentId: 'std_03',
      studentName: 'Bagus Tri Wibowo',
      classId: 'cls_7a',
      className: 'VII A',
      subjectId: 'sbj_infor',
      subjectName: 'Informatika',
      assessmentType: 'Asesmen Sumatif 1',
      startedAt: '2026-10-25T08:00:00Z',
      submittedAt: '2026-10-25T08:35:12Z',
      durationSpentMinutes: 35,
      totalQuestions: 5,
      multipleChoiceTotal: 4,
      multipleChoiceCorrect: 4,
      multipleChoiceScore: 40,
      essayTotal: 1,
      essayGradedCount: 1,
      essayScore: 18,
      maxPossibleScore: 60,
      finalScore: 97, // (58/60) * 100 approx 97
      isFullyGraded: true,
      violationCount: 0,
      answersSummary: [
        {
          questionId: 'qst_inf_01',
          questionText: 'Komponen perangkat keras komputer yang berfungsi sebagai "otak" pemrosesan...',
          questionType: 'pilihan_ganda',
          studentAnswer: 'A',
          correctAnswer: 'A',
          weight: 10,
          scoreEarned: 10,
          isCorrect: true,
        },
        {
          questionId: 'qst_inf_02',
          questionText: 'Manakah di bawah ini yang tergolong perangkat input...',
          questionType: 'pilihan_ganda',
          studentAnswer: 'B',
          correctAnswer: 'B',
          weight: 10,
          scoreEarned: 10,
          isCorrect: true,
        },
        {
          questionId: 'qst_inf_03',
          questionText: 'Sistem operasi komputer seperti Microsoft Windows atau Linux...',
          questionType: 'benar_salah',
          studentAnswer: 'B',
          correctAnswer: 'B',
          weight: 10,
          scoreEarned: 10,
          isCorrect: true,
        },
        {
          questionId: 'qst_inf_04',
          questionText: 'Di era digital saat ini, etika penggunaan internet...',
          questionType: 'pilihan_ganda',
          studentAnswer: 'B',
          correctAnswer: 'B',
          weight: 10,
          scoreEarned: 10,
          isCorrect: true,
        },
        {
          questionId: 'qst_inf_05',
          questionText: 'Jelaskan perbedaan mendasar antara memori primer (RAM) dan penyimpanan sekunder...',
          questionType: 'uraian',
          studentAnswer: 'RAM bersifat sementara (volatile) dan cepat untuk menjalankan aplikasi, sedangkan SSD menyimpan data permanen walau komputer mati.',
          correctAnswer: 'RAM volatile, storage non-volatile',
          weight: 20,
          scoreEarned: 18,
          scoringRubric: 'Maksimal 20 poin: penjelasan tepat.',
          essayNote: 'Penjelasan sangat baik dan tepat.',
        },
      ],
    },
  ];
  await putBatchToStore(STORES.EXAM_RESULTS, defaultResults);

  // 8. App Settings
  await putToStore(STORES.APP_SETTINGS, { id: 'default', ...DEFAULT_APP_SETTINGS });

  // 9. Initial Activity Log
  await logActivity('Sistem', 'system', 'Inisialisasi Database', 'Data master awal SMP Negeri 3 Kertek berhasil dimuat.');
}

// Backup & Export all data to JSON
export async function exportAllData(): Promise<string> {
  const db = await openDB();
  const stores = Object.values(STORES);
  const backupObject: Record<string, any> = {
    version: DB_VERSION,
    appName: 'E-Ujian SMP Negeri 3 Kertek',
    exportedAt: new Date().toISOString(),
    data: {},
  };

  for (const storeName of stores) {
    backupObject.data[storeName] = await getAllFromStore(storeName);
  }

  return JSON.stringify(backupObject, null, 2);
}

// Import / Restore backup
export async function importBackupData(
  jsonString: string,
  mode: 'replace' | 'merge' = 'replace'
): Promise<{ success: boolean; message: string; summary: Record<string, number> }> {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.data || typeof parsed.data !== 'object') {
      return { success: false, message: 'Format file cadangan tidak valid (struktur data hilang).', summary: {} };
    }

    const summary: Record<string, number> = {};

    for (const [storeName, items] of Object.entries(parsed.data)) {
      if (Array.isArray(items) && Object.values(STORES).includes(storeName as any)) {
        if (mode === 'replace') {
          await clearStore(storeName);
        }
        await putBatchToStore(storeName, items);
        summary[storeName] = items.length;
      }
    }

    await logActivity('Admin', 'admin', 'Restore Data', `Memulihkan database dengan mode: ${mode}`);
    return { success: true, message: 'Data cadangan berhasil dipulihkan ke IndexedDB!', summary };
  } catch (err: any) {
    return { success: false, message: `Gagal membaca file backup: ${err.message}`, summary: {} };
  }
}
