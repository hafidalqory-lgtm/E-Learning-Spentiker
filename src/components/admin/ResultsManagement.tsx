import React, { useState, useEffect } from 'react';
import { ExamResult, SchoolClass, Subject, AssessmentType } from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import { exportExamResultsToFile } from '../../utils/exportImport';
import {
  Award,
  Search,
  Filter,
  Download,
  Printer,
  Eye,
  Trash2,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  BookOpen,
  Edit3,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  School,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface ResultsManagementProps {
  userRole?: 'admin' | 'guru';
  assignedSubjectIds?: string[];
}

const SUMMATIVE_ASSESSMENTS: AssessmentType[] = [
  'Asesmen Sumatif 1',
  'Asesmen Sumatif 2',
  'Asesmen Sumatif 3',
  'Asesmen Sumatif 4',
];

export const ResultsManagement: React.FC<ResultsManagementProps> = ({
  userRole = 'admin',
  assignedSubjectIds = [],
}) => {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // HIERARCHICAL DRILL-DOWN NAVIGATION STATE
  // Level 1: selectedSubjectForView === null (Pilih Mata Pelajaran)
  // Level 2: selectedSubjectForView !== null && selectedAssessmentForView === null (Pilih Asesmen)
  // Level 3: selectedSubjectForView !== null && selectedAssessmentForView !== null (Hasil Ujian Asesmen Terpilih)
  // -------------------------------------------------------------
  const [selectedSubjectForView, setSelectedSubjectForView] = useState<Subject | null>(null);
  const [selectedAssessmentForView, setSelectedAssessmentForView] = useState<AssessmentType | null>(null);

  // Search terms & Filters
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [filterClass, setFilterClass] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'score'>('date');

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Detail & Grading Modal
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [essayScores, setEssayScores] = useState<Record<string, number>>({});
  const [essayNotes, setEssayNotes] = useState<Record<string, string>>({});
  const [isSavingGrading, setIsSavingGrading] = useState<boolean>(false);

  // Delete modals
  const [resultToDelete, setResultToDelete] = useState<ExamResult | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resList, clsList, sbjList] = await Promise.all([
        getAllFromStore<ExamResult>(STORES.EXAM_RESULTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<Subject>(STORES.SUBJECTS),
      ]);

      let allowedResults = resList;
      let allowedSubjects = sbjList;
      if (userRole === 'guru' && assignedSubjectIds.length > 0) {
        allowedResults = resList.filter((r) => assignedSubjectIds.includes(r.subjectId));
        allowedSubjects = sbjList.filter((s) => assignedSubjectIds.includes(s.id));
      }

      setResults(allowedResults);
      setClasses(clsList);
      setSubjects(allowedSubjects);
      setSelectedIds([]);

      // Update selected subject reference if modified
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
      console.error('Failed to load exam results:', err);
    } finally {
      setLoading(false);
    }
  };

  // Counting Helpers
  const getSubjectResultsCount = (subjectId: string): number => {
    return results.filter((r) => r.subjectId === subjectId).length;
  };

  const getSubjectAssessmentResults = (subjectId: string, assessment: AssessmentType): ExamResult[] => {
    return results.filter((r) => r.subjectId === subjectId && r.assessmentType === assessment);
  };

  const getSubjectAverageScore = (subjectId: string): string => {
    const subRes = results.filter((r) => r.subjectId === subjectId);
    if (subRes.length === 0) return '-';
    const sum = subRes.reduce((acc, curr) => acc + curr.finalScore, 0);
    return (sum / subRes.length).toFixed(1);
  };

  const handleOpenDetail = (res: ExamResult) => {
    setSelectedResult(res);
    const initialScores: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};

    res.answersSummary.forEach((ans) => {
      if (ans.questionType === 'uraian') {
        initialScores[ans.questionId] = ans.scoreEarned || 0;
        initialNotes[ans.questionId] = ans.essayNote || '';
      }
    });

    setEssayScores(initialScores);
    setEssayNotes(initialNotes);
  };

  const handleSaveEssayGrading = async () => {
    if (!selectedResult) return;
    setIsSavingGrading(true);

    try {
      let updatedTotalEarned = 0;
      let updatedEssayEarned = 0;
      let gradedEssaysCount = 0;

      const updatedAnswersSummary = selectedResult.answersSummary.map((ans) => {
        if (ans.questionType === 'uraian') {
          const score = Number(essayScores[ans.questionId]) || 0;
          const note = essayNotes[ans.questionId] || '';
          updatedEssayEarned += score;
          updatedTotalEarned += score;
          gradedEssaysCount++;
          return {
            ...ans,
            scoreEarned: score,
            essayNote: note,
            isCorrect: score > 0,
          };
        } else {
          updatedTotalEarned += ans.scoreEarned;
          return ans;
        }
      });

      const maxScore = selectedResult.maxPossibleScore || 100;
      const finalScore = Math.min(100, Math.round((updatedTotalEarned / maxScore) * 100));

      const updatedResult: ExamResult = {
        ...selectedResult,
        essayScore: updatedEssayEarned,
        essayGradedCount: gradedEssaysCount,
        finalScore,
        isFullyGraded: true,
        answersSummary: updatedAnswersSummary,
      };

      await putToStore(STORES.EXAM_RESULTS, updatedResult);
      await logActivity(
        'Guru/Admin',
        'guru',
        'Penilaian Uraian',
        `Memperbarui nilai uraian untuk siswa ${selectedResult.studentName} (${selectedResult.subjectName}) menjadi ${finalScore}`
      );

      setSelectedResult(updatedResult);
      await loadData();
      alert('Nilai uraian berhasil disimpan dan nilai akhir siswa telah dihitung ulang!');
    } catch (err: any) {
      alert(`Gagal menyimpan nilai: ${err.message}`);
    } finally {
      setIsSavingGrading(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!resultToDelete) return;
    try {
      await deleteFromStore(STORES.EXAM_RESULTS, resultToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Hasil Ujian', `Menghapus hasil ujian siswa ${resultToDelete.studentName}`);
      setResultToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus hasil: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.EXAM_RESULTS, selectedIds);
      await logActivity(
        'Admin',
        'admin',
        'Hapus Masal Hasil Ujian',
        `Menghapus ${selectedIds.length} rekaman hasil ujian sekaligus.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus hasil terpilih: ${err.message}`);
    }
  };

  // Filtered in Level 3
  const currentAssessmentResults = results
    .filter((r) => {
      if (!selectedSubjectForView || !selectedAssessmentForView) return false;
      if (r.subjectId !== selectedSubjectForView.id) return false;
      if (r.assessmentType !== selectedAssessmentForView) return false;

      if (filterClass && r.className !== filterClass) return false;
      if (studentSearchTerm.trim()) {
        const term = studentSearchTerm.toLowerCase();
        if (!r.studentName.toLowerCase().includes(term)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.studentName.localeCompare(b.studentName);
      if (sortBy === 'score') return b.finalScore - a.finalScore;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  const isAllSelected =
    currentAssessmentResults.length > 0 && selectedIds.length === currentAssessmentResults.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < currentAssessmentResults.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(currentAssessmentResults.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Summary Metrics for Level 3
  const totalCount = currentAssessmentResults.length;
  const averageScore =
    totalCount > 0
      ? (currentAssessmentResults.reduce((acc, curr) => acc + curr.finalScore, 0) / totalCount).toFixed(1)
      : '0.0';
  const highestScore =
    totalCount > 0 ? Math.max(...currentAssessmentResults.map((r) => r.finalScore)) : 0;
  const lowestScore =
    totalCount > 0 ? Math.min(...currentAssessmentResults.map((r) => r.finalScore)) : 0;

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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <School className="w-4 h-4" />
                <span>Pengolahan Nilai SMP Negeri 3 Kertek</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>Hasil Jawaban Siswa - Pilih Mata Pelajaran</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pilih mata pelajaran terlebih dahulu untuk melihat hasil jawaban ujian pada Asesmen Sumatif 1, 2, 3, dan 4
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportExamResultsToFile(results, 'xlsx')}
                disabled={results.length === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Semua Hasil</span>
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden">
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
              Total: <strong className="text-slate-900">{filteredSubjects.length} Mata Pelajaran</strong> &bull; Total Pengumpulan: <strong className="text-blue-600">{results.length} Siswa</strong>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Memuat data hasil ujian...</p>
            </div>
          ) : filteredSubjects.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-700">Mata Pelajaran Tidak Ditemukan</h3>
              <p className="text-xs text-slate-500 mt-1">
                {subjectSearchTerm
                  ? 'Tidak ada mata pelajaran yang cocok dengan kata kunci.'
                  : 'Belum ada mata pelajaran terdaftar.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((sub) => {
                const totalR = getSubjectResultsCount(sub.id);
                const as1Count = getSubjectAssessmentResults(sub.id, 'Asesmen Sumatif 1').length;
                const as2Count = getSubjectAssessmentResults(sub.id, 'Asesmen Sumatif 2').length;
                const as3Count = getSubjectAssessmentResults(sub.id, 'Asesmen Sumatif 3').length;
                const as4Count = getSubjectAssessmentResults(sub.id, 'Asesmen Sumatif 4').length;
                const avgScore = getSubjectAverageScore(sub.id);

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
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {totalR} Jawaban Masuk
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        Rata-Rata Nilai: <strong className="text-blue-600">{avgScore}</strong> &bull; {sub.teacherName ? `Guru: ${sub.teacherName}` : 'Standar Guru'}
                      </p>

                      {/* Mini Asesmen Breakdown Pills */}
                      <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 1:</span>
                          <span className={`font-bold ${as1Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as1Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 2:</span>
                          <span className={`font-bold ${as2Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as2Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 3:</span>
                          <span className={`font-bold ${as3Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as3Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 4:</span>
                          <span className={`font-bold ${as4Count > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                            {as4Count} siswa
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-blue-600 group-hover:text-blue-700">
                      <span>Buka Hasil Asesmen</span>
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
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
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
                    : 'Pengolahan dan rekap hasil jawaban ujian'}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs text-blue-200">Total Pengumpulan</span>
                <div className="text-2xl font-black text-white">
                  {getSubjectResultsCount(selectedSubjectForView.id)} Siswa
                </div>
              </div>
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
                  Klik pada tahapan asesmen di bawah untuk melihat nilai dan jawaban siswa
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {SUMMATIVE_ASSESSMENTS.map((asType, idx) => {
                const subRes = getSubjectAssessmentResults(selectedSubjectForView.id, asType);
                const count = subRes.length;
                const avg =
                  count > 0 ? (subRes.reduce((acc, c) => acc + c.finalScore, 0) / count).toFixed(1) : '-';

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
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            count > 0 ? theme.badge : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {count} Siswa
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-slate-900 mb-1">
                        {asType}
                      </h4>
                      <p className="text-xs text-slate-500 mb-4">
                        {count > 0
                          ? `Rata-rata Nilai: ${avg}. Tersedia ${count} lembar jawaban siswa.`
                          : 'Belum ada siswa yang mengumpulkan ujian pada asesmen ini.'}
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
                        <span>Buka Hasil Asesmen {theme.num}</span>
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
          LEVEL 3: DAFTAR HASIL JAWABAN ASESMEN SPESIFIK
      ============================================================= */}
      {selectedSubjectForView && selectedAssessmentForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Breadcrumbs & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
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
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto print:hidden">
            {SUMMATIVE_ASSESSMENTS.map((asType) => {
              const count = getSubjectAssessmentResults(selectedSubjectForView.id, asType).length;
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
                    {count} Siswa
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Header for this Assessment */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <span>{selectedSubjectForView.code} &bull; {selectedSubjectForView.name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-blue-600" />
                <span>Hasil Jawaban {selectedAssessmentForView}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Koreksi jawaban uraian manual, cetak lembar nilai, dan ekspor data siswa
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Hapus {selectedIds.length} Hasil Terpilih</span>
                </button>
              )}

              <button
                onClick={() => exportExamResultsToFile(currentAssessmentResults, 'xlsx')}
                disabled={currentAssessmentResults.length === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Unduh Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                disabled={currentAssessmentResults.length === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 disabled:opacity-50"
              >
                <Printer className="w-4 h-4 text-slate-600" />
                <span>Cetak Hasil</span>
              </button>
            </div>
          </div>

          {/* Metric Cards for Level 3 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:grid-cols-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Total Siswa
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">{totalCount} Siswa</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Rata-rata Nilai
              </span>
              <div className="text-2xl font-black text-blue-600 mt-1">{averageScore}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Nilai Tertinggi
              </span>
              <div className="text-2xl font-black text-emerald-600 mt-1">{highestScore}</div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
                Nilai Terendah
              </span>
              <div className="text-2xl font-black text-amber-600 mt-1">{lowestScore}</div>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN siswa..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

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

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
              >
                <option value="date">Waktu Pengumpulan</option>
                <option value="name">Nama Siswa (A-Z)</option>
                <option value="score">Nilai Tertinggi</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-medium self-end sm:self-auto shrink-0">
              {selectedIds.length > 0 && (
                <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {selectedIds.length} dipilih
                </span>
              )}
              <span>
                Total: <strong className="text-slate-900">{currentAssessmentResults.length} Hasil</strong>
              </span>
            </div>
          </div>

          {/* Results Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-3 w-10 text-center print:hidden">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="p-1 hover:text-blue-600 transition-colors"
                        title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua hasil'}
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
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4 text-center">Benar / Soal</th>
                    <th className="py-3 px-4 text-center">Nilai Akhir</th>
                    <th className="py-3 px-4 text-center">Status Koreksi</th>
                    <th className="py-3 px-4 text-center w-36 print:hidden">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Memuat data hasil ujian...
                      </td>
                    </tr>
                  ) : currentAssessmentResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center">
                        <div className="max-w-md mx-auto space-y-2">
                          <Award className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="text-sm font-bold text-slate-800">
                            Belum Ada Jawaban pada {selectedAssessmentForView}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Hasil ujian siswa pada mata pelajaran {selectedSubjectForView.name} akan otomatis muncul di sini setelah siswa menyelesaikan ujian.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    currentAssessmentResults.map((r, idx) => {
                      const isChecked = selectedIds.includes(r.id);
                      return (
                        <tr
                          key={r.id}
                          className={`hover:bg-blue-50/40 transition-colors ${
                            isChecked ? 'bg-blue-50/60' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center print:hidden">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleSelectOne(r.id)}
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-900">{r.studentName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">ID: {r.studentId}</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="bg-slate-100 text-slate-800 text-[11px] font-bold px-2 py-0.5 rounded border border-slate-200">
                              {r.className}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-semibold">
                            {r.multipleChoiceCorrect} / {r.multipleChoiceTotal}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                                r.finalScore >= 75
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {r.finalScore}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {r.essayTotal > 0 ? (
                              r.isFullyGraded ? (
                                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200 flex items-center justify-center gap-1 mx-auto max-w-[120px]">
                                  <CheckCircle className="w-3 h-3 text-emerald-600" />
                                  Sudah Dinilai
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full border border-amber-200 flex items-center justify-center gap-1 mx-auto max-w-[120px]">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Perlu Koreksi
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                                Otomatis (PG)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center print:hidden">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleOpenDetail(r)}
                                className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs flex items-center gap-1 transition-colors border border-blue-200"
                                title="Lihat detail jawaban atau koreksi uraian"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Detail</span>
                              </button>
                              <button
                                onClick={() => setResultToDelete(r)}
                                className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                                title="Hapus Hasil Ujian Siswa Ini"
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

      {/* Modal Detail / Grading */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Lembar Jawaban & Koreksi Siswa
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedResult.studentName} ({selectedResult.className}) &bull;{' '}
                  {selectedResult.subjectName} ({selectedResult.assessmentType})
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Score Summary Box */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Nilai Akhir</span>
                <div className="text-2xl font-black text-blue-600">{selectedResult.finalScore}</div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Jawaban Benar</span>
                <div className="text-2xl font-black text-emerald-600">
                  {selectedResult.multipleChoiceCorrect} / {selectedResult.multipleChoiceTotal}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Poin Uraian</span>
                <div className="text-2xl font-black text-amber-600">
                  {selectedResult.essayScore || 0}
                </div>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">Durasi Pengerjaan</span>
                <div className="text-2xl font-black text-slate-700">
                  {selectedResult.durationSpentMinutes} m
                </div>
              </div>
            </div>

            {/* Question Breakdown List */}
            <div className="space-y-4">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                Rincian Butir Soal & Jawaban Siswa
              </h4>

              {selectedResult.answersSummary.map((ans, idx) => (
                <div
                  key={ans.questionId}
                  className={`p-4 rounded-xl border transition-all ${
                    ans.questionType === 'uraian'
                      ? 'bg-amber-50/40 border-amber-200'
                      : ans.isCorrect
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : 'bg-rose-50/40 border-rose-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-xs text-slate-700">
                      Soal No. {idx + 1} ({ans.questionType.replace('_', ' ').toUpperCase()})
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        ans.questionType === 'uraian'
                          ? 'bg-amber-100 text-amber-900'
                          : ans.isCorrect
                          ? 'bg-emerald-100 text-emerald-900'
                          : 'bg-rose-100 text-rose-900'
                      }`}
                    >
                      {ans.questionType === 'uraian'
                        ? `Skor: ${essayScores[ans.questionId] ?? ans.scoreEarned} / ${ans.weight}`
                        : ans.isCorrect
                        ? `Benar (+${ans.scoreEarned})`
                        : 'Salah (0)'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 mt-2 font-medium leading-relaxed">
                    {ans.questionText}
                  </p>

                  {/* Student Answer vs Key */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Jawaban Siswa:
                      </span>
                      <p className="font-semibold text-slate-900">
                        {ans.studentAnswer || <em className="text-slate-400">Tidak dijawab</em>}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-400 block mb-1">
                        Kunci Jawaban / Pedoman:
                      </span>
                      <p className="font-semibold text-emerald-800">{ans.correctAnswer}</p>
                    </div>
                  </div>

                  {/* Essay Grading Input */}
                  {ans.questionType === 'uraian' && (
                    <div className="mt-3 pt-3 border-t border-amber-200/60 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Beri Skor Uraian (Maks {ans.weight}):
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={ans.weight}
                          value={essayScores[ans.questionId] ?? 0}
                          onChange={(e) =>
                            setEssayScores({
                              ...essayScores,
                              [ans.questionId]: Math.min(
                                ans.weight,
                                Math.max(0, Number(e.target.value))
                              ),
                            })
                          }
                          className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-white font-bold font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">
                          Catatan / Umpan Balik Guru:
                        </label>
                        <input
                          type="text"
                          placeholder="Tuliskan catatan koreksi..."
                          value={essayNotes[ans.questionId] || ''}
                          onChange={(e) =>
                            setEssayNotes({
                              ...essayNotes,
                              [ans.questionId]: e.target.value,
                            })
                          }
                          className="w-full p-2 text-xs border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={() => setSelectedResult(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl"
              >
                Tutup
              </button>

              {selectedResult.essayTotal > 0 && (
                <button
                  onClick={handleSaveEssayGrading}
                  disabled={isSavingGrading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>
                    {isSavingGrading ? 'Menyimpan Nilai...' : 'Simpan & Hitung Ulang Nilai Rapor'}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Single */}
      {resultToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Hasil Ujian Siswa Ini?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Hasil ujian siswa <strong>{resultToDelete.studentName}</strong> pada mata pelajaran {resultToDelete.subjectName} ({resultToDelete.assessmentType}) akan dihapus secara permanen.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setResultToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteResult}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Hasil Ujian
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
              Hapus {selectedIds.length} Hasil Ujian Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} rekaman hasil ujian</strong> untuk dihapus permanen. Tindakan ini tidak dapat dibatalkan.
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
