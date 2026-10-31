import React, { useState, useRef } from 'react';
import {
  exportAllData,
  importBackupData,
  seedInitialData,
  clearStore,
  STORES,
  logActivity,
} from '../../db/indexedDB';
import { downloadFile } from '../../utils/exportImport';
import {
  Database,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  FileJson,
  ShieldAlert,
  HardDrive,
} from 'lucide-react';

export const BackupRestore: React.FC = () => {
  const [backupJson, setBackupJson] = useState<string>('');
  const [previewSummary, setPreviewSummary] = useState<Record<string, number> | null>(null);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Danger Zone Clear Data
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 1. Export All Data
  const handleExportAll = async () => {
    try {
      setIsProcessing(true);
      const json = await exportAllData();
      const filename = `Backup_EUjian_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.json`;
      downloadFile(json, filename, 'application/json');
      setStatusMsg({
        type: 'success',
        text: `Cadangan data lengkap berhasil diunduh (${filename})! Simpan file ini di media penyimpanan eksternal atau Google Drive sekolah.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Gagal mengekspor data: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Read File for Restore
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        if (!parsed.data || typeof parsed.data !== 'object') {
          throw new Error('File tidak memiliki objek data yang valid.');
        }

        const summary: Record<string, number> = {};
        for (const [key, val] of Object.entries(parsed.data)) {
          if (Array.isArray(val)) {
            summary[key] = val.length;
          }
        }

        setBackupJson(text);
        setPreviewSummary(summary);
        setStatusMsg(null);
      } catch (err: any) {
        setStatusMsg({ type: 'error', text: `File JSON cadangan rusak atau tidak valid: ${err.message}` });
        setBackupJson('');
        setPreviewSummary(null);
      }
    };
    reader.readAsText(file);
  };

  // 3. Confirm Restore
  const handleExecuteRestore = async () => {
    if (!backupJson) return;
    setIsProcessing(true);

    try {
      const result = await importBackupData(backupJson, importMode);
      if (result.success) {
        setStatusMsg({
          type: 'success',
          text: `Data cadangan berhasil dipulihkan! Total data: ${JSON.stringify(result.summary)}`,
        });
        setBackupJson('');
        setPreviewSummary(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setStatusMsg({ type: 'error', text: result.message });
      }
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Gagal memulihkan: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Reset to Demo Data
  const handleResetDemoData = async () => {
    if (
      !window.confirm(
        'Apakah Anda yakin ingin memuat ulang data demo awal SMP Negeri 3 Kertek? Data yang belum dicadangkan mungkin akan tertimpa.'
      )
    ) {
      return;
    }

    try {
      setIsProcessing(true);
      await seedInitialData(true);
      await logActivity('Admin', 'admin', 'Reset Demo', 'Memuat ulang data bawaan demo SMP Negeri 3 Kertek.');
      setStatusMsg({
        type: 'success',
        text: 'Data demo resmi SMP Negeri 3 Kertek berhasil dimuat ulang ke IndexedDB!',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Gagal memuat ulang data demo: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Danger Clear All
  const handleExecuteClearDatabase = async () => {
    if (confirmInput.trim().toUpperCase() !== 'HAPUS SEMUA DATA') {
      alert('Teks konfirmasi yang Anda ketik salah.');
      return;
    }

    try {
      setIsProcessing(true);
      const stores = Object.values(STORES);
      for (const st of stores) {
        await clearStore(st);
      }
      setShowClearConfirm(false);
      setConfirmInput('');
      setStatusMsg({
        type: 'success',
        text: 'Seluruh data lokal telah dibersihkan dari IndexedDB.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: `Gagal menghapus data: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            <span>Pencadangan & Pemulihan Data (Backup & Restore)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Amankan data ujian lokal tanpa server melalui ekspor dan impor file JSON terenkripsi
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start gap-2.5 animate-in fade-in ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="leading-relaxed font-medium">{statusMsg.text}</span>
        </div>
      )}

      {/* Grid: Backup & Restore Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Ekspor Cadangan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
              <Download className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Ekspor Seluruh Database
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Unduh salinan lengkap seluruh data: data kelas, siswa, guru, mata pelajaran, bank soal, jadwal ujian, hasil pengerjaan, dan log aktivitas dalam format file JSON.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={handleExportAll}
              disabled={isProcessing}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <FileJson className="w-4 h-4" />
              <span>{isProcessing ? 'Memproses...' : 'Unduh File Backup (.json)'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Impor / Pulihkan Cadangan */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Pulihkan dari File Backup
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Unggah file JSON cadangan untuk memulihkan data pada komputer proktor baru atau setelah instalasi ulang browser.
            </p>

            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
              />
            </div>
          </div>

          {previewSummary && (
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="font-bold text-slate-800">Ringkasan Isi File Cadangan:</div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                {Object.entries(previewSummary).map(([key, count]) => (
                  <div key={key}>
                    &bull; {key}: <strong>{count} item</strong>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="block font-semibold text-slate-700 mb-1">
                  Pilih Metode Pemulihan:
                </label>
                <select
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as any)}
                  className="w-full p-1.5 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="replace">Ganti / Timpa Seluruh Data Lama</option>
                  <option value="merge">Gabungkan Data (Merge)</option>
                </select>
              </div>

              <button
                onClick={handleExecuteRestore}
                disabled={isProcessing}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow mt-2"
              >
                Terapkan Pemulihan Sekarang
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demo Reset & Danger Zone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Reset Demo Data */}
        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span>Muat Ulang Data Standar Demo Sekolah</span>
            </h4>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Memuat kembali paket kelas standar (VII A - IX B), siswa, dewan guru, mata pelajaran, dan bank soal Asesmen Sumatif bawaan SMP Negeri 3 Kertek.
            </p>
          </div>

          <div className="mt-4">
            <button
              onClick={handleResetDemoData}
              disabled={isProcessing}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Muat Ulang Data Demo
            </button>
          </div>
        </div>

        {/* Danger Zone: Clear Database */}
        <div className="bg-rose-50/60 p-6 rounded-2xl border border-rose-200 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-rose-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Zona Berbahaya: Kosongkan Database</span>
            </h4>
            <p className="text-xs text-rose-700 mt-1.5 leading-relaxed">
              Menghapus seluruh data lokal yang tersimpan di IndexedDB browser ini. Tindakan ini tidak dapat dibatalkan jika Anda belum memiliki file backup.
            </p>
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold"
            >
              Kosongkan Seluruh Database...
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Clearing Database */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Konfirmasi Pembersihan Database
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Seluruh data siswa, soal, dan hasil nilai ujian akan terhapus secara permanen dari browser ini. Untuk melanjutkan, ketik kata di bawah ini:
            </p>
            <div className="my-3 font-mono font-bold text-rose-700 text-xs bg-rose-50 p-2 rounded-lg border border-rose-200 select-all">
              HAPUS SEMUA DATA
            </div>

            <input
              type="text"
              placeholder="Ketik teks konfirmasi..."
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 font-mono text-xs mb-4 uppercase"
            />

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowClearConfirm(false);
                  setConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteClearDatabase}
                disabled={confirmInput.trim().toUpperCase() !== 'HAPUS SEMUA DATA'}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20 disabled:opacity-40"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
