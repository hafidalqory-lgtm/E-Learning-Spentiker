import * as XLSX from 'xlsx';
import { Student, Question, ExamResult, RaporRecapItem, QuestionType, AssessmentType } from '../types';

/**
 * Downloads a generated file in browser
 */
export function downloadFile(content: BlobPart, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------------------------------------------------------------
// STUDENTS IMPORT / EXPORT
// -------------------------------------------------------------

export function downloadStudentTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    { 'No': 1, 'NISN': '0098123401', 'Nama Siswa': 'Ahmad Faiz Al-Faruq', 'Kelas': 'VII A', 'Jenis Kelamin (L/P)': 'L' },
    { 'No': 2, 'NISN': '0098123402', 'Nama Siswa': 'Annisa Nurul Ramadhani', 'Kelas': 'VII A', 'Jenis Kelamin (L/P)': 'P' },
    { 'No': 3, 'NISN': '0098123403', 'Nama Siswa': 'Bagus Tri Wibowo', 'Kelas': 'VII A', 'Jenis Kelamin (L/P)': 'L' },
    { 'No': 4, 'NISN': '0087123409', 'Nama Siswa': 'Muhammad Rizky Saputra', 'Kelas': 'VIII A', 'Jenis Kelamin (L/P)': 'L' },
    { 'No': 5, 'NISN': '0076123411', 'Nama Siswa': 'Rangga Arya Sena', 'Kelas': 'IX A', 'Jenis Kelamin (L/P)': 'L' },
  ];

  if (format === 'csv') {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin (L/P)'];
    const rows = sampleData.map(d => [d.No, d.NISN, `"${d['Nama Siswa']}"`, `"${d.Kelas}"`, d['Jenis Kelamin (L/P)']].join(','));
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, 'Template_Siswa_SMPN3Kertek.csv', 'text/csv;charset=utf-8;');
  } else {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Siswa');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(out, 'Template_Siswa_SMPN3Kertek.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export function exportStudentsToFile(students: Student[], format: 'xlsx' | 'csv' = 'xlsx') {
  const exportData = students.map((s, index) => ({
    'No': index + 1,
    'NISN': s.nisn || '-',
    'Nama Siswa': s.name,
    'Kelas': s.className,
    'Jenis Kelamin': s.gender || 'L',
    'Status': s.status,
    'Tanggal Terdaftar': s.createdAt,
  }));

  if (format === 'csv') {
    const headers = ['No', 'NISN', 'Nama Siswa', 'Kelas', 'Jenis Kelamin', 'Status', 'Tanggal Terdaftar'];
    const rows = exportData.map(d => [d.No, d.NISN, `"${d['Nama Siswa']}"`, `"${d.Kelas}"`, d['Jenis Kelamin'], d.Status, d['Tanggal Terdaftar']].join(','));
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `Data_Siswa_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Siswa');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(out, `Data_Siswa_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export async function parseStudentFile(
  file: File,
  validClassMap: Map<string, string> // key: className lowercase, value: classId
): Promise<{
  validStudents: Omit<Student, 'id' | 'createdAt'>[];
  errors: { row: number; error: string; raw: any }[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheet = wb.Sheets[wb.SheetNames[0]];
  const rows: any[] = XLSX.utils.sheet_to_json(firstSheet);

  const validStudents: Omit<Student, 'id' | 'createdAt'>[] = [];
  const errors: { row: number; error: string; raw: any }[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1
    const name = row['Nama Siswa'] || row['Nama'] || row['nama_siswa'] || row['name'];
    const className = row['Kelas'] || row['kelas'] || row['class'];
    const nisn = row['NISN'] || row['nisn'] || '';
    const genderRaw = (row['Jenis Kelamin (L/P)'] || row['Jenis Kelamin'] || row['gender'] || 'L').toString().toUpperCase();
    const gender = genderRaw.startsWith('P') ? 'P' : 'L';

    if (!name || !String(name).trim()) {
      errors.push({ row: rowNum, error: 'Kolom "Nama Siswa" kosong atau tidak ditemukan.', raw: row });
      return;
    }
    if (!className || !String(className).trim()) {
      errors.push({ row: rowNum, error: 'Kolom "Kelas" kosong atau tidak ditemukan.', raw: row });
      return;
    }

    const cleanClassName = String(className).trim();
    const classId = validClassMap.get(cleanClassName.toLowerCase());
    if (!classId) {
      errors.push({
        row: rowNum,
        error: `Kelas "${cleanClassName}" belum terdaftar di sistem. Daftarkan kelas di Menu Kelas terlebih dahulu.`,
        raw: row,
      });
      return;
    }

    validStudents.push({
      name: String(name).trim(),
      className: cleanClassName,
      classId,
      nisn: String(nisn || '').trim(),
      gender,
      status: 'aktif',
    });
  });

  return { validStudents, errors };
}

// -------------------------------------------------------------
// QUESTION BANK IMPORT / EXPORT
// -------------------------------------------------------------

export function matchSubject(
  query: string,
  subjectList: { id: string; name: string }[],
  defaultSubject?: { id: string; name: string }
): { id: string; name: string } | null {
  if (!query || !query.trim()) {
    return defaultSubject || (subjectList.length > 0 ? subjectList[0] : null);
  }
  const clean = query.trim().toLowerCase();

  // 1. Exact match by name or id
  const exact = subjectList.find(
    (s) => s.name.toLowerCase() === clean || s.id.toLowerCase() === clean
  );
  if (exact) return exact;

  // 2. Common Indonesian alias abbreviations for SMP subjects
  const aliasMap: Record<string, string[]> = {
    'ipa': ['ilmu pengetahuan alam', 'sains', 'ipa'],
    'ips': ['ilmu pengetahuan sosial', 'ips'],
    'matematika': ['mtk', 'mat', 'math', 'matematika'],
    'bahasa indonesia': ['b.indo', 'bindo', 'bin', 'bahasa indonesia', 'b indonesia', 'indonesia'],
    'bahasa inggris': ['b.ing', 'bing', 'inggris', 'english', 'eng', 'bahasa inggris', 'b inggris'],
    'pendidikan pancasila': ['pkn', 'ppkn', 'pancasila', 'pendidikan pancasila dan kewarganegaraan'],
    'pendidikan agama islam': ['pai', 'agama', 'agama islam', 'pendidikan agama', 'pendidikan agama islam dan budi pekerti'],
    'pendidikan jasmani': ['pjok', 'penjas', 'penjaskes', 'olahraga', 'pendidikan jasmani olahraga dan kesehatan'],
    'informatika': ['tik', 'komputer', 'informatika', 'it', 'teknologi informasi'],
    'seni budaya': ['seni', 'sbk', 'seni budaya dan prakarya', 'seni rupa', 'seni musik'],
    'prakarya': ['pkr', 'prakarya'],
    'bahasa jawa': ['jawa', 'b.jawa', 'bahasa daerah', 'muatan lokal'],
  };

  for (const [key, aliases] of Object.entries(aliasMap)) {
    if (aliases.some((a) => clean === a || clean.includes(a) || a.includes(clean))) {
      const found = subjectList.find((s) => {
        const sName = s.name.toLowerCase();
        return sName.includes(key) || aliases.some((a) => sName.includes(a));
      });
      if (found) return found;
    }
  }

  // 3. Substring matching
  const subMatch = subjectList.find(
    (s) => s.name.toLowerCase().includes(clean) || clean.includes(s.name.toLowerCase())
  );
  if (subMatch) return subMatch;

  // 4. Default subject fallback if provided
  if (defaultSubject) return defaultSubject;

  // 5. If only 1 subject exists, use it
  if (subjectList.length === 1) return subjectList[0];

  return null;
}

function getRowValue(row: Record<string, any>, candidates: string[]): string {
  const keys = Object.keys(row);
  for (const cand of candidates) {
    const candNorm = cand.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of keys) {
      const keyNorm = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (keyNorm === candNorm) {
        const val = row[key];
        if (val !== undefined && val !== null) {
          return String(val).trim();
        }
      }
    }
  }
  return '';
}

function cleanAnswerKey(rawAnswer: string, type: QuestionType): string {
  if (!rawAnswer) return type === 'uraian' ? '' : 'A';
  const ans = rawAnswer.trim();

  if (type === 'benar_salah') {
    const lower = ans.toLowerCase();
    if (
      lower.startsWith('b') ||
      lower.startsWith('t') ||
      lower === '1' ||
      lower.includes('benar') ||
      lower.includes('true')
    ) {
      return 'Benar';
    }
    if (
      lower.startsWith('s') ||
      lower.startsWith('f') ||
      lower === '0' ||
      lower.includes('salah') ||
      lower.includes('false')
    ) {
      return 'Salah';
    }
    return 'Benar';
  }

  if (type === 'pilihan_ganda') {
    // Strip "Opsi A", "(A)", "A.", "Kunci: A" -> extract uppercase letter
    const match = ans.match(/[A-Ea-e]/);
    if (match) {
      return match[0].toUpperCase();
    }
    return ans.toUpperCase();
  }

  if (type === 'pilihan_ganda_kompleks') {
    const matches = ans.toUpperCase().match(/[A-E]/g);
    if (matches && matches.length > 0) {
      return Array.from(new Set(matches)).sort().join(', ');
    }
    return ans;
  }

  return ans;
}

export function downloadQuestionTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    {
      'Mata Pelajaran': 'Informatika',
      'Asesmen': 'Asesmen Sumatif 1',
      'Kelas': 'VII A, VII B, VII C',
      'Jenis Soal': 'Pilihan Ganda',
      'Pertanyaan': 'Komponen utama komputer yang berfungsi sebagai otak pengendali seluruh program adalah...',
      'Pilihan A': 'Central Processing Unit (CPU)',
      'Pilihan B': 'Random Access Memory (RAM)',
      'Pilihan C': 'Hard Disk Drive (HDD)',
      'Pilihan D': 'Power Supply Unit (PSU)',
      'Pilihan E': '',
      'Kunci Jawaban': 'A',
      'Bobot': 10,
      'Pembahasan': 'CPU merupakan prosesor utama pemrosesan instruksi.',
    },
    {
      'Mata Pelajaran': 'Informatika',
      'Asesmen': 'Asesmen Sumatif 1',
      'Kelas': 'VII A, VII B, VII C',
      'Jenis Soal': 'Pilihan Ganda',
      'Pertanyaan': 'Perangkat keras di bawah ini yang tergolong sebagai perangkat masukan (input) adalah...',
      'Pilihan A': 'Keyboard dan Mouse',
      'Pilihan B': 'Monitor dan Speaker',
      'Pilihan C': 'Printer dan Plotter',
      'Pilihan D': 'Proyektor LCD',
      'Pilihan E': 'Headphone',
      'Kunci Jawaban': 'A',
      'Bobot': 10,
      'Pembahasan': 'Keyboard dan mouse berfungsi memasukkan data/perintah ke komputer.',
    },
    {
      'Mata Pelajaran': 'Informatika',
      'Asesmen': 'Asesmen Sumatif 1',
      'Kelas': 'VII A, VII B, VII C',
      'Jenis Soal': 'Benar/Salah',
      'Pertanyaan': 'Sistem operasi Linux bersifat open source dan dapat dikembangkan secara bebas.',
      'Pilihan A': 'Benar',
      'Pilihan B': 'Salah',
      'Pilihan C': '',
      'Pilihan D': '',
      'Pilihan E': '',
      'Kunci Jawaban': 'Benar',
      'Bobot': 10,
      'Pembahasan': 'Linux adalah sistem operasi open source berlisensi GNU GPL.',
    },
    {
      'Mata Pelajaran': 'Informatika',
      'Asesmen': 'Asesmen Sumatif 1',
      'Kelas': 'VII A, VII B, VII C',
      'Jenis Soal': 'Uraian',
      'Pertanyaan': 'Jelaskan perbedaan mendasar antara jaringan LAN (Local Area Network) dan WAN (Wide Area Network)!',
      'Pilihan A': '',
      'Pilihan B': '',
      'Pilihan C': '',
      'Pilihan D': '',
      'Pilihan E': '',
      'Kunci Jawaban': 'LAN mencakup area terbatas (gedung/sekolah), sedangkan WAN mencakup area geografis luas antarkota/negara.',
      'Bobot': 20,
      'Pembahasan': 'Rubrik: Penjelasan LAN cakupan lokal (10 poin), WAN cakupan luas (10 poin).',
    },
  ];

  if (format === 'csv') {
    const headers = Object.keys(sampleData[0]);
    const rows = sampleData.map((d) =>
      headers.map((h) => `"${String((d as any)[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, 'Template_Soal_SMPN3Kertek.csv', 'text/csv;charset=utf-8;');
  } else {
    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(
      out,
      'Template_Soal_SMPN3Kertek.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
}

export function exportQuestionsToFile(questions: Question[], format: 'xlsx' | 'csv' = 'xlsx') {
  const exportData = questions.map((q, idx) => ({
    'No': idx + 1,
    'Mata Pelajaran': q.subjectName,
    'Asesmen': q.assessmentType,
    'Kelas Sasaran': (q.targetClasses || []).join(', '),
    'Jenis Soal':
      q.type === 'pilihan_ganda'
        ? 'Pilihan Ganda'
        : q.type === 'uraian'
        ? 'Uraian'
        : q.type === 'benar_salah'
        ? 'Benar/Salah'
        : 'Pilihan Ganda Kompleks',
    'Pertanyaan': q.questionText,
    'Pilihan A': q.options.find((o) => o.key === 'A')?.text || '',
    'Pilihan B': q.options.find((o) => o.key === 'B')?.text || '',
    'Pilihan C': q.options.find((o) => o.key === 'C')?.text || '',
    'Pilihan D': q.options.find((o) => o.key === 'D')?.text || '',
    'Pilihan E': q.options.find((o) => o.key === 'E')?.text || '',
    'Kunci Jawaban': q.correctAnswer,
    'Bobot': q.weight,
    'Pembahasan': q.discussion || '',
  }));

  if (format === 'csv') {
    const headers = Object.keys(exportData[0] || {});
    const rows = exportData.map((d) =>
      headers.map((h) => `"${String((d as any)[h] || '').replace(/"/g, '""')}"`).join(',')
    );
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(
      csvContent,
      `Bank_Soal_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.csv`,
      'text/csv;charset=utf-8;'
    );
  } else {
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bank Soal');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(
      out,
      `Bank_Soal_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
}

export interface ParseQuestionOptions {
  defaultSubjectId?: string;
  defaultAssessment?: AssessmentType;
  defaultClassNames?: string[];
  forceOverrideSubject?: boolean;
  forceOverrideAssessment?: boolean;
}

export async function parseQuestionFile(
  file: File,
  subjects: { id: string; name: string }[],
  options: ParseQuestionOptions = {}
): Promise<{
  validQuestions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: { row: number; error: string; raw: any }[];
  warnings: { row: number; warning: string }[];
}> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File lembar kerja Excel kosong atau tidak terbaca.');
  }
  const firstSheet = wb.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

  if (!rows || rows.length === 0) {
    throw new Error('Tidak ada baris data yang ditemukan dalam berkas.');
  }

  const validQuestions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: { row: number; error: string; raw: any }[] = [];
  const warnings: { row: number; warning: string }[] = [];

  const defaultSubObj = options.defaultSubjectId
    ? subjects.find((s) => s.id === options.defaultSubjectId)
    : subjects[0];
  const defaultAssess = options.defaultAssessment || 'Asesmen Sumatif 1';
  const defaultClasses = options.defaultClassNames && options.defaultClassNames.length > 0
    ? options.defaultClassNames
    : ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'IX A'];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2;

    // Flexible column resolution
    const subjectRaw = getRowValue(row, [
      'Mata Pelajaran',
      'Mapel',
      'Subject',
      'Pelajaran',
      'Nama Mapel',
      'Mata_Pelajaran',
    ]);
    const assessmentRaw = getRowValue(row, [
      'Asesmen',
      'Penilaian',
      'Assessment',
      'Jenis Asesmen',
      'Sumatif',
      'Asesmen Sumatif',
    ]);
    const classesRaw = getRowValue(row, [
      'Kelas (Pisahkan Koma)',
      'Kelas Sasaran',
      'Target Kelas',
      'Kelas',
      'Target_Kelas',
      'Class',
    ]);
    const qTypeRaw = getRowValue(row, [
      'Jenis Soal',
      'Jenis',
      'Tipe Soal',
      'Tipe',
      'Bentuk Soal',
      'Bentuk',
      'Type',
    ]).toLowerCase();
    const questionText = getRowValue(row, [
      'Pertanyaan',
      'Soal',
      'Teks Soal',
      'Isi Soal',
      'Butir Soal',
      'Question',
      'Text',
    ]);
    const imageUrl = getRowValue(row, ['Gambar', 'Image', 'Foto', 'URL Gambar', 'Image URL']);
    const optA = getRowValue(row, ['Pilihan A', 'Opsi A', 'Jawaban A', 'A', 'Pilihan_A', 'Opsi_A']);
    const optB = getRowValue(row, ['Pilihan B', 'Opsi B', 'Jawaban B', 'B', 'Pilihan_B', 'Opsi_B']);
    const optC = getRowValue(row, ['Pilihan C', 'Opsi C', 'Jawaban C', 'C', 'Pilihan_C', 'Opsi_C']);
    const optD = getRowValue(row, ['Pilihan D', 'Opsi D', 'Jawaban D', 'D', 'Pilihan_D', 'Opsi_D']);
    const optE = getRowValue(row, ['Pilihan E', 'Opsi E', 'Jawaban E', 'E', 'Pilihan_E', 'Opsi_E']);
    const answerRaw = getRowValue(row, [
      'Kunci Jawaban',
      'Kunci',
      'Jawaban Benar',
      'Jawaban',
      'Kunci_Jawaban',
      'Key',
      'Answer',
    ]);
    const weightRaw = getRowValue(row, ['Bobot', 'Bobot Nilai', 'Skor', 'Poin', 'Weight', 'Score']);
    const discussion = getRowValue(row, ['Pembahasan', 'Rubrik', 'Keterangan', 'Discussion', 'Rubric']);

    // Check Question Text
    if (!questionText) {
      // If row is entirely empty, skip silently
      const rowValues = Object.values(row).filter((v) => String(v).trim().length > 0);
      if (rowValues.length <= 1) return;
      errors.push({
        row: rowNum,
        error: 'Teks "Pertanyaan/Soal" kosong pada baris ini.',
        raw: row,
      });
      return;
    }

    // Determine Subject
    let subjectObj = defaultSubObj;
    if (!options.forceOverrideSubject && subjectRaw) {
      const matched = matchSubject(subjectRaw, subjects, defaultSubObj);
      if (matched) {
        subjectObj = matched;
      } else {
        warnings.push({
          row: rowNum,
          warning: `Mata pelajaran "${subjectRaw}" tidak ditemukan. Menggunakan "${defaultSubObj?.name || 'Default'}".`,
        });
      }
    }

    if (!subjectObj) {
      errors.push({
        row: rowNum,
        error: 'Mata pelajaran belum terdaftar di sistem. Daftarkan di Menu Mata Pelajaran.',
        raw: row,
      });
      return;
    }

    // Determine Assessment
    let assessment: AssessmentType = defaultAssess;
    if (!options.forceOverrideAssessment && assessmentRaw) {
      const aLower = assessmentRaw.toLowerCase();
      if (aLower.includes('4') || aLower.includes('empat')) assessment = 'Asesmen Sumatif 4';
      else if (aLower.includes('3') || aLower.includes('tiga')) assessment = 'Asesmen Sumatif 3';
      else if (aLower.includes('2') || aLower.includes('dua')) assessment = 'Asesmen Sumatif 2';
      else if (aLower.includes('1') || aLower.includes('satu')) assessment = 'Asesmen Sumatif 1';
    }

    // Determine Question Type
    let type: QuestionType = 'pilihan_ganda';
    if (qTypeRaw.includes('uraian') || qTypeRaw.includes('esai') || qTypeRaw.includes('essay')) {
      type = 'uraian';
    } else if (
      qTypeRaw.includes('benar') ||
      qTypeRaw.includes('salah') ||
      qTypeRaw.includes('true') ||
      qTypeRaw.includes('false')
    ) {
      type = 'benar_salah';
    } else if (qTypeRaw.includes('kompleks') || qTypeRaw.includes('complex')) {
      type = 'pilihan_ganda_kompleks';
    } else if (!optA && !optB && (answerRaw.length > 5 || !answerRaw)) {
      // Auto-detect essay if no options are given and answer is long or blank
      type = 'uraian';
    }

    // Build options
    const optionsList: Question['options'] = [];
    if (type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks') {
      if (optA) optionsList.push({ key: 'A', text: optA });
      if (optB) optionsList.push({ key: 'B', text: optB });
      if (optC) optionsList.push({ key: 'C', text: optC });
      if (optD) optionsList.push({ key: 'D', text: optD });
      if (optE) optionsList.push({ key: 'E', text: optE });

      // If options are missing, warn and fall back
      if (optionsList.length < 2) {
        if (!optA && !optB) {
          // If no options, convert to uraian
          type = 'uraian';
          warnings.push({
            row: rowNum,
            warning: 'Pilihan jawaban A & B kosong. Jenis soal dialihkan ke Uraian/Esai.',
          });
        }
      }
    } else if (type === 'benar_salah') {
      optionsList.push({ key: 'A', text: 'Benar' }, { key: 'B', text: 'Salah' });
    }

    // Normalize Answer Key
    const cleanKey = cleanAnswerKey(answerRaw, type);
    if (!cleanKey && type !== 'uraian') {
      warnings.push({
        row: rowNum,
        warning: `Kunci jawaban kosong. Otomatis diset ke Pilihan A (silakan tinjau kembali).`,
      });
    }

    // Target Classes
    let targetClasses = defaultClasses;
    if (classesRaw) {
      const parsedClasses = classesRaw
        .split(/[,;]/)
        .map((c) => c.trim())
        .filter(Boolean);
      if (parsedClasses.length > 0) {
        targetClasses = parsedClasses;
      }
    }

    // Weight
    const parsedWeight = Number(weightRaw);
    const weight = !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : type === 'uraian' ? 20 : 10;

    validQuestions.push({
      subjectId: subjectObj.id,
      subjectName: subjectObj.name,
      assessmentType: assessment,
      targetClasses,
      type,
      questionText,
      imageUrl: imageUrl || undefined,
      options: optionsList,
      correctAnswer: cleanKey || (type === 'uraian' ? '' : 'A'),
      weight,
      discussion: discussion || undefined,
      scoringRubric: type === 'uraian' ? discussion || 'Rubrik penilaian guru' : undefined,
    });
  });

  return { validQuestions, errors, warnings };
}

/**
 * Parses questions pasted from Word or Plain Text.
 * Supports format:
 * 1. Question text...
 * A. Option A
 * B. Option B
 * C. Option C
 * D. Option D
 * Kunci: A
 * Bobot: 10
 */
export function parseQuestionText(
  rawText: string,
  subject: { id: string; name: string },
  assessment: AssessmentType,
  targetClasses: string[]
): {
  validQuestions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[];
  errors: { row: number; error: string; raw: any }[];
  warnings: { row: number; warning: string }[];
} {
  const validQuestions: Omit<Question, 'id' | 'createdAt' | 'updatedAt'>[] = [];
  const errors: { row: number; error: string; raw: any }[] = [];
  const warnings: { row: number; warning: string }[] = [];

  if (!rawText.trim()) {
    return { validQuestions, errors, warnings };
  }

  // Split text by lines
  const lines = rawText.split(/\r?\n/).map((l) => l.trim());

  // Group lines into question blocks
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  const isQuestionStart = (line: string): boolean => {
    return /^(?:soal\s*)?\d+[\.\)]\s+/i.test(line);
  };

  for (const line of lines) {
    if (!line) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }

    if (isQuestionStart(line)) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      currentBlock.push(line);
    } else {
      currentBlock.push(line);
    }
  }

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  blocks.forEach((block, idx) => {
    const qNum = idx + 1;
    let questionText = '';
    const options: Question['options'] = [];
    let correctAnswer = '';
    let weight = 10;
    let discussion = '';
    let type: QuestionType = 'pilihan_ganda';

    // Parse lines in block
    for (let i = 0; i < block.length; i++) {
      const line = block[i];

      // Match question text (first line usually)
      if (i === 0) {
        questionText = line.replace(/^(?:soal\s*)?\d+[\.\)]\s*/i, '').trim();
        continue;
      }

      // Check for answer key: "Kunci: A" or "Kunci Jawaban: A" or "Jawaban: A"
      const keyMatch = line.match(/^(?:kunci(?:\s*jawaban)?|jawaban)\s*[:=]\s*(.+)$/i);
      if (keyMatch) {
        correctAnswer = keyMatch[1].trim();
        continue;
      }

      // Check for weight: "Bobot: 10" or "Skor: 10" or "Poin: 10"
      const weightMatch = line.match(/^(?:bobot|skor|poin)\s*[:=]\s*(\d+)/i);
      if (weightMatch) {
        weight = parseInt(weightMatch[1], 10) || 10;
        continue;
      }

      // Check for discussion: "Pembahasan: ..." or "Rubrik: ..."
      const discMatch = line.match(/^(?:pembahasan|rubrik|keterangan)\s*[:=]\s*(.+)$/i);
      if (discMatch) {
        discussion = discMatch[1].trim();
        continue;
      }

      // Check for Option A, B, C, D, E
      const optMatch = line.match(/^([A-Ea-e])[\.\)]\s+(.+)$/);
      if (optMatch) {
        const key = optMatch[1].toUpperCase() as 'A' | 'B' | 'C' | 'D' | 'E';
        const text = optMatch[2].trim();
        options.push({ key, text });
        continue;
      }

      // If question text is multi-line before options
      if (options.length === 0 && !correctAnswer) {
        questionText += ' ' + line;
      } else if (discussion) {
        discussion += ' ' + line;
      }
    }

    if (!questionText) {
      errors.push({
        row: qNum,
        error: `Nomor ${qNum}: Teks pertanyaan tidak terdeteksi.`,
        raw: block.join('\n'),
      });
      return;
    }

    // Determine type
    if (options.length >= 2) {
      if (
        options.length === 2 &&
        options.some((o) => o.text.toLowerCase().includes('benar')) &&
        options.some((o) => o.text.toLowerCase().includes('salah'))
      ) {
        type = 'benar_salah';
      } else {
        type = 'pilihan_ganda';
      }
    } else {
      type = 'uraian';
      if (weight === 10) weight = 20; // default for essay
    }

    const cleanKey = cleanAnswerKey(correctAnswer, type);

    validQuestions.push({
      subjectId: subject.id,
      subjectName: subject.name,
      assessmentType: assessment,
      targetClasses: targetClasses.length > 0 ? targetClasses : ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'IX A'],
      type,
      questionText,
      options,
      correctAnswer: cleanKey || (type === 'uraian' ? '' : 'A'),
      weight,
      discussion: discussion || undefined,
      scoringRubric: type === 'uraian' ? discussion || 'Rubrik penilaian uraian' : undefined,
    });
  });

  return { validQuestions, errors, warnings };
}


// -------------------------------------------------------------
// EXAM RESULTS & RAPOR RECAP EXPORT
// -------------------------------------------------------------

export function exportExamResultsToFile(results: ExamResult[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = results.map((r, i) => ({
    'No': i + 1,
    'Nama Siswa': r.studentName,
    'Kelas': r.className,
    'Mata Pelajaran': r.subjectName,
    'Asesmen': r.assessmentType,
    'Total Soal': r.totalQuestions,
    'Benar (PG)': r.multipleChoiceCorrect,
    'Nilai PG': r.multipleChoiceScore,
    'Nilai Uraian': r.essayScore,
    'Nilai Akhir (0-100)': r.finalScore,
    'Status Penilaian': r.isFullyGraded ? 'Lengkap & Final' : 'Menunggu Koreksi Uraian',
    'Waktu Selesai': r.submittedAt ? new Date(r.submittedAt).toLocaleString('id-ID') : '-',
    'Pelanggaran': r.violationCount,
  }));

  if (format === 'csv') {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(d => headers.map(h => `"${String((d as any)[h] || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `Hasil_Ujian_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Ujian');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(out, `Hasil_Ujian_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export function exportRaporRecapToFile(recap: RaporRecapItem[], format: 'xlsx' | 'csv' = 'xlsx') {
  const data = recap.map((item, i) => ({
    'No': i + 1,
    'Nama Siswa': item.studentName,
    'Kelas': item.className,
    'Mata Pelajaran': item.subjectName,
    'Asesmen Sumatif 1': item.sumatif1 !== null ? item.sumatif1 : '-',
    'Asesmen Sumatif 2': item.sumatif2 !== null ? item.sumatif2 : '-',
    'Asesmen Sumatif 3': item.sumatif3 !== null ? item.sumatif3 : '-',
    'Asesmen Sumatif 4': item.sumatif4 !== null ? item.sumatif4 : '-',
    'Rata-Rata Rapor': item.averageScore !== null ? item.averageScore.toFixed(1) : '-',
    'Status Asesmen': `${item.completedCount}/4 Selesai`,
  }));

  if (format === 'csv') {
    const headers = Object.keys(data[0] || {});
    const rows = data.map(d => headers.map(h => `"${String((d as any)[h] || '').replace(/"/g, '""')}"`).join(','));
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    downloadFile(csvContent, `Rekap_Nilai_Rapor_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai Rapor');
    const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(out, `Rekap_Nilai_Rapor_SMPN3Kertek_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}
