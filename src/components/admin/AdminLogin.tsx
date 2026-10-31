import React, { useState } from 'react';
import { hashPassword, saveUserSession } from '../../utils/auth';
import { logActivity } from '../../db/indexedDB';
import { SchoolLogo } from '../common/SchoolLogo';
import { Shield, Lock, ArrowLeft, KeyRound, AlertCircle } from 'lucide-react';

interface AdminLoginProps {
  onLoginSuccess: () => void;
  onBackToStudentPortal: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({
  onLoginSuccess,
  onBackToStudentPortal,
}) => {
  const [username, setUsername] = useState<string>('admin');
  const [password, setPassword] = useState<string>('admin123');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Check stored admin custom hash or default admin123
      const storedHash = localStorage.getItem('eujian_admin_password_hash');
      const expectedHash = storedHash || (await hashPassword('admin123'));
      const inputHash = await hashPassword(password);

      if (username.trim().toLowerCase() !== 'admin' || inputHash !== expectedHash) {
        setError('Username atau kata sandi administrator salah.');
        setLoading(false);
        return;
      }

      saveUserSession({
        role: 'admin',
        name: 'Administrator Sekolah',
        username: 'admin',
        loginTime: new Date().toISOString(),
      });

      await logActivity('Administrator', 'admin', 'Login Admin', 'Berhasil masuk ke panel kontrol admin.');
      onLoginSuccess();
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
      </header>

      <main className="flex-1 flex items-center justify-center my-auto">
        <div className="w-full max-w-md bg-slate-900/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-3 text-amber-400">
              <Shield className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Login Administrator Sekolah
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              SMP Negeri 3 Kertek &bull; Kontrol Penuh Sistem ANBK
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
                Username Admin
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Masukkan username admin"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
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
                placeholder="Masukkan kata sandi admin"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Default Login: Username: <strong>admin</strong> | Password: <strong>admin123</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Memverifikasi...' : 'Masuk Panel Admin'}</span>
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
