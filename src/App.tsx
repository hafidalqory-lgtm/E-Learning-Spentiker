import React, { useState, useEffect } from 'react';
import {
  Student,
  ExamSetting,
  ExamResult,
  ExamSession,
  Teacher,
} from './types';
import {
  seedInitialData,
  logActivity,
  openDB,
} from './db/indexedDB';
import {
  getUserSession,
  clearUserSession,
  UserSession,
} from './utils/auth';

// Common Components
import { SchoolLogo } from './components/common/SchoolLogo';
import { Sidebar, AdminMenuKey } from './components/common/Sidebar';
import { UserGuideModal } from './components/common/UserGuideModal';

// Student Components
import { StudentLogin } from './components/student/StudentLogin';
import { ExamRoom } from './components/student/ExamRoom';
import { ExamCompleted } from './components/student/ExamCompleted';

// Auth Components
import { TeacherLogin } from './components/teacher/TeacherLogin';
import { AdminLogin } from './components/admin/AdminLogin';

// Dashboard Management Views
import { AdminDashboard } from './components/admin/AdminDashboard';
import { ClassManagement } from './components/admin/ClassManagement';
import { StudentManagement } from './components/admin/StudentManagement';
import { TeacherManagement } from './components/admin/TeacherManagement';
import { SubjectManagement } from './components/admin/SubjectManagement';
import { QuestionBank } from './components/admin/QuestionBank';
import { ExamManagement } from './components/admin/ExamManagement';
import { ResultsManagement } from './components/admin/ResultsManagement';
import { RaporRecap } from './components/admin/RaporRecap';
import { SettingsView } from './components/admin/SettingsView';
import { BackupRestore } from './components/admin/BackupRestore';

import {
  BookOpen,
  HelpCircle,
  Menu,
  Shield,
  UserCheck,
  RotateCcw,
} from 'lucide-react';

type AppView =
  | 'student_portal'
  | 'student_exam'
  | 'student_completed'
  | 'teacher_login'
  | 'admin_login'
  | 'admin_panel';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('student_portal');
  const [currentAdminMenu, setCurrentAdminMenu] = useState<AdminMenuKey>('dashboard');

  // Active student exam states
  const [activeStudent, setActiveStudent] = useState<Student | null>(null);
  const [activeExam, setActiveExam] = useState<ExamSetting | null>(null);
  const [activeSession, setActiveSession] = useState<ExamSession | null>(null);
  const [activeCameraStream, setActiveCameraStream] = useState<MediaStream | null>(null);
  const [completedResult, setCompletedResult] = useState<ExamResult | null>(null);

  // Authenticated Dashboard User
  const [currentUserSession, setCurrentUserSession] = useState<UserSession | null>(null);

  // Mobile sidebar toggle
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // User Guide Modal
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Initialize DB and Seed Data on first mount
  useEffect(() => {
    const init = async () => {
      try {
        await openDB();
        await seedInitialData();

        // Restore auth session if present
        const savedSession = getUserSession();
        if (savedSession) {
          setCurrentUserSession(savedSession);
          setCurrentView('admin_panel');
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, []);

  // 1. Student Exam Handlers
  const handleStartExam = (
    student: Student,
    exam: ExamSetting,
    existingSession?: ExamSession | null,
    cameraStream?: MediaStream | null
  ) => {
    setActiveStudent(student);
    setActiveExam(exam);
    setActiveSession(existingSession || null);
    setActiveCameraStream(cameraStream || null);
    setCurrentView('student_exam');
  };

  const handleFinishExam = (result: ExamResult) => {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      setActiveCameraStream(null);
    }
    setCompletedResult(result);
    setCurrentView('student_completed');
  };

  const handleReturnToPortal = () => {
    if (activeCameraStream) {
      activeCameraStream.getTracks().forEach((track) => track.stop());
      setActiveCameraStream(null);
    }
    setActiveStudent(null);
    setActiveExam(null);
    setActiveSession(null);
    setCompletedResult(null);
    setCurrentView('student_portal');
  };

  // 2. Auth Handlers
  const handleTeacherLoginSuccess = (teacher: Teacher) => {
    const session: UserSession = {
      role: 'guru',
      userId: teacher.id,
      name: teacher.name,
      username: teacher.username,
      subjectIds: teacher.subjectIds,
      classIds: teacher.classIds,
      loginTime: new Date().toISOString(),
    };
    setCurrentUserSession(session);
    setCurrentAdminMenu('dashboard');
    setCurrentView('admin_panel');
  };

  const handleAdminLoginSuccess = () => {
    const session: UserSession = {
      role: 'admin',
      name: 'Administrator Sekolah',
      username: 'admin',
      loginTime: new Date().toISOString(),
    };
    setCurrentUserSession(session);
    setCurrentAdminMenu('dashboard');
    setCurrentView('admin_panel');
  };

  const handleLogout = () => {
    clearUserSession();
    setCurrentUserSession(null);
    setCurrentView('student_portal');
  };

  // --------------------------------------------------------------------------
  // RENDER VIEWS
  // --------------------------------------------------------------------------

  // 1. Exam Room (Fullscreen Focused)
  if (currentView === 'student_exam' && activeStudent && activeExam) {
    return (
      <ExamRoom
        student={activeStudent}
        exam={activeExam}
        initialSession={activeSession}
        initialCameraStream={activeCameraStream}
        onFinishExam={handleFinishExam}
        onExitToPortal={handleReturnToPortal}
      />
    );
  }

  // 2. Exam Completed Receipt
  if (currentView === 'student_completed' && completedResult) {
    return (
      <ExamCompleted
        result={completedResult}
        onReturnToPortal={handleReturnToPortal}
      />
    );
  }

  // 3. Teacher Login
  if (currentView === 'teacher_login') {
    return (
      <TeacherLogin
        onLoginSuccess={handleTeacherLoginSuccess}
        onBackToStudentPortal={() => setCurrentView('student_portal')}
        onOpenAdminLogin={() => setCurrentView('admin_login')}
      />
    );
  }

  // 4. Admin Login
  if (currentView === 'admin_login') {
    return (
      <AdminLogin
        onLoginSuccess={handleAdminLoginSuccess}
        onBackToStudentPortal={() => setCurrentView('student_portal')}
      />
    );
  }

  // 5. Admin & Teacher Dashboard Layout with LEFT-SIDE SIDEBAR
  if (currentView === 'admin_panel' && currentUserSession) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
        {/* Top Bar */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
            {/* Mobile Toggle Button for Left Sidebar */}
            <button
              onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
              className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200"
              title="Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            <SchoolLogo size="sm" showText={true} />
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 pl-3 border-l border-slate-200">
              <span>Panel Manajemen</span>
              <span>&bull;</span>
              <span className="font-semibold text-slate-700 capitalize">
                {currentAdminMenu}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowGuideModal(true)}
              className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-blue-200"
            >
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span className="hidden sm:inline">Buku Panduan</span>
            </button>
          </div>
        </header>

        {/* -------------------------------------------------------------
            MAIN VIEWPORT: SIDEBAR ON THE LEFT, CONTENT ON THE RIGHT!
        -------------------------------------------------------------- */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Left-Side Sidebar (Desktop permanent, Mobile overlay from left) */}
          <div
            className={`fixed inset-y-0 left-0 z-40 lg:static lg:block transition-transform duration-300 ${
              isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
            }`}
          >
            <Sidebar
              currentMenu={currentAdminMenu}
              onSelectMenu={(menu) => {
                setCurrentAdminMenu(menu);
                setIsMobileSidebarOpen(false);
              }}
              onLogout={handleLogout}
              userRole={currentUserSession.role}
              userName={currentUserSession.name}
            />
          </div>

          {/* Mobile backdrop */}
          {isMobileSidebarOpen && (
            <div
              onClick={() => setIsMobileSidebarOpen(false)}
              className="fixed inset-0 bg-slate-950/60 z-30 lg:hidden"
            />
          )}

          {/* Main Right Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-100">
            <div className="max-w-7xl mx-auto">
              {currentAdminMenu === 'dashboard' && (
                <AdminDashboard
                  onNavigate={(menu) => setCurrentAdminMenu(menu)}
                  userRole={currentUserSession.role}
                  userName={currentUserSession.name}
                />
              )}
              {currentAdminMenu === 'classes' && <ClassManagement />}
              {currentAdminMenu === 'students' && <StudentManagement />}
              {currentAdminMenu === 'teachers' && <TeacherManagement />}
              {currentAdminMenu === 'subjects' && <SubjectManagement />}
              {currentAdminMenu === 'questions' && (
                <QuestionBank
                  userRole={currentUserSession.role}
                  assignedSubjectIds={currentUserSession.subjectIds}
                />
              )}
              {currentAdminMenu === 'exams' && (
                <ExamManagement
                  userRole={currentUserSession.role}
                  assignedSubjectIds={currentUserSession.subjectIds}
                />
              )}
              {currentAdminMenu === 'results' && (
                <ResultsManagement
                  userRole={currentUserSession.role}
                  assignedSubjectIds={currentUserSession.subjectIds}
                />
              )}
              {currentAdminMenu === 'recap' && (
                <RaporRecap
                  userRole={currentUserSession.role}
                  assignedSubjectIds={currentUserSession.subjectIds}
                />
              )}
              {currentAdminMenu === 'settings' && <SettingsView />}
              {currentAdminMenu === 'backup' && <BackupRestore />}
            </div>
          </main>
        </div>

        {/* Global User Guide Modal */}
        <UserGuideModal
          isOpen={showGuideModal}
          onClose={() => setShowGuideModal(false)}
        />
      </div>
    );
  }

  // 6. Default Student Portal (Login Page)
  return (
    <>
      <StudentLogin
        onStartExam={handleStartExam}
        onOpenTeacherLogin={() => setCurrentView('teacher_login')}
        onOpenAdminLogin={() => setCurrentView('admin_login')}
      />

      {/* Floating Quick Guide Button on Student Portal */}
      <button
        onClick={() => setShowGuideModal(true)}
        className="fixed bottom-4 left-4 z-40 bg-slate-900/90 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg border border-slate-700/80 backdrop-blur flex items-center gap-2 transition-all hover:scale-105"
      >
        <BookOpen className="w-4 h-4 text-blue-400" />
        <span>Buku Panduan ANBK</span>
      </button>

      <UserGuideModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />
    </>
  );
}
