import React, { useState, useEffect } from 'react';
import {
  SchoolClass,
  Student,
  Teacher,
  Subject,
  ExamSetting,
  ExamResult,
  ActivityLog,
} from '../../types';
import { getAllFromStore, STORES } from '../../db/indexedDB';
import {
  Layers,
  GraduationCap,
  Users,
  BookOpen,
  Clock,
  CheckCircle,
  FileText,
  Activity,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import { AdminMenuKey } from '../common/Sidebar';

interface AdminDashboardProps {
  onNavigate: (menu: AdminMenuKey) => void;
  userRole: 'admin' | 'guru';
  userName: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigate,
  userRole,
  userName,
}) => {
  const [stats, setStats] = useState({
    classes: 0,
    students: 0,
    teachers: 0,
    subjects: 0,
    activeExams: 0,
    completedExams: 0,
    totalResults: 0,
  });

  const [recentLogs, setRecentLogs] = useState<ActivityLog[]>([]);
  const [recentResults, setRecentResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [cls, std, tch, sbj, exm, res, logs] = await Promise.all([
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<Student>(STORES.STUDENTS),
        getAllFromStore<Teacher>(STORES.TEACHERS),
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<ExamSetting>(STORES.EXAM_SETTINGS),
        getAllFromStore<ExamResult>(STORES.EXAM_RESULTS),
        getAllFromStore<ActivityLog>(STORES.ACTIVITY_LOGS),
      ]);

      const activeExams = exm.filter((e) => e.status === 'aktif').length;
      const completedExams = exm.filter((e) => e.status === 'selesai').length;

      setStats({
        classes: cls.length,
        students: std.length,
        teachers: tch.length,
        subjects: sbj.length,
        activeExams,
        completedExams,
        totalResults: res.length,
      });

      // Sort logs descending
      const sortedLogs = [...logs].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setRecentLogs(sortedLogs.slice(0, 7));

      // Sort results descending
      const sortedRes = [...res].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );
      setRecentResults(sortedRes.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard statistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { title: 'Jumlah Kelas', count: stats.classes, icon: Layers, color: 'from-blue-600 to-blue-700', link: 'classes' as AdminMenuKey, roles: ['admin'] },
    { title: 'Jumlah Siswa', count: stats.students, icon: GraduationCap, color: 'from-indigo-600 to-indigo-700', link: 'students' as AdminMenuKey, roles: ['admin', 'guru'] },
    { title: 'Jumlah Guru', count: stats.teachers, icon: Users, color: 'from-violet-600 to-violet-700', link: 'teachers' as AdminMenuKey, roles: ['admin'] },
    { title: 'Mata Pelajaran', count: stats.subjects, icon: BookOpen, color: 'from-cyan-600 to-cyan-700', link: 'subjects' as AdminMenuKey, roles: ['admin', 'guru'] },
    { title: 'Ujian Aktif', count: stats.activeExams, icon: Clock, color: 'from-amber-500 to-amber-600', link: 'exams' as AdminMenuKey, roles: ['admin', 'guru'] },
    { title: 'Hasil Jawaban Masuk', count: stats.totalResults, icon: CheckCircle, color: 'from-emerald-600 to-emerald-700', link: 'results' as AdminMenuKey, roles: ['admin', 'guru'] },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-blue-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 bg-blue-500/20 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-400/30 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Sistem E-Ujian ANBK Aktif & Terpantau
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Selamat Datang, {userName}!
          </h2>
          <p className="text-xs sm:text-sm text-blue-200/80 mt-1 max-w-2xl">
            Sistem Asesmen Sumatif 1, 2, 3, dan 4 SMP Negeri 3 Kertek berjalan dengan penyimpanan lokal IndexedDB yang aman dan terisolasi.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate('exams')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md transition-all"
          >
            Jadwal Ujian
          </button>
          <button
            onClick={() => onNavigate('results')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition-all"
          >
            Lihat Hasil
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {statCards
          .filter((card) => card.roles.includes(userRole))
          .map((card, idx) => {
            const Icon = card.icon;
            return (
              <div
                key={idx}
                onClick={() => onNavigate(card.link)}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-400 transition-all cursor-pointer flex flex-col justify-between group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${card.color} text-white flex items-center justify-center shadow-sm`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
                </div>
                <div className="mt-4">
                  <span className="text-xs font-semibold text-slate-500 block truncate">
                    {card.title}
                  </span>
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {loading ? '-' : card.count}
                  </span>
                </div>
              </div>
            );
          })}
      </div>

      {/* Two Column Section: Recent Results & Activity Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Submissions */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Pengumpulan Ujian Terbaru</span>
              </h3>
              <p className="text-xs text-slate-500">
                Siswa yang baru saja mengumpulkan asesmen
              </p>
            </div>
            <button
              onClick={() => onNavigate('results')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Semua Hasil &rarr;
            </button>
          </div>

          {recentResults.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada hasil pengerjaan ujian yang tersimpan.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentResults.map((r) => (
                <div key={r.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-slate-800">{r.studentName}</div>
                    <div className="text-slate-500 text-[11px]">
                      {r.className} &bull; {r.subjectName} ({r.assessmentType})
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-extrabold text-sm text-blue-700 block">
                      {r.finalScore} / 100
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      r.isFullyGraded
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.isFullyGraded ? 'Final' : 'Perlu Koreksi'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Logs */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-600" />
                <span>Log Aktivitas Sistem</span>
              </h3>
              <p className="text-xs text-slate-500">
                Catatan proktor dan aktivitas terkini
              </p>
            </div>
          </div>

          {recentLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Belum ada log aktivitas yang tercatat.
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="text-xs p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
                    <span className="font-semibold text-slate-700">{log.actor} ({log.role})</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString('id-ID')}</span>
                  </div>
                  <div className="font-bold text-slate-800">{log.action}</div>
                  <div className="text-slate-600 text-[11px] truncate">{log.details}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
