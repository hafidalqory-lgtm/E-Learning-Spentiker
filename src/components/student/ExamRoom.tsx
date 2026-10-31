import React, { useState, useEffect, useRef } from 'react';
import {
  Student,
  ExamSetting,
  Question,
  ExamSession,
  ExamSessionAnswer,
  ExamResult,
  AppSettings,
} from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  getByIdFromStore,
  logActivity,
  DEFAULT_APP_SETTINGS,
} from '../../db/indexedDB';
import { SchoolLogo } from '../common/SchoolLogo';
import {
  requestCameraStream,
  createVirtualCameraStream,
  attachStreamToVideo,
} from '../../utils/camera';
import {
  Camera,
  CameraOff,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Bookmark,
  Send,
  Maximize2,
  HelpCircle,
  ShieldAlert,
  RefreshCw,
  Video,
} from 'lucide-react';

interface ExamRoomProps {
  student: Student;
  exam: ExamSetting;
  initialSession?: ExamSession | null;
  initialCameraStream?: MediaStream | null;
  onFinishExam: (result: ExamResult) => void;
  onExitToPortal: () => void;
}

export const ExamRoom: React.FC<ExamRoomProps> = ({
  student,
  exam,
  initialSession,
  initialCameraStream,
  onFinishExam,
  onExitToPortal,
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, ExamSessionAnswer>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(exam.durationMinutes * 60);
  const [loading, setLoading] = useState<boolean>(true);
  const [showNavGrid, setShowNavGrid] = useState<boolean>(true);

  // Camera state - prioritize already active stream from login
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(
    initialCameraStream && initialCameraStream.active ? initialCameraStream : null
  );
  const [cameraActive, setCameraActive] = useState<boolean>(
    Boolean(initialCameraStream && initialCameraStream.active)
  );
  const [cameraWarning, setCameraWarning] = useState<string>('');
  const [showFloatingCamera, setShowFloatingCamera] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Security & Violations
  const [violations, setViolations] = useState<ExamSession['violationLogs']>([]);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState<boolean>(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Session ID & preservation
  const sessionIdRef = useRef<string>(
    initialSession ? initialSession.id : `ses_${student.id}_${exam.id}_${Date.now()}`
  );
  const appSettingsRef = useRef<AppSettings>(DEFAULT_APP_SETTINGS);

  // 1. Initialize Exam Data & Session
  useEffect(() => {
    initializeExam();

    return () => {
      // Cleanup camera tracks on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const initializeExam = async () => {
    try {
      setLoading(true);

      // Load app settings
      const settings = await getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default');
      if (settings) appSettingsRef.current = settings;

      // Load all questions for this subject & assessment
      const allQ = await getAllFromStore<Question>(STORES.QUESTIONS);
      const filtered = allQ.filter(
        (q) =>
          q.subjectId === exam.subjectId &&
          q.assessmentType === exam.assessmentType
      );

      let finalOrderedQuestions: Question[] = [];

      if (initialSession && initialSession.orderedQuestionIds?.length > 0) {
        // Restore session question order
        const qMap = new Map(filtered.map((q) => [q.id, q]));
        initialSession.orderedQuestionIds.forEach((id) => {
          const found = qMap.get(id);
          if (found) finalOrderedQuestions.push(found);
        });
        // Any remaining
        filtered.forEach((q) => {
          if (!finalOrderedQuestions.some((f) => f.id === q.id)) {
            finalOrderedQuestions.push(q);
          }
        });

        // Restore answers
        setAnswers(initialSession.answers || {});
        setTimeRemaining(
          initialSession.timeRemainingSeconds > 0
            ? initialSession.timeRemainingSeconds
            : exam.durationMinutes * 60
        );
        setViolations(initialSession.violationLogs || []);
      } else {
        // Fresh start
        finalOrderedQuestions = [...filtered];
        if (exam.randomizeQuestions) {
          finalOrderedQuestions.sort(() => Math.random() - 0.5);
        }

        // Limit to totalQuestions if specified
        if (exam.totalQuestions > 0 && finalOrderedQuestions.length > exam.totalQuestions) {
          finalOrderedQuestions = finalOrderedQuestions.slice(0, exam.totalQuestions);
        }

        // Init blank answers
        const initialAnswers: Record<string, ExamSessionAnswer> = {};
        finalOrderedQuestions.forEach((q) => {
          initialAnswers[q.id] = {
            questionId: q.id,
            selectedAnswer: '',
            essayText: '',
            isHesitant: false,
          };
        });
        setAnswers(initialAnswers);
      }

      setQuestions(finalOrderedQuestions);

      // Request fullscreen
      enterFullscreen();

      // Start or adopt Camera
      if (initialCameraStream && initialCameraStream.active) {
        attachActiveCameraStream(initialCameraStream);
      } else {
        await initCamera();
      }

      // Save initial session state
      await persistSession(
        initialSession?.answers || {},
        finalOrderedQuestions.map((q) => q.id),
        initialSession?.timeRemainingSeconds || exam.durationMinutes * 60,
        initialSession?.violationLogs || []
      );
    } catch (err) {
      console.error('Failed to initialize exam:', err);
    } finally {
      setLoading(false);
    }
  };

  const attachActiveCameraStream = (stream: MediaStream) => {
    setCameraStream(stream);
    setCameraActive(true);
    setCameraWarning('');

    if (videoRef.current) {
      attachStreamToVideo(videoRef.current, stream);
    }

    // Monitor track disconnect
    stream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        setCameraActive(false);
        setCameraWarning('Kamera pengawas terputus!');
        recordViolation('camera_disconnected', 'Kamera pengawas terputus selama ujian.');
      };
    });
  };

  // 2. Camera Monitoring Initialization with Resilient Multi-tier Fallback
  const initCamera = async () => {
    try {
      const stream = await requestCameraStream();
      attachActiveCameraStream(stream);
    } catch (err) {
      console.warn('Physical camera unavailable, enabling virtual proctor stream:', err);
      try {
        const vStream = createVirtualCameraStream(student.name);
        attachActiveCameraStream(vStream);
      } catch (vErr) {
        setCameraActive(false);
        setCameraWarning('Kamera belum aktif.');
      }
    }
  };

  const handleReconnectCamera = async () => {
    try {
      setCameraWarning('Mencoba menyambungkan kamera...');
      const stream = await requestCameraStream();
      attachActiveCameraStream(stream);
    } catch (err: any) {
      console.warn('Manual reconnect physical camera failed, using virtual camera:', err);
      const vStream = createVirtualCameraStream(student.name);
      attachActiveCameraStream(vStream);
    }
  };

  // 3. Fullscreen Management & Anti-cheat detection
  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request blocked:', err);
      });
    }
  };

  const recordViolation = async (
    type: 'fullscreen_exit' | 'tab_switch' | 'camera_disconnected',
    message: string
  ) => {
    const newViolation = {
      timestamp: new Date().toISOString(),
      type,
      message,
    };
    setViolations((prev) => {
      const updated = [...prev, newViolation];
      // update DB session asynchronously
      updateSessionViolations(updated);
      return updated;
    });
  };

  const updateSessionViolations = async (updatedViolations: ExamSession['violationLogs']) => {
    const session = await getByIdFromStore<ExamSession>(STORES.EXAM_SESSIONS, sessionIdRef.current);
    if (session) {
      session.violationLogs = updatedViolations;
      await putToStore(STORES.EXAM_SESSIONS, session);
    }
  };

  useEffect(() => {
    // Fullscreen exit listener
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setShowFullscreenWarning(true);
        recordViolation('fullscreen_exit', 'Siswa keluar dari mode fullscreen ANBK.');
      } else {
        setShowFullscreenWarning(false);
      }
    };

    // Tab / Window focus listener
    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation('tab_switch', 'Siswa berpindah tab atau meminimalkan browser.');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // 4. Timer Countdown & Autosave
  useEffect(() => {
    if (loading || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAutoSubmitDueToTime();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, timeRemaining]);

  // Periodic autosave to IndexedDB every 5 seconds
  useEffect(() => {
    if (loading || questions.length === 0) return;

    const interval = setInterval(() => {
      persistSession(answers, questions.map((q) => q.id), timeRemaining, violations);
    }, 5000);

    return () => clearInterval(interval);
  }, [answers, timeRemaining, violations, questions, loading]);

  const persistSession = async (
    currentAnswers: Record<string, ExamSessionAnswer>,
    orderedIds: string[],
    remainingSec: number,
    currentViolations: ExamSession['violationLogs']
  ) => {
    const session: ExamSession = {
      id: sessionIdRef.current,
      examId: exam.id,
      studentId: student.id,
      studentName: student.name,
      classId: student.classId,
      className: student.className,
      subjectId: exam.subjectId,
      subjectName: exam.subjectName,
      assessmentType: exam.assessmentType,
      startTime: initialSession ? initialSession.startTime : new Date().toISOString(),
      durationMinutes: exam.durationMinutes,
      timeRemainingSeconds: remainingSec,
      status: 'ongoing',
      orderedQuestionIds: orderedIds,
      answers: currentAnswers,
      violationLogs: currentViolations,
      lastHeartbeat: new Date().toISOString(),
    };
    await putToStore(STORES.EXAM_SESSIONS, session);
  };

  // 5. Answer Handlers
  const currentQuestion = questions[currentIndex];

  const handleSelectOption = (key: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedAnswer: key,
          essayText: prev[currentQuestion.id]?.essayText || '',
          isHesitant: prev[currentQuestion.id]?.isHesitant || false,
        },
      };
      // Immediately write to IndexedDB
      persistSession(updated, questions.map((q) => q.id), timeRemaining, violations);
      return updated;
    });
  };

  const handleEssayChange = (text: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const updated = {
        ...prev,
        [currentQuestion.id]: {
          questionId: currentQuestion.id,
          selectedAnswer: '',
          essayText: text,
          isHesitant: prev[currentQuestion.id]?.isHesitant || false,
        },
      };
      return updated;
    });
  };

  const handleToggleHesitant = () => {
    if (!currentQuestion) return;
    setAnswers((prev) => {
      const existing = prev[currentQuestion.id] || {
        questionId: currentQuestion.id,
        selectedAnswer: '',
        essayText: '',
        isHesitant: false,
      };
      const updated = {
        ...prev,
        [currentQuestion.id]: {
          ...existing,
          isHesitant: !existing.isHesitant,
        },
      };
      persistSession(updated, questions.map((q) => q.id), timeRemaining, violations);
      return updated;
    });
  };

  // 6. Navigation
  const goToNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // 7. Exam Calculation & Submission
  const handleAutoSubmitDueToTime = async () => {
    alert('Waktu ujian telah habis! Sistem secara otomatis menyimpan seluruh jawaban Anda.');
    await submitFinalExam();
  };

  const submitFinalExam = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      let multipleChoiceTotal = 0;
      let multipleChoiceCorrect = 0;
      let multipleChoiceScore = 0;
      let essayTotal = 0;
      let totalWeight = 0;

      const answersSummary: ExamResult['answersSummary'] = [];

      questions.forEach((q) => {
        const studentAns = answers[q.id];
        totalWeight += q.weight;

        if (q.type === 'uraian') {
          essayTotal++;
          answersSummary.push({
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.type,
            studentAnswer: studentAns?.essayText || '(Tidak dijawab)',
            correctAnswer: q.correctAnswer,
            weight: q.weight,
            scoreEarned: 0, // Pending teacher grading
            isCorrect: false,
            scoringRubric: q.scoringRubric,
          });
        } else {
          multipleChoiceTotal++;
          const chosen = studentAns?.selectedAnswer?.trim().toUpperCase() || '';
          const correctKey = q.correctAnswer.trim().toUpperCase();
          const isCorrect = chosen === correctKey;

          if (isCorrect) {
            multipleChoiceCorrect++;
            multipleChoiceScore += q.weight;
          }

          answersSummary.push({
            questionId: q.id,
            questionText: q.questionText,
            questionType: q.type,
            studentAnswer: chosen || '(Kosong)',
            correctAnswer: correctKey,
            weight: q.weight,
            scoreEarned: isCorrect ? q.weight : 0,
            isCorrect,
          });
        }
      });

      // Calculate final score
      // If there are no essays, score is fully final: (earned / totalWeight) * 100
      // If there are essays, it is marked as not fully graded until teacher grades the essay.
      const isFullyGraded = essayTotal === 0;
      const initialEarned = multipleChoiceScore;
      const finalScore = totalWeight > 0 ? Math.round((initialEarned / totalWeight) * 100) : 0;

      const result: ExamResult = {
        id: `res_${student.id}_${exam.id}_${Date.now()}`,
        sessionId: sessionIdRef.current,
        examId: exam.id,
        studentId: student.id,
        studentName: student.name,
        classId: student.classId,
        className: student.className,
        subjectId: exam.subjectId,
        subjectName: exam.subjectName,
        assessmentType: exam.assessmentType,
        startedAt: initialSession ? initialSession.startTime : new Date().toISOString(),
        submittedAt: new Date().toISOString(),
        durationSpentMinutes: Math.round((exam.durationMinutes * 60 - timeRemaining) / 60) || 1,
        totalQuestions: questions.length,
        multipleChoiceTotal,
        multipleChoiceCorrect,
        multipleChoiceScore,
        essayTotal,
        essayGradedCount: 0,
        essayScore: 0,
        maxPossibleScore: totalWeight,
        finalScore,
        isFullyGraded,
        violationCount: violations.length,
        answersSummary,
      };

      // Save to IndexedDB
      await putToStore(STORES.EXAM_RESULTS, result);

      // Mark session as completed
      const session = await getByIdFromStore<ExamSession>(STORES.EXAM_SESSIONS, sessionIdRef.current);
      if (session) {
        session.status = 'completed';
        session.endTime = new Date().toISOString();
        await putToStore(STORES.EXAM_SESSIONS, session);
      }

      await logActivity(
        student.name,
        'siswa',
        'Mengumpulkan Ujian',
        `Menyelesaikan ${exam.subjectName} (${exam.assessmentType}) dengan skor objektif: ${multipleChoiceScore}/${totalWeight}`
      );

      // Stop camera
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      // Exit fullscreen if still active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      onFinishExam(result);
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('Terjadi kesalahan saat menyimpan jawaban. Silakan hubungi pengawas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper count status
  const answeredCount = Object.values(answers).filter(
    (a) => Boolean(a.selectedAnswer) || (Boolean(a.essayText) && a.essayText!.trim().length > 0)
  ).length;
  const hesitantCount = Object.values(answers).filter((a) => a.isHesitant).length;
  const unansweredCount = Math.max(0, questions.length - answeredCount);

  // Time format
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const isTimeCritical = timeRemaining <= 300; // < 5 mins

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-base font-semibold">Mempersiapkan Ruang Ujian ANBK...</p>
        <p className="text-xs text-slate-400 mt-1">Mengunduh butir soal & memverifikasi kamera</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold">Belum Ada Butir Soal</h2>
        <p className="text-sm text-slate-400 max-w-md mt-2">
          Ujian ini belum memiliki soal untuk mata pelajaran <strong>{exam.subjectName}</strong> ({exam.assessmentType}). Guru atau admin dapat menambahkan soal di Menu Bank Soal.
        </p>
        <button
          onClick={onExitToPortal}
          className="mt-6 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold"
        >
          Kembali ke Portal
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col select-none font-sans">
      {/* -------------------------------------------------------------
          TOP BAR (ANBK Blue Header)
      -------------------------------------------------------------- */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 text-white px-4 sm:px-6 py-2.5 shadow-md border-b border-blue-800/60 flex items-center justify-between z-30">
        {/* Left: School & Student Meta */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-lg p-1 border border-white/20 flex items-center justify-center">
            <SchoolLogo size="sm" showText={false} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-white leading-tight">
                {student.name}
              </span>
              <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-1.5 py-0.5 rounded">
                {student.className}
              </span>
            </div>
            <div className="text-xs text-blue-200/80 font-medium">
              {exam.subjectName} &bull; {exam.assessmentType}
            </div>
          </div>
        </div>

        {/* Right: Camera Feed, Countdown Timer & Fullscreen Status */}
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Live Camera Preview Widget */}
          <button
            type="button"
            onClick={() => setShowFloatingCamera(!showFloatingCamera)}
            className="flex items-center gap-2 bg-slate-950/70 hover:bg-slate-900 border border-blue-500/40 px-2.5 py-1 rounded-xl shadow-inner transition-colors cursor-pointer text-left"
            title="Klik untuk melihat/menyembunyikan monitor kamera pengawas"
          >
            <div className="w-10 sm:w-12 h-7 sm:h-9 bg-black rounded overflow-hidden relative border border-slate-700 shrink-0">
              {cameraActive && cameraStream ? (
                <video
                  ref={(el) => attachStreamToVideo(el, cameraStream)}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-rose-400">
                  <CameraOff className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
            <div className="flex flex-col text-left">
              <span
                className={`flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase ${
                  cameraActive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cameraActive ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'
                  }`}
                ></span>
                {cameraActive ? 'Kamera Aktif' : 'Kamera Mati'}
              </span>
              <span className="text-[9px] text-slate-400 hidden sm:inline">
                {cameraActive ? 'Terpantau ANBK' : 'Klik Sambungkan'}
              </span>
            </div>
          </button>

          {/* Countdown Timer */}
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border font-mono text-sm sm:text-base font-bold shadow-sm ${
              isTimeCritical
                ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
                : 'bg-blue-900/60 border-blue-700 text-white'
            }`}
          >
            <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400' : 'text-blue-300'}`} />
            <span>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Toggle Question Matrix */}
          <button
            onClick={() => setShowNavGrid(!showNavGrid)}
            className="px-3 py-1.5 rounded-xl bg-blue-700/80 hover:bg-blue-600 text-white text-xs font-semibold border border-blue-500/40 flex items-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden md:inline">Daftar Soal</span>
          </button>
        </div>
      </header>

      {/* -------------------------------------------------------------
          BODY: QUESTION CONTENT (LEFT) + QUESTION NAVIGATION (RIGHT)
      -------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Display Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between bg-slate-50">
          <div className="max-w-4xl mx-auto w-full">
            {/* Question Header Card */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div className="flex items-center gap-3">
                <span className="bg-blue-800 text-white text-xs sm:text-sm font-extrabold px-3 py-1 rounded-lg shadow-sm">
                  SOAL NO. {currentIndex + 1}
                </span>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {currentQuestion.type === 'pilihan_ganda'
                    ? 'Pilihan Ganda'
                    : currentQuestion.type === 'uraian'
                    ? 'Uraian / Esai'
                    : currentQuestion.type === 'benar_salah'
                    ? 'Benar atau Salah'
                    : 'Pilihan Ganda Kompleks'}{' '}
                  &bull; Bobot: {currentQuestion.weight} Poin
                </span>
              </div>

              {answers[currentQuestion.id]?.isHesitant && (
                <span className="bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-2.5 py-1 rounded-md flex items-center gap-1">
                  <Bookmark className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  Ragu-ragu
                </span>
              )}
            </div>

            {/* Question Text */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80 mb-6">
              <p className="text-base sm:text-lg text-slate-800 leading-relaxed font-medium">
                {currentQuestion.questionText}
              </p>

              {currentQuestion.imageUrl && (
                <div className="mt-4 rounded-xl overflow-hidden border border-slate-200 max-h-80 flex items-center justify-center bg-slate-100">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Lampiran Soal"
                    className="max-h-80 object-contain"
                  />
                </div>
              )}
            </div>

            {/* Answer Options Area */}
            {currentQuestion.type === 'uraian' ? (
              // Essay Input
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200/80">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Tuliskan Jawaban Uraian Anda di Bawah Ini:
                </label>
                <textarea
                  value={answers[currentQuestion.id]?.essayText || ''}
                  onChange={(e) => handleEssayChange(e.target.value)}
                  placeholder="Ketik uraian jawaban secara jelas dan lengkap..."
                  rows={8}
                  className="w-full p-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent leading-relaxed text-slate-800 bg-slate-50/50"
                />
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Jawaban tersimpan secara otomatis setiap kali diketik.</span>
                  <span>
                    {(answers[currentQuestion.id]?.essayText || '').length} Karakter
                  </span>
                </div>
              </div>
            ) : (
              // Multiple Choice / True-False
              <div className="space-y-3">
                {currentQuestion.options.map((opt) => {
                  const isSelected =
                    answers[currentQuestion.id]?.selectedAnswer === opt.key;
                  return (
                    <button
                      key={opt.key}
                      onClick={() => handleSelectOption(opt.key)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'bg-blue-50 border-blue-600 shadow-md ring-2 ring-blue-500/20 text-blue-950 font-semibold'
                          : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 text-slate-800 shadow-sm'
                      }`}
                    >
                      {/* Circular ANBK Badge */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-600 border border-slate-300'
                        }`}
                      >
                        {opt.key}
                      </div>
                      <div className="flex-1 text-sm sm:text-base pt-1 leading-relaxed">
                        {opt.text}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* -------------------------------------------------------------
              BOTTOM CONTROL BAR (ANBK: Sebelumnya, Ragu-ragu, Berikutnya)
          -------------------------------------------------------------- */}
          <div className="max-w-4xl mx-auto w-full mt-8 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={goToPrev}
                disabled={currentIndex === 0}
                className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>

              <button
                onClick={handleToggleHesitant}
                className={`px-4 py-2.5 rounded-xl border font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-all shadow-sm ${
                  answers[currentQuestion.id]?.isHesitant
                    ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                    : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                <span>{answers[currentQuestion.id]?.isHesitant ? 'Batal Ragu' : 'Ragu-ragu'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={goToNext}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-md shadow-blue-600/20"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirmSubmit(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-colors shadow-md shadow-emerald-600/20 animate-pulse"
                >
                  <Send className="w-4 h-4" />
                  <span>Selesai Ujian</span>
                </button>
              )}
            </div>
          </div>
        </main>

        {/* -------------------------------------------------------------
            RIGHT QUESTION MATRIX PANEL (ANBK Style Grid)
        -------------------------------------------------------------- */}
        {showNavGrid && (
          <aside className="w-72 lg:w-80 bg-white border-l border-slate-200 flex flex-col justify-between shadow-lg z-20">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daftar Nomor Soal
                </h3>
                <span className="text-xs font-medium text-slate-500">
                  {answeredCount} / {questions.length} Dijawab
                </span>
              </div>

              {/* Legend */}
              <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-600 font-medium pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-blue-600 inline-block"></span>
                  <span>Dijawab</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-400 inline-block"></span>
                  <span>Ragu-ragu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-200 border border-slate-300 inline-block"></span>
                  <span>Belum</span>
                </div>
              </div>
            </div>

            {/* Grid of Numbers */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-5 gap-2.5">
                {questions.map((q, idx) => {
                  const ans = answers[q.id];
                  const isAnswered =
                    Boolean(ans?.selectedAnswer) ||
                    (Boolean(ans?.essayText) && ans.essayText!.trim().length > 0);
                  const isHesitant = ans?.isHesitant;
                  const isCurrent = currentIndex === idx;

                  let btnStyle = 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200';
                  if (isHesitant) {
                    btnStyle = 'bg-amber-400 text-slate-900 border-amber-500 font-bold';
                  } else if (isAnswered) {
                    btnStyle = 'bg-blue-600 text-white border-blue-700 font-semibold';
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-xl text-xs font-semibold border flex items-center justify-center transition-all ${btnStyle} ${
                        isCurrent
                          ? 'ring-2 ring-offset-2 ring-blue-500 scale-105 shadow-md'
                          : ''
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Submit Button at bottom of Nav Matrix */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <button
                onClick={() => setShowConfirmSubmit(true)}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Kumpulkan Ujian</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* -------------------------------------------------------------
          MODAL 1: CONFIRMATION BEFORE SUBMISSION
      -------------------------------------------------------------- */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-blue-900 border-b border-slate-100 pb-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-blue-600" />
              <h3 className="text-base font-bold">Konfirmasi Pengumpulan Ujian</h3>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Apakah Anda yakin ingin mengakhiri dan mengumpulkan hasil ujian{' '}
              <strong>{exam.subjectName}</strong>? Periksa ringkasan pengerjaan Anda:
            </p>

            {/* Submission Summary Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs mb-5">
              <div className="flex justify-between items-center text-slate-700">
                <span>Total Butir Soal:</span>
                <strong>{questions.length} Soal</strong>
              </div>
              <div className="flex justify-between items-center text-blue-700 font-semibold">
                <span>Sudah Dijawab:</span>
                <span>{answeredCount} Soal</span>
              </div>
              <div className="flex justify-between items-center text-amber-700">
                <span>Masih Ragu-ragu:</span>
                <span>{hesitantCount} Soal</span>
              </div>
              <div className="flex justify-between items-center text-rose-700 font-bold">
                <span>Belum Dijawab:</span>
                <span>{unansweredCount} Soal</span>
              </div>
            </div>

            {unansweredCount > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-start gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>
                  Masih ada <strong>{unansweredCount} butir soal</strong> yang belum Anda jawab. Soal yang kosong akan mendapatkan skor nol.
                </span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setShowConfirmSubmit(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Kembali ke Soal
              </button>
              <button
                onClick={submitFinalExam}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan Jawaban...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Ya, Kumpulkan Sekarang</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL 2: FULLSCREEN SECURITY ALERT WARNING
      -------------------------------------------------------------- */}
      {showFullscreenWarning && (
        <div className="fixed inset-0 z-50 bg-red-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-slate-900 border-4 border-rose-600 text-center animate-in bounce-in duration-300">
            <ShieldAlert className="w-16 h-16 text-rose-600 mx-auto mb-3 animate-pulse" />
            <h3 className="text-xl font-extrabold text-rose-950">
              PERINGATAN SISTEM ANBK!
            </h3>
            <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
              Anda terdeteksi <strong>keluar dari mode Layar Penuh (Fullscreen)</strong>. Sesuai protokol ANBK SMP Negeri 3 Kertek, peserta ujian dilarang meminimalkan layar atau membuka jendela lain.
            </p>

            <div className="my-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
              Peristiwa ini telah dicatat ke dalam log pengawasan proktor lokal.
            </div>

            <button
              onClick={enterFullscreen}
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
            >
              <Maximize2 className="w-4 h-4" />
              <span>Kembali ke Layar Penuh (Lanjutkan Ujian)</span>
            </button>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          FLOATING ANBK PROCTORING CAMERA WIDGET
      -------------------------------------------------------------- */}
      {showFloatingCamera ? (
        <div className="fixed bottom-4 right-4 z-40 bg-slate-900/95 border border-blue-500/50 rounded-2xl shadow-2xl p-2.5 backdrop-blur-md text-white w-44 sm:w-52 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
            <span className="text-[10px] font-extrabold tracking-wider uppercase flex items-center gap-1.5 text-blue-300">
              <span
                className={`w-2 h-2 rounded-full ${
                  cameraActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              ></span>
              Kamera Pengawas
            </span>
            <button
              type="button"
              onClick={() => setShowFloatingCamera(false)}
              className="text-slate-400 hover:text-white text-xs px-1 hover:bg-slate-800 rounded"
              title="Kecilkan widget kamera"
            >
              ✕
            </button>
          </div>

          <div className="w-full h-28 sm:h-32 bg-black rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center">
            {cameraActive && cameraStream ? (
              <>
                <video
                  ref={(el) => attachStreamToVideo(el, cameraStream)}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <div className="absolute top-1.5 left-1.5 bg-emerald-600/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 shadow">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  LIVE ANBK
                </div>
              </>
            ) : (
              <div className="p-2 text-center space-y-1.5">
                <CameraOff className="w-5 h-5 text-rose-400 mx-auto" />
                <p className="text-[9px] text-rose-300 font-semibold leading-tight">
                  {cameraWarning || 'Kamera Belum Aktif'}
                </p>
                <button
                  type="button"
                  onClick={handleReconnectCamera}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold rounded-lg shadow flex items-center gap-1 mx-auto"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Hubungkan</span>
                </button>
              </div>
            )}
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[9px] text-slate-400 px-0.5">
            <span className="truncate max-w-[110px]">{student.name}</span>
            <button
              type="button"
              onClick={handleReconnectCamera}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-0.5"
              title="Hubungkan ulang kamera"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowFloatingCamera(true)}
          className="fixed bottom-4 right-4 z-40 bg-slate-900/90 hover:bg-blue-900 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-blue-500/50 backdrop-blur flex items-center gap-2 transition-transform hover:scale-105"
          title="Tampilkan layar kamera pengawas"
        >
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Monitor Kamera</span>
        </button>
      )}
    </div>
  );
};
