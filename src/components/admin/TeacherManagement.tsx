import React, { useState, useEffect } from 'react';
import { Teacher, Subject, SchoolClass } from '../../types';
import {
  getAllFromStore,
  STORES,
  putToStore,
  deleteFromStore,
  deleteBatchFromStore,
  logActivity,
} from '../../db/indexedDB';
import { hashPassword } from '../../utils/auth';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  BookOpen,
  Layers,
  KeyRound,
  AlertTriangle,
  CheckSquare,
  Square,
  MinusSquare,
} from 'lucide-react';

export const TeacherManagement: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal Add / Edit
  const [showModal, setShowModal] = useState<boolean>(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [nipInput, setNipInput] = useState<string>('');
  const [usernameInput, setUsernameInput] = useState<string>('');
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [statusInput, setStatusInput] = useState<'aktif' | 'nonaktif'>('aktif');
  const [modalError, setModalError] = useState<string>('');

  // Delete Confirm
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState<boolean>(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tchList, sbjList, clsList] = await Promise.all([
        getAllFromStore<Teacher>(STORES.TEACHERS),
        getAllFromStore<Subject>(STORES.SUBJECTS),
        getAllFromStore<SchoolClass>(STORES.CLASSES),
      ]);
      setTeachers(tchList);
      setSubjects(sbjList);
      setClasses(clsList);
      setSelectedIds([]);
    } catch (err) {
      console.error('Failed to load teachers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setNameInput('');
    setNipInput('');
    setUsernameInput('');
    setPasswordInput('');
    setSelectedSubjectIds([]);
    setSelectedClassIds([]);
    setStatusInput('aktif');
    setModalError('');
    setShowModal(true);
  };

  const handleOpenEdit = (t: Teacher) => {
    setEditingTeacher(t);
    setNameInput(t.name);
    setNipInput(t.nip || '');
    setUsernameInput(t.username);
    setPasswordInput('');
    setSelectedSubjectIds(t.subjectIds || []);
    setSelectedClassIds(t.classIds || []);
    setStatusInput(t.status);
    setModalError('');
    setShowModal(true);
  };

  const toggleSubject = (sbjId: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(sbjId) ? prev.filter((id) => id !== sbjId) : [...prev, sbjId]
    );
  };

  const toggleClass = (clsId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(clsId) ? prev.filter((id) => id !== clsId) : [...prev, clsId]
    );
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUsername = usernameInput.trim().toLowerCase();

    if (!nameInput.trim()) {
      setModalError('Nama guru wajib diisi.');
      return;
    }
    if (!cleanUsername) {
      setModalError('Username guru wajib diisi.');
      return;
    }

    const duplicate = teachers.find(
      (t) => t.username.toLowerCase() === cleanUsername && t.id !== editingTeacher?.id
    );
    if (duplicate) {
      setModalError(`Username "${cleanUsername}" sudah digunakan oleh guru lain.`);
      return;
    }

    try {
      let passwordHash = editingTeacher?.passwordHash || '';
      if (!editingTeacher) {
        if (!passwordInput.trim()) {
          setModalError('Kata sandi wajib diisi untuk akun baru.');
          return;
        }
        passwordHash = await hashPassword(passwordInput);
      } else if (passwordInput.trim()) {
        passwordHash = await hashPassword(passwordInput);
      }

      if (editingTeacher) {
        const updated: Teacher = {
          ...editingTeacher,
          name: nameInput.trim(),
          nip: nipInput.trim(),
          username: cleanUsername,
          passwordHash,
          subjectIds: selectedSubjectIds,
          classIds: selectedClassIds,
          status: statusInput,
        };
        await putToStore(STORES.TEACHERS, updated);
        await logActivity('Admin', 'admin', 'Ubah Guru', `Mengubah profil guru ${nameInput}`);
      } else {
        const newTeacher: Teacher = {
          id: 'tch_' + Date.now().toString(36),
          name: nameInput.trim(),
          nip: nipInput.trim(),
          username: cleanUsername,
          passwordHash,
          subjectIds: selectedSubjectIds,
          classIds: selectedClassIds,
          status: statusInput,
          createdAt: new Date().toISOString().slice(0, 10),
        };
        await putToStore(STORES.TEACHERS, newTeacher);
        await logActivity('Admin', 'admin', 'Tambah Guru', `Menambahkan akun guru baru ${nameInput}`);
      }

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      setModalError(`Gagal menyimpan data guru: ${err.message}`);
    }
  };

  const handleDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    try {
      await deleteFromStore(STORES.TEACHERS, teacherToDelete.id);
      await logActivity('Admin', 'admin', 'Hapus Guru', `Menghapus akun guru ${teacherToDelete.name}`);
      setTeacherToDelete(null);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus guru: ${err.message}`);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await deleteBatchFromStore(STORES.TEACHERS, selectedIds);
      await logActivity(
        'Admin',
        'admin',
        'Hapus Masal Guru',
        `Menghapus ${selectedIds.length} akun guru sekaligus.`
      );
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
      await loadData();
    } catch (err: any) {
      alert(`Gagal menghapus guru terpilih: ${err.message}`);
    }
  };

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAllSelected =
    filteredTeachers.length > 0 && selectedIds.length === filteredTeachers.length;
  const isPartiallySelected =
    selectedIds.length > 0 && selectedIds.length < filteredTeachers.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTeachers.map((t) => t.id));
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
            <Users className="w-5 h-5 text-blue-600" />
            <span>Manajemen Akun Guru</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Kelola kewenangan login dan mata pelajaran yang diampu oleh dewan guru SMP Negeri 3 Kertek
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/20 transition-all animate-in fade-in"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus {selectedIds.length} Guru Terpilih</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md shadow-blue-600/20 transition-all self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Akun Guru</span>
          </button>
        </div>
      </div>

      {/* Search and Counts */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama guru atau username..."
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
            Total: <strong className="text-slate-800">{teachers.length} Guru</strong> terdaftar
          </span>
        </div>
      </div>

      {/* Teacher Table */}
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
                    title={isAllSelected ? 'Batalkan pilihan semua' : 'Pilih semua guru'}
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
                <th className="py-3 px-4">Nama Guru</th>
                <th className="py-3 px-4">NIP / Username</th>
                <th className="py-3 px-4">Mata Pelajaran</th>
                <th className="py-3 px-4">Kelas Diampu</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center w-28">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Memuat data guru...
                  </td>
                </tr>
              ) : filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    Tidak ditemukan data guru yang sesuai.
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((t, idx) => {
                  const taughtSubjects = subjects.filter((s) => t.subjectIds?.includes(s.id));
                  const taughtClasses = classes.filter((c) => t.classIds?.includes(c.id));
                  const isChecked = selectedIds.includes(t.id);

                  return (
                    <tr
                      key={t.id}
                      className={`hover:bg-blue-50/40 transition-colors ${
                        isChecked ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectOne(t.id)}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-medium text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {t.name}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        <div>@{t.username}</div>
                        {t.nip && <div className="text-[10px] text-slate-400 font-sans">NIP: {t.nip}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {taughtSubjects.length > 0 ? (
                            taughtSubjects.map((s) => (
                              <span
                                key={s.id}
                                className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] border border-blue-200"
                              >
                                {s.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Belum diatur</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {taughtClasses.length > 0 ? (
                            taughtClasses.map((c) => (
                              <span
                                key={c.id}
                                className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px] font-mono border border-slate-200"
                              >
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Semua kelas</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          t.status === 'aktif'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-200 text-slate-600'
                        }`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenEdit(t)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors"
                            title="Edit Akun Guru"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setTeacherToDelete(t)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Hapus Akun Guru Ini"
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
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 mb-4">
              {editingTeacher ? `Edit Akun Guru: ${editingTeacher.name}` : 'Tambah Akun Guru Baru'}
            </h3>

            {modalError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleSaveTeacher} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Nama Lengkap & Gelar Guru <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Triyono, S.Pd., M.Kom."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    NIP (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 198205122008011005"
                    value={nipInput}
                    onChange={(e) => setNipInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Username Login <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: triyono"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  {editingTeacher
                    ? 'Ganti Kata Sandi (Kosongkan jika tidak diubah)'
                    : 'Kata Sandi Login'}
                </label>
                <input
                  type="password"
                  placeholder={editingTeacher ? 'Masukkan sandi baru' : 'Contoh: guru123'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Subjects Checklist */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Pilih Mata Pelajaran yang Diampu
                </label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {subjects.map((sbj) => {
                    const isChecked = selectedSubjectIds.includes(sbj.id);
                    return (
                      <label
                        key={sbj.id}
                        className="flex items-center gap-2 cursor-pointer hover:text-blue-700"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSubject(sbj.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="truncate">{sbj.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Classes Checklist */}
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Pilih Kelas yang Menjadi Tanggung Jawabnya
                </label>
                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-28 overflow-y-auto">
                  {classes.map((cls) => {
                    const isChecked = selectedClassIds.includes(cls.id);
                    return (
                      <label
                        key={cls.id}
                        className="flex items-center gap-2 cursor-pointer hover:text-blue-700 font-mono"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleClass(cls.id)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span>{cls.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Status Akun
                </label>
                <select
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="aktif">Aktif (Dapat Login)</option>
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
                  {editingTeacher ? 'Simpan Perubahan' : 'Tambah Guru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Confirmation Modal */}
      {teacherToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 text-slate-800 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Hapus Akun Guru {teacherToDelete.name}?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Guru ini tidak akan dapat login lagi ke portal pengelolaan soal.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setTeacherToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleDeleteTeacher}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md shadow-rose-600/20"
              >
                Ya, Hapus Guru Ini
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
              Hapus {selectedIds.length} Akun Guru Sekaligus?
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Anda memilih <strong>{selectedIds.length} akun guru</strong> untuk dihapus dari sistem.
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
                Ya, Hapus Semua Guru Terpilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
