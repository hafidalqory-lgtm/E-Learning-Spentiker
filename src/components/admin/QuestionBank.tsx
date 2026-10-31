import React, { useState, useEffect, useRef } from 'react';
import {
  Question,
  Subject,
  SchoolClass,
  QuestionType,
  AssessmentType,
} from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  putBatchToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import {
  downloadQuestionTemplate,
  exportQuestionsToFile,
  parseQuestionFile,
  parseQuestionText,
} from '../../utils/exportImport';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Copy,
  Edit2,
  Trash2,
  Eye,
  FileSpreadsheet,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  Image as ImageIcon,
  FileText,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  FileUp,
  ClipboardPaste,
  Sparkles,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  FolderOpen,
  School,
  Award,
} from 'lucide-react';

interface QuestionBankProps {
  userRole?: 'admin' | 'guru';
  assignedSubjectIds?: string[];
}

const SUMMATIVE_ASSESSMENTS: AssessmentType[] = [
  'Asesmen Sumatif 1',
  'Asesmen Sumatif 2',
  'Asesmen Sumatif 3',
  'Asesmen Sumatif 4',
];

export const QuestionBank: React.FC<QuestionBankProps> = ({
  userRole = 'admin',
  assignedSubjectIds = [],
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // HIERARCHICAL DRILL-DOWN NAVIGATION STATE
  // Level 1: selectedSubjectForView === null (Pilih Mata Pelajaran)
  // Level 2: selectedSubjectForView !== null && selectedAssessmentForView === null (Pilih Asesmen)
  // Level 3: selectedSubjectForView !== null && selectedAssessmentForView !== null (Daftar Soal Asesmen)
  // -------------------------------------------------------------
  const [selectedSubjectForView, setSelectedSubjectForView] = useState<Subject | null>(null);
  const [selectedAssessmentForView, setSelectedAssessmentForView] = useState<AssessmentType | null>(null);

  // Searches & Filters
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [questionSearchTerm, setQuestionSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterTargetClass, setFilterTargetClass] = useState<string>('');

  // Multi-select state (for Level 3 question table)
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);

  // Form Fields
  const [subjectIdInput, setSubjectIdInput] = useState<string>('');
  const [assessmentInput, setAssessmentInput] = useState<AssessmentType>('Asesmen Sumatif 1');
  const [typeInput, setTypeInput] = useState<QuestionType>('pilihan_ganda');
  const [targetClassesInput, setTargetClassesInput] = useState<string[]>([]);
  const [questionTextInput, setQuestionTextInput] = useState<string>('');
  const [imageUrlInput, setImageUrlInput] = useState<string>('');
  const [optA, setOptA] = useState<string>('');
  const [optB, setOptB] = useState<string>('');
  const [optC, setOptC] = useState<string>('');
  const [optD, setOptD] = useState<string>('');
  const [optE, setOptE] = useState<string>('');
  const [correctAnswerInput, setCorrectAnswerInput] = useState<string>('A');
  const [weightInput, setWeightInput] = useState<number>(10);
  const [discussionInput, setDiscussionInput] = useState<string>('');
  const [rubricInput, setRubricInput] = useState<string>('');
  const [modalError, setModalError] = useState<string>('');

  // Question Preview Modal
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);

  // Delete Confirm Modals
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  // Import Modal State
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importTab, setImportTab] = useState<'excel' | 'text'>('excel');
  const [importSubjectId, setImportSubjectId] = useState<string>('');
  const [importAssessment, setImportAssessment] = useState<AssessmentType>('Asesmen Sumatif 1');
  const [importClasses, setImportClasses] = useState<string[]>([]);
  const [importForceOverride, setImportForceOverride] = useState<boolean>(true);
  const [importPastedText, setImportPastedText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string>('');
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null);
  const [isProcessingImport, setIsProcessingImport] = useState<boolean>(false);
  const [importNotification, setImportNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [importPreview, setImportPreview] = useState<{
    valid: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
    errors: { row: number; error: string; raw: any }[];
    warnings: { row: number; warning: string }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qList, sbjList, clsList] = await Promise.all([
        getAllFromStore<Question>(STORES.QUESTIONS),
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
      ]);

      let allowedSubjects = sbjList;
      if (userRole === 'guru' && assignedSubjectIds.length > 0) {
        allowedSubjects = sbjList.filter((s) => assignedSubjectIds.includes(s.id));
      }

      setQuestions(qList);
      setSubjects(allowedSubjects);
      setClasses(clsList);
      setSelectedIds([]);

      // If currently selected subject was updated or deleted
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
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Helpers for Question Counting
  // -------------------------------------------------------------
  const getSubjectTotalQuestions = (subjectId: string): number => {
    return questions.filter((q) => q.subjectId === subjectId).length;
  };

  const getSubjectAssessmentQuestionsCount = (
    subjectId: string,
    assessment: AssessmentType
  ): number => {
    return questions.filter(
      (q) => q.subjectId === subjectId && q.assessmentType === assessment
    ).length;
  };

  // -------------------------------------------------------------
  // Modal Handlers (Add / Edit)
  // -------------------------------------------------------------
  const handleOpenAdd = () => {
    setEditingQuestion(null);
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

    setTypeInput('pilihan_ganda');
    setTargetClassesInput(classes.map((c) => c.name));
    setQuestionTextInput('');
    setImageUrlInput('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setOptE('');
    setCorrectAnswerInput('A');
    setWeightInput(10);
    setDiscussionInput('');
    setRubricInput('');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setSubjectIdInput(q.subjectId);
    setAssessmentInput(q.assessmentType);
    setTypeInput(q.type);
    setTargetClassesInput(q.targetClasses || []);
    setQuestionTextInput(q.questionText);
    setImageUrlInput(q.imageUrl || '');
    setOptA(q.options.find((o) => o.key === 'A')?.text || '');
    setOptB(q.options.find((o) => o.key === 'B')?.text || '');
    setOptC(q.options.find((o) => o.key === 'C')?.text || '');
    setOptD(q.options.find((o) => o.key === 'D')?.text || '');
    setOptE(q.options.find((o) => o.key === 'E')?.text || '');
    setCorrectAnswerInput(q.correctAnswer);
    setWeightInput(q.weight);
    setDiscussionInput(q.discussion || '');
    setRubricInput(q.scoringRubric || '');
    setModalError('');
    setShowModal(true);
  };

  const handleDuplicate = async (q: Question) => {
    const duplicated: Question = {
      ...q,
      id: 'qst_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
      questionText: `${q.questionText} (Salinan)`,
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
    };

    try {
      await putToStore(STORES.QUESTIONS, duplicated);
      await logActivity('Guru/Admin', 'guru', 'Duplikasi Soal', `Menduplikasi butir soal pada ${q.subjectName}`);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menduplikasi: ${err.message}`);
    }
  };

  const toggleTargetClass = (clsName: string) => {
    setTargetClassesInput((prev) =>
      prev.includes(clsName) ? prev.filter((c) => c !== clsName) : [...prev, clsName]
    );
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!questionTextInput.trim()) {
      setModalError('Pertanyaan tidak boleh kosong.');
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === subjectIdInput);
    if (!selectedSubject) {
      setModalError('Pilih mata pelajaran yang valid.');
      return;
    }

    const options: Question['options'] = [];
    if (typeInput === 'pilihan_ganda' || typeInput === 'pilihan_ganda_kompleks') {
      if (!optA.trim() || !optB.trim()) {
        setModalError('Minimal Pilihan A dan B wajib diisi.');
        return;
      }
      options.push({ key: 'A', text: optA.trim() });
      options.push({ key: 'B', text: optB.trim() });
      if (optC.trim()) options.push({ key: 'C', text: optC.trim() });
      if (optD.trim()) options.push({ key: 'D', text: optD.trim() });
      if (optE.trim()) options.push({ key: 'E', text: optE.trim() });
    } else if (typeInput === 'benar_salah') {
      options.push({ key: 'A', text: 'Benar' });
      options.push({ key: 'B', text: 'Salah' });
    }

    const now = new Date().toISOString().slice(0, 10);
    const newQuestion: Question = {
      id: editingQuestion
        ? editingQuestion.id
        : 'qst_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
      subjectId: selectedSubject.id,
      subjectName: selectedSubject.name,
      assessmentType: assessmentInput,
      targetClasses: targetClassesInput.length > 0 ? targetClassesInput : classes.map((c) => c.name),
      type: typeInput,
      questionText: questionTextInput.trim(),
      imageUrl: imageUrlInput.trim() || undefined,
      options,
      correctAnswer: correctAnswerInput.trim(),
      weight: Number(weightInput) || 10,
      discussion: discussionInput.trim() || undefined,
      scoringRubric: typeInput === 'uraian' ? rubricInput.trim() : undefined,
      createdAt: editingQuestion ? editingQuestion.createdAt : now,
      updatedAt: now,
    };

    try {
      await putToStore(STORES.QUESTIONS, newQuestion);
      await logActivity(
        'Guru/Admin',
        'guru',
        editingQuestion ? 'Perbarui Soal' : 'Tambah Soal',
        `${editingQuestion ? 'Memperbarui' : 'Menambahkan'} butir soal pada ${selectedSubject.name} (${assessmentInput})`
      );
      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan butir soal: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Deletion Handlers
  // -------------------------------------------------------------
  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await deleteFromStore(STORES.QUESTIONS, questionToDelete.id);
      await logActivity(
        'Guru/Admin',
        'guru',
        'Hapus Soal',
        `Menghapus butir soal pada ${questionToDelete.subjectName}`
      );
      setQuestionToDelete(null);
      setSelectedIds((prev) => prev.filter((id) => id !== questionToDelete.id));
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus soal: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.QUESTIONS, selectedIds);
      await logActivity(
        'Guru/Admin',
        'guru',
        'Hapus Masal Soal',
        `Menghapus ${selectedIds.length} butir soal secara massal`
      );
      setSelectedIds([]);
      setShowBulkDeleteConfirm(false);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus soal massal: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // Import Handlers
  // -------------------------------------------------------------
  const handleOpenImportModal = () => {
    if (selectedSubjectForView) {
      setImportSubjectId(selectedSubjectForView.id);
    } else if (subjects.length > 0) {
      setImportSubjectId(subjects[0].id);
    }

    if (selectedAssessmentForView) {
      setImportAssessment(selectedAssessmentForView);
    } else {
      setImportAssessment('Asesmen Sumatif 1');
    }

    setImportClasses(classes.map((c) => c.name));
    setImportForceOverride(true);
    setImportPastedText('');
    setImportFileName('');
    setSelectedImportFile(null);
    setImportNotification(null);
    setImportPreview(null);
    setShowImportModal(true);
  };

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImportFile(file);
      setImportFileName(file.name);
      setImportNotification(null);
      setImportPreview(null);
    }
  };

  const handleProcessExcel = async () => {
    if (!selectedImportFile) {
      setImportNotification({
        type: 'error',
        message: 'Silakan pilih berkas Excel atau CSV terlebih dahulu.',
      });
      return;
    }

    try {
      setIsProcessingImport(true);
      setImportNotification(null);

      const { validQuestions, errors, warnings } = await parseQuestionFile(
        selectedImportFile,
        subjects.map((s) => ({ id: s.id, name: s.name })),
        {
          defaultSubjectId: importSubjectId || (subjects.length > 0 ? subjects[0].id : undefined),
          defaultAssessment: importAssessment,
          defaultClassNames: importClasses.length > 0 ? importClasses : undefined,
          forceOverrideSubject: importForceOverride,
          forceOverrideAssessment: importForceOverride,
        }
      );

      setImportPreview({ valid: validQuestions, errors, warnings });
      if (validQuestions.length === 0 && errors.length > 0) {
        setImportNotification({
          type: 'error',
          message: `Tidak ada soal yang valid. Ditemukan ${errors.length} baris tidak sesuai format.`,
        });
      } else if (validQuestions.length > 0) {
        setImportNotification({
          type: 'success',
          message: `Berhasil memproses ${validQuestions.length} butir soal siap diimpor.${
            warnings.length > 0 ? ` (${warnings.length} butir disesuaikan secara otomatis)` : ''
          }`,
        });
      }
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: `Gagal membaca file: ${err.message || 'Pastikan file Excel memiliki baris soal yang valid.'}`,
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleProcessText = () => {
    if (!importPastedText.trim()) {
      setImportNotification({
        type: 'error',
        message: 'Silakan tempel teks soal terlebih dahulu.',
      });
      return;
    }
    const targetSub = subjects.find((s) => s.id === importSubjectId) || subjects[0];
    if (!targetSub) {
      setImportNotification({
        type: 'error',
        message: 'Pilih mata pelajaran sasaran terlebih dahulu.',
      });
      return;
    }

    try {
      setIsProcessingImport(true);
      const { validQuestions, errors, warnings } = parseQuestionText(
        importPastedText,
        targetSub,
        importAssessment,
        importClasses
      );
      setImportPreview({ valid: validQuestions, errors, warnings });
      if (validQuestions.length === 0) {
        setImportNotification({
          type: 'error',
          message: 'Format teks belum dikenali. Gunakan awalan nomor soal seperti "1. Soal...", "A. ...", "Kunci: A".',
        });
      } else {
        setImportNotification({
          type: 'success',
          message: `Berhasil memproses ${validQuestions.length} butir soal dari teks!`,
        });
      }
    } catch (err: any) {
      setImportNotification({
        type: 'error',
        message: `Gagal membaca format teks: ${err.message}`,
      });
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleRemovePreviewItem = (index: number) => {
    if (!importPreview) return;
    const updated = [...importPreview.valid];
    updated.splice(index, 1);
    setImportPreview({
      ...importPreview,
      valid: updated,
    });
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.valid.length === 0) return;

    try {
      setIsProcessingImport(true);
      const newItems: Question[] = importPreview.valid.map((v, i) => ({
        ...v,
        id:
          'qst_' +
          Date.now().toString(36) +
          '_' +
          i +
          '_' +
          Math.random().toString(36).slice(2, 5),
        createdAt: new Date().toISOString().slice(0, 10),
        updatedAt: new Date().toISOString().slice(0, 10),
      }));

      await putBatchToStore(STORES.QUESTIONS, newItems);
      await logActivity(
        'Guru/Admin',
        'guru',
        'Impor Soal',
        `Berhasil mengimpor ${newItems.length} butir soal ke bank soal`
      );

      setShowImportModal(false);
      setImportPreview(null);
      setSelectedImportFile(null);
      setImportPastedText('');
      await loadData();
      alert(`Sukses! ${newItems.length} butir soal berhasil diimpor dan disimpan ke database.`);
    } catch (err: any) {
      alert(`Gagal menyimpan data impor: ${err.message}`);
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleLoadSampleText = () => {
    setImportPastedText(`1. Perangkat keras komputer yang berfungsi memproses instruksi aritmatika dan logika adalah...
A. ALU (Arithmetic Logic Unit)
B. RAM
C. Harddisk
D. Keyboard
Kunci: A
Bobot: 10
Pembahasan: ALU adalah bagian inti dari CPU yang memproses operasi hitung dan logika.

2. Komputer yang saling terhubung dalam satu gedung sekolah membentuk jaringan LAN.
A. Benar
B. Salah
Kunci: Benar
Bobot: 10

3. Jelaskan pengertian dan manfaat dari jaringan Local Area Network (LAN) di lingkungan sekolah!
Kunci: Jaringan lokal terbatas yang menghubungkan komputer di sekolah untuk berbagi printer dan data.
Bobot: 20
Pembahasan: Rubrik: Konsep LAN cakupan lokal (10 poin), Manfaat berbagi sumber daya (10 poin).`);
  };

  // -------------------------------------------------------------
  // Filtered Questions in Level 3
  // -------------------------------------------------------------
  const questionsForCurrentAssessment = questions.filter((q) => {
    if (!selectedSubjectForView || !selectedAssessmentForView) return false;
    if (q.subjectId !== selectedSubjectForView.id) return false;
    if (q.assessmentType !== selectedAssessmentForView) return false;

    if (filterType && q.type !== filterType) return false;
    if (
      filterTargetClass &&
      q.targetClasses &&
      !q.targetClasses.includes(filterTargetClass)
    ) {
      return false;
    }

    if (questionSearchTerm.trim()) {
      const term = questionSearchTerm.toLowerCase();
      const matchText = q.questionText.toLowerCase().includes(term);
      const matchAns = q.correctAnswer.toLowerCase().includes(term);
      if (!matchText && !matchAns) return false;
    }

    return true;
  });

  const isAllSelected =
    questionsForCurrentAssessment.length > 0 &&
    selectedIds.length === questionsForCurrentAssessment.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < questionsForCurrentAssessment.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(questionsForCurrentAssessment.map((q) => q.id));
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

  // Color generator for subject card badges
  const getSubjectColor = (idx: number) => {
    const colors = [
      { bg: 'bg-blue-500/10 text-blue-700 border-blue-200', dot: 'bg-blue-600', hover: 'hover:border-blue-400 hover:shadow-blue-500/10' },
      { bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-200', dot: 'bg-emerald-600', hover: 'hover:border-emerald-400 hover:shadow-emerald-500/10' },
      { bg: 'bg-indigo-500/10 text-indigo-700 border-indigo-200', dot: 'bg-indigo-600', hover: 'hover:border-indigo-400 hover:shadow-indigo-500/10' },
      { bg: 'bg-amber-500/10 text-amber-700 border-amber-200', dot: 'bg-amber-600', hover: 'hover:border-amber-400 hover:shadow-amber-500/10' },
      { bg: 'bg-purple-500/10 text-purple-700 border-purple-200', dot: 'bg-purple-600', hover: 'hover:border-purple-400 hover:shadow-purple-500/10' },
      { bg: 'bg-rose-500/10 text-rose-700 border-rose-200', dot: 'bg-rose-600', hover: 'hover:border-rose-400 hover:shadow-rose-500/10' },
      { bg: 'bg-cyan-500/10 text-cyan-700 border-cyan-200', dot: 'bg-cyan-600', hover: 'hover:border-cyan-400 hover:shadow-cyan-500/10' },
      { bg: 'bg-teal-500/10 text-teal-700 border-teal-200', dot: 'bg-teal-600', hover: 'hover:border-teal-400 hover:shadow-teal-500/10' },
    ];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* =============================================================
          LEVEL 1: PILIH MATA PELAJARAN (SUBJECT LIST VIEW)
          Tampil ketika belum ada Mata Pelajaran yang dipilih
      ============================================================= */}
      {!selectedSubjectForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <School className="w-4 h-4" />
                <span>Bank Soal Terpusat SMP Negeri 3 Kertek</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Pilih Mata Pelajaran</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Silakan klik pada salah satu mata pelajaran di bawah untuk mengelola butir soal Asesmen Sumatif 1, 2, 3, dan 4
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => downloadQuestionTemplate('xlsx')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
                title="Unduh format template Excel soal"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Template Soal</span>
              </button>

              <button
                onClick={handleOpenImportModal}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
                title="Impor soal dari Excel atau salin teks"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Impor Soal</span>
              </button>

              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Soal Baru</span>
              </button>
            </div>
          </div>

          {/* Search Bar for Subjects */}
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
              Total: <strong className="text-slate-900">{filteredSubjects.length} Mata Pelajaran</strong> &bull; Total Soal: <strong className="text-blue-600">{questions.length} Butir</strong>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Memuat daftar mata pelajaran...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Mata Pelajaran Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1">
                {subjectSearchTerm
                  ? 'Tidak ada mata pelajaran yang cocok dengan kata kunci pencarian.'
                  : 'Belum ada mata pelajaran terdaftar. Tambahkan di menu Mata Pelajaran.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((sub, idx) => {
                const totalQ = getSubjectTotalQuestions(sub.id);
                const as1 = getSubjectAssessmentQuestionsCount(sub.id, 'Asesmen Sumatif 1');
                const as2 = getSubjectAssessmentQuestionsCount(sub.id, 'Asesmen Sumatif 2');
                const as3 = getSubjectAssessmentQuestionsCount(sub.id, 'Asesmen Sumatif 3');
                const as4 = getSubjectAssessmentQuestionsCount(sub.id, 'Asesmen Sumatif 4');
                const colorStyle = getSubjectColor(idx);

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectForView(sub);
                      setSelectedAssessmentForView(null);
                    }}
                    className={`group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between ${colorStyle.hover}`}
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${colorStyle.bg}`}
                        >
                          {sub.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {totalQ} Butir Soal
                        </span>
                      </div>

                      {/* Subject Name */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {sub.name}
                      </h3>

                      {/* Teacher / Subtext */}
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {sub.teacherName ? `Guru: ${sub.teacherName}` : 'Guru Pengampu: Belum ditentukan'}
                      </p>

                      {/* Mini Asesmen Breakdown Pills */}
                      <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 1:</span>
                          <span className={`font-bold ${as1 > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as1} soal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 2:</span>
                          <span className={`font-bold ${as2 > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as2} soal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 3:</span>
                          <span className={`font-bold ${as3 > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as3} soal
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 4:</span>
                          <span className={`font-bold ${as4 > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as4} soal
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Buka Asesmen Soal</span>
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
          LEVEL 2: PILIH ASESMEN SUMATIF (ASSESSMENT SELECTION VIEW)
          Tampil ketika Mata Pelajaran sudah dipilih, tetapi Asesmen belum dipilih
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

            <div className="flex items-center gap-2">
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
          </div>

          {/* Selected Subject Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-white/5 pointer-events-none transform skew-x-12" />
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
                    : 'Mata pelajaran asesmen ANBK SMP Negeri 3 Kertek'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={handleOpenAdd}
                  className="px-3.5 py-2 bg-white text-blue-900 hover:bg-blue-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
                >
                  <Plus className="w-4 h-4 text-blue-600" />
                  <span>Buat Soal di Mapel Ini</span>
                </button>
                <button
                  onClick={handleOpenImportModal}
                  className="px-3.5 py-2 bg-blue-800/80 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-blue-600 transition-colors"
                >
                  <Upload className="w-4 h-4 text-blue-300" />
                  <span>Impor Soal ke Mapel Ini</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: 4 Summative Assessments */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <span>Pilih Tahapan Asesmen Sumatif</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Klik pada asesmen di bawah untuk melihat dan mengedit butir-butir soalnya
                </p>
              </div>
              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                Total Soal: {getSubjectTotalQuestions(selectedSubjectForView.id)} Butir
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUMMATIVE_ASSESSMENTS.map((asType, idx) => {
                const count = getSubjectAssessmentQuestionsCount(selectedSubjectForView.id, asType);
                const hasQuestions = count > 0;

                const cardThemes = [
                  {
                    border: 'border-blue-200 hover:border-blue-400',
                    badge: 'bg-blue-100 text-blue-800',
                    btn: 'bg-blue-600 hover:bg-blue-500 text-white',
                    icon: 'text-blue-600 bg-blue-50',
                    num: '1',
                  },
                  {
                    border: 'border-emerald-200 hover:border-emerald-400',
                    badge: 'bg-emerald-100 text-emerald-800',
                    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
                    icon: 'text-emerald-600 bg-emerald-50',
                    num: '2',
                  },
                  {
                    border: 'border-indigo-200 hover:border-indigo-400',
                    badge: 'bg-indigo-100 text-indigo-800',
                    btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
                    icon: 'text-indigo-600 bg-indigo-50',
                    num: '3',
                  },
                  {
                    border: 'border-purple-200 hover:border-purple-400',
                    badge: 'bg-purple-100 text-purple-800',
                    btn: 'bg-purple-600 hover:bg-purple-500 text-white',
                    icon: 'text-purple-600 bg-purple-50',
                    num: '4',
                  },
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
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            hasQuestions ? theme.badge : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count} Butir Soal
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        {asType}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        {hasQuestions
                          ? `Sudah tersedia ${count} butir soal siap digunakan untuk ujian.`
                          : 'Belum ada soal pada asesmen ini. Klik untuk membuat atau mengimpor.'}
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
                        <span>Buka Soal Asesmen {theme.num}</span>
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
          LEVEL 3: DAFTAR BUTIR SOAL ASESMEN SPESIFIK (QUESTION LIST VIEW)
          Tampil ketika Mata Pelajaran DAN Asesmen Sumatif sudah dipilih!
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
                title="Kembali ke semua mata pelajaran"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Semua Mapel</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => setSelectedAssessmentForView(null)}
                className="hover:text-blue-600 transition-colors font-semibold text-slate-700"
                title="Kembali ke pilihan asesmen"
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

          {/* Quick-Switch Assessment Tabs (Allows fast switching without going back) */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto">
            {SUMMATIVE_ASSESSMENTS.map((asType) => {
              const count = getSubjectAssessmentQuestionsCount(selectedSubjectForView.id, asType);
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
                <HelpCircle className="w-5 h-5 text-blue-600" />
                <span>Butir Soal {selectedAssessmentForView}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Kelola butir soal pilihan ganda, benar/salah, kompleks, dan esai untuk tahapan asesmen ini
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Bulk Delete Button */}
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus {selectedIds.length} Terpilih</span>
                </button>
              )}

              {/* Download Template */}
              <button
                onClick={() => downloadQuestionTemplate('xlsx')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
                title="Unduh format template Excel soal"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Template</span>
              </button>

              {/* Upload Button */}
              <button
                onClick={handleOpenImportModal}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
                title="Buka panel impor soal ke asesmen ini"
              >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Impor Soal</span>
              </button>

              {/* Export Button */}
              <button
                onClick={() => exportQuestionsToFile(questionsForCurrentAssessment, 'xlsx')}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
                title="Ekspor soal asesmen ini ke file Excel"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                <span>Ekspor Soal</span>
              </button>

              {/* Add Question Button */}
              <button
                onClick={handleOpenAdd}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Soal Baru</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              {/* Search question text */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari isi pertanyaan atau kunci..."
                  value={questionSearchTerm}
                  onChange={(e) => setQuestionSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Bentuk Soal</option>
                <option value="pilihan_ganda">Pilihan Ganda</option>
                <option value="uraian">Uraian / Esai</option>
                <option value="benar_salah">Benar / Salah</option>
                <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks</option>
              </select>

              {/* Target Class Filter */}
              <select
                value={filterTargetClass}
                onChange={(e) => setFilterTargetClass(e.target.value)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Semua Target Kelas</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.name}>
                    Kelas {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium self-end lg:self-auto shrink-0">
              {selectedIds.length > 0 && (
                <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {selectedIds.length} dipilih
                </span>
              )}
              <span>
                Ditemukan: <strong className="text-slate-900">{questionsForCurrentAssessment.length} Soal</strong>
              </span>
            </div>
          </div>

          {/* Questions Table */}
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
                        title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua soal'}
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
                    <th className="py-3 px-4">Pertanyaan</th>
                    <th className="py-3 px-4">Bentuk & Bobot</th>
                    <th className="py-3 px-4">Kunci Jawaban</th>
                    <th className="py-3 px-4">Target Kelas</th>
                    <th className="py-3 px-4 text-center w-36">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Memuat butir soal...
                      </td>
                    </tr>
                  ) : questionsForCurrentAssessment.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-3">
                          <HelpCircle className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-800">
                            Belum Ada Soal pada {selectedAssessmentForView}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Mata pelajaran {selectedSubjectForView.name} belum memiliki butir soal pada tahapan asesmen ini.
                          </p>
                          <div className="flex items-center justify-center gap-2 pt-2">
                            <button
                              onClick={handleOpenAdd}
                              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Buat Soal Pertama</span>
                            </button>
                            <button
                              onClick={handleOpenImportModal}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-300"
                            >
                              <Upload className="w-4 h-4 text-blue-600" />
                              <span>Impor dari Excel / Teks</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    questionsForCurrentAssessment.map((q, idx) => {
                      const isChecked = selectedIds.includes(q.id);
                      return (
                        <tr
                          key={q.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isChecked ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(q.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <p className="line-clamp-2 text-slate-800 font-medium leading-relaxed">
                              {q.questionText}
                            </p>
                            {q.imageUrl && (
                              <div className="flex items-center gap-1 text-[10px] text-blue-600 mt-1">
                                <ImageIcon className="w-3 h-3" />
                                <span>Ada Lampiran Gambar</span>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                q.type === 'pilihan_ganda'
                                  ? 'bg-blue-100 text-blue-800'
                                  : q.type === 'benar_salah'
                                  ? 'bg-purple-100 text-purple-800'
                                  : q.type === 'uraian'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {q.type === 'pilihan_ganda'
                                ? 'Pilihan Ganda'
                                : q.type === 'uraian'
                                ? 'Uraian / Esai'
                                : q.type === 'benar_salah'
                                ? 'Benar / Salah'
                                : 'PG Kompleks'}
                            </span>
                            <div className="text-[11px] text-slate-500 font-mono mt-1">
                              Bobot: {q.weight} Poin
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                            <span className="bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                              {q.correctAnswer.length > 25
                                ? q.correctAnswer.slice(0, 25) + '...'
                                : q.correctAnswer}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex flex-wrap gap-1 max-w-[140px]">
                              {q.targetClasses && q.targetClasses.length > 0 ? (
                                q.targetClasses.slice(0, 3).map((cls) => (
                                  <span
                                    key={cls}
                                    className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold"
                                  >
                                    {cls}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 text-[10px]">Semua Kelas</span>
                              )}
                              {q.targetClasses && q.targetClasses.length > 3 && (
                                <span className="text-[10px] text-slate-500 font-semibold">
                                  +{q.targetClasses.length - 3}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setPreviewQuestion(q)}
                                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                                title="Pratinjau Soal"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDuplicate(q)}
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                                title="Duplikasi Soal"
                              >
                                <Copy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenEdit(q)}
                                className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                                title="Edit Soal"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setQuestionToDelete(q)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Hapus Soal Ini"
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
          MODAL: TAMBAH / EDIT BUTIR SOAL
      ============================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4 flex items-center justify-between">
              <span>{editingQuestion ? 'Edit Butir Soal Asesmen' : 'Buat Butir Soal Baru'}</span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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

                {/* Question Type */}
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Bentuk Soal <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={typeInput}
                    onChange={(e) => {
                      const t = e.target.value as QuestionType;
                      setTypeInput(t);
                      if (t === 'benar_salah') setCorrectAnswerInput('Benar');
                      else if (t === 'pilihan_ganda') setCorrectAnswerInput('A');
                      else setCorrectAnswerInput('');
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="pilihan_ganda">Pilihan Ganda (A, B, C, D, E)</option>
                    <option value="uraian">Uraian / Esai (Penilaian Rubrik)</option>
                    <option value="benar_salah">Benar atau Salah</option>
                    <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks</option>
                  </select>
                </div>
              </div>

              {/* Target Classes Selection */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Target Kelas Rombongan Belajar
                </label>
                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  {classes.map((cls) => {
                    const isSelected = targetClassesInput.includes(cls.name);
                    return (
                      <button
                        type="button"
                        key={cls.id}
                        onClick={() => toggleTargetClass(cls.name)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-700 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        {cls.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Question Text */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Isi Butir Pertanyaan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Ketik isi pertanyaan secara jelas..."
                  value={questionTextInput}
                  onChange={(e) => setQuestionTextInput(e.target.value)}
                  className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed font-medium"
                />
              </div>

              {/* Optional Image URL */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  URL / Data Gambar Pendukung (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: https://... atau gambar data:image/png;base64,..."
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
                />
              </div>

              {/* Multiple Choice Options */}
              {(typeInput === 'pilihan_ganda' || typeInput === 'pilihan_ganda_kompleks') && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
                    Opsi Pilihan Jawaban:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                        A
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Pilihan A"
                        value={optA}
                        onChange={(e) => setOptA(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                        B
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="Pilihan B"
                        value={optB}
                        onChange={(e) => setOptB(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                        C
                      </span>
                      <input
                        type="text"
                        placeholder="Pilihan C (Opsional)"
                        value={optC}
                        onChange={(e) => setOptC(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                        D
                      </span>
                      <input
                        type="text"
                        placeholder="Pilihan D (Opsional)"
                        value={optD}
                        onChange={(e) => setOptD(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-slate-200"
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-900 font-bold flex items-center justify-center shrink-0">
                        E
                      </span>
                      <input
                        type="text"
                        placeholder="Pilihan E (Opsional)"
                        value={optE}
                        onChange={(e) => setOptE(e.target.value)}
                        className="flex-1 p-2 rounded-xl border border-slate-200"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Answer Key & Weight */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Kunci Jawaban Benar <span className="text-rose-500">*</span>
                  </label>
                  {typeInput === 'pilihan_ganda' ? (
                    <select
                      value={correctAnswerInput}
                      onChange={(e) => setCorrectAnswerInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-emerald-800"
                    >
                      <option value="A">Kunci: Pilihan A</option>
                      <option value="B">Kunci: Pilihan B</option>
                      {optC && <option value="C">Kunci: Pilihan C</option>}
                      {optD && <option value="D">Kunci: Pilihan D</option>}
                      {optE && <option value="E">Kunci: Pilihan E</option>}
                    </select>
                  ) : typeInput === 'benar_salah' ? (
                    <select
                      value={correctAnswerInput}
                      onChange={(e) => setCorrectAnswerInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-bold text-emerald-800"
                    >
                      <option value="Benar">Kunci: Benar</option>
                      <option value="Salah">Kunci: Salah</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      required
                      placeholder="Kunci jawaban atau poin penting..."
                      value={correctAnswerInput}
                      onChange={(e) => setCorrectAnswerInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold text-emerald-800"
                    />
                  )}
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Bobot Nilai Soal (Poin) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={weightInput}
                    onChange={(e) => setWeightInput(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 font-bold font-mono"
                  />
                </div>
              </div>

              {/* Essay Rubric or Discussion */}
              {typeInput === 'uraian' ? (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Pedoman Rubrik Penilaian Uraian (Untuk Panduan Guru)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Maksimal 20 poin: penjelasan konsep (10 poin)..."
                    value={rubricInput}
                    onChange={(e) => setRubricInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Pembahasan Soal (Opsional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tuliskan pembahasan untuk bahan evaluasi..."
                    value={discussionInput}
                    onChange={(e) => setDiscussionInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200"
                  />
                </div>
              )}

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
                  {editingQuestion ? 'Simpan Perubahan' : 'Simpan Butir Soal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: PRATINJAU TAMPILAN SISWA
      ============================================================= */}
      {previewQuestion && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Pratinjau Tampilan Siswa
                </h3>
                <span className="text-xs text-blue-700 font-semibold">
                  {previewQuestion.subjectName} &bull; {previewQuestion.assessmentType}
                </span>
              </div>
              <button
                onClick={() => setPreviewQuestion(null)}
                className="text-slate-400 hover:text-slate-700 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {previewQuestion.questionText}
                </p>
                {previewQuestion.imageUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 bg-white">
                    <img
                      src={previewQuestion.imageUrl}
                      alt="Lampiran"
                      className="max-h-48 mx-auto object-contain"
                    />
                  </div>
                )}
              </div>

              {previewQuestion.type === 'uraian' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <div className="font-bold">Bentuk Soal: Uraian / Esai (Bobot: {previewQuestion.weight} Poin)</div>
                  <div className="mt-1 text-slate-600">Siswa akan menjawab pada kolom teks bebas.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {previewQuestion.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`p-3 rounded-xl border flex items-center gap-3 ${
                        opt.key === previewQuestion.correctAnswer
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-semibold'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                          opt.key === previewQuestion.correctAnswer
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {opt.key}
                      </span>
                      <span>{opt.text}</span>
                      {opt.key === previewQuestion.correctAnswer && (
                        <span className="ml-auto text-[10px] bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                          Kunci Jawaban
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 pt-3 border-t border-slate-100 text-right">
              <button
                onClick={() => setPreviewQuestion(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: KONFIRMASI HAPUS SATU SOAL
      ============================================================= */}
      {questionToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Butir Soal Ini?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Soal pada mata pelajaran <strong>{questionToDelete.subjectName}</strong> ({questionToDelete.assessmentType}) akan dihapus dari bank soal secara permanen.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setQuestionToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteQuestion}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Soal Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: KONFIRMASI HAPUS MASSAL
      ============================================================= */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus {selectedIds.length} Butir Soal Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} butir soal</strong> untuk dihapus secara permanen dari bank soal. Tindakan ini tidak dapat dibatalkan.
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
                Ya, Hapus Semua Soal Terpilih
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =============================================================
          MODAL: IMPOR SOAL LENGKAP (EXCEL / CSV & SALIN TEKS WORD)
      ============================================================= */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Impor Butir Soal ke Bank Soal
                  </h3>
                  <p className="text-xs text-slate-500">
                    SMP Negeri 3 Kertek &bull; Mendukung berkas Excel, CSV, dan Salin-Tempel Teks Word
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowImportModal(false)}
                className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-slate-800 text-xs flex-1">
              {/* Target Subject & Assessment Config */}
              <div className="bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-blue-900 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Pengaturan Sasaran Impor Soal:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Mata Pelajaran Sasaran:
                    </label>
                    <select
                      value={importSubjectId}
                      onChange={(e) => setImportSubjectId(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-blue-200 bg-white font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Jenis Asesmen:
                    </label>
                    <select
                      value={importAssessment}
                      onChange={(e) => setImportAssessment(e.target.value as AssessmentType)}
                      className="w-full p-2.5 rounded-xl border border-blue-200 bg-white font-semibold text-slate-800 text-xs focus:ring-2 focus:ring-blue-500"
                    >
                      {SUMMATIVE_ASSESSMENTS.map((as) => (
                        <option key={as} value={as}>
                          {as}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="forceOverrideCheck"
                    checked={importForceOverride}
                    onChange={(e) => setImportForceOverride(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="forceOverrideCheck" className="text-slate-700 font-medium cursor-pointer">
                    Terapkan mata pelajaran dan asesmen di atas ke seluruh butir soal yang diimpor (Direkomendasikan)
                  </label>
                </div>
              </div>

              {/* Method Tabs */}
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  type="button"
                  onClick={() => setImportTab('excel')}
                  className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
                    importTab === 'excel'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>1. Unggah File Excel / CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('text')}
                  className={`pb-2.5 px-3 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors ${
                    importTab === 'text'
                      ? 'border-blue-600 text-blue-700'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>2. Salin-Tempel Teks (Word / Docs)</span>
                </button>
              </div>

              {/* Tab 1: Excel / CSV */}
              {importTab === 'excel' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors bg-slate-50/50">
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="excelFileInput"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleSelectFile}
                      className="hidden"
                    />
                    <label
                      htmlFor="excelFileInput"
                      className="cursor-pointer flex flex-col items-center justify-center gap-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-slate-800 text-sm">
                        {importFileName ? (
                          <span className="text-emerald-700 flex items-center gap-1.5 justify-center">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            File Terpilih: {importFileName}
                          </span>
                        ) : (
                          'Klik di sini untuk memilih file Excel (.xlsx / .xls) atau .csv'
                        )}
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Mendukung template standar maupun file Excel yang dibuat oleh bapak/ibu guru.
                      </p>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Belum punya format Excel yang pas?</span>
                      <button
                        type="button"
                        onClick={() => downloadQuestionTemplate('xlsx')}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        Unduh Template Excel Resmi (.xlsx)
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!selectedImportFile || isProcessingImport}
                      onClick={handleProcessExcel}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        selectedImportFile
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessingImport ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Membaca Berkas...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Proses & Pratinjau Soal Excel</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Tab 2: Text / Word */}
              {importTab === 'text' && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-semibold text-slate-700">
                        Tempel Teks Soal dari Microsoft Word atau Google Docs:
                      </label>
                      <button
                        type="button"
                        onClick={handleLoadSampleText}
                        className="text-blue-600 hover:text-blue-700 font-bold hover:underline flex items-center gap-1 text-[11px]"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Muat Contoh Format Soal</span>
                      </button>
                    </div>

                    <textarea
                      rows={8}
                      value={importPastedText}
                      onChange={(e) => setImportPastedText(e.target.value)}
                      placeholder={`Contoh format:
1. Apa fungsi dari RAM pada komputer?
A. Penyimpan data sementara
B. Penyimpan data permanen
C. Mengatur suplai listrik
D. Memproses grafis
Kunci: A
Bobot: 10

2. Sistem operasi Linux bersifat open source.
A. Benar
B. Salah
Kunci: Benar
Bobot: 10`}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!importPastedText.trim() || isProcessingImport}
                      onClick={handleProcessText}
                      className={`px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-all ${
                        importPastedText.trim()
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                          : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {isProcessingImport ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Menganalisis Teks...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Proses & Pratinjau Teks Soal</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Notification Banner */}
              {importNotification && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 ${
                    importNotification.type === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : importNotification.type === 'error'
                      ? 'bg-rose-50 border-rose-200 text-rose-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  {importNotification.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span className="font-semibold">{importNotification.message}</span>
                </div>
              )}

              {/* Parsed Preview Section */}
              {importPreview && (
                <div className="space-y-3 pt-3 border-t border-slate-200 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Hasil Analisis Butir Soal:</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                        Valid: {importPreview.valid.length} Butir
                      </span>
                      {importPreview.warnings.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[11px]">
                          Catatan: {importPreview.warnings.length}
                        </span>
                      )}
                      {importPreview.errors.length > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[11px]">
                          Tidak Valid: {importPreview.errors.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Warnings list if any */}
                  {importPreview.warnings.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] space-y-1 max-h-24 overflow-y-auto">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                        <span>Penyesuaian Otomatis Sistem:</span>
                      </div>
                      {importPreview.warnings.map((w, i) => (
                        <div key={i}>
                          &bull; Baris {w.row}: {w.warning}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Errors list if any */}
                  {importPreview.errors.length > 0 && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-[11px] space-y-1 max-h-24 overflow-y-auto">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                        <span>Baris yang Dilewati (Format Tidak Sesuai):</span>
                      </div>
                      {importPreview.errors.map((e, i) => (
                        <div key={i}>
                          &bull; Baris {e.row}: {e.error}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Preview Table */}
                  {importPreview.valid.length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-white">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200 z-10">
                          <tr>
                            <th className="p-2.5 w-10 text-center">No</th>
                            <th className="p-2.5">Mapel & Asesmen</th>
                            <th className="p-2.5">Bentuk Soal</th>
                            <th className="p-2.5">Teks Pertanyaan</th>
                            <th className="p-2.5">Opsi / Kunci</th>
                            <th className="p-2.5 w-16 text-center">Bobot</th>
                            <th className="p-2.5 w-12 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {importPreview.valid.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center font-bold text-slate-500">
                                {idx + 1}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-slate-900">{item.subjectName}</div>
                                <div className="text-[10px] text-blue-700 font-medium">{item.assessmentType}</div>
                              </td>
                              <td className="p-2.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    item.type === 'pilihan_ganda'
                                      ? 'bg-blue-100 text-blue-800'
                                      : item.type === 'benar_salah'
                                      ? 'bg-purple-100 text-purple-800'
                                      : item.type === 'uraian'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                >
                                  {item.type === 'pilihan_ganda'
                                    ? 'PG'
                                    : item.type === 'benar_salah'
                                    ? 'B/S'
                                    : item.type === 'uraian'
                                    ? 'Uraian'
                                    : 'PG Kompleks'}
                                </span>
                              </td>
                              <td className="p-2.5 max-w-xs truncate" title={item.questionText}>
                                {item.questionText}
                              </td>
                              <td className="p-2.5">
                                <div className="font-bold text-emerald-700">
                                  Kunci: {item.correctAnswer || '(Rubrik)'}
                                </div>
                                <div className="text-slate-500 text-[10px]">
                                  {item.options.length > 0 ? `${item.options.length} Opsi Pilihan` : 'Teks Uraian'}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-700">
                                {item.weight}
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePreviewItem(idx)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Hapus butir ini dari daftar impor"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      Belum ada butir soal yang berhasil diproses.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-xl font-semibold text-slate-600 hover:bg-slate-200 text-xs transition-colors"
              >
                Tutup / Batal
              </button>

              <button
                type="button"
                disabled={!importPreview || importPreview.valid.length === 0 || isProcessingImport}
                onClick={handleConfirmImport}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
                  importPreview && importPreview.valid.length > 0
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isProcessingImport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyimpan ke Database...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Simpan {importPreview?.valid.length || 0} Soal ke Bank Soal
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
