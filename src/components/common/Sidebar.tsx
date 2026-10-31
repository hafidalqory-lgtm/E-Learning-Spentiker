import React from 'react';
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  HelpCircle,
  Clock,
  Award,
  Settings,
  Database,
  LogOut,
  UserCheck,
  ChevronRight,
  Shield,
  Layers,
  FileSpreadsheet,
} from 'lucide-react';

export type AdminMenuKey =
  | 'dashboard'
  | 'classes'
  | 'students'
  | 'teachers'
  | 'subjects'
  | 'questions'
  | 'exams'
  | 'results'
  | 'recap'
  | 'settings'
  | 'backup';

interface SidebarProps {
  currentMenu: AdminMenuKey;
  onSelectMenu: (menu: AdminMenuKey) => void;
  onLogout: () => void;
  userRole: 'admin' | 'guru';
  userName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMenu,
  onSelectMenu,
  onLogout,
  userRole,
  userName,
}) => {
  const menuItems = [
    { key: 'dashboard' as AdminMenuKey, label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'guru'] },
    { key: 'classes' as AdminMenuKey, label: 'Kelas', icon: Layers, roles: ['admin'] },
    { key: 'students' as AdminMenuKey, label: 'Siswa', icon: GraduationCap, roles: ['admin', 'guru'] },
    { key: 'teachers' as AdminMenuKey, label: 'Guru', icon: Users, roles: ['admin'] },
    { key: 'subjects' as AdminMenuKey, label: 'Mata Pelajaran', icon: BookOpen, roles: ['admin', 'guru'] },
    { key: 'questions' as AdminMenuKey, label: 'Bank Soal', icon: HelpCircle, roles: ['admin', 'guru'] },
    { key: 'exams' as AdminMenuKey, label: 'Pengaturan Ujian', icon: Clock, roles: ['admin', 'guru'] },
    { key: 'results' as AdminMenuKey, label: 'Hasil Jawaban', icon: Award, roles: ['admin', 'guru'] },
    { key: 'recap' as AdminMenuKey, label: 'Rekap Nilai Rapor', icon: FileSpreadsheet, roles: ['admin', 'guru'] },
    { key: 'settings' as AdminMenuKey, label: 'Pengaturan', icon: Settings, roles: ['admin'] },
    { key: 'backup' as AdminMenuKey, label: 'Backup & Restore', icon: Database, roles: ['admin'] },
  ];

  const visibleItems = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <aside className="w-64 lg:w-72 bg-slate-900 text-slate-100 flex flex-col h-full shrink-0 border-r border-slate-800 shadow-xl z-20">
      {/* Sidebar Header with User Profile */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold shrink-0">
            {userRole === 'admin' ? (
              <Shield className="w-5 h-5 text-amber-400" />
            ) : (
              <UserCheck className="w-5 h-5 text-blue-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white truncate">{userName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  userRole === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              ></span>
              <p className="text-xs text-slate-400 uppercase tracking-wider font-mono">
                {userRole === 'admin' ? 'Administrator' : 'Akses Guru'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Menu Navigasi
        </div>

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentMenu === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onSelectMenu(item.key)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-900/40 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-4 h-4 text-blue-200" />}
            </button>
          );
        })}
      </div>

      {/* Logout button at bottom of Sidebar */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-rose-300 hover:text-rose-200 hover:bg-rose-950/40 border border-rose-900/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Keluar ke Portal Siswa</span>
        </button>
      </div>
    </aside>
  );
};
