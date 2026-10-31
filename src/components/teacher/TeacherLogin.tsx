import React, { useState } from 'react';
import { Teacher } from '../../types';
import { getAllFromStore, STORES, logActivity } from '../../db/indexedDB';
import { hashPassword, saveUserSession } from '../../utils/auth';
import { SchoolLogo } from '../common/SchoolLogo';
import { Lock, UserCheck, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';

interface TeacherLoginProps {
  onLoginSuccess: (teacher: Teacher) => void;
  onBackToStudentPortal: () => void;
  onOpenAdminLogin: () => void;
}

export const TeacherLogin: React.FC<TeacherLoginProps> = ({
  onLoginSuccess,
  onBackToStudentPortal,
  onOpenAdminLogin,
}) => {
  const [username, setUsername] = useState<string>('triyono');
  const [password, setPassword] = useState<string>('guru123');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const teachers = await getAllFromStore<Teacher>(STORES.TEACHERS);
      const targetTeacher = teachers.find(
        (t) => t.username.toLowerCase() === username.trim().toLowerCase() && t.status === 'aktif'
      );

      if (!targetTeacher) {
        setError('Username guru tidak ditemukan atau akun dinonaktifkan.');
        setLoading(false);
        return;
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== targetTeacher.passwordHash) {
        setError('Kata sandi yang Anda masukkan salah.');
        setLoading(false);
        return;
      }

      // Save user session
      saveUserSession({
        role: 'guru',
        userId: targetTeacher.id,
        name: targetTeacher.name,
        username: targetTeacher.username,
        subjectIds: targetTeacher.subjectIds,
        classIds: targetTeacher.classIds,
        loginTime: new Date().toISOString(),
      });

      await logActivity(targetTeacher.name, 'guru', 'Login Guru', 'Berhasil masuk ke dashboard pengampu mata pelajaran.');
      onLoginSuccess(targetTeacher);
    } catch (err: any) {
      setError(`Gagal memproses login: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-md mx-auto w-full py-4 flex items-center justify-between">
        <button
          onClick={onBackToStudentPortal}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Portal Siswa</span>
        </button>
        <button
          onClick={onOpenAdminLogin}
          className="text-xs text-blue-400 hover:text-blue-300 font-medium"
        >
          Login Administrator &rarr;
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center my-auto">
        <div className="w-full max-w-md bg-slate-900/90 border border-blue-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center mx-auto mb-3 text-blue-400">
              <UserCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Login Guru Pengampu
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              SMP Negeri 3 Kertek &bull; Pengelolaan Soal & Nilai Asesmen
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Username Guru
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kata Sandi
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>

            {/* Demo hint for convenience */}
            <div className="p-3 bg-blue-950/50 border border-blue-800/40 rounded-xl text-[11px] text-blue-300 space-y-1">
              <div className="font-semibold text-white flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                Akun Demo Guru Default:
              </div>
              <div>&bull; Informatika: <strong>triyono</strong> / <strong>guru123</strong></div>
              <div>&bull; IPA: <strong>endang</strong> / <strong>guru123</strong></div>
              <div>&bull; Matematika: <strong>agus</strong> / <strong>guru123</strong></div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk Dashboard Guru'}</span>
            </button>
          </form>
        </div>
      </main>

      <footer className="text-center text-xs text-slate-500 py-2">
        SMP NEGERI 3 KERTEK &bull; Sistem ANBK Terintegrasi
      </footer>
    </div>
  );
};
