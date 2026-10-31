import React, { useState, useEffect } from 'react';
import { Subject, Teacher, Question } from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import {
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  UserCheck,
  AlertTriangle,
  Award,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [teacherIdInput, setTeacherIdInput] = useState<string>('');
  const [statusInput, setStatusInput] = useState<'aktif' | 'nonaktif'>('aktif');
  const [modalError, setModalError] = useState<string>('');

  // Delete modals
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sbjList, tchList, qList] = await Promise.all([
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<Teacher>(STORES.TEACHERS),
        getAllFromStore<Question>(STORES.QUESTIONS),
      ]);
      setSubjects(sbjList);
      setTeachers(tchList);
      setQuestions(qList);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setNameInput('');
    setCodeInput('');
    setTeacherIdInput('');
    setStatusInput('aktif');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject(s);
    setNameInput(s.name);
    setCodeInput(s.code);
    setTeacherIdInput(s.teacherId || '');
    setStatusInput(s.status);
    setModalError('');
    setShowModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    const cleanCode = codeInput.trim().toUpperCase();

    if (!cleanName) {
      setModalError('Nama mata pelajaran wajib diisi.');
      return;
    }
    if (!cleanCode) {
      setModalError('Kode mata pelajaran wajib diisi.');
      return;
    }

    const assignedTeacher = teachers.find((t) => t.id === teacherIdInput);

    try {
      if (editingSubject) {
        const updated: Subject = {
          ...editingSubject,
          name: cleanName,
          code: cleanCode,
          teacherId: assignedTeacher?.id,
          teacherName: assignedTeacher?.name,
          status: statusInput,
        };
        await putToStore(STORES.SUBJECTS, updated);
        await logActivity('Admin', 'admin', 'Ubah Mapel', `Mengubah mata pelajaran ${cleanName}`);
      } else {
        const newSubject: Subject = {
          id: 'sbj_' + Date.now().toString(36),
          name: cleanName,
          code: cleanCode,
          teacherId: assignedTeacher?.id,
          teacherName: assignedTeacher?.name,
          status: statusInput,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        await putToStore(STORES.SUBJECTS, newSubject);
        await logActivity('Admin', 'admin', 'Tambah Mapel', `Menambahkan mata pelajaran ${cleanName}`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan mata pelajaran: ${err.message}`);
    }
  };

  const handleDeleteSubject = async () => {
    if (!subjectToDelete) return;
    try {
      await deleteFromStore(STORES.SUBJECTS, subjectToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Mapel', `Menghapus mata pelajaran ${subjectToDelete.name}`);
      setSubjectToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus mata pelajaran: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.SUBJECTS, selectedIds);
      await logActivity(
        'Admin',
        'admin',
        'Hapus Masal Mapel',
        `Menghapus ${selectedIds.length} mata pelajaran sekaligus.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus mata pelajaran terpilih: ${err.message}`);
    }
  };

  const filteredSubjects = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected =
    filteredSubjects.length > 0 && selectedIds.length === filteredSubjects.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < filteredSubjects.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredSubjects.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <span>Manajemen Mata Pelajaran & Asesmen</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mendukung kurikulum terpadu dengan Asesmen Sumatif 1, 2, 3, dan 4
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.length} Mapel Terpilih</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Mata Pelajaran</span>
          </button>
        </div>
      </div>

      {/* Info Banner on Asesmen Sumatif 1, 2, 3, 4 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl text-xs text-blue-900 flex items-center gap-3">
        <Award className="w-5 h-5 text-blue-600 shrink-0" />
        <div>
          <strong className="block font-semibold">Struktur Asesmen Sumatif SMP Negeri 3 Kertek</strong>
          Setiap mata pelajaran dapat memiliki 4 tahapan evaluasi: <strong>Asesmen Sumatif 1</strong>, <strong>Asesmen Sumatif 2</strong>, <strong>Asesmen Sumatif 3</strong>, dan <strong>Asesmen Sumatif 4</strong> yang secara otomatis diintegrasikan ke formulir pembuatan soal dan rekap nilai rapor.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari mata pelajaran atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
          {selectedIds.length > 0 && (
            <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {selectedIds.length} dipilih
            </span>
          )}
          <span>
            Total: <strong className="text-slate-800">{subjects.length} Mata Pelajaran</strong>
          </span>
        </div>
      </div>

      {/* Table */}
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
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua mata pelajaran'}
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
                <th className="py-3 px-4">Kode</th>
                <th className="py-3 px-4">Nama Mata Pelajaran</th>
                <th className="py-3 px-4">Guru Pengampu</th>
                <th className="py-3 px-4">Butir Soal Tersimpan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data mata pelajaran...
                  </td>
                </tr>
              ) : filteredSubjects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan mata pelajaran yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredSubjects.map((s, idx) => {
                  const qCount = questions.filter((q) => q.subjectId === s.id).length;
                  const isChecked = selectedIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(s.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">
                        {s.code}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {s.name}
                      </td>
                      <td className="py-3 px-4">
                        {s.teacherName ? (
                          <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span>{s.teacherName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ditentukan</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded-md font-medium text-[11px] border border-slate-200">
                          {qCount} Soal
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          s.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Mapel"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSubjectToDelete(s)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Mapel Ini"
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

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {editingSubject ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveSubject} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Kode Mapel <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: INF-7"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Nama Mata Pelajaran <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Informatika"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Guru Pengampu (Penanggung Jawab)
                </label>
                <select
                  value={teacherIdInput}
                  onChange={(e) => setTeacherIdInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                >
                  <option value="">-- Pilih Guru Pengampu --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (@{t.username})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Status Mata Pelajaran
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aktif">Aktif (Dapat Dijadwalkan Asesmen)</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
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
                  {editingSubject ? 'Simpan Perubahan' : 'Tambah Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation */}
      {subjectToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Mata Pelajaran {subjectToDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Mata pelajaran akan dihapus dari sistem.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setSubjectToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteSubject}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Mapel Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus {selectedIds.length} Mata Pelajaran Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} mata pelajaran</strong> untuk dihapus dari sistem.
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
                Ya, Hapus Semua Mapel Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
