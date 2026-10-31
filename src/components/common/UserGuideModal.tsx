import React, { useState } from 'react';
import {
  BookOpen,
  Terminal,
  Laptop,
  GraduationCap,
  Users,
  Shield,
  Camera,
  HardDrive,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'lokal' | 'siswa' | 'guru' | 'admin' | 'keamanan'>('lokal');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Buku Panduan Aplikasi E-Ujian SMP Negeri 3 Kertek
              </h3>
              <p className="text-xs text-blue-200/80">
                Petunjuk Teknis ANBK Lokal Berbasis Browser & IndexedDB
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 text-xs font-semibold overflow-x-auto">
          <button
            onClick={() => setActiveTab('lokal')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'lokal'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1. Menjalankan Lokal Tanpa Server</span>
          </button>
          <button
            onClick={() => setActiveTab('siswa')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'siswa'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4" />
            <span>2. Panduan Siswa</span>
          </button>
          <button
            onClick={() => setActiveTab('guru')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'guru'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>3. Panduan Guru</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'admin'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>4. Panduan Admin & Backup</span>
          </button>
          <button
            onClick={() => setActiveTab('keamanan')}
            className={`py-3 px-4 border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeTab === 'keamanan'
                ? 'border-blue-600 text-blue-600 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>5. Batasan Browser & Kiosk Mode</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-slate-700 space-y-4 leading-relaxed">
          {activeTab === 'lokal' && (
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Laptop className="w-4 h-4 text-blue-600" />
                Cara Menjalankan Aplikasi Secara Lokal Tanpa Server Khusus
              </h4>
              <p>
                Aplikasi ini dirancang 100% Client-Side menggunakan React, Vite, Tailwind CSS, dan IndexedDB. Aplikasi dapat berjalan langsung di komputer laptop, komputer proktor lab, maupun dibagikan melalui jaringan lokal (LAN) sekolah tanpa memerlukan database PostgreSQL atau cloud API key.
              </p>

              <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs space-y-2">
                <div className="text-slate-400"># 1. Masuk ke folder proyek</div>
                <div>cd eujian-smpn3kertek</div>
                <div className="text-slate-400 mt-2"># 2. Instalasi dependensi (hanya perlu sekali)</div>
                <div>npm install</div>
                <div className="text-slate-400 mt-2"># 3. Jalankan server lokal Vite</div>
                <div>npm run dev</div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <strong>Akses Browser:</strong>
                <p>
                  Buka browser Google Chrome atau Microsoft Edge, lalu buka alamat:
                  <code className="bg-white px-2 py-0.5 rounded font-mono text-blue-800 font-bold ml-1">
                    http://localhost:3000
                  </code>
                </p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Untuk komputer siswa dalam satu jaringan Wi-Fi/LAN lab yang sama, siswa dapat mengakses melalui IP lokal komputer proktor (contoh: <code>http://192.168.1.100:3000</code>).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'siswa' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Alur Pengerjaan Ujian Siswa (Sistem ANBK)</h4>
              <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                <li>
                  <strong>Halaman Login:</strong> Siswa memilih Kelas (VII A, VII B, dsb), memilih Nama Lengkap dari dropdown yang otomatis terfilter, dan memilih Mata Pelajaran / Asesmen yang dijadwalkan aktif.
                </li>
                <li>
                  <strong>Izin Kamera & Layar Penuh:</strong> Klik tombol <em>Mulai Ujian</em>. Izinkan browser mengakses webcam. Klik tombol <em>Masuk Ujian (Layar Penuh)</em>.
                </li>
                <li>
                  <strong>Pengerjaan Soal:</strong> Klik pilihan A, B, C, D, atau E. Setiap jawaban yang dipilih langsung tersimpan ke IndexedDB browser (autosave).
                </li>
                <li>
                  <strong>Tombol Ragu-ragu:</strong> Gunakan jika siswa masih belum yakin. Soal akan berwarna kuning pada matriks daftar soal sebelah kanan.
                </li>
                <li>
                  <strong>Pencegahan Kecurangan:</strong> Jangan keluar dari mode layar penuh atau berpindah tab jendela lain. Sistem akan mencatat pelanggaran dan memunculkan peringatan.
                </li>
                <li>
                  <strong>Kumpulkan Ujian:</strong> Setelah selesai, klik tombol <em>Selesai Ujian</em> dan konfirmasi pengumpulan.
                </li>
              </ol>
            </div>
          )}

          {activeTab === 'guru' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Panduan Dewan Guru Pengampu</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Login Guru:</strong> Gunakan menu <em>Login Guru</em> di pojok kanan atas. Akun default guru demo:
                  <ul className="list-circle pl-5 mt-1 space-y-0.5">
                    <li>Informatika: Username <code>triyono</code>, Sandi <code>guru123</code></li>
                    <li>IPA: Username <code>endang</code>, Sandi <code>guru123</code></li>
                    <li>Matematika: Username <code>agus</code>, Sandi <code>guru123</code></li>
                  </ul>
                </li>
                <li>
                  <strong>Kewenangan Guru:</strong> Guru hanya mengelola mata pelajaran, membuat bank soal, menjadwalkan ujian, dan memeriksa jawaban uraian pada mata pelajaran yang diampunya.
                </li>
                <li>
                  <strong>Penilaian Uraian:</strong> Masuk ke menu <em>Hasil Jawaban</em> &rarr; klik <em>Koreksi</em> pada siswa yang memiliki soal esai &rarr; masukkan skor uraian &rarr; klik Simpan. Sistem otomatis menghitung ulang nilai akhir siswa.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'admin' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">Panduan Administrator & Proktor Sekolah</h4>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Login Admin:</strong> Username <code>admin</code>, Sandi <code>admin123</code>.
                </li>
                <li>
                  <strong>Impor Siswa & Soal:</strong> Unduh template Excel yang telah disediakan di menu Siswa dan Soal, isi data rombel dan butir pertanyaan, lalu unggah melalui tombol <em>Impor File</em>.
                </li>
                <li>
                  <strong>Pencadangan Rutin (Backup):</strong> Karena data disimpan di IndexedDB browser proktor, pastikan melakukan <em>Ekspor File Backup (.json)</em> di menu Backup & Restore sebelum dan sesudah pelaksanaan asesmen sumatif.
                </li>
                <li>
                  <strong>Rekap Nilai Rapor:</strong> Masuk ke submenu <em>Rekap Nilai Rapor</em> untuk melihat nilai gabungan Asesmen Sumatif 1, 2, 3, dan 4 per kelas serta cetak legger nilai resmi.
                </li>
              </ul>
            </div>
          )}

          {activeTab === 'keamanan' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-900">
                Penjelasan Batasan Browser & Mode Kiosk untuk Laboratorium
              </h4>
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs">
                <strong>Catatan Teknis Integritas Sistem:</strong> Sesuai standar keamanan web dunia, JavaScript murni yang berjalan di dalam browser tidak memiliki izin tingkat sistem operasi untuk mematikan task manager OS, mematikan pintasan Windows (seperti tombol Win atau Alt+Tab), ataupun memblokir aplikasi desktop pihak ketiga.
              </div>
              <p>
                Untuk pelaksanaan asesmen resmi berskala penuh yang benar-benar mengunci desktop siswa:
              </p>
              <ol className="list-decimal pl-5 space-y-1.5">
                <li>
                  <strong>Chrome Kiosk Mode:</strong> Jalankan Google Chrome di PC laboratorium dengan perintah shortcut:
                  <code className="block bg-slate-900 text-white p-2 rounded-lg font-mono mt-1">
                    chrome.exe --kiosk --app=http://localhost:3000 --disable-pinch
                  </code>
                </li>
                <li>
                  <strong>Safe Exam Browser (SEB):</strong> Sekolah dapat mengunduh Safe Exam Browser gratis untuk mengunci lingkungan Windows/macOS seutuhnya dan mengarahkan start URL ke aplikasi E-Ujian ini.
                </li>
                <li>
                  <strong>Pengawasan Kamera:</strong> Kamera web digunakan untuk memantau kehadiran siswa secara visual di ruang kelas dan disimpan sebagai indikator aktif di header ujian.
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow"
          >
            Tutup Buku Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
