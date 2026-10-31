import React, { useState, useEffect } from 'react';
import { SchoolClass, Student } from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  putBatchToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
  Copy,
  ClipboardPaste,
  CheckCircle2,
  Sparkles,
  Info,
  X,
  FileText,
} from 'lucide-react';

export const ClassManagement: React.FC = () => {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Row selection for Bulk Delete
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add / Edit Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [classNameInput, setClassNameInput] = useState<string>('');
  const [gradeInput, setGradeInput] = useState<'7' | '8' | '9'>('7');
  const [modalError, setModalError] = useState<string>('');

  // Copy Paste Modal State
  const [showCopyPasteModal, setShowCopyPasteModal] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [defaultGradeForPaste, setDefaultGradeForPaste] = useState<'7' | '8' | '9'>('7');
  const [parsedPreview, setParsedPreview] = useState<
    { name: string; gradeLevel: '7' | '8' | '9'; isDuplicate: boolean }[]
  >([]);
  const [copyPasteNotification, setCopyPasteNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  // Delete Confirm State
  const [classToDelete, setClassToDelete] = useState<SchoolClass | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [clsList, stdList] = await Promise.all([
        getAllFromStore<SchoolClass>(STORES.CLASSES),
        getAllFromStore<Student>(STORES.STUDENTS),
      ]);
      setClasses(clsList);
      setStudents(stdList);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load classes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStudentCount = (classId: string) => {
    return students.filter((s) => s.classId === classId).length;
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setClassNameInput('');
    setGradeInput('7');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (cls: SchoolClass) => {
    setEditingClass(cls);
    setClassNameInput(cls.name);
    setGradeInput(cls.gradeLevel);
    setModalError('');
    setShowModal(true);
  };

  // 1-Click Duplicate Class
  const handleDuplicateClass = async (cls: SchoolClass) => {
    const letters = ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
    let suggestedName = `${cls.name} (Salinan)`;

    // Try to smartly increment letter, e.g. "VII A" -> "VII B" if not exists
    const match = cls.name.match(/^(VII|VIII|IX|7|8|9)[\s-_]*([A-Z])$/i);
    if (match) {
      const roman = match[1].toUpperCase();
      const currentLetter = match[2].toUpperCase();
      const curIdx = letters.indexOf(currentLetter);
      if (curIdx >= 0 && curIdx < letters.length - 1) {
        const candidate = `${roman} ${letters[curIdx + 1]}`;
        if (!classes.some((c) => c.name.toLowerCase() === candidate.toLowerCase())) {
          suggestedName = candidate;
        }
      }
    }

    try {
      const newClass: SchoolClass = {
        id: 'cls_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
        name: suggestedName,
        gradeLevel: cls.gradeLevel,
        createdAt: new Date().toISOString(),
      };
      await putToStore(STORES.CLASSES, newClass);
      await logActivity('Admin', 'admin', 'Duplikasi Kelas', `Menduplikasi kelas ${cls.name} menjadi ${suggestedName}`);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menduplikasi kelas: ${err.message}`);
    }
  };

  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = classNameInput.trim().toUpperCase();

    if (!cleanName) {
      setModalError('Nama kelas tidak boleh kosong.');
      return;
    }

    const duplicate = classes.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase() && c.id !== editingClass?.id
    );
    if (duplicate) {
      setModalError(`Kelas dengan nama "${cleanName}" sudah ada.`);
      return;
    }

    try {
      if (editingClass) {
        const updated: SchoolClass = {
          ...editingClass,
          name: cleanName,
          gradeLevel: gradeInput,
        };
        await putToStore(STORES.CLASSES, updated);
        await logActivity('Admin', 'admin', 'Ubah Kelas', `Mengubah nama kelas menjadi ${cleanName}`);
      } else {
        const newClass: SchoolClass = {
          id: 'cls_' + Date.now().toString(36),
          name: cleanName,
          gradeLevel: gradeInput,
          createdAt: new Date().toISOString(),
        };
        await putToStore(STORES.CLASSES, newClass);
        await logActivity('Admin', 'admin', 'Tambah Kelas', `Menambahkan kelas baru ${cleanName}`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan kelas: ${err.message}`);
    }
  };

  // -------------------------------------------------------------
  // COPY-PASTE BULK CLASSES HANDLERS
  // -------------------------------------------------------------
  const parseClassText = (text: string, defaultGrade: '7' | '8' | '9') => {
    const lines = text
      .split(/[\r\n,;]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const items: { name: string; gradeLevel: '7' | '8' | '9'; isDuplicate: boolean }[] = [];
    const seenInBatch = new Set<string>();

    lines.forEach((line) => {
      let clean = line.replace(/^kelas\s+/i, '').trim().toUpperCase();
      if (!clean) return;

      let grade: '7' | '8' | '9' = defaultGrade;

      if (/^(?:VII|7)[\s-_]*/i.test(clean)) {
        grade = '7';
        clean = clean.replace(/^(?:VII|7)[\s-_]*/i, 'VII ');
      } else if (/^(?:VIII|8)[\s-_]*/i.test(clean)) {
        grade = '8';
        clean = clean.replace(/^(?:VIII|8)[\s-_]*/i, 'VIII ');
      } else if (/^(?:IX|9)[\s-_]*/i.test(clean)) {
        grade = '9';
        clean = clean.replace(/^(?:IX|9)[\s-_]*/i, 'IX ');
      }

      const lower = clean.toLowerCase();
      if (seenInBatch.has(lower)) return;
      seenInBatch.add(lower);

      const isDuplicate = classes.some((c) => c.name.toLowerCase() === lower);
      items.push({
        name: clean,
        gradeLevel: grade,
        isDuplicate,
      });
    });

    return items;
  };

  const handlePastedTextChange = (text: string) => {
    setPastedText(text);
    const parsed = parseClassText(text, defaultGradeForPaste);
    setParsedPreview(parsed);
    setCopyPasteNotification(null);
  };

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText.trim()) {
          handlePastedTextChange(clipText);
          setCopyPasteNotification({
            type: 'info',
            message: 'Berhasil menempelkan teks dari papan klip (clipboard)!',
          });
          return;
        }
      }
      alert('Silakan tempel teks langsung ke dalam kotak teks (Ctrl+V).');
    } catch (err) {
      alert('Papan klip tidak dapat diakses secara langsung. Silakan tekan Ctrl+V pada kotak teks.');
    }
  };

  const handleLoadSampleClasses = () => {
    const sample = `VII A
VII B
VII C
VIII A
VIII B
VIII C
IX A
IX B
IX C`;
    handlePastedTextChange(sample);
  };

  const handleSaveBulkClasses = async () => {
    const toAdd = parsedPreview.filter((p) => !p.isDuplicate);
    if (toAdd.length === 0) {
      setCopyPasteNotification({
        type: 'error',
        message: 'Tidak ada kelas baru yang dapat ditambahkan (semua kelas sudah terdaftar).',
      });
      return;
    }

    try {
      const now = new Date().toISOString();
      const newClasses: SchoolClass[] = toAdd.map((item, idx) => ({
        id: 'cls_' + Date.now().toString(36) + '_' + idx + '_' + Math.random().toString(36).slice(2, 5),
        name: item.name,
        gradeLevel: item.gradeLevel,
        createdAt: now,
      }));

      await putBatchToStore(STORES.CLASSES, newClasses);
      await logActivity(
        'Admin',
        'admin',
        'Salin & Tempel Kelas',
        `Menambahkan ${newClasses.length} kelas baru sekaligus dari salin-tempel.`
      );

      setShowCopyPasteModal(false);
      setPastedText('');
      setParsedPreview([]);
      await loadData();
      alert(`Berhasil! ${newClasses.length} kelas baru telah ditambahkan ke database.`);
    } catch (err: any) {
      setCopyPasteNotification({
        type: 'error',
        message: `Gagal menyimpan kelas: ${err.message}`,
      });
    }
  };

  // Single Delete
  const handleDeleteClass = async () => {
    if (!classToDelete) return;

    try {
      // Unlink or update any students in this class
      const affectedStudents = students.filter((s) => s.classId === classToDelete.id);
      if (affectedStudents.length > 0) {
        const updatedStudents: Student[] = affectedStudents.map((s) => ({
          ...s,
          classId: '',
          className: '(Tanpa Kelas)',
        }));
        await putBatchToStore(STORES.STUDENTS, updatedStudents);
      }

      await deleteFromStore(STORES.CLASSES, classToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Kelas', `Menghapus kelas ${classToDelete.name}`);
      setClassToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus kelas: ${err.message}`);
    }
  };

  // Bulk Delete Selected Classes
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    try {
      // Unlink affected students
      const affectedStudents = students.filter((s) => selectedIds.includes(s.classId));
      if (affectedStudents.length > 0) {
        const updatedStudents: Student[] = affectedStudents.map((s) => ({
          ...s,
          classId: '',
          className: '(Tanpa Kelas)',
        }));
        await putBatchToStore(STORES.STUDENTS, updatedStudents);
      }

      await deleteBatchFromStore(STORES.CLASSES, selectedIds);
      await logActivity(
        'Admin',
        'admin',
        'Hapus Masal Kelas',
        `Menghapus ${selectedIds.length} kelas sekaligus.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus data kelas masal: ${err.message}`);
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Toggle Single Selection
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Toggle Select All
  const isAllSelected =
    filteredClasses.length > 0 && selectedIds.length === filteredClasses.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < filteredClasses.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredClasses.map((c) => c.id));
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Manajemen Data Kelas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola tingkatan dan rombongan belajar SMP Negeri 3 Kertek
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Delete Button when items selected */}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.length} Kelas Terpilih</span>
            </button>
          )}

          {/* Copy-Paste Button */}
          <button
            onClick={() => {
              setShowCopyPasteModal(true);
              setPastedText('');
              setParsedPreview([]);
              setCopyPasteNotification(null);
            }}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors border border-indigo-200"
            title="Salin dan tempel daftar nama kelas dari Excel atau Word"
          >
            <ClipboardPaste className="w-4 h-4 text-indigo-600" />
            <span>Salin & Tempel Kelas</span>
          </button>

          {/* Add Single Class */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kelas</span>
          </button>
        </div>
      </div>

      {/* Search & Statistics Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama kelas (contoh: VII A, VIII B)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          {selectedIds.length > 0 && (
            <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {selectedIds.length} dipilih
            </span>
          )}
          <span>
            Total: <strong className="text-slate-800">{classes.length} Kelas</strong> terdaftar
          </span>
        </div>
      </div>

      {/* Class Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="p-1 hover:text-blue-600 transition-colors"
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua kelas'}
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : isPartiallySelected ? (
                      <MinusSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4">Nama Kelas</th>
                <th className="py-3 px-4">Tingkat</th>
                <th className="py-3 px-4">Jumlah Siswa</th>
                <th className="py-3 px-4">Tanggal Dibuat</th>
                <th className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat data kelas...
                  </td>
                </tr>
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data kelas yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredClasses.map((cls, index) => {
                  const studentCount = getStudentCount(cls.id);
                  const isChecked = selectedIds.includes(cls.id);
                  return (
                    <tr
                      key={cls.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(cls.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {index + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {cls.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-slate-200">
                          Kelas {cls.gradeLevel}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-medium text-slate-800">
                          <Users className="w-3.5 h-3.5 text-blue-500" />
                          <span>{studentCount} Siswa</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(cls.createdAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDuplicateClass(cls)}
                            className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                            title="Salin / Duplikasi Kelas Ini"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(cls)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Kelas"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setClassToDelete(cls)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Kelas Ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =============================================================
          MODAL: SALIN & TEMPEL BANYAK KELAS (REQUESTED FEATURE)
      ============================================================= */}
      {showCopyPasteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <ClipboardPaste className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Salin & Tempel Banyak Kelas Sekaligus
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tempel daftar kelas dari Excel, Word, atau teks. Sistem otomatis mendeteksi tingkatan (VII, VIII, IX).
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCopyPasteModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banner */}
            {copyPasteNotification && (
              <div
                className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  copyPasteNotification.type === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : copyPasteNotification.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-blue-50 border-blue-200 text-blue-800'
                }`}
              >
                <Info className="w-4 h-4 shrink-0" />
                <span>{copyPasteNotification.message}</span>
              </div>
            )}

            {/* Quick Helper Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
              <label className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                Tempel Teks Daftar Kelas di Bawah:
              </label>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePasteFromClipboard}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 border border-slate-300"
                  title="Baca dari clipboard browser"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Tempel dari Clipboard</span>
                </button>
                <button
                  type="button"
                  onClick={handleLoadSampleClasses}
                  className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center gap-1 border border-indigo-200"
                  title="Muat contoh format kelas VII A-C, VIII A-C, IX A-C"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Contoh Format</span>
                </button>
              </div>
            </div>

            {/* Textarea Input */}
            <textarea
              rows={6}
              value={pastedText}
              onChange={(e) => handlePastedTextChange(e.target.value)}
              placeholder={`Ketik atau tempel nama kelas, contoh:
VII A
VII B
VII C
VIII A
VIII B
IX A
(atau dipisahkan koma: VII A, VII B, VII C)`}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed bg-slate-50 focus:bg-white"
            />

            {/* Analysis & Preview of Parsed Classes */}
            {parsedPreview.length > 0 && (
              <div className="mt-4 space-y-3 animate-in fade-in">
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                  <div className="font-bold text-slate-800 text-xs flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Hasil Analisis ({parsedPreview.length} Kelas Terdeteksi):</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {parsedPreview.filter((p) => !p.isDuplicate).length} Kelas Baru
                    </span>
                    {parsedPreview.filter((p) => p.isDuplicate).length > 0 && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        {parsedPreview.filter((p) => p.isDuplicate).length} Sudah Ada (Dilewati)
                      </span>
                    )}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-white text-xs">
                  {parsedPreview.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 flex items-center justify-between ${
                        item.isDuplicate ? 'bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 text-center font-mono text-slate-400 font-semibold">
                          {idx + 1}.
                        </span>
                        <strong className="text-slate-900">{item.name}</strong>
                        <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-semibold text-slate-600">
                          Tingkat {item.gradeLevel}
                        </span>
                      </div>

                      <div>
                        {item.isDuplicate ? (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                            Sudah Terdaftar
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Siap Disimpan
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCopyPasteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>

              <button
                type="button"
                disabled={parsedPreview.filter((p) => !p.isDuplicate).length === 0}
                onClick={handleSaveBulkClasses}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50 transition-all"
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>
                  Simpan {parsedPreview.filter((p) => !p.isDuplicate).length} Kelas Baru
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Class Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {editingClass ? 'Edit Nama Kelas' : 'Tambah Kelas Baru'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveClass} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Tingkat Kelas
                </label>
                <select
                  value={gradeInput}
                  onChange={(e) => setGradeInput(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
                >
                  <option value="7">Tingkat 7 (Kelas VII)</option>
                  <option value="8">Tingkat 8 (Kelas VIII)</option>
                  <option value="9">Tingkat 9 (Kelas IX)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nama Rombongan Belajar (Contoh: VII A, VIII B)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: VII A"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-semibold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md shadow-blue-600/20"
                >
                  {editingClass ? 'Simpan Perubahan' : 'Tambah Kelas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {classToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Kelas {classToDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Jika kelas ini dihapus, siswa yang sebelumnya terdaftar di kelas ini akan dialihkan menjadi tanpa kelas.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setClassToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteClass}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Kelas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus {selectedIds.length} Kelas Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} kelas</strong> untuk dihapus. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleBulkDelete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Semua Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
