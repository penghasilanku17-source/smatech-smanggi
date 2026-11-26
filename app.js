/* =====================================================================
   SMATECH (SMANGGI TECHNOLOGY) — SMAN 1 Gondanglegi
   app.js : logika aplikasi lengkap (menggantikan blok <script> inline
   yang terpotong di index.html)
   ===================================================================== */
(function () {
  'use strict';

  const STORAGE_KEY = 'SMATECH_SMANGGI_STATE_V2';

  // =====================================================================
  // KONFIGURASI BACKEND GOOGLE APPS SCRIPT & ANTREAN OFFLINE
  // =====================================================================
  const SMATECH_CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbzw80dy-9qXAHVHNN_YN5-3RhUAQW3ZXQGqsX_6UkUfg1igDXCLGLNIGieT-v8Yd08ssQ/exec',
    OFFLINE_QUEUE_KEY: 'smatech_pending_results_v1'
  };

  const LETTERS = ['A', 'B', 'C', 'D', 'E'];
  const LEVELS = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
  const DEFAULT_PASSWORD = 'smanggi123';
  const TOTAL_Q = 40;

  // =====================================================================
  // UTILITAS DASAR
  // =====================================================================
  const $ = (id) => document.getElementById(id);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  function escapeHtml(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderIcons() {
    try { if (window.lucide && window.lucide.createIcons) window.lucide.createIcons(); } catch (e) { /* abaikan */ }
  }

  function nowTime() {
    return new Date().toLocaleTimeString('id-ID', { hour12: false });
  }

  function fmtDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function shuffleArr(a) {
    const r = a.slice();
    for (let i = r.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  function showToast(msg, type) {
    const stack = $('toastStack');
    if (!stack) return;
    const tones = {
      success: 'bg-emerald-600 text-white',
      error: 'bg-rose-600 text-white',
      warning: 'bg-amber-400 text-slate-900',
      info: 'bg-slate-800 text-white'
    };
    const el = document.createElement('div');
    el.className = 'pointer-events-auto px-4 py-3 rounded-xl shadow-lg text-xs font-semibold ' + (tones[type] || tones.info);
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function downloadBlob(content, mime, filename) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function triggerCsvDownload(rows, filename) {
    const csv = '\ufeff' + rows.map((r) => r.map((c) => {
      const s = String(c === undefined || c === null ? '' : c);
      return /[",\n\r;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }).join(',')).join('\r\n');
    downloadBlob(csv, 'text/csv;charset=utf-8', filename);
  }

  function isApiReady() {
    const url = String(SMATECH_CONFIG.API_URL || '').trim();
    return (
      url.startsWith('https://script.google.com/macros/s/') &&
      url.endsWith('/exec') &&
      !url.includes('MASUKKAN_URL_DEPLOYMENT_ANDA')
    );
  }

  async function sha256Hex(text) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const buf = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(text)));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (e) { /* jatuh ke fallback */ }
    return 'plain:' + String(text);
  }

  // POST text/plain agar tidak memicu preflight CORS pada Apps Script
  async function smatechApi(action, payload) {
    if (!isApiReady()) throw new Error('API belum dikonfigurasi');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 15000) : null;
    try {
      const res = await fetch(SMATECH_CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(Object.assign({ action: action }, payload || {})),
        signal: ctrl ? ctrl.signal : undefined
      });
      const json = await res.json();
      if (json && (json.ok === false || json.success === false)) {
        throw new Error(json.message || json.error || 'Permintaan ditolak server');
      }
      return json;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // =====================================================================
  // DATA AWAL (SEED)
  // =====================================================================
  const INFORMATICS_TEACHERS = [
    { id: 'T1', name: 'Pak Hardian Aji Kusuma, S.Kom.', initials: 'HA', role: 'Koordinator Informatika', email: 'hardian@smanggi.sch.id' },
    { id: 'T2', name: 'Bu Sari Wulandari, S.Pd.', initials: 'SW', role: 'Guru Informatika', email: 'sari@smanggi.sch.id' },
    { id: 'T3', name: 'Pak Dimas Prasetyo, S.T.', initials: 'DP', role: 'Guru Informatika', email: 'dimas@smanggi.sch.id' }
  ];

  const SAMPLE_LINES = [
    'Langkah pertama berpikir komputasional untuk memecahkan masalah besar adalah ... | Dekomposisi masalah | Menulis kode | Membeli perangkat | Menghapus data | Mencetak hasil | A | C1',
    'Proses mengenali pola yang berulang pada suatu masalah disebut ... | Abstraksi | Pengenalan pola | Dekomposisi | Algoritma | Debugging | B | C1',
    'Menyaring detail yang tidak penting dan fokus pada hal esensial disebut ... | Dekomposisi | Pengenalan pola | Abstraksi | Simulasi | Enkripsi | C | C1',
    'Urutan langkah logis dan terhingga untuk menyelesaikan masalah disebut ... | Variabel | Algoritma | Kompilator | Protokol | Basis data | B | C1',
    'Simbol belah ketupat pada flowchart digunakan untuk ... | Awal proses | Input data | Percabangan atau keputusan | Output | Akhir proses | C | C2',
    'Tipe data yang cocok untuk menyimpan nilai 3.14 adalah ... | Integer | Float | Boolean | String | Array | B | C1',
    'Hasil dari 7 % 3 pada pemrograman adalah ... | 0 | 1 | 2 | 3 | 4 | B | C2',
    'Struktur kontrol yang mengulang perintah selama kondisi terpenuhi adalah ... | If-else | Switch | While | Print | Import | C | C1',
    'Variabel adalah ... | Tempat menyimpan data yang nilainya dapat berubah | Perintah mencetak | Jenis kabel | Alat input | Nama file | A | C1',
    'Algoritma pencarian yang memeriksa elemen satu per satu dari awal disebut ... | Binary search | Sequential search | Bubble sort | Merge sort | Hashing | B | C1',
    'Binary search mensyaratkan data dalam kondisi ... | Acak | Terurut | Kosong | Duplikat semua | Terenkripsi | B | C2',
    'Singkatan IP pada IP address adalah ... | Internet Protocol | Internal Program | Input Process | Integrated Page | Interface Port | A | C1',
    'Protokol untuk mengakses halaman web secara aman adalah ... | HTTP | FTP | HTTPS | SMTP | DHCP | C | C1',
    'Perangkat yang menghubungkan beberapa komputer dalam satu jaringan lokal adalah ... | Switch | Monitor | Printer | Scanner | Speaker | A | C1',
    'Layanan yang menerjemahkan nama domain menjadi alamat IP adalah ... | DHCP | DNS | NAT | VPN | SSH | B | C2',
    'Topologi jaringan yang semua perangkatnya terhubung ke satu pusat disebut ... | Bus | Ring | Star | Mesh | Tree | C | C1',
    'Jaringan yang mencakup area satu gedung atau sekolah disebut ... | WAN | MAN | LAN | PAN | GAN | C | C1',
    'Contoh alamat IPv4 yang valid adalah ... | 192.168.1.10 | 300.1.1.1 | 192.168.1 | 192.168.1.1.1 | abc.def.ghi.jkl | A | C2',
    'Data mentah yang diolah menjadi informasi bermakna melalui proses ... | Analisis data | Instalasi | Defragmentasi | Booting | Formatting | A | C1',
    'Ukuran pemusatan data yang dihitung dengan menjumlah semua data lalu dibagi banyaknya data adalah ... | Modus | Median | Mean | Rentang | Kuartil | C | C2',
    'Data nilai 70, 80, dan 90 memiliki rata-rata ... | 70 | 75 | 80 | 85 | 90 | C | C2',
    'Diagram yang tepat untuk membandingkan jumlah antar kategori adalah ... | Diagram batang | Diagram alir | Diagram blok | Diagram ER | Diagram fase | A | C2',
    'Serangan yang menipu korban agar memberikan data pribadi lewat pesan palsu disebut ... | Phishing | Debugging | Streaming | Booting | Cloning | A | C1',
    'Kata sandi yang paling kuat adalah ... | 123456 | password | Nama sendiri | Kombinasi huruf besar, kecil, angka, dan simbol yang panjang | Tanggal lahir | D | C2',
    'Autentikasi dua faktor (2FA) bertujuan untuk ... | Mempercepat internet | Menambah lapisan keamanan akun | Menghapus virus | Memperbesar penyimpanan | Mengompres file | B | C2',
    'Proses mengubah data agar tidak terbaca pihak yang tidak berwenang disebut ... | Dekripsi | Enkripsi | Kompresi | Formatting | Indexing | B | C1',
    'Perangkat lunak berbahaya yang dibuat untuk merusak atau mencuri data disebut ... | Malware | Firmware | Freeware | Middleware | Hardware | A | C1',
    'Etika bermedia digital sebelum membagikan informasi adalah ... | Langsung menyebarkan | Memeriksa kebenaran sumbernya | Menambah bumbu agar menarik | Mengubah judul | Menghapus sumber | B | C3',
    'Hak cipta melindungi ... | Karya orisinal pencipta | Alamat IP | Kata sandi | Kabel jaringan | Suhu ruangan | A | C1',
    'Jejak digital adalah ... | Data aktivitas online yang tertinggal | Bekas sidik jari di keyboard | Kabel putus | Sinyal wifi | Daya baterai | A | C2',
    'Dalam flowchart, simbol persegi panjang menyatakan ... | Proses | Keputusan | Awal | Konektor | Dokumen | A | C1',
    'Pseudocode adalah ... | Bahasa mesin | Representasi algoritma dengan bahasa mirip bahasa manusia | Jenis virus | Protokol jaringan | Format gambar | B | C1',
    'Kesalahan logika program yang membuat keluaran tidak sesuai harapan disebut ... | Syntax error | Logic error | Hardware fault | Network error | Power error | B | C2',
    'Proses mencari dan memperbaiki kesalahan program disebut ... | Compiling | Debugging | Deploying | Coding | Streaming | B | C1',
    'Larik (array) adalah ... | Kumpulan data bertipe sama yang diakses dengan indeks | Sebuah perulangan | Jenis jaringan | Perangkat output | Alamat email | A | C2',
    'Jika indeks array dimulai dari 0, elemen ke-3 diakses dengan indeks ... | 0 | 1 | 2 | 3 | 4 | C | C3',
    'Bilangan biner 101 bernilai desimal ... | 3 | 4 | 5 | 6 | 7 | C | C2',
    '1 byte sama dengan ... | 2 bit | 4 bit | 8 bit | 16 bit | 32 bit | C | C1',
    'Mengunggah data ke penyimpanan awan memerlukan ... | Koneksi internet | Disket | Kabel VGA | Printer | Speaker | A | C2',
    'Dampak positif perkembangan teknologi informasi di bidang pendidikan adalah ... | Akses sumber belajar lebih luas | Semua guru tergantikan | Tidak perlu belajar | Internet tidak diperlukan | Buku dilarang | A | C3'
  ];

  const SEED_STUDENTS = [
    ['261001', 'Nabila Putri', 'X-1'], ['261002', 'Raka Pratama', 'X-1'],
    ['261003', 'Salsabila Azzahra', 'X-2'], ['261004', 'Muhammad Fajar', 'X-2'],
    ['261005', 'Dewi Anggraini', 'X-3'], ['261006', 'Bagus Setiawan', 'X-3'],
    ['261007', 'Aulia Rahma', 'X-4'], ['261008', 'Rizky Maulana', 'X-4'],
    ['261009', 'Putri Maharani', 'XI-1'], ['261010', 'Ahmad Zaki', 'XI-1'],
    ['261011', 'Citra Lestari', 'XI-2'], ['261012', 'Dimas Aditya', 'XI-2'],
    ['261013', 'Fitri Handayani', 'XI-3'], ['261014', 'Yoga Permana', 'XI-3'],
    ['261015', 'Nur Aini', 'XI-4'], ['261016', 'Eko Prasetyo', 'XI-4']
  ];

  // =====================================================================
  // PARSER SOAL
  // =====================================================================
  function parseQuestionLine(raw) {
    let line = String(raw || '').trim();
    if (!line) return null;
    line = line.replace(/^\s*\d+\s*[.)]\s+/, '');
    const p = line.split('|').map((s) => s.trim());
    if (p.length < 7) return { error: 'Kolom kurang (minimal 7 kolom dipisah tanda |)' };
    const question = p[0];
    const options = [p[1], p[2], p[3], p[4], p[5]];
    const answer = String(p[6] || '').toUpperCase();
    const level = String(p[7] || 'C2').toUpperCase();
    if (!question) return { error: 'Pertanyaan kosong' };
    if (!options.slice(0, 4).every(Boolean)) return { error: 'Opsi A–D wajib diisi' };
    if (LETTERS.indexOf(answer) === -1) return { error: 'Kunci harus A–E' };
    if (!options[LETTERS.indexOf(answer)]) return { error: 'Kunci menunjuk opsi kosong' };
    if (LEVELS.indexOf(level) === -1) return { error: 'Level harus C1–C6' };
    return { q: { question: question, options: options, answer: answer, level: level } };
  }

  function isValidQuestion(q) {
    return !!(q && String(q.question || '').trim() &&
      q.options.slice(0, 4).every((o) => String(o || '').trim()) &&
      LETTERS.indexOf(q.answer) !== -1 &&
      String(q.options[LETTERS.indexOf(q.answer)] || '').trim() &&
      LEVELS.indexOf(q.level) !== -1);
  }

  function rotateQuestion(q, k) {
    if (!q.options.every((o) => String(o || '').trim())) return clone(q);
    const n = q.options.length;
    const opts = q.options.map((_, j) => q.options[(j + k) % n]);
    const oldIdx = LETTERS.indexOf(q.answer);
    return { question: q.question, options: opts, answer: LETTERS[(oldIdx - k + n * 10) % n], level: q.level };
  }

  function makeRng(seed) {
    let s = seed;
    return function () {
      s = (s * 1664525 + 1013904223) % 4294967296;
      return s / 4294967296;
    };
  }

  function gradeAttempt(att, batch) {
    let correct = 0;
    let answered = 0;
    batch.questions.forEach((q, i) => {
      const a = att.answers[i];
      if (a) {
        answered++;
        if (a === q.answer) correct++;
      }
    });
    att.totalQuestions = batch.questions.length;
    att.answeredCount = answered;
    att.correctCount = correct;
    att.score = Math.round((correct / (att.totalQuestions || TOTAL_Q)) * 100);
  }

  function seedAttempt(student, tok, batch, accuracy, status, violations, seed, minutesAgo) {
    const rnd = makeRng(seed);
    const answers = batch.questions.map((q) => {
      if (rnd() < accuracy) return q.answer;
      const wrong = LETTERS.filter((l) => l !== q.answer);
      return wrong[Math.floor(rnd() * wrong.length)];
    });
    const logs = [];
    const reasons = ['Perpindahan Tab / Browser Disembunyikan', 'Fokus Jendela Ujian Hilang (Window Blur)', 'Keluar dari Mode Layar Penuh'];
    for (let i = 0; i < violations; i++) {
      logs.push({ reason: reasons[i % reasons.length], time: '09.' + String(10 + i * 7).padStart(2, '0') + '.' + String(12 + i * 5).padStart(2, '0') });
    }
    const att = {
      id: 'ATT-SEED-' + student.nis,
      token: tok.token,
      nis: student.nis,
      name: student.name,
      className: student.className,
      status: status,
      violations: violations,
      violationLogs: logs,
      totalQuestions: batch.questions.length,
      answers: answers,
      flags: {},
      order: batch.questions.map((_, i) => i),
      optOrders: batch.questions.map(() => [0, 1, 2, 3, 4]),
      endAt: 0,
      current: 0,
      startedAt: new Date(Date.now() - minutesAgo * 60000).toISOString(),
      finishedAt: new Date(Date.now() - (minutesAgo - 40) * 60000).toISOString()
    };
    gradeAttempt(att, batch);
    return att;
  }

  function seedDb() {
    const base = SAMPLE_LINES.map((l) => parseQuestionLine(l).q);
    const now = Date.now();
    const day = 86400000;
    const batches = [
      {
        id: 'B-001', title: 'Asesmen Sumatif Informatika X — Berpikir Komputasional & Algoritma',
        className: 'Kelas X', topic: 'Berpikir Komputasional', teacherId: 'T1',
        createdAt: new Date(now - 6 * day).toISOString(), questions: clone(base)
      },
      {
        id: 'B-002', title: 'Latihan Jaringan Komputer & Internet (Kelas X)',
        className: 'Kelas X', topic: 'Jaringan Komputer & Internet', teacherId: 'T2',
        createdAt: new Date(now - 3 * day).toISOString(), questions: base.map((q, i) => rotateQuestion(q, 1 + (i % 4)))
      },
      {
        id: 'B-003', title: 'Asesmen Sumatif Informatika XI — Analisis Data & Keamanan Siber',
        className: 'Kelas XI', topic: 'Analisis Data & Keamanan Siber', teacherId: 'T3',
        createdAt: new Date(now - day).toISOString(), questions: base.slice().reverse().map((q) => rotateQuestion(q, 2))
      }
    ];
    const students = SEED_STUDENTS.map((r) => ({ nis: r[0], name: r[1], className: r[2], active: true }));
    const tokens = [
      {
        token: 'SMG26A', title: 'Sumatif Informatika Kelas X', batchId: 'B-001', targetClass: 'KELAS_X',
        durationMinutes: 60, kkm: 75, maxViolations: 3, randomize: true, enforceFullscreen: true,
        showScore: true, status: 'AKTIF', createdBy: INFORMATICS_TEACHERS[0].name
      },
      {
        token: 'SMG26B', title: 'Sumatif Informatika Kelas XI', batchId: 'B-003', targetClass: 'KELAS_XI',
        durationMinutes: 60, kkm: 75, maxViolations: 3, randomize: true, enforceFullscreen: true,
        showScore: true, status: 'AKTIF', createdBy: INFORMATICS_TEACHERS[2].name
      }
    ];
    const byNis = (n) => students.find((s) => s.nis === n);
    const attempts = [
      seedAttempt(byNis('261002'), tokens[0], batches[0], 0.9, 'SELESAI', 0, 11, 120),
      seedAttempt(byNis('261003'), tokens[0], batches[0], 0.72, 'SELESAI', 1, 22, 110),
      seedAttempt(byNis('261004'), tokens[0], batches[0], 0.95, 'SELESAI', 0, 33, 100),
      seedAttempt(byNis('261005'), tokens[0], batches[0], 0.55, 'TERKUNCI', 3, 44, 90)
    ];
    return { version: 2, batches: batches, students: students, tokens: tokens, attempts: attempts };
  }

  function loadDb() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.batches) && Array.isArray(parsed.students) &&
          Array.isArray(parsed.tokens) && Array.isArray(parsed.attempts)) {
          return parsed;
        }
      }
    } catch (e) { /* data rusak: pakai seed */ }
    const fresh = seedDb();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh)); } catch (e) { /* abaikan */ }
    return fresh;
  }

  // =====================================================================
  // STATE
  // =====================================================================
  let db = { batches: [], students: [], tokens: [], attempts: [] };

  function emptyDraft() {
    return Array.from({ length: TOTAL_Q }, () => ({ question: '', options: ['', '', '', '', ''], answer: '', level: 'C2' }));
  }

  const runtime = {
    activeTeacher: null,
    activeModule: 'bank',
    bankSort: 'newest',
    resultsSubTab: 'grades',
    inputSubTab: 'paste',
    draft: emptyDraft(),
    draftSource: 'paste',
    variants: { A: [], B: [], C: [] },
    variantBatchId: null,
    activeVariant: 'A',
    inspectorBatchId: null,
    inspectorShowKeys: false,
    pending: null,
    cbtSession: null,
    flushing: false
  };

  function persistDb() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); } catch (e) { /* kuota penuh */ }
    updateBadges();
  }

  function getBatch(id) { return db.batches.find((b) => b.id === id); }
  function teacherName(id) {
    const t = INFORMATICS_TEACHERS.find((x) => x.id === id);
    return t ? t.name : 'Guru Informatika';
  }

  function updateBadges() {
    const totalQ = db.batches.reduce((s, b) => s + b.questions.length, 0);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    set('badgeBankCount', db.batches.length);
    set('badgeStudentCount', db.students.length);
    set('badgeLiveActive', db.tokens.filter((t) => t.status === 'AKTIF').length);
    set('gateStatQuestions', totalQ);
    set('gateStatStudents', db.students.length);
  }

  // =====================================================================
  // 1. AUTENTIKASI
  // =====================================================================
  function setAuthTab(tab) {
    const isTeacher = tab !== 'student';
    if ($('authTeacherPanel')) $('authTeacherPanel').classList.toggle('hidden', !isTeacher);
    if ($('authStudentPanel')) $('authStudentPanel').classList.toggle('hidden', isTeacher);
    const on = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold bg-brand-900 text-white shadow-xs transition flex items-center justify-center gap-2';
    const off = 'py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-2';
    if ($('segTeacherBtn')) $('segTeacherBtn').className = isTeacher ? on : off;
    if ($('segStudentBtn')) $('segStudentBtn').className = isTeacher ? off : on;
  }

  function renderQuickTeacherCards() {
    const grid = $('quickTeacherGrid');
    if (!grid) return;
    grid.innerHTML = INFORMATICS_TEACHERS.map((t) => `
      <button type="button" onclick="quickTeacherLogin('${t.id}')"
        class="p-3 rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 text-left transition flex flex-col gap-2">
        <span class="w-9 h-9 rounded-xl bg-brand-900 text-cyan-300 font-bold text-xs flex items-center justify-center">${escapeHtml(t.initials)}</span>
        <span>
          <strong class="block text-xs text-slate-900 leading-tight">${escapeHtml(t.name)}</strong>
          <span class="block text-[10px] text-slate-500 mt-0.5">${escapeHtml(t.role)}</span>
        </span>
      </button>`).join('');
  }

  function loginTeacher(teacher) {
    runtime.activeTeacher = teacher;
    $('authGateView')?.classList.add('hidden');
    $('studentCbtView')?.classList.add('hidden');
    $('teacherWorkspaceView')?.classList.remove('hidden');
    if ($('topbarTeacherInitials')) $('topbarTeacherInitials').textContent = teacher.initials;
    if ($('topbarTeacherName')) $('topbarTeacherName').textContent = teacher.name;
    if ($('topbarTeacherRole')) $('topbarTeacherRole').textContent = teacher.role;
    populateAllDropdowns();
    switchTeacherModule('bank');
    syncDashboardFromCloud(true);
    showToast('Selamat datang, ' + teacher.name, 'success');
  }

  function quickTeacherLogin(id) {
    const t = INFORMATICS_TEACHERS.find((x) => x.id === id);
    if (t) loginTeacher(t);
  }

  async function handleTeacherManualLogin(e) {
    e.preventDefault();
    const box = $('teacherLoginErrorBox');
    const showErr = (m) => { if (box) { box.textContent = m; box.classList.remove('hidden'); } };
    if (box) box.classList.add('hidden');
    const user = ($('teacherEmailInput')?.value || '').trim().toLowerCase();
    const pass = $('teacherPassInput')?.value || '';
    if (!user || !pass) { showErr('Email/username dan kata sandi wajib diisi.'); return; }
    // Login hanya melalui Google Sheets (sheet Users).
    if (!isApiReady()) {
      showErr('Server belum dikonfigurasi. Hubungi administrator.');
      return;
    }
    try {
      const passwordHash = await sha256Hex(pass);
      const res = await smatechApi('loginGuru', { email: user, passwordHash: passwordHash });
      if (res && res.user) {
        const u = res.user;
        const initials = String(u.nama || 'GR').split(' ').filter(Boolean).slice(0, 2).map((w) => (w[0] || '')).join('').toUpperCase();
        loginTeacher({
          id: u.user_id || 'GURU-01',
          initials: initials || 'GR',
          name: u.nama || 'Guru',
          email: u.email || user,
          role: u.role || 'Guru Informatika'
        });
        return;
      }
      if (res && res.reason) { showErr(res.reason); return; }
      showErr('Akun guru tidak ditemukan atau kata sandi salah.');
    } catch (err) {
      showErr('Tidak dapat terhubung ke server. Pastikan Apps Script sudah di-deploy ulang.');
    }
  }

  function manualCloudSync() { syncDashboardFromCloud(false); }

  function logoutToGate() {
    runtime.activeTeacher = null;
    $('teacherWorkspaceView')?.classList.add('hidden');
    $('studentCbtView')?.classList.add('hidden');
    $('authGateView')?.classList.remove('hidden');
    setAuthTab('teacher');
  }

  function launchStudentPortalFromTeacher() {
    $('teacherWorkspaceView')?.classList.add('hidden');
    $('authGateView')?.classList.remove('hidden');
    setAuthTab('student');
    fillQuickStudentDemo();
  }

  function toggleMobileSidebar(open) {
    const sidebar = $('teacherSidebar');
    const backdrop = $('mobileSidebarBackdrop');
    if (!sidebar) return;
    if (open) {
      sidebar.classList.remove('-translate-x-full');
      if (backdrop) backdrop.classList.remove('hidden');
    } else {
      sidebar.classList.add('-translate-x-full');
      if (backdrop) backdrop.classList.add('hidden');
    }
  }

  function closeModal(id) { $(id)?.classList.add('hidden'); }
  function openModal(id) { $(id)?.classList.remove('hidden'); renderIcons(); }

  const MODULE_META = {
    bank: { title: 'Bank Soal (40-Butir)', subtitle: 'Kolaborasi Repositori Soal Informatika SMAN 1 Gondanglegi' },
    input: { title: 'Input Batch 40 Soal', subtitle: 'Smart Paste Parser & Grid Editor Terstruktur 40 Butir' },
    compose: { title: 'Pengolahan & Rakit Ujian', subtitle: 'Generator Paket Acak A/B/C & Mix-Match Lintas Batch' },
    students: { title: 'Data Siswa (X & XI)', subtitle: 'Direktori Peserta Didik & Validasi NIS Ujian CBT' },
    live: { title: 'Ujian Live & Token', subtitle: 'Manajemen Token Sesi 6-Karakter & Live Proctoring' },
    results: { title: 'Hasil, Nilai & Analisis', subtitle: 'Rekap Skor, Ketuntasan KKM & Analisis Butir Soal' }
  };

  function switchTeacherModule(moduleKey) {
    runtime.activeModule = MODULE_META[moduleKey] ? moduleKey : 'bank';
    document.querySelectorAll('.workspace-module').forEach((sec) => sec.classList.add('hidden'));
    $('module-' + runtime.activeModule)?.classList.remove('hidden');

    document.querySelectorAll('.sidebar-nav-btn').forEach((btn) => {
      const isActive = btn.getAttribute('data-nav') === runtime.activeModule;
      btn.className = isActive
        ? 'sidebar-nav-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-indigo-600 text-white shadow-xs transition'
        : 'sidebar-nav-btn w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white transition';
    });

    const meta = MODULE_META[runtime.activeModule];
    if ($('topbarModuleTitle')) $('topbarModuleTitle').textContent = meta.title;
    if ($('topbarModuleSubtitle')) $('topbarModuleSubtitle').textContent = meta.subtitle;
    toggleMobileSidebar(false);

    const m = runtime.activeModule;
    if (m === 'bank') renderBankBatches();
    if (m === 'input') { renderGridEditorRows(); evaluateDraftValidity(); }
    if (m === 'compose') { generateShuffledVariants(); refreshMixStatus(); }
    if (m === 'students') renderStudentDirectory();
    if (m === 'live') {
      if ($('liveTokenInput') && !$('liveTokenInput').value) populateNewTokenCode();
      renderActiveTokensGrid();
      renderLiveProctoringTable();
    }
    if (m === 'results') renderResultsModule();
    renderIcons();
  }

  function populateAllDropdowns() {
    const teacherSel = $('bankTeacherFilter');
    if (teacherSel) {
      const prev = teacherSel.value || 'ALL';
      teacherSel.innerHTML = '<option value="ALL">Semua Guru (3 Guru)</option>' +
        INFORMATICS_TEACHERS.map((t) => `<option value="${t.id}">${escapeHtml(t.name)}</option>`).join('');
      teacherSel.value = prev;
    }

    const batchOptionsHtml = db.batches.map((b) =>
      `<option value="${escapeHtml(b.id)}">[${escapeHtml(b.id)}] ${escapeHtml(b.title)}</option>`).join('');

    ['variantSourceBatchSelect', 'mixSource1Select', 'mixSource2Select', 'liveBatchSelect'].forEach((id, idx) => {
      const el = $(id);
      if (!el) return;
      const prev = el.value;
      el.innerHTML = batchOptionsHtml;
      if (prev && db.batches.some((b) => b.id === prev)) el.value = prev;
      else if (idx === 2 && db.batches.length > 1) el.value = db.batches[1].id;
    });

    const tokenOptsAll = '<option value="ALL">Semua Sesi Token</option>' +
      db.tokens.map((t) => `<option value="${escapeHtml(t.token)}">${escapeHtml(t.token)} — ${escapeHtml(t.title)}</option>`).join('');
    const pf = $('proctorTokenFilter');
    if (pf) { const prev = pf.value; pf.innerHTML = tokenOptsAll; if (prev) pf.value = prev; if (!pf.value) pf.value = 'ALL'; }

    const resFilter = $('resultsTokenFilter');
    if (resFilter) {
      const prev = resFilter.value;
      resFilter.innerHTML = db.tokens.map((t) =>
        `<option value="${escapeHtml(t.token)}">${escapeHtml(t.token)} — ${escapeHtml(t.title)}</option>`).join('');
      if (prev && db.tokens.some((t) => t.token === prev)) resFilter.value = prev;
    }
    updateBadges();
  }

  function populateNewTokenCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = 'SMG';
      for (let i = 0; i < 3; i++) code += chars[Math.floor(Math.random() * chars.length)];
    } while (db.tokens.some((t) => t.token === code));
    if ($('liveTokenInput')) $('liveTokenInput').value = code;
  }

  function fillQuickStudentDemo() {
    const activeStudent = db.students.find((s) => s.active && !db.attempts.some((a) => a.nis === s.nis && a.token === 'SMG26A')) ||
      db.students.find((s) => s.active) || db.students[0];
    const activeTok = db.tokens.find((t) => t.status === 'AKTIF') || db.tokens[0];
    if ($('cbtNisInput') && activeStudent) {
      $('cbtNisInput').value = activeStudent.nis;
      updateStudentLookupPreview(activeStudent.nis);
    }
    if ($('cbtTokenCodeInput') && activeTok) $('cbtTokenCodeInput').value = activeTok.token;
  }

  function updateStudentLookupPreview(nisRaw) {
    const box = $('studentLookupPreview');
    if (!box) return;
    const nis = String(nisRaw || '').trim();
    if (!nis) {
      box.className = 'p-3.5 rounded-2xl border border-slate-200 bg-slate-50 transition';
      box.innerHTML = `<div class="flex items-center gap-3 text-xs text-slate-500">
        <div class="w-9 h-9 rounded-xl bg-slate-200/80 flex items-center justify-center text-slate-500 shrink-0"><i data-lucide="user-search" class="w-4 h-4"></i></div>
        <div><span class="font-semibold text-slate-700 block">Pencarian Otomatis Database Siswa</span><span>Ketik NIS untuk memverifikasi identitas & kelas peserta secara instan.</span></div>
      </div>`;
      renderIcons();
      return;
    }
    const found = db.students.find((s) => s.nis === nis);
    if (found) {
      box.className = 'p-3.5 rounded-2xl border border-emerald-300 bg-emerald-50/70 transition';
      box.innerHTML = `<div class="flex items-center justify-between gap-3 text-xs">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0"><i data-lucide="user-check" class="w-4 h-4"></i></div>
          <div>
            <strong class="text-slate-900 block">${escapeHtml(found.name)}</strong>
            <span class="text-emerald-800 font-semibold">NIS ${escapeHtml(found.nis)} • Kelas ${escapeHtml(found.className)}</span>
          </div>
        </div>
        <span class="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold">${found.active ? 'TERDAFTAR' : 'NONAKTIF'}</span>
      </div>`;
    } else {
      box.className = 'p-3.5 rounded-2xl border border-amber-300 bg-amber-50/70 transition';
      box.innerHTML = `<div class="flex items-center gap-3 text-xs text-amber-900">
        <div class="w-9 h-9 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0"><i data-lucide="help-circle" class="w-4 h-4"></i></div>
        <div><strong class="block">NIS Belum Ditemukan di Cache Lokal</strong><span>Sistem akan memeriksa otomatis ke Google Sheets saat tombol Validasi ditekan.</span></div>
      </div>`;
    }
    renderIcons();
  }

  // =====================================================================
  // SINKRONISASI CLOUD (GOOGLE APPS SCRIPT)
  // =====================================================================
  function setSyncPill(state) {
    const pill = $('cloudSyncPill');
    if (!pill) return;
    const label = pill.querySelector('span:last-child');
    const dot = pill.querySelector('span:first-child');
    const map = {
      online: ['Terhubung Cloud Apps Script', 'bg-emerald-500 animate-pulse'],
      syncing: ['Menyinkronkan...', 'bg-amber-500 animate-pulse'],
      offline: ['Mode Lokal (cloud tidak terjangkau)', 'bg-slate-400'],
      local: ['Mode Lokal (API belum diatur)', 'bg-slate-400']
    };
    const m = map[state] || map.local;
    if (label) label.textContent = m[0];
    if (dot) dot.className = 'w-2 h-2 rounded-full ' + m[1];
  }

  function normalizeCloudStudent(r) {
    if (!r) return null;
    const nis = String(r.nis !== undefined ? r.nis : (r.NIS !== undefined ? r.NIS : '')).trim();
    const name = String(r.name || r.nama || r.nama_lengkap || r.Nama || '').trim();
    const className = String(r.className || r.kelas || r.Kelas || '').trim().toUpperCase();
    if (!nis || !name) return null;
    const act = r.active !== undefined ? r.active : (r.aktif !== undefined ? r.aktif : true);
    const active = !(act === false || /^(false|nonaktif|0|tidak)$/i.test(String(act)));
    return { nis: nis, name: name, className: className, active: active };
  }

  function normalizeCloudToken(r) {
    if (!r) return null;
    const token = String(r.token || r.token_code || '').trim().toUpperCase();
    const title = String(r.title || r.judul_ujian || '').trim();
    const batchId = String(r.batchId || r.batch_id || '').trim();
    if (!token || !title || !getBatch(batchId)) return null;
    const status = String(r.status || 'AKTIF').toUpperCase();
    return {
      token: token, title: title, batchId: batchId,
      targetClass: String(r.targetClass || r.target_kelas || 'ALL'),
      durationMinutes: parseInt(r.durationMinutes || r.durasi_menit, 10) || 60,
      kkm: parseInt(r.kkm, 10) || 75,
      maxViolations: parseInt(r.maxViolations || r.max_pelanggaran, 10) || 3,
      randomize: r.randomize !== undefined ? !!r.randomize : (r.acak_soal !== undefined ? !!r.acak_soal : true),
      enforceFullscreen: r.enforceFullscreen !== undefined ? !!r.enforceFullscreen : (r.wajib_fullscreen !== undefined ? !!r.wajib_fullscreen : true),
      showScore: r.showScore !== undefined ? !!r.showScore : (r.tampil_nilai !== undefined ? !!r.tampil_nilai : true),
      status: status === 'TERKUNCI' ? 'TERKUNCI' : 'AKTIF',
      createdBy: String(r.createdBy || r.dibuat_oleh || 'Guru Informatika')
    };
  }

  async function syncDashboardFromCloud(silent) {
    if (!isApiReady()) {
      setSyncPill('local');
      if (!silent) showToast('URL Apps Script belum diatur. Data tersimpan lokal di browser.', 'warning');
      return;
    }
    setSyncPill('syncing');
    try {
      const res = await smatechApi('getDashboard');
      const d = (res && (res.data || res)) || {};
      let changed = false;
      if (Array.isArray(d.students)) {
        d.students.map(normalizeCloudStudent).filter(Boolean).forEach((s) => {
          const i = db.students.findIndex((x) => x.nis === s.nis);
          if (i === -1) db.students.push(s); else db.students[i] = Object.assign(db.students[i], s);
          changed = true;
        });
      }
      if (Array.isArray(d.tokens)) {
        d.tokens.map(normalizeCloudToken).filter(Boolean).forEach((t) => {
          const i = db.tokens.findIndex((x) => x.token === t.token);
          if (i === -1) db.tokens.push(t); else db.tokens[i] = Object.assign(db.tokens[i], t);
          changed = true;
        });
      }
      if (changed) {
        persistDb();
        populateAllDropdowns();
        if (runtime.activeTeacher) switchTeacherModule(runtime.activeModule);
      }
      setSyncPill('online');
      if (!silent) showToast('Sinkronisasi dengan Google Sheets selesai.', 'success');
    } catch (err) {
      setSyncPill('offline');
      if (!silent) showToast('Cloud tidak terjangkau. Aplikasi memakai data lokal.', 'warning');
    }
  }

  // =====================================================================
  // 2. BANK SOAL
  // =====================================================================
  function updateBankKpis(visibleCount) {
    const set = (id, v) => { const el = $(id); if (el) el.textContent = String(v); };
    set('kpiBankBatches', db.batches.length);
    set('kpiBankQuestions', db.batches.reduce((s, b) => s + b.questions.length, 0));
    set('kpiBankClassX', db.batches.filter((b) => b.className === 'Kelas X').length);
    set('kpiBankClassXI', db.batches.filter((b) => b.className === 'Kelas XI').length);
    void visibleCount;
  }

  function setBankSort(order) {
    runtime.bankSort = order === 'oldest' ? 'oldest' : 'newest';
    const on = 'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold bg-brand-900 text-white shadow-2xs transition flex items-center justify-center gap-1';
    const off = 'flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 transition flex items-center justify-center gap-1';
    if ($('sortNewestBtn')) $('sortNewestBtn').className = runtime.bankSort === 'newest' ? on : off;
    if ($('sortOldestBtn')) $('sortOldestBtn').className = runtime.bankSort === 'oldest' ? on : off;
    renderBankBatches();
  }

  function renderBankBatches() {
    const grid = $('bankBatchesGrid');
    if (!grid) return;
    const kw = ($('bankSearchInput')?.value || '').trim().toLowerCase();
    const teacher = $('bankTeacherFilter')?.value || 'ALL';
    const cls = $('bankClassFilter')?.value || 'ALL';

    const list = db.batches.filter((b) => {
      if (teacher !== 'ALL' && b.teacherId !== teacher) return false;
      if (cls !== 'ALL' && b.className !== cls) return false;
      if (kw && !(b.title + ' ' + b.topic + ' ' + b.id).toLowerCase().includes(kw)) return false;
      return true;
    });
    list.sort((a, b) => runtime.bankSort === 'oldest'
      ? new Date(a.createdAt) - new Date(b.createdAt)
      : new Date(b.createdAt) - new Date(a.createdAt));

    updateBankKpis(list.length);

    if (list.length === 0) {
      grid.innerHTML = '<div class="col-span-full p-8 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl bg-white">Tidak ada paket soal yang cocok dengan filter.</div>';
      return;
    }

    grid.innerHTML = list.map((b) => {
      const isX = b.className === 'Kelas X';
      return `
        <article class="bg-white rounded-2xl border border-slate-200 shadow-2xs p-4 flex flex-col gap-3">
          <div class="flex items-start justify-between gap-2">
            <span class="px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 font-mono text-[11px] font-bold">${escapeHtml(b.id)}</span>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-bold ${isX ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}">${escapeHtml(b.className)}</span>
          </div>
          <h4 class="text-sm font-extrabold text-slate-900 leading-snug">${escapeHtml(b.title)}</h4>
          <p class="text-[11px] text-slate-500">${escapeHtml(b.topic)} • <strong class="tabular-nums">${b.questions.length}</strong> butir</p>
          <div class="text-[11px] text-slate-500 flex items-center justify-between gap-2">
            <span class="truncate">${escapeHtml(teacherName(b.teacherId))}</span>
            <span class="shrink-0">${escapeHtml(fmtDate(b.createdAt))}</span>
          </div>
          <div class="mt-auto flex flex-wrap gap-2 pt-1">
            <button type="button" onclick="openBatchInspector('${escapeHtml(b.id)}')"
              class="flex-1 px-3 py-2 rounded-xl bg-brand-900 hover:bg-brand-800 text-white text-xs font-bold">Inspeksi 40 Soal</button>
            <button type="button" onclick="createTokenFromBatch('${escapeHtml(b.id)}')"
              class="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold">Token</button>
            <button type="button" onclick="deleteBatch('${escapeHtml(b.id)}')"
              class="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold">Hapus</button>
          </div>
        </article>`;
    }).join('');
  }

  function deleteBatch(id) {
    const b = getBatch(id);
    if (!b) return;
    if (db.tokens.some((t) => t.batchId === id)) {
      showToast('Paket ini dipakai oleh token ujian. Hapus token terkait terlebih dahulu.', 'error');
      return;
    }
    if (!window.confirm('Hapus paket "' + b.title + '" dari Bank Soal?')) return;
    db.batches = db.batches.filter((x) => x.id !== id);
    persistDb();
    populateAllDropdowns();
    renderBankBatches();
    showToast('Paket ' + id + ' dihapus.', 'info');
  }

  function openBatchInspector(id) {
    if (!getBatch(id)) return;
    runtime.inspectorBatchId = id;
    runtime.inspectorShowKeys = false;
    renderInspector();
    openModal('batchInspectorModal');
  }

  function toggleInspectorKeys() {
    runtime.inspectorShowKeys = !runtime.inspectorShowKeys;
    renderInspector();
  }

  function renderInspector() {
    const b = getBatch(runtime.inspectorBatchId);
    if (!b) return;
    if ($('inspectorTitle')) $('inspectorTitle').textContent = b.title;
    if ($('inspectorMeta')) $('inspectorMeta').textContent = `${b.id} • ${b.className} • ${b.topic} • ${b.questions.length} soal • ${teacherName(b.teacherId)}`;
    if ($('inspectorToggleKeysBtn')) $('inspectorToggleKeysBtn').textContent = runtime.inspectorShowKeys ? 'Sembunyikan Kunci & Level' : 'Tampilkan Kunci & Level';
    const list = $('inspectorQuestionsList');
    if (!list) return;
    list.innerHTML = b.questions.map((q, i) => `
      <div class="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
        <div class="flex items-start justify-between gap-3">
          <p class="font-semibold text-slate-900 leading-relaxed"><span class="font-mono text-slate-500 mr-1.5">${i + 1}.</span>${escapeHtml(q.question)}</p>
          ${runtime.inspectorShowKeys ? `<span class="shrink-0 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-mono text-[11px] font-bold">${escapeHtml(q.level)}</span>` : ''}
        </div>
        <ul class="space-y-1">
          ${q.options.map((o, k) => {
            if (!String(o || '').trim()) return '';
            const isKey = runtime.inspectorShowKeys && LETTERS[k] === q.answer;
            return `<li class="px-3 py-1.5 rounded-lg ${isKey ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold' : 'bg-slate-50 text-slate-700'}">
              <span class="font-mono font-bold mr-1.5">${LETTERS[k]}.</span>${escapeHtml(o)}${isKey ? ' <span class="ml-1">✓ Kunci</span>' : ''}</li>`;
          }).join('')}
        </ul>
      </div>`).join('');
  }

  function createTokenFromBatch(id) {
    const b = getBatch(id);
    if (!b) return;
    closeModal('batchInspectorModal');
    switchTeacherModule('live');
    if ($('liveBatchSelect')) $('liveBatchSelect').value = b.id;
    if ($('liveExamTitleInput') && !$('liveExamTitleInput').value) $('liveExamTitleInput').value = 'Sumatif ' + b.topic + ' (' + b.className + ')';
    if ($('liveTargetClassSelect')) $('liveTargetClassSelect').value = b.className === 'Kelas XI' ? 'KELAS_XI' : 'KELAS_X';
    populateNewTokenCode();
    showToast('Lengkapi detail sesi lalu terbitkan token.', 'info');
  }

  function quickCreateTokenFromInspector() { createTokenFromBatch(runtime.inspectorBatchId); }

  // =====================================================================
  // 3. INPUT BATCH 40 SOAL
  // =====================================================================
  function switchInputSubTab(tab) {
    runtime.inputSubTab = tab === 'grid' ? 'grid' : 'paste';
    $('inputPanePaste')?.classList.toggle('hidden', runtime.inputSubTab !== 'paste');
    $('inputPaneGrid')?.classList.toggle('hidden', runtime.inputSubTab !== 'grid');
    const on = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-brand-900 text-white transition';
    const off = 'px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-300 hover:bg-slate-100 transition';
    if ($('inputSubTabPasteBtn')) $('inputSubTabPasteBtn').className = runtime.inputSubTab === 'paste' ? on : off;
    if ($('inputSubTabGridBtn')) $('inputSubTabGridBtn').className = runtime.inputSubTab === 'grid' ? on : off;
    if (runtime.inputSubTab === 'grid') {
      renderGridEditorRows();
    } else if (runtime.draftSource === 'grid' && $('smartPasteTextarea')) {
      $('smartPasteTextarea').value = runtime.draft
        .filter((q) => q.question.trim() || q.options.some((o) => o.trim()))
        .map((q) => [q.question].concat(q.options).concat([q.answer, q.level]).join(' | ')).join('\n');
      runtime.draftSource = 'paste';
    }
  }

  function renderGridEditorRows() {
    const tbody = $('gridEditorTbody');
    if (!tbody) return;
    const cell = 'w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-600';
    tbody.innerHTML = runtime.draft.map((q, i) => `
      <tr>
        <td class="p-2 text-center font-mono font-bold text-slate-500">${i + 1}</td>
        <td class="p-1.5"><textarea rows="2" class="${cell}" oninput="updateDraftCell(${i},'question',this.value)">${escapeHtml(q.question)}</textarea></td>
        ${q.options.map((o, k) => `<td class="p-1.5"><input type="text" value="${escapeHtml(o)}" class="${cell}" oninput="updateDraftCell(${i},'opt${k}',this.value)" /></td>`).join('')}
        <td class="p-1.5"><select class="${cell} bg-white" onchange="updateDraftCell(${i},'level',this.value)">
          ${LEVELS.map((l) => `<option value="${l}" ${q.level === l ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
        <td class="p-1.5"><select class="${cell} bg-white font-bold" onchange="updateDraftCell(${i},'answer',this.value)">
          <option value="">—</option>${LETTERS.map((l) => `<option value="${l}" ${q.answer === l ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      </tr>`).join('');
  }

  function updateDraftCell(i, field, value) {
    const q = runtime.draft[i];
    if (!q) return;
    if (field === 'question') q.question = value;
    else if (field === 'level') q.level = value;
    else if (field === 'answer') q.answer = value;
    else if (field.indexOf('opt') === 0) q.options[parseInt(field.slice(3), 10)] = value;
    runtime.draftSource = 'grid';
    evaluateDraftValidity();
  }

  function evaluateDraftValidity() {
    const valid = runtime.draft.filter(isValidQuestion).length;
    const title = ($('inputBatchTitle')?.value || '').trim();
    const done = valid === TOTAL_Q;
    if ($('draftMeterBar')) {
      $('draftMeterBar').style.width = Math.round((valid / TOTAL_Q) * 100) + '%';
      $('draftMeterBar').className = 'h-full transition-all duration-300 ' + (done ? 'bg-emerald-500' : 'bg-amber-500');
    }
    if ($('draftMeterBadge')) {
      $('draftMeterBadge').textContent = valid + ' / ' + TOTAL_Q + ' Soal Valid';
      $('draftMeterBadge').className = 'px-3 py-1 rounded-full text-xs font-mono font-bold border tabular-nums ' +
        (done ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200');
    }
    if ($('saveBatchBtn')) $('saveBatchBtn').disabled = !(done && title);
  }

  function parseSmartPasteText(silent) {
    const ta = $('smartPasteTextarea');
    const diag = $('pasteDiagnosticsBox');
    if (!ta) return;
    const lines = ta.value.split(/\r?\n/).filter((l) => l.trim());
    runtime.draft = emptyDraft();
    runtime.draftSource = 'paste';
    const errors = [];
    lines.forEach((line, i) => {
      if (i >= TOTAL_Q) return;
      const r = parseQuestionLine(line);
      if (r && r.q) runtime.draft[i] = r.q;
      else if (r && r.error) errors.push({ line: i + 1, msg: r.error });
    });
    const valid = runtime.draft.filter(isValidQuestion).length;
    if (diag) {
      if (!lines.length) {
        diag.className = 'p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600';
        diag.textContent = 'Belum ada teks soal yang diproses.';
      } else {
        const notes = [];
        if (lines.length > TOTAL_Q) notes.push('Ada ' + (lines.length - TOTAL_Q) + ' baris berlebih (hanya 40 baris pertama dipakai).');
        if (lines.length < TOTAL_Q) notes.push('Kurang ' + (TOTAL_Q - lines.length) + ' baris untuk mencapai 40 soal.');
        const ok = valid === TOTAL_Q;
        diag.className = 'p-3.5 rounded-xl border text-xs space-y-1 ' + (ok ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-950');
        diag.innerHTML = `<strong>${valid} dari ${lines.length} baris valid.</strong>` +
          notes.map((n) => `<div>${escapeHtml(n)}</div>`).join('') +
          errors.slice(0, 8).map((e) => `<div class="text-rose-700">Baris ${e.line}: ${escapeHtml(e.msg)}</div>`).join('') +
          (errors.length > 8 ? `<div class="text-rose-700">…dan ${errors.length - 8} kesalahan lain.</div>` : '');
      }
    }
    evaluateDraftValidity();
    if (!silent) showToast(valid + ' soal valid terdeteksi.', valid === TOTAL_Q ? 'success' : 'warning');
  }

  function loadSample40Template() {
    if ($('smartPasteTextarea')) $('smartPasteTextarea').value = SAMPLE_LINES.join('\n');
    if ($('inputBatchTitle') && !$('inputBatchTitle').value.trim()) $('inputBatchTitle').value = 'Paket Contoh Informatika (40 Soal)';
    parseSmartPasteText(true);
    renderGridEditorRows();
    showToast('Template 40 soal contoh dimuat.', 'success');
  }

  // --- Import Soal dari DOCX (format SOAL + 5 JAWABAN, kolom Jawaban 1/0) ---
  function parseDocxImportHtml(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const rows = Array.from(doc.querySelectorAll('table tr'));
    const questions = [];
    let current = null;

    const flush = () => {
      if (current && String(current.question || '').trim() && current.options.length >= 4) {
        const opts = [];
        for (let k = 0; k < 5; k++) opts.push(current.options[k] ? current.options[k].text : '');
        const ansIdx = current.options.findIndex((o) => o.correct);
        const answer = ansIdx >= 0 && ansIdx < 5 ? LETTERS[ansIdx] : 'A';
        questions.push({ question: String(current.question).trim(), options: opts, answer: answer, level: 'C2' });
      }
      current = null;
    };

    rows.forEach((tr) => {
      const tds = Array.from(tr.querySelectorAll('td,th')).map((td) => String(td.textContent || '').trim());
      if (tds.length < 3) return;
      const jenis = String(tds[1] || '').toUpperCase();
      const isi = tds[2] || '';
      const jawaban = String(tds[3] || '').trim();
      if (jenis === 'SOAL') {
        flush();
        current = { question: isi, options: [] };
      } else if (jenis === 'JAWABAN' && current) {
        current.options.push({ text: isi, correct: jawaban === '1' });
      }
    });
    flush();
    return questions;
  }

  async function importDocxFromFile(evt) {
    const file = evt && evt.target && evt.target.files && evt.target.files[0];
    if (!file) return;
    if (typeof mammoth === 'undefined') { showToast('Library mammoth belum termuat (perlu internet).', 'error'); return; }
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer: arrayBuffer });
      const questions = parseDocxImportHtml(result.value || '');
      if (!questions.length) { showToast('Tidak ada soal terbaca dari DOCX.', 'warning'); return; }
      const lines = questions.map((q) => [q.question].concat(q.options).concat([q.answer, q.level]).join(' | '));
      const ta = $('smartPasteTextarea');
      if (ta) ta.value = lines.join('\n');
      if ($('inputBatchTitle') && !$('inputBatchTitle').value.trim()) {
        $('inputBatchTitle').value = 'Impor Soal ' + questions.length + ' Butir';
      }
      parseSmartPasteText(true);
      renderGridEditorRows();
      showToast(questions.length + ' soal berhasil diimpor. Lanjutkan Import Kisi-Kisi (XLSX) untuk Level Kognitif.', 'success');
    } catch (err) {
      showToast('Gagal membaca DOCX: ' + (err && err.message ? err.message : err), 'error');
    }
    evt.target.value = '';
  }

  // --- Import Kisi-Kisi dari XLSX (mengisi Level Kognitif per No Soal) ---
  function importKisiFromFile(evt) {
    const file = evt && evt.target && evt.target.files && evt.target.files[0];
    if (!file) return;
    if (typeof XLSX === 'undefined') { showToast('Library XLSX belum termuat (perlu internet).', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const headerIdx = rows.findIndex((r) => r.some((c) => String(c).trim().toLowerCase() === 'level kognitif'));
        if (headerIdx === -1) { showToast('Kolom "Level Kognitif" tidak ditemukan di kisi-kisi.', 'warning'); return; }
        const headers = rows[headerIdx].map((h) => String(h).trim());
        const cNo = headers.indexOf('No');
        const cLevel = headers.indexOf('Level Kognitif');
        if (cNo === -1 || cLevel === -1) { showToast('Kolom No / Level Kognitif tidak ditemukan.', 'warning'); return; }
        let assigned = 0;
        for (let r = headerIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          const no = parseInt(row[cNo], 10);
          const lv = String(row[cLevel]).trim().toUpperCase();
          if (!no || LEVELS.indexOf(lv) === -1) continue;
          const i = no - 1;
          if (i >= 0 && i < runtime.draft.length) {
            runtime.draft[i].level = lv;
            assigned++;
          }
        }
        renderGridEditorRows();
        evaluateDraftValidity();
        showToast('Level kognitif ' + assigned + ' soal diimpor dari kisi-kisi.', 'success');
      } catch (err) {
        showToast('Gagal membaca XLSX: ' + (err && err.message ? err.message : err), 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    evt.target.value = '';
  }

  function resetInputDraft() {
    runtime.draft = emptyDraft();
    runtime.draftSource = 'paste';
    if ($('smartPasteTextarea')) $('smartPasteTextarea').value = '';
    if ($('inputBatchTitle')) $('inputBatchTitle').value = '';
    if ($('pasteDiagnosticsBox')) {
      $('pasteDiagnosticsBox').className = 'p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600';
      $('pasteDiagnosticsBox').textContent = 'Belum ada teks soal yang diproses.';
    }
    renderGridEditorRows();
    evaluateDraftValidity();
  }

  function nextBatchId() {
    const max = db.batches.reduce((m, b) => {
      const n = parseInt(String(b.id).replace(/\D/g, ''), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return 'B-' + String(max + 1).padStart(3, '0');
  }

  function pushBatchToCloud(batch) {
    smatechApi('saveBatch', {
      batch: {
        batch_id: batch.id, judul: batch.title, kelas: batch.className, topik: batch.topic,
        guru_id: batch.teacherId, dibuat: batch.createdAt,
        soal: batch.questions.map((q, i) => ({
          no: i + 1, pertanyaan: q.question,
          opsi_a: q.options[0], opsi_b: q.options[1], opsi_c: q.options[2], opsi_d: q.options[3], opsi_e: q.options[4],
          kunci: q.answer, level: q.level
        }))
      }
    }).catch(() => {});
  }

  function commitNewBatch40() {
    const title = ($('inputBatchTitle')?.value || '').trim();
    const valid = runtime.draft.filter(isValidQuestion);
    if (!title) { showToast('Judul paket wajib diisi.', 'error'); return; }
    if (valid.length !== TOTAL_Q) { showToast('Harus tepat 40 soal valid.', 'error'); return; }
    const batch = {
      id: nextBatchId(), title: title,
      className: $('inputBatchClass')?.value || 'Kelas X',
      topic: $('inputBatchTopic')?.value || 'Berpikir Komputasional',
      teacherId: runtime.activeTeacher ? runtime.activeTeacher.id : 'T1',
      createdAt: new Date().toISOString(),
      questions: clone(runtime.draft)
    };
    db.batches.push(batch);
    persistDb();
    populateAllDropdowns();
    pushBatchToCloud(batch);
    resetInputDraft();
    showToast('Paket ' + batch.id + ' tersimpan ke Bank Soal.', 'success');
    switchTeacherModule('bank');
  }

  // =====================================================================
  // 4. PENGOLAHAN & RAKIT UJIAN
  // =====================================================================
  function buildVariant(questions, shuffle, pinFive) {
    let order = questions.map((_, i) => i);
    if (shuffle) {
      const pin = pinFive ? Math.min(5, order.length) : 0;
      order = order.slice(0, pin).concat(shuffleArr(order.slice(pin)));
    }
    return order.map((oi) => {
      const q = questions[oi];
      if (!shuffle) return Object.assign(clone(q), { origNo: oi + 1 });
      const idxs = q.options.map((_, k) => k).filter((k) => String(q.options[k] || '').trim());
      const perm = shuffleArr(idxs);
      const opts = ['', '', '', '', ''];
      perm.forEach((oldK, newK) => { opts[newK] = q.options[oldK]; });
      return {
        question: q.question, options: opts,
        answer: LETTERS[perm.indexOf(LETTERS.indexOf(q.answer))],
        level: q.level, origNo: oi + 1
      };
    });
  }

  function generateShuffledVariants() {
    const id = $('variantSourceBatchSelect')?.value || (db.batches[0] && db.batches[0].id);
    const b = getBatch(id);
    const box = $('variantPreviewContainer');
    if (!b) {
      if (box) box.innerHTML = '<p class="text-slate-400 text-center py-4">Belum ada paket soal.</p>';
      return;
    }
    const pin = Boolean($('pinFirstFiveCheckbox')?.checked);
    runtime.variantBatchId = b.id;
    runtime.variants = {
      A: buildVariant(b.questions, false, pin),
      B: buildVariant(b.questions, true, pin),
      C: buildVariant(b.questions, true, pin)
    };
    selectActiveVariant(runtime.activeVariant);
  }

  function selectActiveVariant(v) {
    runtime.activeVariant = ['A', 'B', 'C'].indexOf(v) !== -1 ? v : 'A';
    ['A', 'B', 'C'].forEach((k) => {
      const el = $('variantTab' + k);
      if (el) el.className = 'py-2 rounded-xl text-xs font-extrabold ' + (k === runtime.activeVariant ? 'bg-brand-900 text-white' : 'bg-slate-100 text-slate-700');
    });
    const box = $('variantPreviewContainer');
    if (!box) return;
    const list = runtime.variants[runtime.activeVariant] || [];
    box.innerHTML = list.map((q, i) => `
      <div class="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1">
        <div class="flex items-center justify-between gap-2">
          <strong class="font-mono text-slate-700">No. ${i + 1} <span class="font-normal text-slate-400">(asal ${q.origNo})</span></strong>
          <span class="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono font-bold">Kunci ${escapeHtml(q.answer)}</span>
        </div>
        <p class="text-slate-800 leading-snug">${escapeHtml(q.question)}</p>
        <div class="grid grid-cols-1 gap-0.5 text-slate-600">
          ${q.options.map((o, k) => String(o || '').trim() ? `<span><span class="font-mono font-bold">${LETTERS[k]}.</span> ${escapeHtml(o)}</span>` : '').join('')}
        </div>
      </div>`).join('');
  }

  function variantTitle() {
    const b = getBatch(runtime.variantBatchId);
    return (b ? b.title : 'Paket Soal') + ' — Paket ' + runtime.activeVariant;
  }

  function exportVariantCsv() {
    const list = runtime.variants[runtime.activeVariant] || [];
    if (!list.length) { showToast('Belum ada paket untuk diekspor.', 'warning'); return; }
    const rows = [['No', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci', 'Level', 'No Asal']];
    list.forEach((q, i) => rows.push([i + 1, q.question].concat(q.options).concat([q.answer, q.level, q.origNo])));
    triggerCsvDownload(rows, 'SMATECH-Paket-' + runtime.activeVariant + '-' + (runtime.variantBatchId || 'batch') + '.csv');
    showToast('Paket ' + runtime.activeVariant + ' diekspor ke CSV.', 'success');
  }

  function openPrintableExamModal() {
    const pc = $('printContainer');
    const list = runtime.variants[runtime.activeVariant] || [];
    if (!pc || !list.length) { showToast('Belum ada paket untuk dicetak.', 'warning'); return; }
    pc.innerHTML = `
      <div style="border-bottom:3px double #000;padding-bottom:8px;margin-bottom:12px;text-align:center;">
        <div style="font-size:12px;font-weight:700;">PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN</div>
        <div style="font-size:17px;font-weight:800;">SMA NEGERI 1 GONDANGLEGI</div>
        <div style="font-size:12px;font-weight:700;margin-top:3px;">${escapeHtml(variantTitle())}</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:12px;">
        <span>Nama: ....................................</span><span>Kelas: ..........</span><span>No. Absen: ......</span>
      </div>
      <div style="font-size:12px;line-height:1.5;">
        ${list.map((q, i) => `
          <div style="margin-bottom:9px;page-break-inside:avoid;">
            <div><strong>${i + 1}.</strong> ${escapeHtml(q.question)}</div>
            ${q.options.map((o, k) => String(o || '').trim() ? `<div style="margin-left:18px;">${LETTERS[k]}. ${escapeHtml(o)}</div>` : '').join('')}
          </div>`).join('')}
      </div>
      <div style="page-break-before:always;font-size:12px;">
        <strong>KUNCI JAWABAN — ${escapeHtml(variantTitle())}</strong>
        <table style="border-collapse:collapse;margin-top:8px;font-size:11px;">
          <tbody>${Array.from({ length: Math.ceil(list.length / 10) }, (_, r) => `
            <tr>${list.slice(r * 10, r * 10 + 10).map((q, c) => `<td style="border:1px solid #000;padding:4px 8px;text-align:center;">${r * 10 + c + 1}.&nbsp;<strong>${escapeHtml(q.answer)}</strong></td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    window.print();
  }

  function normText(s) { return String(s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  function buildMix() {
    const b1 = getBatch($('mixSource1Select')?.value);
    const b2 = getBatch($('mixSource2Select')?.value);
    if (!b1 || !b2) return null;
    const n = Math.max(0, Math.min(TOTAL_Q, parseInt($('mixRatioSlider')?.value, 10) || 0));
    const need2 = TOTAL_Q - n;
    const picked = b1.questions.slice(0, n).map(clone);
    const seen = new Set(picked.map((q) => normText(q.question)));
    const used = new Set();
    const extra = [];
    b2.questions.forEach((q, i) => {
      if (extra.length >= need2) return;
      if (!seen.has(normText(q.question))) { extra.push(clone(q)); seen.add(normText(q.question)); used.add(i); }
    });
    b2.questions.forEach((q, i) => {
      if (extra.length >= need2) return;
      if (!used.has(i)) { extra.push(clone(q)); used.add(i); }
    });
    const all = picked.concat(extra);
    const unique = new Set(all.map((q) => normText(q.question))).size;
    return { b1: b1, b2: b2, n: n, questions: all, dup: all.length - unique };
  }

  function refreshMixStatus() {
    const n = parseInt($('mixRatioSlider')?.value, 10) || 0;
    if ($('mixLeftCount')) $('mixLeftCount').textContent = String(n);
    if ($('mixRightCount')) $('mixRightCount').textContent = String(TOTAL_Q - n);
    const box = $('mixDuplicateCheckBox');
    const mix = buildMix();
    if (!box || !mix) return;
    const bad = mix.dup > 0;
    box.className = 'text-[11px] font-semibold flex items-center gap-1.5 pt-1 ' + (bad ? 'text-amber-700' : 'text-emerald-700');
    box.innerHTML = `<i data-lucide="${bad ? 'alert-triangle' : 'check-circle-2'}" class="w-3.5 h-3.5"></i>
      <span>Pemeriksaan duplikasi teks soal: ${mix.dup} duplikat terdeteksi.</span>`;
    renderIcons();
  }

  function saveCombinedBatch40() {
    const title = ($('mixNewTitleInput')?.value || '').trim();
    const mix = buildMix();
    if (!mix) { showToast('Pilih dua batch sumber.', 'error'); return; }
    if (!title) { showToast('Judul paket gabungan wajib diisi.', 'error'); return; }
    if (mix.questions.length !== TOTAL_Q) { showToast('Paket gabungan harus tepat 40 soal (sumber kurang soal).', 'error'); return; }
    if (mix.dup > 0 && !window.confirm('Ada ' + mix.dup + ' soal duplikat. Tetap simpan?')) return;
    const batch = {
      id: nextBatchId(), title: title, className: mix.b1.className, topic: mix.b1.topic,
      teacherId: runtime.activeTeacher ? runtime.activeTeacher.id : 'T1',
      createdAt: new Date().toISOString(), questions: mix.questions
    };
    db.batches.push(batch);
    persistDb();
    populateAllDropdowns();
    pushBatchToCloud(batch);
    if ($('mixNewTitleInput')) $('mixNewTitleInput').value = '';
    showToast('Paket gabungan ' + batch.id + ' tersimpan.', 'success');
  }

  function exportMixedCsv() {
    const mix = buildMix();
    if (!mix) { showToast('Pilih dua batch sumber.', 'error'); return; }
    const rows = [['No', 'Pertanyaan', 'A', 'B', 'C', 'D', 'E', 'Kunci', 'Level']];
    mix.questions.forEach((q, i) => rows.push([i + 1, q.question].concat(q.options).concat([q.answer, q.level])));
    triggerCsvDownload(rows, 'SMATECH-Gabungan-' + mix.b1.id + '-' + mix.b2.id + '.csv');
    showToast('Paket gabungan diekspor ke CSV.', 'success');
  }

  // =====================================================================
  // 5. DATA SISWA
  // =====================================================================
  function renderStudentDirectory() {
    const tbody = $('studentDirectoryTbody');
    if (!tbody) return;
    const kw = ($('studentSearchInput')?.value || '').trim().toLowerCase();
    const cls = $('studentClassFilterSelect')?.value || 'ALL';
    const list = db.students.filter((s) => {
      if (cls === 'PREFIX_X' && !/^X-/i.test(s.className)) return false;
      if (cls === 'PREFIX_XI' && !/^XI-/i.test(s.className)) return false;
      if (kw && !(s.nis + ' ' + s.name).toLowerCase().includes(kw)) return false;
      return true;
    });
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-slate-400">Tidak ada siswa yang cocok.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((s) => {
      const done = db.attempts.some((a) => a.nis === s.nis);
      return `
        <tr class="hover:bg-slate-50/80">
          <td class="p-3.5 font-mono font-bold text-slate-700 tabular-nums">${escapeHtml(s.nis)}</td>
          <td class="p-3.5 font-bold text-slate-900">${escapeHtml(s.name)}</td>
          <td class="p-3.5">${escapeHtml(s.className)}</td>
          <td class="p-3.5 text-center space-x-1">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${s.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-300'}">${s.active ? 'AKTIF' : 'NONAKTIF'}</span>
            ${done ? '<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-indigo-50 text-indigo-700 border-indigo-200">PERNAH UJIAN</span>' : ''}
          </td>
          <td class="p-3.5 text-right space-x-1.5">
            <button type="button" onclick="toggleStudentActive('${escapeHtml(s.nis)}')" class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">${s.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
            <button type="button" onclick="deleteStudent('${escapeHtml(s.nis)}')" class="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] font-bold">Hapus</button>
          </td>
        </tr>`;
    }).join('');
  }

  function toggleStudentActive(nis) {
    const s = db.students.find((x) => x.nis === nis);
    if (!s) return;
    s.active = !s.active;
    persistDb();
    renderStudentDirectory();
  }

  function deleteStudent(nis) {
    const s = db.students.find((x) => x.nis === nis);
    if (!s || !window.confirm('Hapus siswa ' + s.name + ' (' + nis + ')?')) return;
    db.students = db.students.filter((x) => x.nis !== nis);
    persistDb();
    renderStudentDirectory();
  }

  function openImportStudentsModal() { openModal('importStudentsModal'); }

  function fillSampleImportStudents() {
    if ($('importStudentsTextarea')) $('importStudentsTextarea').value = '261020; Farhan Maulana; X-3\n261021; Salsa Bila Putri; XI-2';
  }

  function processStudentBulkImport() {
    const ta = $('importStudentsTextarea');
    if (!ta) return;
    const lines = ta.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let added = 0;
    let updated = 0;
    let bad = 0;
    lines.forEach((line) => {
      const p = line.split(/[;\t,]/).map((s) => s.trim());
      if (p.length < 3 || !/^\d{3,}$/.test(p[0]) || !p[1] || !/^(X|XI)-\w+$/i.test(p[2])) { bad++; return; }
      const rec = { nis: p[0], name: p[1], className: p[2].toUpperCase(), active: true };
      const i = db.students.findIndex((s) => s.nis === rec.nis);
      if (i === -1) { db.students.push(rec); added++; } else { db.students[i] = Object.assign(db.students[i], rec); updated++; }
    });
    persistDb();
    renderStudentDirectory();
    if (added + updated > 0) {
      smatechApi('importStudents', { students: lines.map((l) => l.split(/[;\t,]/).map((s) => s.trim())).filter((p) => p.length >= 3).map((p) => ({ nis: p[0], nama: p[1], kelas: p[2].toUpperCase() })) }).catch(() => {});
    }
    showToast(`Import selesai: ${added} baru, ${updated} diperbarui, ${bad} baris dilewati.`, bad ? 'warning' : 'success');
    if (added + updated > 0) { ta.value = ''; closeModal('importStudentsModal'); }
  }

  function printStudentExamCards() {
    const pc = $('printContainer');
    if (!pc) return;
    const activeStudents = db.students.filter((s) => s.active).slice(0, 24);
    pc.innerHTML = `
      <div style="text-align:center;margin-bottom:14px;">
        <strong style="font-size:15px;">KARTU PESERTA ASESMEN CBT — SMAN 1 GONDANGLEGI</strong>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${activeStudents.map((s) => `
          <div style="border:1.5px solid #000;border-radius:8px;padding:10px;font-size:11px;page-break-inside:avoid;">
            <div style="font-weight:800;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:6px;">SMATECH CBT • SMAN 1 GONDANGLEGI</div>
            <div><strong>Nama:</strong> ${escapeHtml(s.name)}</div>
            <div><strong>NIS:</strong> <span style="font-family:monospace;font-weight:700;">${escapeHtml(s.nis)}</span></div>
            <div><strong>Kelas:</strong> ${escapeHtml(s.className)}</div>
          </div>`).join('')}
      </div>`;
    window.print();
  }

  // =====================================================================
  // 6. UJIAN LIVE & TOKEN
  // =====================================================================
  function createNewTokenSession() {
    const title = ($('liveExamTitleInput')?.value || '').trim();
    const batchId = $('liveBatchSelect')?.value || (db.batches[0] && db.batches[0].id);
    const token = ($('liveTokenInput')?.value || '').trim().toUpperCase();
    const targetClass = $('liveTargetClassSelect')?.value || 'ALL';
    const durationMinutes = parseInt($('liveDurationInput')?.value, 10) || 60;
    const kkm = parseInt($('liveKkmInput')?.value, 10) || 75;
    const maxViolations = parseInt($('liveMaxCheatSelect')?.value, 10) || 3;

    if (!title || token.length < 4) { showToast('Lengkapi Judul Sesi Ujian dan Kode Token minimal 4 karakter.', 'error'); return; }
    if (!getBatch(batchId)) { showToast('Pilih paket Bank Soal terlebih dahulu.', 'error'); return; }
    if (db.tokens.some((t) => t.token === token)) { showToast('Kode Token "' + token + '" sudah digunakan. Silakan acak ulang.', 'warning'); return; }

    const newTokenObj = {
      token: token, title: title, batchId: batchId, targetClass: targetClass,
      durationMinutes: durationMinutes, kkm: kkm, maxViolations: maxViolations,
      randomize: Boolean($('liveRandomizeCheck')?.checked),
      enforceFullscreen: Boolean($('liveFullscreenCheck')?.checked),
      showScore: Boolean($('liveShowScoreCheck')?.checked),
      status: 'AKTIF',
      createdBy: runtime.activeTeacher ? runtime.activeTeacher.name : 'Guru Informatika'
    };
    db.tokens.unshift(newTokenObj);
    persistDb();
    populateAllDropdowns();
    renderActiveTokensGrid();
    populateNewTokenCode();
    if ($('liveExamTitleInput')) $('liveExamTitleInput').value = '';
    showToast('Token sesi "' + token + '" berhasil diterbitkan!', 'success');

    smatechApi('createToken', {
      token: {
        token_code: newTokenObj.token, judul_ujian: newTokenObj.title, batch_id: newTokenObj.batchId,
        target_kelas: newTokenObj.targetClass, durasi_menit: newTokenObj.durationMinutes, kkm: newTokenObj.kkm,
        max_pelanggaran: newTokenObj.maxViolations, acak_soal: newTokenObj.randomize,
        wajib_fullscreen: newTokenObj.enforceFullscreen, tampil_nilai: newTokenObj.showScore,
        dibuat_oleh: newTokenObj.createdBy
      }
    }).catch(() => {});
  }

  function renderActiveTokensGrid() {
    const grid = $('activeTokensGrid');
    if (!grid) return;
    if ($('tokenActiveSummaryPill')) $('tokenActiveSummaryPill').textContent = db.tokens.length + ' Token';
    if (db.tokens.length === 0) {
      grid.innerHTML = '<div class="p-6 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-2xl">Belum ada token sesi ujian.</div>';
      return;
    }
    grid.innerHTML = db.tokens.map((t, idx) => {
      const isOpen = t.status === 'AKTIF';
      return `
        <div class="p-4 rounded-2xl border ${isOpen ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 bg-slate-50'} flex flex-wrap items-center justify-between gap-3">
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 rounded-lg bg-brand-950 text-cyan-300 font-mono text-sm font-extrabold tracking-widest">${escapeHtml(t.token)}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold ${isOpen ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">${escapeHtml(t.status)}</span>
            </div>
            <h4 class="text-xs sm:text-sm font-extrabold text-slate-900">${escapeHtml(t.title)}</h4>
            <p class="text-[11px] text-slate-500">Target: <strong>${escapeHtml(t.targetClass)}</strong> • Durasi: ${t.durationMinutes} mnt • KKM: ${t.kkm}</p>
          </div>
          <button type="button" onclick="toggleTokenLock(${idx})"
            class="px-3.5 py-2 rounded-xl text-xs font-bold border transition ${isOpen ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600'}">
            ${isOpen ? 'Kunci Sesi' : 'Buka Sesi'}
          </button>
        </div>`;
    }).join('');
  }

  function toggleTokenLock(idx) {
    const t = db.tokens[idx];
    if (!t) return;
    t.status = t.status === 'AKTIF' ? 'TERKUNCI' : 'AKTIF';
    persistDb();
    renderActiveTokensGrid();
    showToast('Status token ' + t.token + ' diubah menjadi ' + t.status + '.', 'info');
    smatechApi('toggleTokenStatus', { tokenCode: t.token, status: t.status }).catch(() => {});
  }

  function renderLiveProctoringTable() {
    const tbody = $('proctoringTbody');
    if (!tbody) return;
    const filterTok = $('proctorTokenFilter')?.value || 'ALL';
    const rows = db.attempts.filter((a) => filterTok === 'ALL' || a.token === filterTok);
    if (rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-slate-400">Belum ada peserta aktif pada sesi ini.</td></tr>';
      return;
    }
    tbody.innerHTML = rows.map((a) => {
      const pct = Math.min(100, Math.round(((a.answeredCount || 0) / (a.totalQuestions || TOTAL_Q)) * 100));
      const statusBadge = a.status === 'TERKUNCI' ? 'bg-rose-100 text-rose-800 border-rose-200'
        : a.status === 'SELESAI' ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
          : 'bg-indigo-100 text-indigo-800 border-indigo-200';
      return `
        <tr class="hover:bg-slate-50/80">
          <td class="p-3.5">
            <strong class="block text-slate-900">${escapeHtml(a.name)}</strong>
            <span class="text-[11px] font-mono text-slate-500">${escapeHtml(a.nis)} • ${escapeHtml(a.className)}</span>
          </td>
          <td class="p-3.5 font-mono font-bold text-brand-900">${escapeHtml(a.token)}</td>
          <td class="p-3.5">
            <div class="flex items-center gap-2">
              <div class="w-24 h-2 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-indigo-600" style="width:${pct}%"></div></div>
              <span class="font-mono font-bold tabular-nums">${a.answeredCount || 0}/${a.totalQuestions || TOTAL_Q}</span>
            </div>
          </td>
          <td class="p-3.5 text-center"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${statusBadge}">${escapeHtml(a.status)}</span></td>
          <td class="p-3.5 text-center">
            <button type="button" onclick="openViolationLogModal('${escapeHtml(a.id)}')"
              class="px-2.5 py-1 rounded-lg font-mono font-bold ${a.violations > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-600'}">${a.violations || 0}x Log</button>
          </td>
          <td class="p-3.5 text-right">
            <button type="button" onclick="resetAttemptUnlock('${escapeHtml(a.id)}')"
              class="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[11px] font-bold">Reset & Buka Kunci</button>
          </td>
        </tr>`;
    }).join('');
  }

  function openViolationLogModal(attemptId) {
    const att = db.attempts.find((a) => a.id === attemptId);
    if (!att) return;
    if ($('vLogStudentTitle')) $('vLogStudentTitle').textContent = 'Log Pelanggaran: ' + att.name;
    if ($('vLogStudentMeta')) $('vLogStudentMeta').textContent = `NIS ${att.nis} • Kelas ${att.className} • Token ${att.token}`;
    const body = $('vLogListBody');
    if (body) {
      const logs = att.violationLogs || [];
      body.innerHTML = logs.length === 0
        ? '<p class="text-slate-500 text-center py-4">Tidak ada catatan pelanggaran keamanan.</p>'
        : logs.map((l, i) => `
          <div class="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2">
            <span class="font-semibold text-rose-950">#${i + 1} • ${escapeHtml(l.reason)}</span>
            <span class="font-mono text-rose-700 font-bold shrink-0">${escapeHtml(l.time)}</span>
          </div>`).join('');
    }
    openModal('violationLogModal');
  }

  function resetAttemptUnlock(attemptId) {
    const idx = db.attempts.findIndex((a) => a.id === attemptId);
    if (idx === -1) return;
    const target = db.attempts[idx];
    db.attempts.splice(idx, 1);
    persistDb();
    renderLiveProctoringTable();
    showToast('Sesi ujian ' + target.name + ' telah di-reset. Siswa dapat masuk kembali menggunakan token.', 'success');
    smatechApi('resetStudentExam', { tokenCode: target.token, nis: target.nis }).catch(() => {});
  }

  // =====================================================================
  // 7. HASIL, NILAI & ANALISIS
  // =====================================================================
  function switchResultsSubTab(tab) {
    runtime.resultsSubTab = tab === 'items' ? 'items' : 'grades';
    $('resultsGradesPane')?.classList.toggle('hidden', runtime.resultsSubTab !== 'grades');
    $('resultsItemsPane')?.classList.toggle('hidden', runtime.resultsSubTab !== 'items');
    const on = 'px-4 py-2 rounded-xl text-xs font-bold bg-brand-900 text-white transition';
    const off = 'px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition';
    if ($('resSubTabGradesBtn')) $('resSubTabGradesBtn').className = runtime.resultsSubTab === 'grades' ? on : off;
    if ($('resSubTabItemsBtn')) $('resSubTabItemsBtn').className = runtime.resultsSubTab === 'items' ? on : off;
  }

  function renderResultsModule() {
    const tokCode = $('resultsTokenFilter')?.value || (db.tokens[0] && db.tokens[0].token);
    const tokObj = db.tokens.find((t) => t.token === tokCode) || db.tokens[0];
    if (!tokObj) return;

    const kkm = tokObj.kkm || 75;
    const list = db.attempts.filter((a) => a.token === tokObj.token);
    const completed = list.filter((a) => a.status === 'SELESAI' || a.status === 'TERKUNCI');
    const avg = completed.length ? (completed.reduce((s, a) => s + (a.score || 0), 0) / completed.length).toFixed(1) : '0.0';
    const passed = completed.filter((a) => (a.score || 0) >= kkm).length;
    const passRate = completed.length ? Math.round((passed / completed.length) * 100) : 0;
    const locked = list.filter((a) => a.status === 'TERKUNCI').length;

    if ($('resKpiAvg')) $('resKpiAvg').textContent = String(avg);
    if ($('resKpiPassRate')) $('resKpiPassRate').textContent = passRate + '%';
    if ($('resKpiFinished')) $('resKpiFinished').textContent = String(completed.length);
    if ($('resKpiLocked')) $('resKpiLocked').textContent = String(locked);

    const gBody = $('resultsGradesTbody');
    if (gBody) {
      if (list.length === 0) {
        gBody.innerHTML = `<tr><td colspan="7" class="p-8 text-center text-slate-400">Belum ada hasil ujian pada token ${escapeHtml(tokObj.token)}.</td></tr>`;
      } else {
        gBody.innerHTML = list.map((a) => {
          const wrong = Math.max(0, (a.totalQuestions || TOTAL_Q) - (a.correctCount || 0));
          const isPass = (a.score || 0) >= kkm;
          return `
            <tr class="hover:bg-slate-50/80">
              <td class="p-3.5 font-mono font-bold text-slate-700 tabular-nums">${escapeHtml(a.nis)}</td>
              <td class="p-3.5 font-bold text-slate-900">${escapeHtml(a.name)}</td>
              <td class="p-3.5">${escapeHtml(a.className)}</td>
              <td class="p-3.5 text-center font-mono tabular-nums"><span class="text-emerald-700 font-bold">${a.correctCount || 0}</span> / <span class="text-rose-600">${wrong}</span></td>
              <td class="p-3.5 text-center font-mono text-sm font-extrabold text-brand-900 tabular-nums">${a.score === undefined ? 0 : a.score}</td>
              <td class="p-3.5 text-center"><span class="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${isPass ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}">${isPass ? 'TUNTAS' : 'REMEDIAL'}</span></td>
              <td class="p-3.5 text-center font-mono font-bold tabular-nums ${a.violations > 0 ? 'text-rose-600' : 'text-slate-500'}">${a.violations || 0}x</td>
            </tr>`;
        }).join('');
      }
    }

    const iBody = $('resultsItemsTbody');
    const batch = getBatch(tokObj.batchId) || db.batches[0];
    if (iBody && batch) {
      iBody.innerHTML = batch.questions.map((q, idx) => {
        const totalAns = completed.length;
        const correctAns = completed.filter((a) => a.answers && a.answers[idx] === q.answer).length;
        const pIndex = totalAns ? Math.round((correctAns / totalAns) * 100) : 0;
        const label = pIndex >= 70 ? 'Mudah' : pIndex >= 35 ? 'Sedang' : 'Sukar';
        const tone = pIndex >= 70 ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : pIndex >= 35 ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-rose-50 text-rose-700 border-rose-200';
        return `
          <tr class="hover:bg-slate-50/80">
            <td class="p-3.5 text-center font-mono font-bold text-slate-600 tabular-nums">${idx + 1}</td>
            <td class="p-3.5 text-slate-800">${escapeHtml(q.question)}</td>
            <td class="p-3.5 text-center font-mono font-extrabold text-brand-900">${escapeHtml(q.answer)}</td>
            <td class="p-3.5 text-center font-mono font-bold tabular-nums">${pIndex}% (${correctAns}/${totalAns})</td>
            <td class="p-3.5 text-center"><span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tone}">${label}</span></td>
          </tr>`;
      }).join('');
    }
  }

  function exportResultsCsv() {
    const tokCode = $('resultsTokenFilter')?.value || (db.tokens[0] && db.tokens[0].token);
    const tokObj = db.tokens.find((t) => t.token === tokCode) || db.tokens[0];
    if (!tokObj) return;
    const rows = [['NIS', 'Nama Siswa', 'Kelas', 'Token', 'Benar', 'Skor', 'Status KKM', 'Pelanggaran']];
    db.attempts.filter((a) => a.token === tokObj.token).forEach((a) => {
      rows.push([a.nis, a.name, a.className, a.token, a.correctCount || 0, a.score || 0,
        (a.score || 0) >= (tokObj.kkm || 75) ? 'TUNTAS' : 'REMEDIAL', a.violations || 0]);
    });
    triggerCsvDownload(rows, 'SMATECH-Nilai-' + tokObj.token + '.csv');
    showToast('Rekap nilai ' + tokObj.token + ' berhasil diunduh.', 'success');
  }

  function printOfficialExamReport() {
    const tokCode = $('resultsTokenFilter')?.value || (db.tokens[0] && db.tokens[0].token);
    const tokObj = db.tokens.find((t) => t.token === tokCode) || db.tokens[0];
    const pc = $('printContainer');
    if (!tokObj || !pc) return;
    const list = db.attempts.filter((a) => a.token === tokObj.token);
    const avg = list.length ? (list.reduce((s, a) => s + (a.score || 0), 0) / list.length).toFixed(1) : '0.0';
    const passed = list.filter((a) => (a.score || 0) >= (tokObj.kkm || 75)).length;
    pc.innerHTML = `
      <div style="border-bottom:3px double #000;padding-bottom:10px;margin-bottom:16px;text-align:center;">
        <div style="font-size:12px;font-weight:700;">PEMERINTAH PROVINSI JAWA TIMUR • DINAS PENDIDIKAN</div>
        <div style="font-size:17px;font-weight:800;">SMA NEGERI 1 GONDANGLEGI</div>
        <div style="font-size:13px;font-weight:700;margin-top:4px;">BERITA ACARA PELAKSANAAN ASESMEN BERBASIS KOMPUTER (SMATECH)</div>
      </div>
      <p style="font-size:12px;line-height:1.6;">Pada hari ini telah dilaksanakan asesmen mata pelajaran <strong>Informatika</strong> untuk sesi <strong>${escapeHtml(tokObj.title)}</strong> (Kode Token: <strong>${escapeHtml(tokObj.token)}</strong>) dengan ringkasan hasil sebagai berikut:</p>
      <table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0;">
        <tr><td style="border:1px solid #000;padding:6px;">Total Peserta Tercatat</td><td style="border:1px solid #000;padding:6px;font-weight:700;">${list.length} Siswa</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">Rata-Rata Nilai</td><td style="border:1px solid #000;padding:6px;font-weight:700;">${avg} (KKM: ${tokObj.kkm})</td></tr>
        <tr><td style="border:1px solid #000;padding:6px;">Jumlah Siswa Tuntas KKM</td><td style="border:1px solid #000;padding:6px;font-weight:700;">${passed} Siswa</td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:14px;">
        <thead><tr style="background:#f1f5f9;">
          <th style="border:1px solid #000;padding:6px;">NIS</th><th style="border:1px solid #000;padding:6px;">Nama Siswa</th>
          <th style="border:1px solid #000;padding:6px;">Kelas</th><th style="border:1px solid #000;padding:6px;">Skor</th>
          <th style="border:1px solid #000;padding:6px;">Keterangan</th></tr></thead>
        <tbody>${list.map((a) => `
          <tr>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${escapeHtml(a.nis)}</td>
            <td style="border:1px solid #000;padding:5px;">${escapeHtml(a.name)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${escapeHtml(a.className)}</td>
            <td style="border:1px solid #000;padding:5px;text-align:center;font-weight:700;">${a.score || 0}</td>
            <td style="border:1px solid #000;padding:5px;text-align:center;">${(a.score || 0) >= (tokObj.kkm || 75) ? 'TUNTAS' : 'REMEDIAL'}</td>
          </tr>`).join('')}</tbody>
      </table>`;
    window.print();
  }

  // =====================================================================
  // 8. BACKUP / RESTORE / RESET
  // =====================================================================
  function openBackupModal() { openModal('backupSystemModal'); }

  function downloadJsonBackup() {
    const payload = Object.assign({ exportedAt: new Date().toISOString() }, clone(db));
    downloadBlob(JSON.stringify(payload, null, 2), 'application/json', 'SMATECH-Backup-' + new Date().toISOString().slice(0, 10) + '.json');
    showToast('Backup JSON diunduh.', 'success');
  }

  function refreshAllViews() {
    populateAllDropdowns();
    if (runtime.activeTeacher) switchTeacherModule(runtime.activeModule);
  }

  function restoreJsonBackup(evt) {
    const input = evt && evt.target;
    const file = input && input.files && input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const obj = JSON.parse(String(reader.result));
        if (!obj || !Array.isArray(obj.batches) || !Array.isArray(obj.students) || !Array.isArray(obj.tokens) || !Array.isArray(obj.attempts)) {
          throw new Error('Struktur file tidak valid');
        }
        db = { version: 2, batches: obj.batches, students: obj.students, tokens: obj.tokens, attempts: obj.attempts };
        persistDb();
        refreshAllViews();
        closeModal('backupSystemModal');
        showToast('Data berhasil dipulihkan dari backup.', 'success');
      } catch (err) {
        showToast('File backup tidak valid: ' + err.message, 'error');
      }
      input.value = '';
    };
    reader.readAsText(file);
  }

  function resetDemoDatabase() {
    if (!window.confirm('Kembalikan semua data ke kondisi awal demo? Data saat ini akan hilang.')) return;
    db = seedDb();
    persistDb();
    refreshAllViews();
    closeModal('backupSystemModal');
    showToast('Data awal demo dipulihkan.', 'success');
  }

  // =====================================================================
  // 9. RUANG UJIAN SISWA (CBT)
  // =====================================================================
  function tokenAllowsClass(tok, className) {
    const t = String(tok.targetClass || 'ALL');
    const c = String(className || '').toUpperCase();
    if (t === 'ALL') return true;
    if (t === 'KELAS_X') return /^X-/.test(c);
    if (t === 'KELAS_XI') return /^XI-/.test(c);
    return t.toUpperCase() === c;
  }

  function targetLabel(t) {
    if (t === 'ALL') return 'semua kelas';
    if (t === 'KELAS_X') return 'seluruh Kelas X';
    if (t === 'KELAS_XI') return 'seluruh Kelas XI';
    return 'kelas ' + t;
  }

  async function handleStudentCbtAuth(e) {
    e.preventDefault();
    const box = $('studentLoginAlertBox');
    const fail = (m) => { if (box) { box.textContent = m; box.classList.remove('hidden'); } };
    if (box) box.classList.add('hidden');

    const nis = ($('cbtNisInput')?.value || '').trim();
    const code = ($('cbtTokenCodeInput')?.value || '').trim().toUpperCase();
    if (!nis || !code) { fail('NIS dan Kode Token wajib diisi.'); return; }

    let student = db.students.find((s) => s.nis === nis);
    if (!student && isApiReady()) {
      try {
        const res = await smatechApi('getStudent', { nis: nis });
        const rec = normalizeCloudStudent(res && (res.student || res.data));
        if (rec) { db.students.push(rec); persistDb(); student = rec; }
      } catch (err) { /* lanjut: dianggap tidak terdaftar */ }
    }
    if (!student) { fail('NIS ' + nis + ' tidak terdaftar. Hubungi pengawas ruang.'); return; }
    if (!student.active) { fail('NIS ini berstatus nonaktif. Hubungi pengawas ruang.'); return; }

    const tok = db.tokens.find((t) => t.token === code);
    if (!tok) { fail('Kode token tidak ditemukan. Periksa kembali kode dari pengawas.'); return; }
    if (tok.status !== 'AKTIF') { fail('Sesi ujian ini terkunci atau belum dibuka oleh pengawas.'); return; }
    if (!tokenAllowsClass(tok, student.className)) { fail('Token ini hanya untuk ' + targetLabel(tok.targetClass) + '. Kelas Anda: ' + student.className + '.'); return; }

    const batch = getBatch(tok.batchId);
    if (!batch) { fail('Paket soal untuk sesi ini tidak ditemukan. Hubungi guru.'); return; }

    const prev = db.attempts.find((a) => a.token === tok.token && a.nis === student.nis);
    if (prev && prev.status !== 'BERJALAN') {
      fail(prev.status === 'TERKUNCI'
        ? 'Ujian Anda terkunci karena pelanggaran. Minta pengawas melakukan Reset & Buka Kunci.'
        : 'Anda sudah menyelesaikan ujian ini. Minta pengawas melakukan reset bila perlu.');
      return;
    }

    runtime.pending = { student: student, tok: tok, batch: batch };
    openPreflight();
  }

  function setCbtStep(step) {
    $('cbtPreflightStep')?.classList.toggle('hidden', step !== 'preflight');
    $('cbtActiveStep')?.classList.toggle('hidden', step !== 'active');
    $('cbtSummaryStep')?.classList.toggle('hidden', step !== 'summary');
  }

  function openPreflight() {
    const p = runtime.pending;
    if (!p) return;
    $('authGateView')?.classList.add('hidden');
    $('teacherWorkspaceView')?.classList.add('hidden');
    $('studentCbtView')?.classList.remove('hidden');
    setCbtStep('preflight');
    if ($('preflightExamTitle')) $('preflightExamTitle').textContent = p.tok.title;
    if ($('preflightStudentLine')) $('preflightStudentLine').textContent = `${p.student.name} • NIS ${p.student.nis} • Kelas ${p.student.className}`;
    if ($('preflightTokenText')) $('preflightTokenText').textContent = p.tok.token;
    if ($('preflightDurationText')) $('preflightDurationText').textContent = p.tok.durationMinutes + ' Menit';
    if ($('preflightKkmText')) $('preflightKkmText').textContent = String(p.tok.kkm);
    if ($('preflightMaxCheatText')) $('preflightMaxCheatText').textContent = 'Maks. ' + p.tok.maxViolations + 'x';
    renderIcons();
  }

  function createAttempt(student, tok, batch) {
    const n = batch.questions.length;
    const idx = Array.from({ length: n }, (_, i) => i);
    const order = tok.randomize ? shuffleArr(idx) : idx;
    const optOrders = batch.questions.map((q) => {
      const present = q.options.map((_, k) => k).filter((k) => String(q.options[k] || '').trim());
      return tok.randomize ? shuffleArr(present) : present;
    });
    return {
      id: 'ATT-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      token: tok.token, nis: student.nis, name: student.name, className: student.className,
      status: 'BERJALAN', violations: 0, violationLogs: [],
      totalQuestions: n, answeredCount: 0, correctCount: 0, score: 0,
      answers: new Array(n).fill(null), flags: {},
      order: order, optOrders: optOrders,
      current: 0,
      startedAt: new Date().toISOString(),
      endAt: Date.now() + (tok.durationMinutes || 60) * 60000
    };
  }

  async function startActiveCbtSession() {
    const p = runtime.pending;
    if (!p) return;
    const student = p.student;
    const tok = p.tok;
    const batch = p.batch;

    let att = db.attempts.find((a) => a.token === tok.token && a.nis === student.nis);
    if (att && att.status !== 'BERJALAN') { showToast('Sesi ujian ini sudah selesai/terkunci.', 'error'); return; }
    if (!att) {
      att = createAttempt(student, tok, batch);
      db.attempts.push(att);
      smatechApi('startExam', { tokenCode: tok.token, nis: student.nis, nama: student.name, kelas: student.className }).catch(() => {});
    }
    persistDb();

    if (tok.enforceFullscreen) {
      try { await document.documentElement.requestFullscreen(); }
      catch (err) { showToast('Mode layar penuh tidak dapat diaktifkan di perangkat ini.', 'warning'); }
    }

    runtime.cbtSession = {
      isRunning: true, attempt: att, token: tok, batch: batch,
      current: att.current || 0, timerId: null, lastViolationAt: Date.now(), warningOpen: false
    };
    setCbtStep('active');
    if ($('cbtTopStudentPill')) $('cbtTopStudentPill').textContent = `${student.nis} • ${student.name} (${student.className})`;
    buildWatermark(att);
    updateViolationShield();
    renderCbtQuestion();
    startCbtTimer();
    renderIcons();
  }

  function buildWatermark(att) {
    const layer = $('cbtWatermarkLayer');
    if (!layer) return;
    const label = escapeHtml(att.nis + ' • ' + att.name);
    layer.innerHTML = '<div style="display:flex;flex-wrap:wrap;gap:60px 80px;transform:rotate(-20deg);width:200%;height:200%;margin:-40% 0 0 -30%;">' +
      Array.from({ length: 160 }, () => '<span style="font:700 16px monospace;white-space:nowrap">' + label + '</span>').join('') + '</div>';
  }

  function startCbtTimer() {
    const s = runtime.cbtSession;
    if (!s) return;
    if (s.timerId) clearInterval(s.timerId);
    tickCbtTimer();
    s.timerId = setInterval(tickCbtTimer, 1000);
  }

  function tickCbtTimer() {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    const rem = Math.max(0, Math.round((s.attempt.endAt - Date.now()) / 1000));
    const mm = String(Math.floor(rem / 60)).padStart(2, '0');
    const ss = String(rem % 60).padStart(2, '0');
    if ($('cbtTimerText')) {
      $('cbtTimerText').textContent = mm + ':' + ss;
      $('cbtTimerText').classList.toggle('text-rose-400', rem <= 300);
    }
    if (rem <= 0) completeStudentExam('SELESAI', 'Waktu ujian habis.');
  }

  function updateViolationShield() {
    const s = runtime.cbtSession;
    if (!s) return;
    const v = s.attempt.violations || 0;
    const max = s.token.maxViolations || 3;
    if ($('cbtViolationText')) $('cbtViolationText').textContent = `Pelanggaran: ${v} / ${max}`;
    if ($('cbtViolationShield')) {
      $('cbtViolationShield').className = 'px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 tabular-nums ' +
        (v === 0 ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-rose-500/20 border-rose-400/40 text-rose-300');
    }
  }

  function renderCbtQuestion() {
    const s = runtime.cbtSession;
    if (!s) return;
    const att = s.attempt;
    const batch = s.batch;
    const total = att.order.length;
    const p = Math.max(0, Math.min(total - 1, s.current));
    s.current = p;
    att.current = p;
    const orig = att.order[p];
    const q = batch.questions[orig];
    const perm = att.optOrders[orig];
    const selected = att.answers[orig];
    const flagged = Boolean(att.flags && att.flags[orig]);

    if ($('cbtQNumLabel')) $('cbtQNumLabel').textContent = String(p + 1);
    if ($('cbtQLevelTag')) $('cbtQLevelTag').textContent = q.level;
    if ($('cbtQuestionBody')) $('cbtQuestionBody').textContent = q.question;

    if ($('cbtQStateBadge')) {
      $('cbtQStateBadge').textContent = flagged ? 'Ragu-Ragu' : selected ? 'Terjawab' : 'Belum Dijawab';
      $('cbtQStateBadge').className = 'text-[11px] font-bold px-2.5 py-1 rounded-lg ' +
        (flagged ? 'bg-amber-100 text-amber-800' : selected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200/80 text-slate-600');
    }

    if ($('cbtOptionsStack')) {
      $('cbtOptionsStack').innerHTML = perm.map((oi, k) => {
        const origLetter = LETTERS[oi];
        const sel = selected === origLetter;
        return `<button type="button" onclick="selectCbtOption('${origLetter}')"
          class="w-full text-left flex items-start gap-3 p-3.5 rounded-xl border-2 transition ${sel ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 bg-white'}">
          <span class="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-mono font-extrabold text-xs ${sel ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}">${LETTERS[k]}</span>
          <span class="text-sm text-slate-800 leading-relaxed pt-0.5">${escapeHtml(q.options[oi])}</span>
        </button>`;
      }).join('');
    }

    if ($('cbtFlagBtnLabel')) $('cbtFlagBtnLabel').textContent = flagged ? 'Hapus Tanda Ragu-Ragu' : 'Tandai Ragu-Ragu';
    if ($('cbtPrevBtn')) $('cbtPrevBtn').disabled = p === 0;
    if ($('cbtNextBtn')) $('cbtNextBtn').disabled = p === total - 1;

    const answered = att.answers.filter(Boolean).length;
    if ($('cbtAnsweredCounter')) $('cbtAnsweredCounter').textContent = answered + ' / ' + total;

    if ($('cbtMatrixGrid')) {
      $('cbtMatrixGrid').innerHTML = att.order.map((o, i) => {
        const isFlag = Boolean(att.flags && att.flags[o]);
        const isAns = Boolean(att.answers[o]);
        const tone = isFlag ? 'bg-amber-400 text-slate-900 border-amber-400'
          : isAns ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-100 text-slate-700 border-slate-300';
        return `<button type="button" onclick="goToCbtQuestion(${i})"
          class="h-9 rounded-lg border text-xs font-mono font-bold tabular-nums ${tone} ${i === p ? 'ring-2 ring-indigo-600 ring-offset-1' : ''}">${i + 1}</button>`;
      }).join('');
    }
  }

  function persistAttemptProgress() {
    const s = runtime.cbtSession;
    if (!s) return;
    gradeAttempt(s.attempt, s.batch);
    persistDb();
  }

  function selectCbtOption(origLetter) {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    const orig = s.attempt.order[s.current];
    s.attempt.answers[orig] = s.attempt.answers[orig] === origLetter ? null : origLetter;
    persistAttemptProgress();
    renderCbtQuestion();
  }

  function stepCbtQuestion(delta) {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    s.current += delta;
    persistAttemptProgress();
    renderCbtQuestion();
  }

  function goToCbtQuestion(i) {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    s.current = i;
    renderCbtQuestion();
  }

  function toggleCbtDoubtFlag() {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    const orig = s.attempt.order[s.current];
    s.attempt.flags = s.attempt.flags || {};
    s.attempt.flags[orig] = !s.attempt.flags[orig];
    persistAttemptProgress();
    renderCbtQuestion();
  }

  function openCbtSubmitModal() {
    const s = runtime.cbtSession;
    if (!s) return;
    const total = s.attempt.order.length;
    const answered = s.attempt.answers.filter(Boolean).length;
    const flagged = Object.keys(s.attempt.flags || {}).filter((k) => s.attempt.flags[k]).length;
    if ($('confirmSubmitSummary')) {
      $('confirmSubmitSummary').textContent = `Terjawab ${answered} dari ${total} soal` +
        (total - answered > 0 ? `, ${total - answered} soal belum dijawab` : '') +
        (flagged > 0 ? `, ${flagged} soal masih ditandai ragu-ragu` : '') +
        '. Setelah dikumpulkan, jawaban tidak dapat diubah.';
    }
    openModal('confirmCbtSubmitModal');
  }

  // ---------- Anti-Kecurangan ----------
  function handleAntiCheatViolation(reason) {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning || s.warningOpen) return;
    const now = Date.now();
    if (now - s.lastViolationAt < 1500) return;
    s.lastViolationAt = now;

    const att = s.attempt;
    att.violations = (att.violations || 0) + 1;
    att.violationLogs = att.violationLogs || [];
    att.violationLogs.push({ reason: reason, time: nowTime() });
    persistDb();
    updateViolationShield();
    smatechApi('logViolation', { tokenCode: att.token, nis: att.nis, alasan: reason, waktu: nowTime(), total: att.violations }).catch(() => {});

    const max = s.token.maxViolations || 3;
    if (att.violations >= max) {
      completeStudentExam('TERKUNCI', 'Terkunci otomatis: ' + reason);
      return;
    }
    s.warningOpen = true;
    if ($('acModalReason')) $('acModalReason').textContent = reason;
    if ($('acModalCounter')) $('acModalCounter').textContent = att.violations + ' / ' + max;
    openModal('antiCheatWarningModal');
  }

  async function acknowledgeAntiCheatWarning() {
    const s = runtime.cbtSession;
    closeModal('antiCheatWarningModal');
    if (!s) return;
    s.warningOpen = false;
    s.lastViolationAt = Date.now();
    if (s.token.enforceFullscreen && !document.fullscreenElement) {
      try { await document.documentElement.requestFullscreen(); } catch (err) { /* abaikan */ }
      s.lastViolationAt = Date.now();
    }
  }

  function triggerSimulatedAntiCheat() {
    handleAntiCheatViolation('Simulasi Tes Anti-Cheat (Uji Pengawas)');
  }

  // ---------- Selesai & Hasil ----------
  function readQueue() {
    try { return JSON.parse(localStorage.getItem(SMATECH_CONFIG.OFFLINE_QUEUE_KEY) || '[]'); } catch (e) { return []; }
  }
  function writeQueue(q) {
    try { localStorage.setItem(SMATECH_CONFIG.OFFLINE_QUEUE_KEY, JSON.stringify(q)); } catch (e) { /* abaikan */ }
  }

  async function flushOfflineExamQueue() {
    if (runtime.flushing || !isApiReady() || (typeof navigator !== 'undefined' && navigator.onLine === false)) return;
    const queue = readQueue();
    if (!queue.length) return;
    runtime.flushing = true;
    const remaining = [];
    for (const item of queue) {
      try { await smatechApi('submitResult', { result: item }); } catch (err) { remaining.push(item); }
    }
    writeQueue(remaining);
    runtime.flushing = false;
    if (remaining.length < queue.length) showToast((queue.length - remaining.length) + ' hasil ujian tertunda berhasil dikirim.', 'success');
  }

  async function submitResultToCloud(att) {
    const result = {
      token_code: att.token, nis: att.nis, nama: att.name, kelas: att.className,
      benar: att.correctCount, salah: Math.max(0, att.totalQuestions - att.correctCount), skor: att.score,
      status: att.status, pelanggaran: att.violations, log_pelanggaran: att.violationLogs,
      jawaban: att.answers, catatan: att.note || '', waktu_selesai: att.finishedAt
    };
    try {
      await smatechApi('submitResult', { result: result });
    } catch (err) {
      const q = readQueue();
      q.push(result);
      writeQueue(q);
    }
  }

  function completeStudentExam(status, note) {
    const s = runtime.cbtSession;
    if (!s || !s.isRunning) return;
    s.isRunning = false;
    if (s.timerId) clearInterval(s.timerId);
    s.timerId = null;

    const att = s.attempt;
    att.status = status === 'TERKUNCI' ? 'TERKUNCI' : 'SELESAI';
    att.note = note || '';
    att.finishedAt = new Date().toISOString();
    gradeAttempt(att, s.batch);
    persistDb();

    closeModal('confirmCbtSubmitModal');
    closeModal('antiCheatWarningModal');
    if (document.fullscreenElement && document.exitFullscreen) {
      try { document.exitFullscreen(); } catch (err) { /* abaikan */ }
    }

    const tok = s.token;
    const locked = att.status === 'TERKUNCI';
    const pass = att.score >= (tok.kkm || 75);
    const showScore = tok.showScore !== false;

    setCbtStep('summary');
    if ($('summaryHeroIcon')) $('summaryHeroIcon').className = 'w-16 h-16 rounded-2xl mx-auto flex items-center justify-center ' + (locked ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600');
    if ($('summaryStatusPill')) {
      $('summaryStatusPill').textContent = locked ? 'UJIAN TERKUNCI — PELANGGARAN' : 'UJIAN SELESAI NORMAL';
      $('summaryStatusPill').className = 'px-3 py-1 rounded-full border text-xs font-extrabold uppercase tracking-wide ' +
        (locked ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200');
    }
    if ($('summarySubtitleText')) {
      $('summarySubtitleText').textContent = locked
        ? 'Ujian dihentikan otomatis karena batas pelanggaran tercapai. Jawaban yang sudah terisi tetap tersimpan. Hubungi pengawas.'
        : 'Jawaban Anda telah tersimpan ke sistem SMATECH SMAN 1 Gondanglegi.';
    }
    if ($('summaryScoreNumber')) $('summaryScoreNumber').textContent = showScore ? String(att.score) : '—';
    if ($('summaryBreakdownNumber')) $('summaryBreakdownNumber').textContent = showScore ? `${att.correctCount} / ${Math.max(0, att.totalQuestions - att.correctCount)}` : '—';
    if ($('summaryKkmBadge')) {
      $('summaryKkmBadge').textContent = showScore ? (pass ? 'TUNTAS' : 'REMEDIAL') : 'DIKUMPULKAN';
      $('summaryKkmBadge').className = 'inline-block mt-0.5 px-2.5 py-0.5 rounded-md text-xs font-extrabold ' +
        (!showScore ? 'bg-slate-200 text-slate-700' : pass ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800');
    }
    renderIcons();
    submitResultToCloud(att);
  }

  function exitCbtToGate() {
    const s = runtime.cbtSession;
    if (s && s.timerId) clearInterval(s.timerId);
    if (s) s.isRunning = false;
    runtime.cbtSession = null;
    runtime.pending = null;
    closeModal('antiCheatWarningModal');
    closeModal('confirmCbtSubmitModal');
    if (document.fullscreenElement && document.exitFullscreen) {
      try { document.exitFullscreen(); } catch (err) { /* abaikan */ }
    }
    $('studentCbtView')?.classList.add('hidden');
    $('authGateView')?.classList.remove('hidden');
    if ($('cbtTokenCodeInput')) $('cbtTokenCodeInput').value = '';
    if ($('cbtNisInput')) $('cbtNisInput').value = '';
    updateStudentLookupPreview('');
    setAuthTab('student');
  }

  // =====================================================================
  // EKSPOR FUNGSI KE WINDOW (dipakai atribut onclick/oninput di HTML)
  // =====================================================================
  Object.assign(window, {
    setAuthTab, quickTeacherLogin, fillQuickStudentDemo, manualCloudSync, logoutToGate,
    launchStudentPortalFromTeacher, toggleMobileSidebar, switchTeacherModule, closeModal,
    openBackupModal, downloadJsonBackup, restoreJsonBackup, resetDemoDatabase,
    renderBankBatches, setBankSort, deleteBatch, openBatchInspector, toggleInspectorKeys,
    createTokenFromBatch, quickCreateTokenFromInspector,
    loadSample40Template, resetInputDraft, evaluateDraftValidity, switchInputSubTab,
    parseSmartPasteText, updateDraftCell, commitNewBatch40, importDocxFromFile, importKisiFromFile,
    generateShuffledVariants, selectActiveVariant, openPrintableExamModal, exportVariantCsv,
    refreshMixStatus, saveCombinedBatch40, exportMixedCsv,
    openImportStudentsModal, fillSampleImportStudents, processStudentBulkImport,
    printStudentExamCards, renderStudentDirectory, toggleStudentActive, deleteStudent,
    populateNewTokenCode, createNewTokenSession, toggleTokenLock, renderLiveProctoringTable,
    openViolationLogModal, resetAttemptUnlock,
    switchResultsSubTab, renderResultsModule, exportResultsCsv, printOfficialExamReport,
    exitCbtToGate, startActiveCbtSession, stepCbtQuestion, goToCbtQuestion, selectCbtOption,
    toggleCbtDoubtFlag, triggerSimulatedAntiCheat, openCbtSubmitModal,
    acknowledgeAntiCheatWarning, completeStudentExam
  });

  // =====================================================================
  // BOOTSTRAP
  // =====================================================================
  function bootstrapSmatech() {
    try {
      db = loadDb();
      renderQuickTeacherCards();
      populateAllDropdowns();
      populateNewTokenCode();
      setAuthTab('teacher');
      setSyncPill(isApiReady() ? 'online' : 'local');
      updateBadges();

      $('teacherManualLoginForm')?.addEventListener('submit', handleTeacherManualLogin);
      $('cbtNisInput')?.addEventListener('input', (e) => updateStudentLookupPreview(e.target.value));
      $('studentCbtLoginForm')?.addEventListener('submit', handleStudentCbtAuth);
      $('cbtTokenCodeInput')?.addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase(); });

      flushOfflineExamQueue();
      window.addEventListener('online', flushOfflineExamQueue);

      // Sinkron antar-tab (guru memantau di satu tab, siswa ujian di tab lain)
      window.addEventListener('storage', (e) => {
        if (e.key !== STORAGE_KEY || !e.newValue) return;
        try {
          const next = JSON.parse(e.newValue);
          if (next && Array.isArray(next.attempts)) {
            db = next;
            updateBadges();
            if (runtime.activeTeacher && runtime.activeModule === 'live') { renderActiveTokensGrid(); renderLiveProctoringTable(); }
            if (runtime.activeTeacher && runtime.activeModule === 'results') renderResultsModule();
          }
        } catch (err) { /* abaikan */ }
      });
      setInterval(() => {
        if (runtime.activeTeacher && runtime.activeModule === 'live' && !$('teacherWorkspaceView')?.classList.contains('hidden')) {
          renderLiveProctoringTable();
        }
      }, 5000);

      // Listener anti-cheat (aktif hanya saat ujian berjalan)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && runtime.cbtSession && runtime.cbtSession.isRunning) {
          handleAntiCheatViolation('Perpindahan Tab / Browser Disembunyikan');
        }
      });
      window.addEventListener('blur', () => {
        if (runtime.cbtSession && runtime.cbtSession.isRunning) {
          handleAntiCheatViolation('Fokus Jendela Ujian Hilang (Window Blur)');
        }
      });
      document.addEventListener('fullscreenchange', () => {
        const s = runtime.cbtSession;
        if (s && s.isRunning && s.token.enforceFullscreen && !document.fullscreenElement) {
          handleAntiCheatViolation('Keluar dari Mode Layar Penuh');
        }
      });
      document.addEventListener('contextmenu', (e) => {
        if (runtime.cbtSession && runtime.cbtSession.isRunning) e.preventDefault();
      });
      ['copy', 'cut', 'paste'].forEach((evt) => {
        document.addEventListener(evt, (e) => {
          if (runtime.cbtSession && runtime.cbtSession.isRunning) e.preventDefault();
        });
      });
      document.addEventListener('keydown', (e) => {
        if (!runtime.cbtSession || !runtime.cbtSession.isRunning) return;
        const key = String(e.key || '').toUpperCase();
        const blocked = key === 'F12' || ((e.ctrlKey || e.metaKey) && ['C', 'V', 'X', 'U', 'P', 'S'].indexOf(key) !== -1);
        if (blocked) {
          e.preventDefault();
          handleAntiCheatViolation('Pintasan Keyboard Diblokir (' + (e.ctrlKey ? 'Ctrl+' : '') + key + ')');
        }
      });

      renderIcons();
    } catch (err) {
      console.error('SMATECH init error:', err);
      showToast('Kendala inisialisasi komponen antarmuka.', 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrapSmatech);
  } else {
    bootstrapSmatech();
  }
})();
