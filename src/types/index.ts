export type QuestionType = 'pilihan_ganda' | 'uraian' | 'benar_salah' | 'pilihan_ganda_kompleks';

export type AssessmentType = 'Asesmen Sumatif 1' | 'Asesmen Sumatif 2' | 'Asesmen Sumatif 3' | 'Asesmen Sumatif 4';

export interface SchoolClass {
  id: string;
  name: string; // e.g. "VII A", "VII B", "VIII A", "IX A"
  gradeLevel: '7' | '8' | '9';
  createdAt: string;
}

export interface Student {
  id: string;
  nisn: string;
  name: string;
  classId: string;
  className: string;
  gender: 'L' | 'P';
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface Teacher {
  id: string;
  nip: string;
  name: string;
  username: string;
  passwordHash: string; // client-side hashed
  subjectIds: string[]; // subjects taught
  classIds: string[]; // classes assigned
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  teacherId?: string;
  teacherName?: string;
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  assessmentType: AssessmentType;
  targetClasses: string[]; // class names e.g. ["VII A", "VII B"]
  type: QuestionType;
  questionText: string;
  imageUrl?: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D' | 'E';
    text: string;
  }[];
  correctAnswer: string; // 'A' | 'B' | 'C' | 'D' | 'E' or 'Benar'/'Salah' or comma-separated keys for complex, or key outline for essay
  weight: number; // default 10
  discussion?: string;
  scoringRubric?: string; // for essay
  createdAt: string;
  updatedAt: string;
}

export interface ExamSetting {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  assessmentType: AssessmentType;
  targetClassIds: string[]; // classes allowed
  targetClassNames: string[];
  teacherId?: string;
  teacherName?: string;
  examDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationMinutes: number; // e.g. 60 or 90
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  maxAttempts: number;
  passingScore: number; // KKM / KKTP default 75
  status: 'draft' | 'aktif' | 'selesai';
  totalQuestions: number;
  createdAt: string;
}

export interface ExamSessionAnswer {
  questionId: string;
  selectedAnswer: string; // for MC or complex choices
  essayText?: string;
  isHesitant: boolean; // ragu-ragu
  scoreEarned?: number; // calculated or graded
  isGraded?: boolean;
}

export interface ExamSession {
  id: string;
  examId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: AssessmentType;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  timeRemainingSeconds: number;
  status: 'ongoing' | 'completed' | 'terminated';
  orderedQuestionIds: string[]; // preserved randomized question order
  answers: Record<string, ExamSessionAnswer>; // key: questionId
  violationLogs: {
    timestamp: string;
    type: 'fullscreen_exit' | 'tab_switch' | 'camera_disconnected';
    message: string;
  }[];
  lastHeartbeat: string;
}

export interface ExamResult {
  id: string;
  sessionId: string;
  examId: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  assessmentType: AssessmentType;
  startedAt: string;
  submittedAt: string;
  durationSpentMinutes: number;
  totalQuestions: number;
  multipleChoiceTotal: number;
  multipleChoiceCorrect: number;
  multipleChoiceScore: number;
  essayTotal: number;
  essayGradedCount: number;
  essayScore: number;
  maxPossibleScore: number;
  finalScore: number; // 0 - 100
  isFullyGraded: boolean; // false if some essay questions need manual scoring
  violationCount: number;
  answersSummary: {
    questionId: string;
    questionText: string;
    questionType: QuestionType;
    studentAnswer: string;
    correctAnswer: string;
    weight: number;
    scoreEarned: number;
    isCorrect?: boolean;
    scoringRubric?: string;
    essayNote?: string;
  }[];
}

export type BackgroundThemeType =
  | 'gradient-blue'
  | 'gradient-midnight'
  | 'gradient-emerald'
  | 'gradient-indigo'
  | 'solid-dark'
  | 'custom-image';

export interface AppSettings {
  id?: string;
  schoolName: string;
  schoolSubtext: string;
  npsn: string;
  address: string;
  headmasterName: string;
  academicYear: string;
  semester: 'Ganjil' | 'Genap';
  defaultExamDuration: number;
  defaultPassingGrade: number;
  enableCameraMonitoring: boolean;
  allowCameraBypassForTroubleshooting: boolean;
  strictFullscreenMode: boolean;
  theme: 'light' | 'dark';

  // Customization
  customLogoUrl?: string; // base64 or URL
  useDefaultLogo?: boolean;
  frontpageTitle?: string;
  frontpageSubtitle?: string;
  frontpageBadge?: string;
  backgroundTheme?: BackgroundThemeType;
  customBackgroundImageUrl?: string;
  backgroundOverlayOpacity?: number; // 0 - 100
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  role: 'admin' | 'guru' | 'siswa' | 'system';
  action: string;
  details: string;
}

export interface RaporRecapItem {
  studentId: string;
  studentName: string;
  className: string;
  subjectName: string;
  sumatif1: number | null;
  sumatif2: number | null;
  sumatif3: number | null;
  sumatif4: number | null;
  completedCount: number;
  averageScore: number | null;
}
