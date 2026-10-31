import React, { useState, useEffect, useRef } from 'react';
import { Student, SchoolClass } from '../../types';
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
  downloadStudentTemplate,
  exportStudentsToFile,
  parseStudentFile,
} from '../../utils/exportImport';
import {
  GraduationCap,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit2,
  Trash2,
  CheckCircle,
  AlertTriangle,
  FileSpreadsheet,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

export const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal manual Add/Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [nisnInput, setNisnInput] = useState<string>('');
  const [classIdInput, setClassIdInput] = useState<string>('');
  const [genderInput, setGenderInput] = useState<'L' | 'P'>('L');
  const [statusInput, setStatusInput] = useState<'aktif' | 'nonaktif'>('aktif');
  const [modalError, setModalError] = useState<string>('');

  // Delete modal
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  // Import Preview Modal
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importPreview, setImportPreview] = useState<{
    valid: Omit<Student, 'id' | 'createdAt'>[];
    errors: { row: number; error: string; raw: any }[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [stdList, clsList] = await Promise.all([
        getAllFromStore<Student>(STORES.STUDENTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
      ]);
      setStudents(stdList);
      setClasses(clsList);
      setSelectedIds([]);
      if (!classIdInput && clsList.length > 0) {
        setClassIdInput(clsList[0].id);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setNameInput('');
    setNisnInput('');
    setGenderInput('L');
    setStatusInput('aktif');
    if (classes.length > 0) setClassIdInput(classes[0].id);
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (student: Student) => {
    setEditingStudent(student);
    setNameInput(student.name);
    setNisnInput(student.nisn || '');
    setClassIdInput(student.classId);
    setGenderInput(student.gender || 'L');
    setStatusInput(student.status);
    setModalError('');
    setShowModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();

    if (!cleanName) {
      setModalError('Nama lengkap siswa wajib diisi.');
      return;
    }

    const selectedCls = classes.find((c) => c.id === classIdInput);
    if (!selectedCls) {
      setModalError('Pilih kelas yang valid.');
      return;
    }

    try {
      if (editingStudent) {
        const updated: Student = {
          ...editingStudent,
          name: cleanName,
          nisn: nisnInput.trim(),
          classId: selectedCls.id,
          className: selectedCls.name,
          gender: genderInput,
          status: statusInput,
        };
        await putToStore(STORES.STUDENTS, updated);
        await logActivity('Admin', 'admin', 'Ubah Siswa', `Mengubah data siswa ${cleanName}`);
      } else {
        const newStudent: Student = {
          id: 'std_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5),
          name: cleanName,
          nisn: nisnInput.trim(),
          classId: selectedCls.id,
          className: selectedCls.name,
          gender: genderInput,
          status: statusInput,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        await putToStore(STORES.STUDENTS, newStudent);
        await logActivity('Admin', 'admin', 'Tambah Siswa', `Menambahkan siswa baru ${cleanName}`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan siswa: ${err.message}`);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      await deleteFromStore(STORES.STUDENTS, studentToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Siswa', `Menghapus siswa ${studentToDelete.name}`);
      setStudentToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus siswa: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.STUDENTS, selectedIds);
      await logActivity(
        'Admin',
        'admin',
        'Hapus Masal Siswa',
        `Menghapus ${selectedIds.length} siswa sekaligus dari sistem.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus siswa terpilih: ${err.message}`);
    }
  };

  // Import handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const validClassMap = new Map<string, string>();
      classes.forEach((c) => {
        validClassMap.set(c.name.toLowerCase().trim(), c.id);
      });

      const { validStudents, errors } = await parseStudentFile(file, validClassMap);
      setImportPreview({ valid: validStudents, errors });
      setShowImportModal(true);
    } catch (err: any) {
      alert(`Gagal memproses file impor: ${err.message}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.valid.length === 0) return;

    try {
      const newItems: Student[] = importPreview.valid.map((v, i) => ({
        ...v,
        id: 'std_' + Date.now().toString(36) + '_' + i + '_' + Math.random().toString(36).slice(2, 5),
        createdAt: new Date().toISOString().slice(0, 10),
      }));

      await putBatchToStore(STORES.STUDENTS, newItems);
      await logActivity(
        'Admin',
        'admin',
        'Impor Siswa',
        `Berhasil mengimpor ${newItems.length} siswa baru dari file.`
      );
      setShowImportModal(false);
      setImportPreview(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menyimpan data impor: ${err.message}`);
    }
  };

  // Filtered students
  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.nisn && s.nisn.includes(searchTerm));
    const matchesClass = selectedClassFilter ? s.classId === selectedClassFilter : true;
    return matchesSearch && matchesClass;
  });

  const isAllSelected =
    filteredStudents.length > 0 && selectedIds.length === filteredStudents.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < filteredStudents.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredStudents.map((s) => s.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            <span>Manajemen Data Siswa</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Data siswa terdaftar resmi untuk portal login ujian ANBK SMP Negeri 3 Kertek
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Bulk Delete Button */}
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.length} Siswa Terpilih</span>
            </button>
          )}

          {/* Download Template Menu */}
          <button
            onClick={() => downloadStudentTemplate('xlsx')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
            title="Unduh format template Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Template Excel</span>
          </button>

          {/* Upload Button */}
          <label className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300 cursor-pointer">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Impor File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Export Button */}
          <button
            onClick={() => exportStudentsToFile(filteredStudents, 'xlsx')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-300"
            title="Ekspor seluruh daftar siswa"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <span>Ekspor Data</span>
          </button>

          {/* Manual Add Button */}
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Siswa</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama atau NISN siswa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="relative w-full sm:w-56">
            <Filter className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            >
              <option value="">Semua Kelas ({students.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Kelas {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium self-end md:self-auto">
          {selectedIds.length > 0 && (
            <span className="font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
              {selectedIds.length} dipilih
            </span>
          )}
          <span>
            Menampilkan <strong className="text-slate-900">{filteredStudents.length}</strong> dari{' '}
            {students.length} siswa
          </span>
        </div>
      </div>

      {/* Students Table */}
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
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua siswa'}
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
                <th className="py-3 px-4">Nama Siswa</th>
                <th className="py-3 px-4">NISN</th>
                <th className="py-3 px-4">Kelas</th>
                <th className="py-3 px-4">L/P</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data siswa...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => {
                  const isChecked = selectedIds.includes(std.id);
                  return (
                    <tr
                      key={std.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(std.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {std.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {std.nisn || '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-md text-[11px] font-semibold border border-blue-200">
                          {std.className}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-600">
                        {std.gender}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          std.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {std.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(std)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Siswa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setStudentToDelete(std)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Siswa Ini"
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

      {/* Manual Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {editingStudent ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nama Lengkap Siswa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Faiz Al-Faruq"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    NISN (Nomor Induk)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 0098123401"
                    value={nisnInput}
                    onChange={(e) => setNisnInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Kelas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={classIdInput}
                    onChange={(e) => setClassIdInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Kelas {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Jenis Kelamin
                  </label>
                  <select
                    value={genderInput}
                    onChange={(e) => setGenderInput(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="L">Laki-laki (L)</option>
                    <option value="P">Perempuan (P)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Status Akun
                  </label>
                  <select
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  >
                    <option value="aktif">Aktif (Dapat Ujian)</option>
                    <option value="nonaktif">Nonaktif</option>
                  </select>
                </div>
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
                  {editingStudent ? 'Simpan Perubahan' : 'Tambah Siswa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Preview Modal */}
      {showImportModal && importPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <span>Pratinjau Impor Data Siswa</span>
                </h3>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  {importPreview.valid.length} Baris Valid
                </span>
              </div>

              {importPreview.errors.length > 0 && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1 text-amber-800">
                    <AlertTriangle className="w-4 h-4" />
                    Peringatan Validasi ({importPreview.errors.length} baris diabaikan):
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 max-h-24 overflow-y-auto">
                    {importPreview.errors.map((err, i) => (
                      <li key={i}>
                        Baris {err.row}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-xs text-slate-600 mb-3">
                Berikut adalah contoh data siswa valid yang akan disimpan ke IndexedDB:
              </p>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Nama Siswa</th>
                      <th className="py-2 px-3">Kelas</th>
                      <th className="py-2 px-3">NISN</th>
                      <th className="py-2 px-3">L/P</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {importPreview.valid.slice(0, 10).map((v, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-semibold">{v.name}</td>
                        <td className="py-2 px-3">{v.className}</td>
                        <td className="py-2 px-3 font-mono">{v.nisn || '-'}</td>
                        <td className="py-2 px-3">{v.gender}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batalkan Impor
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importPreview.valid.length === 0}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 disabled:opacity-40"
              >
                Simpan {importPreview.valid.length} Siswa ke Database
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Siswa {studentToDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Data siswa dari kelas <strong>{studentToDelete.className}</strong> akan dihapus dari daftar peserta ujian.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteStudent}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Siswa Ini
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
              Hapus {selectedIds.length} Siswa Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} siswa</strong> untuk dihapus secara permanen dari database lokal.
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
                Ya, Hapus Semua Siswa Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
