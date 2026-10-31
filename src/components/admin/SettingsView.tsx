import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, BackgroundThemeType } from '../../types';
import {
  getByIdFromStore,
  putToStore,
  STORES,
  logActivity,
  DEFAULT_APP_SETTINGS,
} from '../../db/indexedDB';
import { hashPassword } from '../../utils/auth';
import {
  BACKGROUND_THEME_PRESETS,
  getBackgroundStyle,
  readFileAsDataUrl,
} from '../../utils/theme';
import { SchoolLogo } from '../common/SchoolLogo';
import {
  Settings,
  School,
  Clock,
  Camera,
  Shield,
  Save,
  HardDrive,
  KeyRound,
  CheckCircle,
  HelpCircle,
  Image as ImageIcon,
  Upload,
  Palette,
  RotateCcw,
  Sparkles,
  Eye,
  Sliders,
  Type,
  FileUp,
  X,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setAppSettings] = useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Logo file input ref
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const bgInputRef = useRef<HTMLInputElement | null>(null);

  // Admin password change state
  const [newAdminPassword, setNewAdminPassword] = useState<string>('');
  const [confirmAdminPassword, setConfirmAdminPassword] = useState<string>('');
  const [passwordMsg, setPasswordMsg] = useState<string>('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const existing = await getByIdFromStore<AppSettings>(STORES.APP_SETTINGS, 'default');
      if (existing) {
        setAppSettings({
          ...DEFAULT_APP_SETTINGS,
          ...existing,
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    try {
      const payload: AppSettings = {
        ...DEFAULT_APP_SETTINGS,
        ...settings,
        id: 'default',
      };

      await putToStore(STORES.APP_SETTINGS, payload);
      try {
        localStorage.setItem('smpn3kertek_app_settings', JSON.stringify(payload));
      } catch (storageErr) {
        console.warn('LocalStorage save warning:', storageErr);
      }

      // Dispatch custom event to notify mounted components immediately
      window.dispatchEvent(new CustomEvent('app_settings_updated', { detail: payload }));

      await logActivity(
        'Admin',
        'admin',
        'Ubah Pengaturan',
        'Menyimpan konfigurasi profil sekolah, logo kustom, dan tema latar halaman depan.'
      );
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4500);
    } catch (err: any) {
      alert(`Gagal menyimpan pengaturan: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Logo Handlers
  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 800);
      setAppSettings((prev) => ({
        ...prev,
        customLogoUrl: dataUrl,
        useDefaultLogo: false,
      }));
    } catch (err: any) {
      alert(`Gagal memuat gambar logo: ${err.message}`);
    } finally {
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleResetLogo = () => {
    setAppSettings((prev) => ({
      ...prev,
      customLogoUrl: '',
      useDefaultLogo: true,
    }));
  };

  // 2. Background Image Handlers
  const handleBackgroundImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file, 1920);
      setAppSettings((prev) => ({
        ...prev,
        backgroundTheme: 'custom-image',
        customBackgroundImageUrl: dataUrl,
      }));
    } catch (err: any) {
      alert(`Gagal memuat gambar latar belakang: ${err.message}`);
    } finally {
      if (bgInputRef.current) bgInputRef.current.value = '';
    }
  };

  const handleResetFrontpageTitles = () => {
    setAppSettings((prev) => ({
      ...prev,
      frontpageTitle: DEFAULT_APP_SETTINGS.frontpageTitle,
      frontpageSubtitle: DEFAULT_APP_SETTINGS.frontpageSubtitle,
      frontpageBadge: DEFAULT_APP_SETTINGS.frontpageBadge,
    }));
  };

  // 3. Password Handlers
  const handleChangeAdminPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');

    if (newAdminPassword.length < 6) {
      setPasswordMsg('Kata sandi admin minimal 6 karakter.');
      return;
    }
    if (newAdminPassword !== confirmAdminPassword) {
      setPasswordMsg('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      const hashed = await hashPassword(newAdminPassword);
      localStorage.setItem('eujian_admin_password_hash', hashed);
      await logActivity('Admin', 'admin', 'Ganti Password', 'Memperbarui kata sandi administrator.');
      setPasswordMsg('Kata sandi administrator berhasil diperbarui!');
      setNewAdminPassword('');
      setConfirmAdminPassword('');
    } catch (err: any) {
      setPasswordMsg(`Gagal mengubah password: ${err.message}`);
    }
  };

  const previewBg = getBackgroundStyle(settings);

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Pengaturan Aplikasi & Tampilan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Sesuaikan logo sekolah, judul portal utama, tema background, dan profil identitas ANBK
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedSuccess && (
            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl border border-emerald-300 flex items-center gap-1.5 shadow-sm animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan Berhasil Disimpan!</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center gap-2 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} noValidate className="space-y-6">
        {/* =============================================================
            SECTION 1: CUSTOM LOGO, TITLES & BACKGROUND (REQUESTED FEATURE)
        ============================================================== */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Palette className="w-4 h-4 text-blue-600" />
              <span>Kustomisasi Tampilan Halaman Depan & Logo</span>
            </div>
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              Pratinjau Langsung Aktif
            </span>
          </div>

          {/* Live Preview Box */}
          <div>
            <label className="block font-bold text-slate-700 text-xs uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Pratinjau Tampilan Portal Depan:</span>
            </label>

            <div
              className={`w-full rounded-2xl overflow-hidden border border-slate-700 p-5 text-white relative shadow-xl transition-all ${previewBg.className}`}
              style={previewBg.style}
            >
              {settings.backgroundTheme === 'custom-image' && settings.customBackgroundImageUrl && (
                <div
                  className="absolute inset-0 bg-slate-950 pointer-events-none z-0"
                  style={{ opacity: (settings.backgroundOverlayOpacity ?? 60) / 100 }}
                />
              )}

              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/10 p-2 backdrop-blur border border-white/20 shrink-0 flex items-center justify-center shadow-inner">
                    <SchoolLogo size="lg" showText={false} customLogoUrl={settings.customLogoUrl} />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold tracking-widest text-blue-300 uppercase bg-blue-950/60 px-2 py-0.5 rounded border border-blue-400/30">
                      {settings.frontpageBadge || 'Sistem ANBK Digital'}
                    </span>
                    <h4 className="font-extrabold text-base sm:text-lg leading-tight mt-1 text-white">
                      {settings.frontpageTitle || 'PLATFORM E-UJIAN SMP NEGERI 3 KERTEK'}
                    </h4>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      “{settings.frontpageSubtitle || 'Platform Asesmen dan Evaluasi Pembelajaran Digital'}”
                    </p>
                  </div>
                </div>

                <div className="px-3 py-1.5 rounded-xl bg-blue-600/90 text-white text-xs font-bold shadow shrink-0">
                  MULAI UJIAN
                </div>
              </div>
            </div>
          </div>

          {/* Sub-section A: Ganti Logo */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-xs">1. Pengaturan Logo Sekolah</span>
              </div>
              {settings.customLogoUrl && (
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 hover:underline"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Kembalikan Logo Bawaan</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Logo Preview Avatar */}
              <div className="md:col-span-3 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-slate-200">
                <div className="w-20 h-20 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center overflow-hidden mb-2">
                  <SchoolLogo size="lg" showText={false} customLogoUrl={settings.customLogoUrl} />
                </div>
                <span className="text-[11px] font-bold text-slate-600 text-center">
                  {settings.customLogoUrl ? 'Logo Kustom Aktif' : 'Logo Resmi Default'}
                </span>
              </div>

              {/* Upload & URL Inputs */}
              <div className="md:col-span-9 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unggah Berkas Logo Sekolah (.png, .jpg, .svg, .webp):
                  </label>
                  <input
                    ref={logoInputRef}
                    type="file"
                    id="logoFileInput"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="logoFileInput"
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-300 font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-sm"
                  >
                    <FileUp className="w-4 h-4 text-blue-600" />
                    <span>Pilih Berkas Logo dari Komputer / Laptop</span>
                  </label>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Atau Masukkan Tautan URL Gambar Logo:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: https://sekolah.sch.id/logo.png atau data:image/..."
                    value={settings.customLogoUrl || ''}
                    onChange={(e) =>
                      setAppSettings({ ...settings, customLogoUrl: e.target.value })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sub-section B: Judul Halaman Depan */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-800 text-xs">
                  2. Judul & Teks Sambutan Halaman Depan
                </span>
              </div>
              <button
                type="button"
                onClick={handleResetFrontpageTitles}
                className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1 hover:underline"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Pulihkan Teks Standar</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Judul Utama Portal Ujian:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: PLATFORM E-UJIAN SMP NEGERI 3 KERTEK"
                  value={settings.frontpageTitle || ''}
                  onChange={(e) =>
                    setAppSettings({ ...settings, frontpageTitle: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Subjudul / Slogan Portal:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Platform Asesmen dan Evaluasi Pembelajaran Digital"
                  value={settings.frontpageSubtitle || ''}
                  onChange={(e) =>
                    setAppSettings({ ...settings, frontpageSubtitle: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Label Badge Portal:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sistem ANBK Digital"
                  value={settings.frontpageBadge || ''}
                  onChange={(e) =>
                    setAppSettings({ ...settings, frontpageBadge: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Sub-section C: Background & Tema Latar */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-4">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-slate-800 text-xs">
                3. Pilihan Background & Tema Latar Belakang
              </span>
            </div>

            {/* Presets Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {BACKGROUND_THEME_PRESETS.map((preset) => {
                const isSelected = (settings.backgroundTheme || 'gradient-blue') === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      setAppSettings({ ...settings, backgroundTheme: preset.id })
                    }
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-500/30 bg-blue-50/50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-6 h-6 rounded-lg bg-gradient-to-br ${preset.previewClass} border border-slate-300 shadow-inner shrink-0`}
                      />
                      <span className="font-bold text-xs text-slate-900">{preset.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {preset.description}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Custom Image Upload & Options (shown if custom-image selected) */}
            {settings.backgroundTheme === 'custom-image' && (
              <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3 animate-in fade-in">
                <div className="font-bold text-xs text-blue-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Konfigurasi Gambar Latar Kustom:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Unggah Berkas Gambar Latar:
                    </label>
                    <input
                      ref={bgInputRef}
                      type="file"
                      id="bgFileInput"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="bgFileInput"
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 font-semibold inline-flex items-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>Pilih Foto Gedung / Lab Komputer</span>
                    </label>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Atau URL / Tautan Gambar Latar:
                    </label>
                    <input
                      type="text"
                      placeholder="https://.../gedung-sekolah.jpg atau data:image/..."
                      value={settings.customBackgroundImageUrl || ''}
                      onChange={(e) =>
                        setAppSettings({ ...settings, customBackgroundImageUrl: e.target.value })
                      }
                      className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1">
                    <div className="flex items-center justify-between text-slate-700 font-semibold mb-1">
                      <span>Kegelapan Lapisan Kontras (Overlay Opacity):</span>
                      <span className="font-mono text-blue-600 font-bold">
                        {settings.backgroundOverlayOpacity ?? 60}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={20}
                      max={90}
                      step={5}
                      value={settings.backgroundOverlayOpacity ?? 60}
                      onChange={(e) =>
                        setAppSettings({
                          ...settings,
                          backgroundOverlayOpacity: Number(e.target.value),
                        })
                      }
                      className="w-full accent-blue-600"
                    />
                    <span className="text-[11px] text-slate-500">
                      Lapisan gelap memastikan teks judul dan tombol login siswa tetap mudah terbaca di atas gambar.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =============================================================
            SECTION 2: SCHOOL IDENTITY & METADATA
        ============================================================== */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
            <School className="w-4 h-4 text-blue-600" />
            <span>Profil & Identitas Satuan Pendidikan</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Nama Sekolah Resmi
              </label>
              <input
                type="text"
                required
                value={settings.schoolName}
                onChange={(e) => setAppSettings({ ...settings, schoolName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Subteks Wilayah / Kabupaten
              </label>
              <input
                type="text"
                value={settings.schoolSubtext}
                onChange={(e) => setAppSettings({ ...settings, schoolSubtext: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                NPSN Sekolah
              </label>
              <input
                type="text"
                value={settings.npsn}
                onChange={(e) => setAppSettings({ ...settings, npsn: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Nama Kepala Sekolah
              </label>
              <input
                type="text"
                value={settings.headmasterName}
                onChange={(e) => setAppSettings({ ...settings, headmasterName: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 font-semibold"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold uppercase text-slate-600 mb-1">
                Alamat Lengkap Sekolah
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setAppSettings({ ...settings, address: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:col-span-2">
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">
                  Tahun Pelajaran
                </label>
                <input
                  type="text"
                  value={settings.academicYear}
                  onChange={(e) => setAppSettings({ ...settings, academicYear: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold uppercase text-slate-600 mb-1">
                  Semester
                </label>
                <select
                  value={settings.semester}
                  onChange={(e) => setAppSettings({ ...settings, semester: e.target.value as any })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-semibold"
                >
                  <option value="Ganjil">Ganjil</option>
                  <option value="Genap">Genap</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* =============================================================
            SECTION 3: EXAM & CAMERA PROTOCOLS
        ============================================================== */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
            <Camera className="w-4 h-4 text-blue-600" />
            <span>Protokol Pengawasan Kamera & Fullscreen ANBK</span>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
              <div>
                <strong className="block text-slate-800">Aktifkan Pengawasan Kamera Siswa</strong>
                <span className="text-slate-500">
                  Memeriksa izin MediaDevices kamera web sebelum ujian dan menampilkan pratinjau kecil
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.enableCameraMonitoring}
                onChange={(e) =>
                  setAppSettings({ ...settings, enableCameraMonitoring: e.target.checked })
                }
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
              <div>
                <strong className="block text-slate-800">
                  Izinkan Masuk Ujian Jika Kamera Fisik Tidak Tersedia
                </strong>
                <span className="text-slate-500">
                  Mengaktifkan simulasi kamera virtual ANBK jika komputer sekolah tidak memiliki webcam fisik
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.allowCameraBypassForTroubleshooting}
                onChange={(e) =>
                  setAppSettings({
                    ...settings,
                    allowCameraBypassForTroubleshooting: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70 cursor-pointer">
              <div>
                <strong className="block text-slate-800">Deteksi Ketat Layar Penuh (Fullscreen)</strong>
                <span className="text-slate-500">
                  Tampilkan peringatan darurat dan catat pelanggaran jika siswa keluar dari layar penuh
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.strictFullscreenMode}
                onChange={(e) =>
                  setAppSettings({ ...settings, strictFullscreenMode: e.target.checked })
                }
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Kiosk Mode & Real Lockdown Guidelines */}
          <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-blue-950">
              <Shield className="w-4 h-4 text-blue-600" />
              Petunjuk Penguncian Sistem Laboratorium Sekolah (Kiosk Mode):
            </div>
            <p className="text-slate-700 leading-relaxed">
              Browser web standar tidak diizinkan oleh sistem operasi untuk memblokir pintasan OS (seperti Alt+Tab atau tombol Windows). Untuk pelaksanaan asesmen resmi berskala penuh:
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-0.5">
              <li>
                Gunakan <strong>Google Chrome Kiosk Mode</strong>: jalankan melalui terminal atau shortcut dengan parameter:{' '}
                <code>chrome.exe --kiosk --app=http://localhost:3000</code>
              </li>
              <li>
                Atau pasang <strong>Safe Exam Browser (SEB)</strong> untuk mengunci komputer lab sekolah secara total.
              </li>
            </ul>
          </div>
        </div>

        {/* Submit Settings */}
        <div className="flex items-center justify-between sticky bottom-4 z-20 bg-white/90 backdrop-blur p-4 rounded-2xl border border-slate-200 shadow-xl">
          <div className="text-xs text-slate-600 font-medium hidden sm:block">
            {savedSuccess ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Seluruh pengaturan tampilan dan sistem telah tersimpan di browser Anda!
              </span>
            ) : (
              <span>Klik tombol simpan untuk menerapkan seluruh kustomisasi.</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all hover:scale-[1.02] ml-auto disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Menyimpan...' : 'Simpan Seluruh Pengaturan Tampilan & Sistem'}</span>
          </button>
        </div>
      </form>

      {/* =============================================================
          SECTION 4: ADMIN PASSWORD CHANGER
      ============================================================== */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 text-slate-900 font-bold text-sm">
          <KeyRound className="w-4 h-4 text-amber-600" />
          <span>Ganti Kata Sandi Administrator</span>
        </div>

        {passwordMsg && (
          <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-xl text-xs font-semibold">
            {passwordMsg}
          </div>
        )}

        <form onSubmit={handleChangeAdminPassword} className="space-y-3 text-xs max-w-md">
          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Kata Sandi Baru Administrator
            </label>
            <input
              type="password"
              required
              placeholder="Minimal 6 karakter"
              value={newAdminPassword}
              onChange={(e) => setNewAdminPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-600 mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <input
              type="password"
              required
              placeholder="Ulangi kata sandi baru"
              value={confirmAdminPassword}
              onChange={(e) => setConfirmAdminPassword(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition-all"
          >
            Perbarui Kata Sandi Admin
          </button>
        </form>
      </div>
    </div>
  );
};
