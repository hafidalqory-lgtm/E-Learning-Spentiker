import React from 'react';
import { ExamResult } from '../../types';
import { SchoolLogo } from '../common/SchoolLogo';
import {
  CheckCircle2,
  Award,
  Clock,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

interface ExamCompletedProps {
  result: ExamResult;
  onReturnToPortal: () => void;
}

export const ExamCompleted: React.FC<ExamCompletedProps> = ({
  result,
  onReturnToPortal,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-6">
      <header className="flex justify-between items-center max-w-3xl mx-auto w-full py-4 border-b border-blue-900/60">
        <SchoolLogo size="md" showText={true} />
        <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-3 py-1 rounded-full font-semibold">
          Ujian Sukses Dikumpulkan
        </span>
      </header>

      <main className="flex-1 flex items-center justify-center my-6">
        <div className="max-w-xl w-full bg-slate-900/90 border border-blue-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur text-center relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Success Badge */}
          <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-400/40 rounded-2xl flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-lg shadow-emerald-500/10">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Asesmen Berhasil Dikumpulkan!
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1.5">
            Terima kasih, <strong>{result.studentName}</strong> ({result.className}). Seluruh jawaban Anda telah tersimpan dengan aman di database lokal ANBK sekolah.
          </p>

          {/* Exam Summary Box */}
          <div className="mt-6 bg-slate-950/60 border border-blue-900/50 rounded-2xl p-5 text-left text-xs space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <span className="text-slate-400 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Mata Pelajaran & Asesmen
              </span>
              <strong className="text-white font-semibold">
                {result.subjectName} — {result.assessmentType}
              </strong>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-blue-400" />
                Waktu Pengerjaan
              </span>
              <span className="text-white">{result.durationSpentMinutes} Menit</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Total Butir Soal</span>
              <span className="text-white">{result.totalQuestions} Soal</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-400">Benar Soal Pilihan Ganda</span>
              <span className="text-emerald-400 font-semibold">
                {result.multipleChoiceCorrect} dari {result.multipleChoiceTotal} Soal
              </span>
            </div>

            {/* Score Result Card */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between bg-blue-950/40 p-3 rounded-xl border border-blue-800/40">
              <div className="text-left">
                <span className="text-[11px] uppercase tracking-wider text-blue-300 font-bold block">
                  {result.isFullyGraded ? 'Nilai Akhir Ujian' : 'Skor Sementara (Objektif)'}
                </span>
                <span className="text-[10px] text-slate-400">
                  {result.isFullyGraded
                    ? 'Nilai telah final'
                    : `Menunggu penilaian ${result.essayTotal} soal uraian oleh guru`}
                </span>
              </div>
              <div className="text-3xl font-extrabold text-white font-mono">
                {result.finalScore}
                <span className="text-xs text-blue-300 font-normal"> / 100</span>
              </div>
            </div>
          </div>

          {result.violationCount > 0 && (
            <div className="mt-4 p-3 bg-amber-950/40 border border-amber-600/30 rounded-xl text-amber-300 text-xs flex items-center gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Catatan Pengawasan: Terdapat {result.violationCount} catatan aktivitas keluar layar penuh atau tab switch selama ujian.
              </span>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={onReturnToPortal}
              className="w-full py-3 px-6 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
            >
              <span>Kembali ke Halaman Utama</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-2">
        SMP NEGERI 3 KERTEK &bull; Asesmen Berbasis Komputer Lokal
      </footer>
    </div>
  );
};
