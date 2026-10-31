import React, { useState, useEffect } from 'react';
import {
  SchoolClass,
  Student,
  ExamSetting,
  ExamResult,
  ExamSession,
  AppSettings,
} from '../../types';
import {
  getAllFromStore,
  STORES,
  DEFAULT_APP_SETTINGS,
  getByIdFromStore,
} from '../../db/indexedDB';
import { SchoolLogo } from '../common/SchoolLogo';
import { getBackgroundStyle } from '../../utils/theme';
import {
  requestCameraStream,
  createVirtualCameraStream,
  attachStreamToVideo,
} from '../../utils/camera';
import {
  Clock,
  BookOpen,
  Camera,
  Maximize2,
  AlertTriangle,
  PlayCircle,
  HelpCircle,
  Lock,
  RotateCcw,
  CheckCircle2,
  Info,
  Sparkles,
  Video,
} from 'lucide-react';

interface StudentLoginProps {
  onStartExam: (
    student: Student,
    exam: ExamSetting,
    existingSession?: ExamSession | null,
    cameraStream?: MediaStream | null
  ) => void;
  onOpenTeacherLogin: () => void;
  onOpenAdminLogin: () => void;
}

export const StudentLogin: React.FC<StudentLoginProps> = ({
  onStartExam,
  onOpenTeacherLogin,
  onOpenAdminLogin,
}) => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allExams, setAllExams] = useState<ExamSetting[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);

  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [filteredExams, setFilteredExams] = useState<ExamSetting[]>([]);

  const [previousResult, setPreviousResult] = useState<ExamResult | null>(null);
  const [ongoingSession, setOngoingSession] = useState<ExamSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Permission test modal state
  const [showPreExamModal, setShowPreExamModal] = useState<boolean>(false);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [cameraError, setCameraError] = useState<string>('');
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    loadInitialData();

    const handleSettingsUpdated = (e: any) => {
      if (e.detail) {
        setAppSettings(e.detail);
      } else {
        getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default').then((sets) => {
          if (sets) setAppSettings(sets);
        }).catch(() => {});
      }
    };

    window.addEventListener('app_settings_updated', handleSettingsUpdated);
    return () => window.removeEventListener('app_settings_updated', handleSettingsUpdated);
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [clsList, stdList, exmList, sets] = await Promise.all([
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<Student>(STORES.STUDENTS),
        getAllFromStore<ExamSetting>(STORES.EXAM_SETTINGS),
        getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default'),
      ]);

      setClasses(clsList);
      setAllStudents(stdList);
      setAllExams(exmList);
      if (sets) setAppSettings(sets);
    } catch (err) {
      console.error('Failed to load login data:', err);
    } finally {
      setLoading(false);
    }
  };

  // When class changes, filter students and exams
  useEffect(() => {
    if (!selectedClassId) {
      setFilteredStudents([]);
      setFilteredExams([]);
      setSelectedStudentId('');
      setSelectedExamId('');
      setPreviousResult(null);
      setOngoingSession(null);
      return;
    }

    const studentsInClass = allStudents.filter(
      (s) => s.classId === selectedClassId && s.status === 'aktif'
    );
    setFilteredStudents(studentsInClass);
    setSelectedStudentId('');

    // Active exams targeted to this class
    const examsForClass = allExams.filter(
      (e) => e.status === 'aktif' && e.targetClassIds.includes(selectedClassId)
    );
    setFilteredExams(examsForClass);
    setSelectedExamId('');
    setPreviousResult(null);
    setOngoingSession(null);
  }, [selectedClassId, allStudents, allExams]);

  // When student and exam are both selected, check previous results or ongoing session
  useEffect(() => {
    const checkStudentStatus = async () => {
      if (!selectedStudentId || !selectedExamId) {
        setPreviousResult(null);
        setOngoingSession(null);
        return;
      }

      const results = await getAllFromStore<ExamResult>(STORES.EXAM_RESULTS);
      const existing = results.find(
        (r) => r.studentId === selectedStudentId && r.examId === selectedExamId
      );
      setPreviousResult(existing || null);

      const sessions = await getAllFromStore<ExamSession>(STORES.EXAM_SESSIONS);
      const activeSes = sessions.find(
        (s) =>
          s.studentId === selectedStudentId &&
          s.examId === selectedExamId &&
          s.status === 'ongoing'
      );
      setOngoingSession(activeSes || null);
    };

    checkStudentStatus();
  }, [selectedStudentId, selectedExamId]);

  // Selected object helpers
  const selectedStudent = allStudents.find((s) => s.id === selectedStudentId);
  const selectedExam = allExams.find((e) => e.id === selectedExamId);

  // Trigger Pre-Exam permission check
  const handleInitiateExam = () => {
    if (!selectedStudent || !selectedExam) return;
    setShowPreExamModal(true);
    testCameraAccess();
  };

  const testCameraAccess = async () => {
    setCameraStatus('requesting');
    setCameraError('');

    try {
      const stream = await requestCameraStream();
      setCameraStream(stream);
      setCameraStatus('granted');
    } catch (err: any) {
      console.warn('Camera permission denied or unavailable:', err);
      setCameraStatus('denied');
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak browser. Klik ikon gembok/kamera di bilah alamat browser untuk mengizinkan.'
          : 'Kamera fisik tidak terdeteksi atau sedang digunakan aplikasi lain.'
      );
    }
  };

  const handleUseVirtualCamera = () => {
    try {
      const vStream = createVirtualCameraStream(selectedStudent?.name || 'Siswa SMPN 3 Kertek');
      setCameraStream(vStream);
      setCameraStatus('granted');
      setCameraError('');
    } catch (err: any) {
      alert(`Gagal mengaktifkan simulasi kamera: ${err.message}`);
    }
  };

  const handleConfirmAndEnterExam = async () => {
    setShowPreExamModal(false);

    if (selectedStudent && selectedExam) {
      // Pass the active camera stream directly to the exam room so there is no interruption!
      onStartExam(selectedStudent, selectedExam, ongoingSession, cameraStream);
    }
  };

  const closePreExamModal = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setShowPreExamModal(false);
    setCameraStatus('idle');
  };

  const bg = getBackgroundStyle(appSettings);
  const frontpageTitle = appSettings.frontpageTitle || 'PLATFORM E-UJIAN SMP NEGERI 3 KERTEK';
  const frontpageSubtitle = appSettings.frontpageSubtitle || 'Platform Asesmen dan Evaluasi Pembelajaran Digital';
  const frontpageBadge = appSettings.frontpageBadge || 'Sistem ANBK Digital';

  return (
    <div
      className={`min-h-screen text-slate-100 flex flex-col justify-between relative overflow-x-hidden ${bg.className}`}
      style={bg.style}
    >
      {/* Background overlay for custom background image */}
      {appSettings.backgroundTheme === 'custom-image' && appSettings.customBackgroundImageUrl && (
        <div
          className="absolute inset-0 bg-slate-950 pointer-events-none z-0"
          style={{ opacity: (appSettings.backgroundOverlayOpacity ?? 60) / 100 }}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-blue-900/50 bg-slate-950/70 backdrop-blur px-4 sm:px-8 py-3.5 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <SchoolLogo
            size="md"
            showText={true}
            customLogoUrl={appSettings.customLogoUrl}
            customSchoolName={appSettings.schoolName}
            customSubtext={appSettings.schoolSubtext}
            textColor="light"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTeacherLogin}
            className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border border-slate-700/60 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-blue-400" />
            <span>Login Guru</span>
          </button>
          <button
            onClick={onOpenAdminLogin}
            className="text-xs sm:text-sm font-medium px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-sm shadow-blue-500/20 flex items-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5 text-white" />
            <span>Admin Sekolah</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto relative z-10">
        <div className="w-full max-w-4xl bg-slate-900/90 border border-blue-500/20 rounded-2xl shadow-2xl backdrop-blur overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Hero / Brand Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-950 p-6 sm:p-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-blue-800/40 relative">
            <div>
              <div className="w-16 h-16 rounded-2xl bg-white/10 p-2.5 backdrop-blur border border-white/20 mb-5 shadow-inner flex items-center justify-center">
                <SchoolLogo
                  size="lg"
                  showText={false}
                  customLogoUrl={appSettings.customLogoUrl}
                />
              </div>
              <span className="text-[11px] font-bold tracking-widest text-blue-300 uppercase bg-blue-950/60 px-2.5 py-1 rounded-md border border-blue-400/30">
                {frontpageBadge}
              </span>
              <h1 className="mt-3 text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                {frontpageTitle}
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-blue-200/80 leading-relaxed">
                “{frontpageSubtitle}”
              </p>
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-blue-800/40 text-xs text-blue-200/90">
              <div className="flex items-center gap-2.5">
                <Camera className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pengawasan kamera otomatis selama ujian</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Maximize2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Wajib mode layar penuh (Fullscreen ANBK)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Penyimpanan jawaban lokal otomatis (IndexedDB)</span>
              </div>
            </div>
          </div>

          {/* Right Form Card */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="border-b border-slate-800 pb-4 mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <PlayCircle className="w-5 h-5 text-blue-400" />
                  <span>Portal Peserta Ujian</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih kelas, cari nama Anda pada daftar, dan pilih ujian yang telah dijadwalkan guru.
                </p>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p>Memuat data kelas dan jadwal asesmen...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Dropdown Kelas */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      1. Pilih Kelas Anda <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="">-- Pilih Kelas --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Kelas {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* 2. Dropdown Nama Siswa (Dinamis) */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      2. Pilih Nama Siswa <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      disabled={!selectedClassId}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedClassId
                          ? '-- Pilih Kelas Terlebih Dahulu --'
                          : filteredStudents.length === 0
                          ? '-- Belum ada data siswa di kelas ini --'
                          : '-- Pilih Nama Lengkap Anda --'}
                      </option>
                      {filteredStudents.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.nisn ? `(NISN: ${s.nisn})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Nama siswa terdaftar resmi dari database sekolah tanpa ketik manual.
                    </p>
                  </div>

                  {/* 3. Dropdown Mata Pelajaran & Asesmen */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      3. Pilih Mata Pelajaran / Asesmen <span className="text-rose-400">*</span>
                    </label>
                    <select
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(e.target.value)}
                      disabled={!selectedClassId}
                      className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!selectedClassId
                          ? '-- Pilih Kelas Terlebih Dahulu --'
                          : filteredExams.length === 0
                          ? '-- Tidak ada asesmen aktif untuk kelas ini --'
                          : '-- Pilih Ujian yang Sedang Berlangsung --'}
                      </option>
                      {filteredExams.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.subjectName} — {ex.assessmentType} ({ex.durationMinutes} Menit)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Exam Information & Status Box */}
                  {selectedExam && selectedStudent && (
                    <div className="mt-4 p-4 rounded-xl bg-blue-950/50 border border-blue-800/60 text-xs text-blue-200 space-y-2">
                      <div className="flex items-center justify-between font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-4 h-4 text-blue-400" />
                          {selectedExam.title}
                        </span>
                        <span className="bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded text-[11px] border border-blue-500/30">
                          {selectedExam.assessmentType}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1">
                        <div>
                          <span className="text-slate-400">Durasi:</span>{' '}
                          <strong className="text-white">{selectedExam.durationMinutes} Menit</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Jumlah Soal:</span>{' '}
                          <strong className="text-white">{selectedExam.totalQuestions} Soal</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Batas KKM:</span>{' '}
                          <strong className="text-white">{selectedExam.passingScore}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Guru Pengampu:</span>{' '}
                          <strong className="text-white">{selectedExam.teacherName || 'Guru Mata Pelajaran'}</strong>
                        </div>
                      </div>

                      {/* Status Warnings */}
                      {previousResult && (
                        <div className="mt-3 p-3 rounded-lg bg-amber-950/60 border border-amber-500/40 text-amber-200 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block">Anda Sudah Menyelesaikan Ujian Ini</strong>
                            <span>
                              Jawaban telah tersimpan pada {new Date(previousResult.submittedAt).toLocaleTimeString('id-ID')} dengan nilai: {previousResult.finalScore} / 100 ({previousResult.isFullyGraded ? 'Nilai Final' : 'Menunggu Koreksi Uraian'}).
                              Sistem mencegah pengiriman berulang.
                            </span>
                          </div>
                        </div>
                      )}

                      {ongoingSession && !previousResult && (
                        <div className="mt-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-start gap-2.5">
                          <RotateCcw className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-semibold block">Sesi Ujian Ditemukan (Pemulihan Otomatis)</strong>
                            <span>
                              Anda memiliki sesi pengerjaan yang belum selesai. Seluruh jawaban sebelumnya aman tersimpan di IndexedDB dan akan langsung dipulihkan.
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="mt-8 pt-4 border-t border-slate-800">
              <button
                onClick={handleInitiateExam}
                disabled={!selectedStudentId || !selectedExamId || Boolean(previousResult)}
                className="w-full py-3.5 px-6 rounded-xl font-bold text-sm tracking-wide bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
              >
                <PlayCircle className="w-5 h-5" />
                <span>
                  {previousResult
                    ? 'UJIAN TELAH DIKERJAKAN'
                    : ongoingSession
                    ? 'LANJUTKAN PENGERJAAN UJIAN'
                    : 'MULAI UJIAN'}
                </span>
              </button>
              <p className="text-center text-[11px] text-slate-500 mt-2">
                Pastikan pencahayaan ruangan cukup untuk verifikasi kamera web.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-3 px-4 text-center text-xs text-slate-500 border-t border-slate-900 bg-slate-950/40">
        &copy; {new Date().getFullYear()} {appSettings.schoolName} &bull; ANBK Computer-Based Test Local System
      </footer>

      {/* Camera & Fullscreen Pre-Exam Verification Modal */}
      {showPreExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 text-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-400" />
                <span>Verifikasi Kamera & Persiapan ANBK</span>
              </h3>
              <button
                onClick={closePreExamModal}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-3 bg-blue-950/40 border border-blue-800/40 rounded-xl">
                <p className="text-slate-200 font-medium">
                  Halo, <strong>{selectedStudent?.name}</strong>! Sebelum memasuki ruang ujian mata pelajaran{' '}
                  <strong>{selectedExam?.subjectName}</strong>, sistem ANBK akan memeriksa kesiapan kamera dan mengaktifkan mode layar penuh.
                </p>
              </div>

              {/* Camera Preview Area */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl h-48 relative flex items-center justify-center overflow-hidden">
                {cameraStatus === 'requesting' && (
                  <div className="flex flex-col items-center gap-2 text-slate-400 p-4 text-center">
                    <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-semibold text-slate-300">Menghubungkan ke kamera perangkat...</span>
                    <span className="text-[11px] text-slate-500">Klik "Izinkan / Allow" jika muncul jendela izin pada browser.</span>
                  </div>
                )}

                {cameraStatus === 'granted' && (
                  <div className="relative w-full h-full bg-black">
                    <video
                      autoPlay
                      playsInline
                      muted
                      ref={(el) => attachStreamToVideo(el, cameraStream)}
                      className="w-full h-full object-cover scale-x-[-1]"
                    />
                    <div className="absolute top-2 left-2 bg-emerald-600/95 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1.5 shadow-md backdrop-blur">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                      KAMERA TERHUBUNG & AKTIF (ANBK)
                    </div>
                  </div>
                )}

                {cameraStatus === 'denied' && (
                  <div className="p-4 text-center space-y-2.5 max-w-sm">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <p className="text-rose-400 font-semibold text-xs">{cameraError}</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Jika komputer/perangkat tidak memiliki webcam fisik atau sedang dalam tahap uji coba aplikasi, Anda dapat menggunakan mode kamera virtual ANBK.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={testCameraAccess}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold border border-slate-700"
                      >
                        Deteksi Ulang
                      </button>
                      <button
                        type="button"
                        onClick={handleUseVirtualCamera}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                      >
                        <Video className="w-3.5 h-3.5" />
                        <span>Gunakan Kamera Virtual</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Rules Checklist */}
              <div className="space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Ujian berjalan dalam mode Layar Penuh (Fullscreen).</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Dilarang membuka tab lain, meminimalkan layar, atau menutup browser.</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Setiap jawaban tersimpan secara otomatis setiap kali diklik.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
              <button
                onClick={closePreExamModal}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
              >
                Batal
              </button>

              <button
                onClick={handleConfirmAndEnterExam}
                disabled={cameraStatus === 'requesting'}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2"
              >
                <Maximize2 className="w-4 h-4" />
                <span>Masuk Ujian (Layar Penuh)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
