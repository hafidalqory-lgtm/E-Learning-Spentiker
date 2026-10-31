import React, { useState, useEffect } from 'react';
import {
  ExamSetting,
  Subject,
  SchoolClass,
  Teacher,
  Question,
  AssessmentType,
} from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import {
  Clock,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Shuffle,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  Calendar,
  CheckCircle2,
  School,
  X,
  Play,
  Pause,
} from 'lucide-react';

interface ExamManagementProps {
  userRole?: 'admin' | 'guru';
  assignedSubjectIds?: string[];
}

const SUMMATIVE_ASSESSMENTS: AssessmentType[] = [
  'Asesmen Sumatif 1',
  'Asesmen Sumatif 2',
  'Asesmen Sumatif 3',
  'Asesmen Sumatif 4',
];

export const ExamManagement: React.FC<ExamManagementProps> = ({
  userRole = 'admin',
  assignedSubjectIds = [],
}) => {
  const [exams, setExams] = useState<ExamSetting[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // HIERARCHICAL DRILL-DOWN NAVIGATION STATE
  // Level 1: selectedSubjectForView === null (Pilih Mata Pelajaran)
  // Level 2: selectedSubjectForView !== null && selectedAssessmentForView === null (Pilih Asesmen)
  // Level 3: selectedSubjectForView !== null && selectedAssessmentForView !== null (Jadwal Ujian Asesmen Terpilih)
  // -------------------------------------------------------------
  const [selectedSubjectForView, setSelectedSubjectForView] = useState<Subject | null>(null);
  const [selectedAssessmentForView, setSelectedAssessmentForView] = useState<AssessmentType | null>(null);

  // Search terms & Filters
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [examSearchTerm, setExamSearchTerm] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingExam, setEditingExam] = useState<ExamSetting | null>(null);

  // Form Fields
  const [titleInput, setTitleInput] = useState<string>('');
  const [subjectIdInput, setSubjectIdInput] = useState<string>('');
  const [assessmentInput, setAssessmentInput] = useState<AssessmentType>('Asesmen Sumatif 1');
  const [targetClassIdsInput, setTargetClassIdsInput] = useState<string[]>([]);
  const [teacherIdInput, setTeacherIdInput] = useState<string>('');
  const [examDateInput, setExamDateInput] = useState<string>(new Date().toISOString().slice(0, 10));
  const [startTimeInput, setStartTimeInput] = useState<string>('07:30');
  const [durationInput, setDurationInput] = useState<number>(60);
  const [randomizeQInput, setRandomizeQInput] = useState<boolean>(false);
  const [randomizeOptInput, setRandomizeOptInput] = useState<boolean>(false);
  const [passingScoreInput, setPassingScoreInput] = useState<number>(75);
  const [statusInput, setStatusInput] = useState<'draft' | 'aktif' | 'selesai'>('aktif');
  const [modalError, setModalError] = useState<string>('');

  // Delete modals
  const [examToDelete, setExamToDelete] = useState<ExamSetting | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [exmList, sbjList, clsList, tchList, qList] = await Promise.all([
        getAllFromStore<ExamSetting>(STORES.EXAM_SETTINGS),
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<Teacher>(STORES.TEACHERS),
        getAllFromStore<Question>(STORES.QUESTIONS),
      ]);

      let allowedSubjects = sbjList;
      if (userRole === 'guru' && assignedSubjectIds.length > 0) {
        allowedSubjects = sbjList.filter((s) => assignedSubjectIds.includes(s.id));
      }

      setExams(exmList);
      setSubjects(allowedSubjects);
      setClasses(clsList);
      setTeachers(tchList);
      setQuestions(qList);
      setSelectedIds([]);

      // If currently selected subject was updated or removed
      if (selectedSubjectForView) {
        const stillExists = allowedSubjects.find((s) => s.id === selectedSubjectForView.id);
        if (stillExists) {
          setSelectedSubjectForView(stillExists);
        } else {
          setSelectedSubjectForView(null);
          setSelectedAssessmentForView(null);
        }
      }
    } catch (err) {
      console.error('Failed to load exam settings:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper counting
  const getSubjectExamCount = (subjectId: string): number => {
    return exams.filter((e) => e.subjectId === subjectId).length;
  };

  const getSubjectAssessmentExamCount = (subjectId: string, assessment: AssessmentType): number => {
    return exams.filter((e) => e.subjectId === subjectId && e.assessmentType === assessment).length;
  };

  const getSubjectAssessmentActiveExam = (subjectId: string, assessment: AssessmentType): ExamSetting | undefined => {
    return exams.find((e) => e.subjectId === subjectId && e.assessmentType === assessment && e.status === 'aktif');
  };

  // Form Handlers
  const handleOpenAdd = () => {
    setEditingExam(null);
    setTitleInput('');
    if (selectedSubjectForView) {
      setSubjectIdInput(selectedSubjectForView.id);
    } else if (subjects.length > 0) {
      setSubjectIdInput(subjects[0].id);
    }

    if (selectedAssessmentForView) {
      setAssessmentInput(selectedAssessmentForView);
    } else {
      setAssessmentInput('Asesmen Sumatif 1');
    }

    setTargetClassIdsInput(classes.map((c) => c.id));
    if (teachers.length > 0) setTeacherIdInput(teachers[0].id);
    setExamDateInput(new Date().toISOString().slice(0, 10));
    setStartTimeInput('07:30');
    setDurationInput(60);
    setRandomizeQInput(false);
    setRandomizeOptInput(false);
    setPassingScoreInput(75);
    setStatusInput('aktif');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (ex: ExamSetting) => {
    setEditingExam(ex);
    setTitleInput(ex.title);
    setSubjectIdInput(ex.subjectId);
    setAssessmentInput(ex.assessmentType);
    setTargetClassIdsInput(ex.targetClassIds || []);
    setTeacherIdInput(ex.teacherId || '');
    setExamDateInput(ex.examDate);
    setStartTimeInput(ex.startTime);
    setDurationInput(ex.durationMinutes);
    setRandomizeQInput(ex.randomizeQuestions);
    setRandomizeOptInput(ex.randomizeOptions);
    setPassingScoreInput(ex.passingScore);
    setStatusInput(ex.status);
    setModalError('');
    setShowModal(true);
  };

  const toggleTargetClass = (cId: string) => {
    setTargetClassIdsInput((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  const handleToggleStatus = async (exam: ExamSetting) => {
    const nextStatus = exam.status === 'aktif' ? 'draft' : 'aktif';
    const updated: ExamSetting = {
      ...exam,
      status: nextStatus,
    };
    try {
      await putToStore(STORES.EXAM_SETTINGS, updated);
      await logActivity('Admin/Guru', 'admin', 'Ubah Status Ujian', `Mengubah status "${exam.title}" menjadi ${nextStatus}`);
      await loadData();
    } catch (err: any) {
      alert(`Gagal mengubah status: ${err.message}`);
    }
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();

    const selectedSubject = subjects.find((s) => s.id === subjectIdInput);
    if (!selectedSubject) {
      setModalError('Pilih mata pelajaran yang valid.');
      return;
    }

    if (targetClassIdsInput.length === 0) {
      setModalError('Pilih minimal satu kelas peserta ujian.');
      return;
    }

    const targetClassNames = classes
      .filter((c) => targetClassIdsInput.includes(c.id))
      .map((c) => c.name);

    const selectedTeacher = teachers.find((t) => t.id === teacherIdInput);

    const qCount = questions.filter(
      (q) => q.subjectId === selectedSubject.id && q.assessmentType === assessmentInput
    ).length;

    const finalTitle =
      titleInput.trim() ||
      `${assessmentInput} ${selectedSubject.name}`;

    try {
      if (editingExam) {
        const updated: ExamSetting = {
          ...editingExam,
          title: finalTitle,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          assessmentType: assessmentInput,
          targetClassIds: targetClassIdsInput,
          targetClassNames,
          teacherId: selectedTeacher?.id,
          teacherName: selectedTeacher?.name,
          examDate: examDateInput,
          startTime: startTimeInput,
          durationMinutes: Number(durationInput) || 60,
          randomizeQuestions: randomizeQInput,
          randomizeOptions: randomizeOptInput,
          passingScore: Number(passingScoreInput) || 75,
          status: statusInput,
          totalQuestions: qCount,
        };
        await putToStore(STORES.EXAM_SETTINGS, updated);
        await logActivity('Admin/Guru', 'admin', 'Ubah Pengaturan Ujian', `Memperbarui jadwal ujian: ${finalTitle}`);
      } else {
        const newExam: ExamSetting = {
          id: 'exm_' + Date.now().toString(36),
          title: finalTitle,
          subjectId: selectedSubject.id,
          subjectName: selectedSubject.name,
          assessmentType: assessmentInput,
          targetClassIds: targetClassIdsInput,
          targetClassNames,
          teacherId: selectedTeacher?.id,
          teacherName: selectedTeacher?.name,
          examDate: examDateInput,
          startTime: startTimeInput,
          durationMinutes: Number(durationInput) || 60,
          randomizeQuestions: randomizeQInput,
          randomizeOptions: randomizeOptInput,
          maxAttempts: 1,
          passingScore: Number(passingScoreInput) || 75,
          status: statusInput,
          totalQuestions: qCount,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        await putToStore(STORES.EXAM_SETTINGS, newExam);
        await logActivity('Admin/Guru', 'admin', 'Tambah Jadwal Ujian', `Menjadwalkan ujian baru: ${finalTitle}`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan pengaturan ujian: ${err.message}`);
    }
  };

  const handleDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await deleteFromStore(STORES.EXAM_SETTINGS, examToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Ujian', `Menghapus jadwal ujian ${examToDelete.title}`);
      setExamToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus ujian: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.EXAM_SETTINGS, selectedIds);
      await logActivity(
        'Admin/Guru',
        'admin',
        'Hapus Masal Jadwal Ujian',
        `Menghapus ${selectedIds.length} jadwal ujian sekaligus.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus jadwal ujian terpilih: ${err.message}`);
    }
  };

  // Filtered Exams in Level 3
  const currentAssessmentExams = exams.filter((e) => {
    if (!selectedSubjectForView || !selectedAssessmentForView) return false;
    if (e.subjectId !== selectedSubjectForView.id) return false;
    if (e.assessmentType !== selectedAssessmentForView) return false;

    if (filterStatus && e.status !== filterStatus) return false;
    if (filterClass && e.targetClassNames && !e.targetClassNames.includes(filterClass)) return false;

    if (examSearchTerm.trim()) {
      const term = examSearchTerm.toLowerCase();
      return e.title.toLowerCase().includes(term);
    }

    return true;
  });

  const isAllSelected =
    currentAssessmentExams.length > 0 && selectedIds.length === currentAssessmentExams.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < currentAssessmentExams.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentAssessmentExams.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filtered Subjects in Level 1
  const filteredSubjects = subjects.filter((s) => {
    if (!subjectSearchTerm.trim()) return true;
    const term = subjectSearchTerm.toLowerCase();
    return s.name.toLowerCase().includes(term) || s.code.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* =============================================================
          LEVEL 1: PILIH MATA PELAJARAN (SUBJECT LIST VIEW)
      ============================================================= */}
      {!selectedSubjectForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <School className="w-4 h-4" />
                <span>Pengaturan & Sesi Ujian SMP Negeri 3 Kertek</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Pilih Mata Pelajaran</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pilih mata pelajaran untuk mengatur jadwal dan sesi pelaksanaan Asesmen Sumatif 1, 2, 3, dan 4
              </p>
            </div>

            <button
              onClick={handleOpenAdd}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Jadwal Ujian Baru</span>
            </button>
          </div>

          {/* Search bar for subjects */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari mata pelajaran berdasarkan nama atau kode..."
                value={subjectSearchTerm}
                onChange={(e) => setSubjectSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              {subjectSearchTerm && (
                <button
                  onClick={() => setSubjectSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
              Total: <strong className="text-slate-900">{filteredSubjects.length} Mata Pelajaran</strong> &bull; Total Jadwal: <strong className="text-blue-600">{exams.length} Sesi</strong>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Memuat jadwal mata pelajaran...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Mata Pelajaran Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1">
                {subjectSearchTerm
                  ? 'Tidak ada mata pelajaran yang cocok dengan kata kunci pencarian.'
                  : 'Belum ada mata pelajaran terdaftar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((sub) => {
                const totalE = getSubjectExamCount(sub.id);
                const as1Count = getSubjectAssessmentExamCount(sub.id, 'Asesmen Sumatif 1');
                const as2Count = getSubjectAssessmentExamCount(sub.id, 'Asesmen Sumatif 2');
                const as3Count = getSubjectAssessmentExamCount(sub.id, 'Asesmen Sumatif 3');
                const as4Count = getSubjectAssessmentExamCount(sub.id, 'Asesmen Sumatif 4');
                const hasActive = exams.some((e) => e.subjectId === sub.id && e.status === 'aktif');

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectForView(sub);
                      setSelectedAssessmentForView(null);
                    }}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between hover:border-blue-400 hover:shadow-blue-500/10"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {sub.code}
                        </span>
                        {hasActive ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Ujian Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {totalE} Jadwal
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {sub.teacherName ? `Guru: ${sub.teacherName}` : 'Guru Pengampu: Belum ditentukan'}
                      </p>

                      {/* Mini Asesmen Breakdown Pills */}
                      <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 1:</span>
                          <span className={`font-bold ${as1Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as1Count} jadwal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 2:</span>
                          <span className={`font-bold ${as2Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as2Count} jadwal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 3:</span>
                          <span className={`font-bold ${as3Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as3Count} jadwal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 4:</span>
                          <span className={`font-bold ${as4Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as4Count} jadwal
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Buka Jadwal Asesmen</span>
                      <div className="w-6 h-6 rounded-lg bg-blue-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center transition-colors">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =============================================================
          LEVEL 2: PILIH ASESMEN SUMATIF (ASSESSMENT SELECTOR VIEW)
      ============================================================= */}
      {selectedSubjectForView && !selectedAssessmentForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Breadcrumb Navigation & Back Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedAssessmentForView(null);
                }}
                className="hover:text-blue-600 flex items-center gap-1.5 transition-colors font-bold text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Daftar Mata Pelajaran</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {selectedSubjectForView.name} ({selectedSubjectForView.code})
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedSubjectForView(null);
                setSelectedAssessmentForView(null);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti Mapel</span>
            </button>
          </div>

          {/* Selected Subject Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-blue-800/80 text-blue-200 text-xs font-bold px-3 py-1 rounded-xl mb-2 border border-blue-700/50">
                  <BookOpen className="w-3.5 h-3.5 text-blue-300" />
                  <span>KODE: {selectedSubjectForView.code}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {selectedSubjectForView.name}
                </h2>
                <p className="text-xs text-blue-100 mt-1 max-w-xl">
                  {selectedSubjectForView.teacherName
                    ? `Guru Pengampu: ${selectedSubjectForView.teacherName}`
                    : 'Pengaturan jadwal dan sesi ujian ANBK'}
                </p>
              </div>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors self-start md:self-auto"
              >
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Buat Jadwal di Mapel Ini</span>
              </button>
            </div>
          </div>

          {/* Section: 4 Summative Assessments Cards */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <span>Pilih Tahapan Asesmen Sumatif</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik pada tahapan asesmen di bawah untuk melihat dan mengelola sesi ujian
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                Total Jadwal: {getSubjectExamCount(selectedSubjectForView.id)} Sesi
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUMMATIVE_ASSESSMENTS.map((asType, idx) => {
                const count = getSubjectAssessmentExamCount(selectedSubjectForView.id, asType);
                const activeExam = getSubjectAssessmentActiveExam(selectedSubjectForView.id, asType);

                const cardThemes = [
                  { border: 'border-blue-200 hover:border-blue-400', badge: 'bg-blue-100 text-blue-800', btn: 'bg-blue-600 hover:bg-blue-500 text-white', icon: 'text-blue-600 bg-blue-50', num: '1' },
                  { border: 'border-emerald-200 hover:border-emerald-400', badge: 'bg-emerald-100 text-emerald-800', btn: 'bg-emerald-600 hover:bg-emerald-500 text-white', icon: 'text-emerald-600 bg-emerald-50', num: '2' },
                  { border: 'border-indigo-200 hover:border-indigo-400', badge: 'bg-indigo-100 text-indigo-800', btn: 'bg-indigo-600 hover:bg-indigo-500 text-white', icon: 'text-indigo-600 bg-indigo-50', num: '3' },
                  { border: 'border-purple-200 hover:border-purple-400', badge: 'bg-purple-100 text-purple-800', btn: 'bg-purple-600 hover:bg-purple-500 text-white', icon: 'text-purple-600 bg-purple-50', num: '4' },
                ];
                const theme = cardThemes[idx % cardThemes.length];

                return (
                  <div
                    key={asType}
                    onClick={() => setSelectedAssessmentForView(asType)}
                    className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between ${theme.border}`}
                  >
                    <div>
                      {/* Top info */}
                      <div className="flex items-center justify-between mb-4">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${theme.icon}`}
                        >
                          AS-{theme.num}
                        </div>
                        {activeExam ? (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                            {count} Jadwal
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        {asType}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        {activeExam
                          ? `Ujian sedang aktif: ${activeExam.durationMinutes} menit (${activeExam.targetClassNames.join(', ')})`
                          : count > 0
                          ? `Tersedia ${count} jadwal ujian tersimpan (status draft/selesai).`
                          : 'Belum ada jadwal ujian pada asesmen ini. Klik untuk membuat.'}
                      </p>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAssessmentForView(asType);
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm ${theme.btn}`}
                      >
                        <span>Buka Jadwal Asesmen {theme.num}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          LEVEL 3: DAFTAR JADWAL UJIAN ASESMEN SPESIFIK
      ============================================================= */}
      {selectedSubjectForView && selectedAssessmentForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Breadcrumbs & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedAssessmentForView(null);
                }}
                className="hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Semua Mapel</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => setSelectedAssessmentForView(null)}
                className="hover:text-blue-600 transition-colors font-semibold text-slate-700"
              >
                {selectedSubjectForView.name}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
                {selectedAssessmentForView}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedAssessmentForView(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pilih Asesmen Lain</span>
              </button>
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedAssessmentForView(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
              >
                <span>Ganti Mapel</span>
              </button>
            </div>
          </div>

          {/* Quick-Switch Assessment Tabs */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
            {SUMMATIVE_ASSESSMENTS.map((asType) => {
              const count = getSubjectAssessmentExamCount(selectedSubjectForView.id, asType);
              const isActive = selectedAssessmentForView === asType;

              return (
                <button
                  key={asType}
                  onClick={() => {
                    setSelectedAssessmentForView(asType);
                    setSelectedIds([]);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{asType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Header for this Assessment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <span>{selectedSubjectForView.code} &bull; {selectedSubjectForView.name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Jadwal Ujian {selectedAssessmentForView}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Atur pelaksanaan asesmen sumatif, durasi, kelas sasaran, pengacakan soal, dan aktivasi ujian
              </p>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus {selectedIds.length} Terpilih</span>
                </button>
              )}

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Jadwal Baru</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari judul jadwal ujian..."
                  value={examSearchTerm}
                  onChange={(e) => setExamSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif (Bisa Dimulai Siswa)</option>
                <option value="draft">Draft (Ditutup)</option>
                <option value="selesai">Selesai</option>
              </select>

              {/* Class Filter */}
              <select
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium self-end sm:self-auto shrink-0">
              {selectedIds.length > 0 && (
                <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {selectedIds.length} dipilih
                </span>
              )}
              <span>
                Total: <strong className="text-slate-900">{currentAssessmentExams.length} Jadwal</strong>
              </span>
            </div>
          </div>

          {/* Exams Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 w-10 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 hover:text-blue-600 transition-colors"
                        title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua jadwal'}
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : isPartiallySelected ? (
                          <MinusSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Sesi Ujian</th>
                    <th className="py-3 px-4">Kelas Peserta</th>
                    <th className="py-3 px-4">Tanggal & Waktu</th>
                    <th className="py-3 px-4">Durasi & Soal</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Memuat jadwal ujian...
                      </td>
                    </tr>
                  ) : currentAssessmentExams.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <Clock className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-800">
                            Belum Ada Jadwal pada {selectedAssessmentForView}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Buat jadwal ujian baru untuk mengaktifkan ujian ini agar siswa dapat memilihnya di portal ujian.
                          </p>
                          <div className="pt-2">
                            <button
                              onClick={handleOpenAdd}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm mx-auto"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Buat Jadwal Ujian Sekarang</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentAssessmentExams.map((ex, idx) => {
                      const isChecked = selectedIds.includes(ex.id);
                      return (
                        <tr
                          key={ex.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isChecked ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(ex.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{ex.title}</div>
                            <div className="text-slate-500 text-[11px]">
                              {ex.teacherName ? `Pengawas: ${ex.teacherName}` : 'Standar Guru'} &bull; KKM: {ex.passingScore}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {ex.targetClassNames.map((name, i) => (
                                <span
                                  key={i}
                                  className="bg-blue-50 text-blue-800 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-200"
                                >
                                  {name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-800">{ex.examDate}</div>
                            <div className="text-slate-500 text-[11px] font-mono">Pukul {ex.startTime} WIB</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{ex.durationMinutes} Menit</div>
                            <div className="text-[11px] text-blue-600 font-semibold">
                              {ex.totalQuestions} Butir Soal
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(ex)}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 transition-colors ${
                                ex.status === 'aktif'
                                  ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                  : ex.status === 'selesai'
                                  ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                  : 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                              }`}
                              title="Klik untuk mengubah status aktif/draft"
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  ex.status === 'aktif'
                                    ? 'bg-emerald-600 animate-pulse'
                                    : ex.status === 'selesai'
                                    ? 'bg-slate-500'
                                    : 'bg-amber-600'
                                }`}
                              />
                              <span className="capitalize">{ex.status}</span>
                            </button>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenEdit(ex)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Edit Jadwal"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setExamToDelete(ex)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Hapus Jadwal"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: TAMBAH / EDIT PENGATURAN UJIAN
      ============================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900">
                {editingExam ? 'Edit Pengaturan & Jadwal Ujian' : 'Buat Jadwal Ujian Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveExam} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Subject */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={subjectIdInput}
                    onChange={(e) => setSubjectIdInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assessment Type */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tahapan Asesmen <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assessmentInput}
                    onChange={(e) => setAssessmentInput(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    {SUMMATIVE_ASSESSMENTS.map((as) => (
                      <option key={as} value={as}>
                        {as}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Judul Sesi Ujian (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk otomatis menggunakan nama asesmen dan mapel"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>

              {/* Target Classes Selection */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Pilih Kelas Peserta Ujian <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {classes.map((cls) => {
                    const isSelected = targetClassIdsInput.includes(cls.id);
                    return (
                      <button
                        type="button"
                        key={cls.id}
                        onClick={() => toggleTargetClass(cls.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Kelas {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date, Time & Duration */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Tanggal Pelaksanaan
                  </label>
                  <input
                    type="date"
                    required
                    value={examDateInput}
                    onChange={(e) => setExamDateInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Jam Mulai (WIB)
                  </label>
                  <input
                    type="time"
                    required
                    value={startTimeInput}
                    onChange={(e) => setStartTimeInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Durasi (Menit)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={300}
                    required
                    value={durationInput}
                    onChange={(e) => setDurationInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Randomization & KKM */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={randomizeQInput}
                      onChange={(e) => setRandomizeQInput(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Acak Urutan Soal</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2 font-semibold text-slate-700 cursor-pointer pt-2">
                    <input
                      type="checkbox"
                      checked={randomizeOptInput}
                      onChange={(e) => setRandomizeOptInput(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Acak Opsi Pilihan</span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-600 mb-1">
                    KKM / Nilai Minimal:
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passingScoreInput}
                    onChange={(e) => setPassingScoreInput(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-slate-300 font-bold font-mono text-xs"
                  />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Status Ketersediaan Ujian
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatusInput('aktif')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      statusInput === 'aktif'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300" />
                    <span>Aktif (Bisa Dimulai Siswa)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusInput('draft')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      statusInput === 'draft'
                        ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-300" />
                    <span>Draft (Belum Dibuka)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatusInput('selesai')}
                    className={`p-2.5 rounded-xl border font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                      statusInput === 'selesai'
                        ? 'bg-slate-700 text-white border-slate-800 shadow-md'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>Selesai (Ditutup)</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20"
                >
                  {editingExam ? 'Simpan Perubahan' : 'Jadwalkan Ujian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Single */}
      {examToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Jadwal Ujian Ini?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Jadwal <strong>{examToDelete.title}</strong> akan dihapus. Siswa tidak akan dapat mengakses ujian ini lagi.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setExamToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteExam}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Jadwal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus {selectedIds.length} Jadwal Ujian Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} jadwal ujian</strong> untuk dihapus secara massal. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Semua Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
