import React, { useState, useEffect } from 'react';
import {
  Student,
  Subject,
  SchoolClass,
  ExamResult,
  RaporRecapItem,
  AppSettings,
  AssessmentType,
} from '../../types';
import {
  getAllFromStore,
  STORES,
  getByIdFromStore,
  DEFAULT_APP_SETTINGS,
} from '../../db/indexedDB';
import { exportRaporRecapToFile } from '../../utils/exportImport';
import {
  FileSpreadsheet,
  Printer,
  Download,
  Filter,
  Search,
  BookOpen,
  Layers,
  Calculator,
  ArrowLeft,
  ChevronRight,
  GraduationCap,
  School,
  X,
  Award,
  CheckCircle2,
  Clock,
} from 'lucide-react';

interface RaporRecapProps {
  userRole?: 'admin' | 'guru';
  assignedSubjectIds?: string[];
}

const SUMMATIVE_ASSESSMENTS: AssessmentType[] = [
  'Asesmen Sumatif 1',
  'Asesmen Sumatif 2',
  'Asesmen Sumatif 3',
  'Asesmen Sumatif 4',
];

type RaporViewScope = 'all_sumatif' | AssessmentType;

export const RaporRecap: React.FC<RaporRecapProps> = ({
  userRole = 'admin',
  assignedSubjectIds = [],
}) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);

  // -------------------------------------------------------------
  // HIERARCHICAL DRILL-DOWN NAVIGATION STATE
  // Level 1: selectedSubjectForView === null (Pilih Mata Pelajaran)
  // Level 2: selectedSubjectForView !== null && selectedScopeForView === null (Pilih Asesmen / Rekap Rapor)
  // Level 3: selectedSubjectForView !== null && selectedScopeForView !== null (Tabel Rekap Nilai)
  // -------------------------------------------------------------
  const [selectedSubjectForView, setSelectedSubjectForView] = useState<Subject | null>(null);
  const [selectedScopeForView, setSelectedScopeForView] = useState<RaporViewScope | null>(null);

  // Search terms & Filters
  const [subjectSearchTerm, setSubjectSearchTerm] = useState<string>('');
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  // Assessment inclusion toggles for calculating average in 'all_sumatif'
  const [includeSumatif1, setIncludeSumatif1] = useState<boolean>(true);
  const [includeSumatif2, setIncludeSumatif2] = useState<boolean>(true);
  const [includeSumatif3, setIncludeSumatif3] = useState<boolean>(true);
  const [includeSumatif4, setIncludeSumatif4] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stdList, sbjList, clsList, resList, sets] = await Promise.all([
        getAllFromStore<Student>(STORES.STUDENTS),
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<ExamResult>(STORES.EXAM_RESULTS),
        getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default'),
      ]);

      let allowedSubjects = sbjList;
      if (userRole === 'guru' && assignedSubjectIds.length > 0) {
        allowedSubjects = sbjList.filter((s) => assignedSubjectIds.includes(s.id));
      }

      setStudents(stdList);
      setSubjects(allowedSubjects);
      setClasses(clsList);
      setResults(resList);
      if (sets) setAppSettings(sets);

      if (clsList.length > 0 && !selectedClassId) {
        setSelectedClassId(clsList[0].id);
      }

      // If active selected subject was modified
      if (selectedSubjectForView) {
        const stillExists = allowedSubjects.find((s) => s.id === selectedSubjectForView.id);
        if (stillExists) {
          setSelectedSubjectForView(stillExists);
        } else {
          setSelectedSubjectForView(null);
          setSelectedScopeForView(null);
        }
      }
    } catch (err) {
      console.error('Failed to load rapor recap data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find((c) => c.id === selectedClassId) || (classes.length > 0 ? classes[0] : null);

  // Build Rapor Recapitulation Data for Level 3
  const recapData: RaporRecapItem[] = [];

  if (selectedClass && selectedSubjectForView) {
    const classStudents = students.filter(
      (s) => s.classId === selectedClass.id && s.status === 'aktif'
    );

    classStudents.forEach((student) => {
      const studentResults = results.filter(
        (r) =>
          r.studentId === student.id &&
          r.subjectId === selectedSubjectForView.id
      );

      const resS1 = studentResults.find((r) => r.assessmentType === 'Asesmen Sumatif 1');
      const resS2 = studentResults.find((r) => r.assessmentType === 'Asesmen Sumatif 2');
      const resS3 = studentResults.find((r) => r.assessmentType === 'Asesmen Sumatif 3');
      const resS4 = studentResults.find((r) => r.assessmentType === 'Asesmen Sumatif 4');

      const s1 = resS1 ? resS1.finalScore : null;
      const s2 = resS2 ? resS2.finalScore : null;
      const s3 = resS3 ? resS3.finalScore : null;
      const s4 = resS4 ? resS4.finalScore : null;

      // Count assessments with grades that are included in calculation
      const includedScores: number[] = [];
      if (includeSumatif1 && s1 !== null) includedScores.push(s1);
      if (includeSumatif2 && s2 !== null) includedScores.push(s2);
      if (includeSumatif3 && s3 !== null) includedScores.push(s3);
      if (includeSumatif4 && s4 !== null) includedScores.push(s4);

      const averageScore =
        includedScores.length > 0
          ? includedScores.reduce((acc, curr) => acc + curr, 0) / includedScores.length
          : null;

      const completedCount = [s1, s2, s3, s4].filter((s) => s !== null).length;

      recapData.push({
        studentId: student.id,
        studentName: student.name,
        className: selectedClass.name,
        subjectName: selectedSubjectForView.name,
        sumatif1: s1,
        sumatif2: s2,
        sumatif3: s3,
        sumatif4: s4,
        completedCount,
        averageScore,
      });
    });
  }

  // Filtered by Search
  const filteredRecap = recapData.filter((item) =>
    item.studentName.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  // Helper counting
  const getSubjectResultsCount = (subjectId: string): number => {
    return results.filter((r) => r.subjectId === subjectId).length;
  };

  const getSubjectAssessmentResultsCount = (subjectId: string, assessment: AssessmentType): number => {
    return results.filter((r) => r.subjectId === subjectId && r.assessmentType === assessment).length;
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
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
                <School className="w-4 h-4" />
                <span>Legger Rapor SMP Negeri 3 Kertek</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <span>Rekap Nilai Rapor - Pilih Mata Pelajaran</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Pilih mata pelajaran terlebih dahulu untuk melihat legger nilai Asesmen Sumatif 1, 2, 3, dan 4 serta rata-rata rapor
              </p>
            </div>
          </div>

          {/* Search bar for subjects */}
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
              Total: <strong className="text-slate-900">{filteredSubjects.length} Mata Pelajaran</strong>
            </div>
          </div>

          {/* Subjects Grid */}
          {loading ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
              <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs font-semibold">Memuat rekap nilai mata pelajaran...</p>
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
                const as1Count = getSubjectAssessmentResultsCount(sub.id, 'Asesmen Sumatif 1');
                const as2Count = getSubjectAssessmentResultsCount(sub.id, 'Asesmen Sumatif 2');
                const as3Count = getSubjectAssessmentResultsCount(sub.id, 'Asesmen Sumatif 3');
                const as4Count = getSubjectAssessmentResultsCount(sub.id, 'Asesmen Sumatif 4');

                return (
                  <div
                    key={sub.id}
                    onClick={() => {
                      setSelectedSubjectForView(sub);
                      setSelectedScopeForView(null);
                    }}
                    className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between hover:border-indigo-400 hover:shadow-indigo-500/10"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {sub.code}
                        </span>
                        <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {totalR} Nilai Masuk
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {sub.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {sub.teacherName ? `Guru: ${sub.teacherName}` : 'Standar Guru'} &bull; KKM: 75
                      </p>

                      {/* Mini Asesmen Breakdown Pills */}
                      <div className="grid grid-cols-2 gap-1.5 mt-4 pt-3 border-t border-slate-100 text-[11px]">
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 1:</span>
                          <span className={`font-bold ${as1Count > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {as1Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 2:</span>
                          <span className={`font-bold ${as2Count > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {as2Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 3:</span>
                          <span className={`font-bold ${as3Count > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {as3Count} siswa
                          </span>
                        </div>
                        <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-500 font-medium">Asesmen 4:</span>
                          <span className={`font-bold ${as4Count > 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                            {as4Count} siswa
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 pt-3 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                      <span>Buka Rekap Nilai</span>
                      <div className="w-6 h-6 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors">
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
          LEVEL 2: PILIH ASESMEN ATAU REKAP RAPOR GABUNGAN
      ============================================================= */}
      {selectedSubjectForView && !selectedScopeForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Breadcrumb Navigation & Back Button */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedScopeForView(null);
                }}
                className="hover:text-blue-600 flex items-center gap-1.5 transition-colors font-bold text-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-blue-600" />
                <span>Daftar Mata Pelajaran</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                {selectedSubjectForView.name} ({selectedSubjectForView.code})
              </span>
            </div>

            <button
              onClick={() => {
                setSelectedSubjectForView(null);
                setSelectedScopeForView(null);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Ganti Mapel</span>
            </button>
          </div>

          {/* Selected Subject Banner */}
          <div className="bg-gradient-to-r from-indigo-900 to-blue-900 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-800/80 text-indigo-200 text-xs font-bold px-3 py-1 rounded-xl mb-2 border border-indigo-700/50">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                  <span>KODE: {selectedSubjectForView.code}</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">
                  {selectedSubjectForView.name}
                </h2>
                <p className="text-xs text-indigo-100 mt-1 max-w-xl">
                  {selectedSubjectForView.teacherName
                    ? `Guru Pengampu: ${selectedSubjectForView.teacherName}`
                    : 'Pengolahan legger rapor dan rekap nilai per asesmen'}
                </p>
              </div>

              {/* Quick Jump to Full Recap */}
              <button
                onClick={() => setSelectedScopeForView('all_sumatif')}
                className="px-4 py-2 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors self-start md:self-auto"
              >
                <Calculator className="w-4 h-4 text-indigo-600" />
                <span>Buka Legger Rapor Gabungan</span>
              </button>
            </div>
          </div>

          {/* Section: 1 Master Card for Full Rapor + 4 Summative Assessment Cards */}
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Pilih Tampilan Rekap Nilai</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih rekap gabungan seluruh asesmen untuk rapor atau per tahapan asesmen sumatif
              </p>
            </div>

            {/* Master Card: Full Rapor Semester Legger */}
            <div
              onClick={() => setSelectedScopeForView('all_sumatif')}
              className="bg-gradient-to-r from-blue-50 via-indigo-50 to-white rounded-2xl border-2 border-indigo-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 hover:border-indigo-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-indigo-600/20 shrink-0">
                  <Calculator className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-base font-bold text-slate-900">
                      Rekapitulasi Legger Rapor Akhir (Gabungan AS 1, 2, 3, 4)
                    </h4>
                    <span className="text-[10px] bg-indigo-600 text-white font-bold px-2 py-0.5 rounded-full">
                      Direkomendasikan
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    Menampilkan tabel lengkap seluruh siswa per kelas dengan kolom Asesmen 1, 2, 3, 4, serta kolom rata-rata rapor otomatis yang siap dicetak untuk legger rapor semester.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors shrink-0"
              >
                <span>Buka Legger Rapor</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Cards: Specific Summative Assessments */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {SUMMATIVE_ASSESSMENTS.map((asType, idx) => {
                const count = getSubjectAssessmentResultsCount(selectedSubjectForView.id, asType);

                return (
                  <div
                    key={asType}
                    onClick={() => setSelectedScopeForView(asType)}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between hover:border-indigo-400"
                  >
                    <div>
                      {/* Top info */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base bg-indigo-50 text-indigo-700">
                          AS-{idx + 1}
                        </div>
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                            count > 0 ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
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
                          ? `Tersedia ${count} nilai siswa pada asesmen ini.`
                          : 'Belum ada nilai siswa yang masuk pada asesmen ini.'}
                      </p>
                    </div>

                    {/* Bottom Action Button */}
                    <div className="pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScopeForView(asType);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700"
                      >
                        <span>Buka Nilai Asesmen {idx + 1}</span>
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
          LEVEL 3: TAMPILAN TABEL REKAPITULASI NILAI SPESIFIK
      ============================================================= */}
      {selectedSubjectForView && selectedScopeForView && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Breadcrumbs & Navigation Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedScopeForView(null);
                }}
                className="hover:text-blue-600 flex items-center gap-1 transition-colors"
              >
                <School className="w-3.5 h-3.5 text-blue-600" />
                <span>Semua Mapel</span>
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <button
                onClick={() => setSelectedScopeForView(null)}
                className="hover:text-blue-600 transition-colors font-semibold text-slate-700"
              >
                {selectedSubjectForView.name}
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-indigo-700 font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                {selectedScopeForView === 'all_sumatif'
                  ? 'Legger Rapor Gabungan (AS 1-4)'
                  : selectedScopeForView}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedScopeForView(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Pilih Tampilan Lain</span>
              </button>
              <button
                onClick={() => {
                  setSelectedSubjectForView(null);
                  setSelectedScopeForView(null);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors border border-slate-300"
              >
                <span>Ganti Mapel</span>
              </button>
            </div>
          </div>

          {/* Quick Tabs to toggle between Full Legger and Individual Assessments */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2 overflow-x-auto print:hidden">
            <button
              onClick={() => setSelectedScopeForView('all_sumatif')}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                selectedScopeForView === 'all_sumatif'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Calculator className="w-4 h-4" />
              <span>Legger Rapor Akhir (AS 1 - 4)</span>
            </button>

            {SUMMATIVE_ASSESSMENTS.map((asType) => {
              const count = getSubjectAssessmentResultsCount(selectedSubjectForView.id, asType);
              const isActive = selectedScopeForView === asType;

              return (
                <button
                  key={asType}
                  onClick={() => setSelectedScopeForView(asType)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all flex items-center gap-2 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{asType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {count} Siswa
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action Header for this Assessment View */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <span>{selectedSubjectForView.code} &bull; {selectedSubjectForView.name}</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                <span>
                  {selectedScopeForView === 'all_sumatif'
                    ? 'Rekap Nilai Rata-Rata Rapor Asesmen Sumatif'
                    : `Rekapitulasi Nilai ${selectedScopeForView}`}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedScopeForView === 'all_sumatif'
                  ? 'Penghitungan rata-rata nilai Asesmen Sumatif 1, 2, 3, dan 4 untuk legger rapor SMP Negeri 3 Kertek'
                  : `Daftar nilai seluruh siswa pada tahapan ${selectedScopeForView}`}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => exportRaporRecapToFile(filteredRecap, 'xlsx')}
                disabled={filteredRecap.length === 0}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 disabled:opacity-50"
              >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>Ekspor Excel</span>
              </button>
              <button
                onClick={() => window.print()}
                disabled={filteredRecap.length === 0}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Rekap Legger</span>
              </button>
            </div>
          </div>

          {/* Class & Student Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 max-w-lg">
              {/* Class Select */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Pilih Rombongan Belajar (Kelas):
                </label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      Kelas {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Search */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Cari Nama Siswa:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ketik nama siswa..."
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium self-end sm:self-auto">
              Total Siswa: <strong className="text-slate-900">{filteredRecap.length} Orang</strong>
            </div>
          </div>

          {/* If viewing 'all_sumatif', show formula calculation options */}
          {selectedScopeForView === 'all_sumatif' && (
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs print:hidden">
              <div>
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-indigo-600" />
                  Formula Penghitungan Rata-rata Rapor:
                </span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Rata-rata = <code>Total Nilai Asesmen Terpilih / Jumlah Asesmen yang Dikerjakan Siswa</code>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 font-semibold text-slate-700">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSumatif1}
                    onChange={(e) => setIncludeSumatif1(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sumatif 1</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSumatif2}
                    onChange={(e) => setIncludeSumatif2(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sumatif 2</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSumatif3}
                    onChange={(e) => setIncludeSumatif3(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sumatif 3</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeSumatif4}
                    onChange={(e) => setIncludeSumatif4(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Sumatif 4</span>
                </label>
              </div>
            </div>
          )}

          {/* Printable Paper View Header & Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 overflow-hidden">
            {/* Print Title Block */}
            <div className="text-center pb-5 mb-5 border-b-2 border-slate-900">
              <h2 className="text-lg font-black uppercase tracking-tight text-slate-900">
                {appSettings.schoolName}
              </h2>
              <h3 className="text-sm font-bold uppercase text-slate-800">
                {selectedScopeForView === 'all_sumatif'
                  ? 'REKAPITULASI NILAI ASESMEN SUMATIF (LEGGER RAPOR)'
                  : `DAFTAR NILAI ${selectedScopeForView.toUpperCase()}`}
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Mata Pelajaran: <strong>{selectedSubjectForView?.name}</strong> &bull; Kelas: <strong>{selectedClass?.name}</strong> &bull; Tahun Pelajaran: {appSettings.academicYear} ({appSettings.semester})
              </p>
            </div>

            {/* Recap Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="bg-slate-100 text-slate-800 text-[11px] font-bold uppercase tracking-wider text-center border-b border-slate-300">
                    <th className="py-2.5 px-3 border border-slate-300 w-12">No</th>
                    <th className="py-2.5 px-4 border border-slate-300 text-left">Nama Siswa</th>
                    <th className="py-2.5 px-3 border border-slate-300 w-20">Kelas</th>

                    {selectedScopeForView === 'all_sumatif' ? (
                      <>
                        <th className="py-2.5 px-3 border border-slate-300 w-28">Asesmen 1</th>
                        <th className="py-2.5 px-3 border border-slate-300 w-28">Asesmen 2</th>
                        <th className="py-2.5 px-3 border border-slate-300 w-28">Asesmen 3</th>
                        <th className="py-2.5 px-3 border border-slate-300 w-28">Asesmen 4</th>
                        <th className="py-2.5 px-3 border border-slate-300 w-28 bg-indigo-50 text-indigo-900 font-extrabold">
                          Rata-Rata Rapor
                        </th>
                        <th className="py-2.5 px-3 border border-slate-300 w-24">Predikat</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-3 border border-slate-300 w-32">Nilai {selectedScopeForView}</th>
                        <th className="py-2.5 px-3 border border-slate-300 w-32">Status KKM (75)</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-800">
                  {loading ? (
                    <tr>
                      <td colSpan={selectedScopeForView === 'all_sumatif' ? 9 : 5} className="py-8 text-center text-slate-400">
                        Memuat rekapitulasi nilai...
                      </td>
                    </tr>
                  ) : filteredRecap.length === 0 ? (
                    <tr>
                      <td colSpan={selectedScopeForView === 'all_sumatif' ? 9 : 5} className="py-8 text-center text-slate-400">
                        Belum ada data siswa di kelas {selectedClass?.name}.
                      </td>
                    </tr>
                  ) : (
                    filteredRecap.map((item, idx) => {
                      if (selectedScopeForView === 'all_sumatif') {
                        const predikat =
                          item.averageScore !== null
                            ? item.averageScore >= 90
                              ? 'A'
                              : item.averageScore >= 80
                              ? 'B'
                              : item.averageScore >= 75
                              ? 'C'
                              : 'D (Remedial)'
                            : '-';

                        return (
                          <tr key={item.studentId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 border border-slate-300 font-semibold text-slate-900">
                              {item.studentName}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-medium">
                              {item.className}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {item.sumatif1 !== null ? (
                                <span className="font-bold text-slate-900">{item.sumatif1}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {item.sumatif2 !== null ? (
                                <span className="font-bold text-slate-900">{item.sumatif2}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {item.sumatif3 !== null ? (
                                <span className="font-bold text-slate-900">{item.sumatif3}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {item.sumatif4 !== null ? (
                                <span className="font-bold text-slate-900">{item.sumatif4}</span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 bg-indigo-50/50 font-mono font-black text-indigo-900 text-sm">
                              {item.averageScore !== null ? item.averageScore.toFixed(1) : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-bold">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] ${
                                  predikat === 'A'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : predikat === 'B'
                                    ? 'bg-blue-100 text-blue-800'
                                    : predikat === 'C'
                                    ? 'bg-amber-100 text-amber-800'
                                    : predikat === '-'
                                    ? 'text-slate-400'
                                    : 'bg-rose-100 text-rose-800'
                                }`}
                              >
                                {predikat}
                              </span>
                            </td>
                          </tr>
                        );
                      } else {
                        // Single Assessment view
                        const score =
                          selectedScopeForView === 'Asesmen Sumatif 1'
                            ? item.sumatif1
                            : selectedScopeForView === 'Asesmen Sumatif 2'
                            ? item.sumatif2
                            : selectedScopeForView === 'Asesmen Sumatif 3'
                            ? item.sumatif3
                            : item.sumatif4;

                        const isTuntas = score !== null && score >= 75;

                        return (
                          <tr key={item.studentId} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono">
                              {idx + 1}
                            </td>
                            <td className="py-2.5 px-4 border border-slate-300 font-semibold text-slate-900">
                              {item.studentName}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-medium">
                              {item.className}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-mono font-black text-sm">
                              {score !== null ? (
                                <span className={score >= 75 ? 'text-emerald-700' : 'text-rose-700'}>
                                  {score}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-xs font-normal">Belum Mengerjakan</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center border border-slate-300 font-bold">
                              {score !== null ? (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] ${
                                    isTuntas
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {isTuntas ? 'Tuntas' : 'Perlu Remedial'}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      }
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Signature Block for Print */}
            <div className="hidden print:grid grid-cols-2 gap-8 mt-12 text-center text-xs">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala Sekolah SMP Negeri 3 Kertek</p>
                <div className="h-16" />
                <p className="font-bold underline">H. Suharsono, M.Pd.</p>
                <p className="text-slate-500">NIP. 19680512 199403 1 008</p>
              </div>

              <div>
                <p>Kertek, Wonosobo, {new Date().toLocaleDateString('id-ID')}</p>
                <p className="font-bold">Guru Mata Pelajaran</p>
                <div className="h-16" />
                <p className="font-bold underline">{selectedSubjectForView?.teacherName || 'Guru Pengampu'}</p>
                <p className="text-slate-500">NIP. -</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
