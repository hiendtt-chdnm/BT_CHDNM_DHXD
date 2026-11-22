/* ═══════════════════════════════════════════════════════════════════
   app-engine.js — HP CHDNM · Hệ thống Bài tập Online BMCHDNM-ĐHXDHN
   Bộ công cụ dùng chung: PRNG, chấm điểm, tiến độ, kiểm tra lịch chương
   Không import thư viện ngoài — Vanilla JS thuần, tương thích mọi trình duyệt
   v1.0 — 2026
   ═══════════════════════════════════════════════════════════════════ */

/* ── BIẾN TOÀN CỤC ────────────────────────────────────────────────── */
var ANS = {};            /* Lưu kết quả từng câu: { id: true | false | null } */
var _submitted = false;  /* Cờ ngăn nộp lại sau khi đã gửi thành công */
var TOTAL_QUESTIONS = 0; /* Tổng số câu — gán sau khi genA() và genBC() xong */

/* ── 1. HÀM LÀM TRÒN SỐ ──────────────────────────────────────────── */
function r1(v) { return Math.round(v * 10)    / 10;    }
function r2(v) { return Math.round(v * 100)   / 100;   }
function r3(v) { return Math.round(v * 1000)  / 1000;  }

/* ── 2. BỘ SINH SỐ NGẪU NHIÊN THEO HẠT GIỐNG (Seeded PRNG — LCG) ── */
/*  Đảm bảo: cùng STT → cùng đề bài mỗi lần vào.                      */
/*  Cú pháp: var rng = seededRng(stt * 7 + 2101);                      */
/*           var x = rng();  // trả về số trong [0, 1)                  */
function seededRng(seed) {
  var s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = s * 16807 % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/* ── 3. ĐỌC THÔNG TIN SINH VIÊN TỪ sessionStorage ─────────────────── */
function getSV() {
  try { return JSON.parse(sessionStorage.getItem('ncm_sv')); }
  catch (e) { return null; }
}

/* ── 4. CUỘN ĐẾN Ô NHẬP ĐẦU TIÊN CHƯA ĐÚNG ─────────────────────── */
function scrollNext() {
  var inp = document.querySelector('.ans-inp:not(.ok)');
  if (inp) { inp.closest('.ans-row').scrollIntoView({ behavior: 'smooth', block: 'center' }); inp.focus(); }
}

/* ── 4b. TOAST THÔNG BÁO NỔI (dùng trong C2 submitResult) ─────────── */
function toast(msg, dur) {
  dur = dur || 3000;
  var el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { el.classList.remove('show'); }, dur);
}

/* ── 4c. TOGGLE ACCORDION (dùng trong C2 — onclick="togS(this)") ───── */
function togS(hd) { hd.classList.toggle('open'); hd.nextElementSibling.classList.toggle('open'); }

/* ── 4d. TẠO CARD NHÓM B VÀ C (dùng chung cho C2 exercise files) ────── */
function renderBCards(bcfg) {
  var h = ''; bcfg.forEach(function (b) {
    h += '<div class="card"><div class="card-hd"><i class="ti ti-pencil"></i><div><h2>' + b.title + '</h2></div>'
      + '<span class="cbadge" style="background:#6A1B9A">&#9999;&#65039; ' + b.num + '</span></div>'
      + '<div class="card-body"><div class="earth-box" id="' + b.pid + '-prob">&#9203;</div>'
      + '<div class="fml-box"><div class="fml-title">C&#244;ng th&#7913;c</div><div>' + b.fml + '</div></div>'
      + '<div id="' + b.pid + '-q"></div></div></div>';
  }); document.getElementById('b-cards').innerHTML = h;
}
function renderCCards(ccfg) {
  var h = ''; ccfg.forEach(function (c) {
    h += '<div class="card"><div class="card-hd"><i class="ti ti-brain"></i><div><h2>' + c.title + '</h2></div>'
      + '<span class="cbadge" style="background:#E65100">&#129504; ' + c.num + '</span></div>'
      + '<div class="card-body"><div class="earth-box" id="' + c.pid + '-prob">&#9203;</div>'
      + '<div id="' + c.pid + '-q"></div></div></div>';
  }); document.getElementById('c-cards').innerHTML = h;
}

/* ── 4e. MCQ CHỌN VỊ TRÍ LỚP ĐẤT (dùng chung cho C2 exercise files) ── */
function makeLopMCQ(pid, opts, correct, expText) {
  var html = opts.map(function (o, i) {
    return '<div class="mcq-opt" id="mco-' + pid + '-' + i + '" '
      + 'onclick="pickMCQ(\'' + pid + '\',' + i + ',' + correct + ',this.dataset.exp)" '
      + 'data-exp="' + expText.replace(/"/g, '&quot;').replace(/'/g, '&#39;') + '"><span class="mkey">'
      + String.fromCharCode(65 + i) + '</span><span>' + o + '</span></div>';
  }).join('');
  document.getElementById(pid + '-opts').innerHTML = html;
  ANS['mcq-' + pid] = null;
}

/* ── 5. CHẤM CÂU HỎI ĐIỀN SỐ ────────────────────────────────────── */
/*  Dung sai: ±tol tuyệt đối, ±0.005 (làm tròn 2 chữ số), hoặc ±2% tương đối — lấy cái lớn nhất */
function chkFill(id, ans, tol) {
  var inp  = document.getElementById(id);
  var chip = document.getElementById('ck-' + id);
  if (!inp || !chip) return;
  var v = parseFloat(inp.value);
  if (isNaN(v)) {
    inp.classList.remove('ok', 'no');
    chip.className = 'chip';
    chip.textContent = '';
    ANS[id] = null;
    updateProg();
    return;
  }
  var effectiveTol = Math.max(tol, 0.005, Math.abs(ans) * 0.02);
  var ok = Math.abs(v - ans) <= effectiveTol;
  inp.classList.toggle('ok', ok);
  inp.classList.toggle('no', !ok);
  chip.className = 'chip ' + (ok ? 'ok' : 'no');
  chip.textContent = ok ? '✓' : '✗';
  ANS[id] = ok;
  updateProg();
}

/* ── 6. TẠO HTML MỘT HÀNG CÂU HỎI ĐIỀN SỐ ─────────────────────── */
/*  Mỗi lần gọi tự đăng ký id vào ANS.                                 */
function makeQ(id, label, ans, tol, unit) {
  ANS[id] = null;
  return '<div class="ans-row">'
    + '<span class="ans-label">' + label + '</span>'
    + '<input class="ans-inp" id="' + id + '" type="number" step="any"'
    + ' inputmode="decimal" placeholder="?" oninput="chkFill(\'' + id + '\',' + ans + ',' + tol + ')">'
    + '<span class="ans-unit">' + unit + '</span>'
    + '<span class="chip" id="ck-' + id + '"></span>'
    + '</div>';
}

/* ── 7. CẬP NHẬT TIẾN ĐỘ & NÚT NỘP BÀI ───────────────────────── */
function updateProg() {
  var attempted = 0, done = 0;
  var total = TOTAL_QUESTIONS || Object.keys(ANS).length;
  Object.keys(ANS).forEach(function (k) {
    if (ANS[k] !== null && ANS[k] !== undefined) {
      attempted++;
      if (ANS[k] === true) done++;
    }
  });
  var attemPct = total ? Math.round(attempted / total * 100) : 0;
  var donePct  = total ? Math.round(done  / total * 100) : 0;

  var el;
  if ((el = document.getElementById('prog-fill') || document.getElementById('prog-bar')))
    el.style.width = attemPct + '%';
  if ((el = document.getElementById('prog-text') || document.getElementById('prog-txt')))
    el.textContent = 'Đã làm: ' + attempted + '/' + total
      + ' (' + attemPct + '%) · Đúng: ' + done + ' (' + donePct + '%)';
  if ((el = document.getElementById('nav-prog')))
    el.textContent = attempted + '/' + total;
  if ((el = document.getElementById('hdr-prog')))
    el.textContent = attempted + ' / ' + total;

  if (!_submitted) {
    var minPct = (typeof window.MIN_ATTEMPT_PCT !== 'undefined') ? window.MIN_ATTEMPT_PCT : 80;
    var btn = document.getElementById('btn-nop');
    if (btn) {
      var ready = (attemPct >= minPct && attempted > 0);
      btn.style.background    = ready ? 'rgba(46,125,50,.7)' : 'rgba(150,150,150,.35)';
      btn.style.borderColor   = ready ? 'rgba(165,214,167,.6)' : 'rgba(200,200,200,.4)';
      btn.innerHTML = (ready ? '✅' : '🔒')
        + ' Nộp bài <span style="font-size:10px;opacity:.8">(' + attemPct + '%/' + minPct + '%)</span>';
    }
  }
}

/* ── 8. KIỂM TRA LỊCH MỞ/ĐÓNG CHƯƠNG (từ config.js) ─────────────── */
/*  chapterId: 'c1', 'c2', ... khớp với key trong CHAPTER_SCHEDULE      */
function checkChapterSchedule(chapterId) {
  if (typeof window.CHAPTER_SCHEDULE === 'undefined') return true;
  var cfg = window.CHAPTER_SCHEDULE[chapterId];
  if (!cfg) return true;
  if (!cfg.active) return false;
  var now = new Date();
  if (cfg.open  && new Date(cfg.open)  > now) return false;
  if (cfg.close && new Date(cfg.close) < now) return false;
  return true;
}

/* ── 9. KHỞI TẠO TRANG BÀI TẬP ──────────────────────────────────── */
/*  Gọi ở đầu window.onload của mỗi trang bài tập.                     */
/*  Trả về { stt, sv, isOpen } để trang dùng tiếp.                     */
function initChapterPage(chapterId) {
  var sv  = getSV();
  var stt = 1;
  var el;

  /* Hiển thị thông tin sinh viên lên header */
  if (sv && sv.name) {
    if ((el = document.getElementById('sv-display')))
      el.textContent = sv.name + ' — MSSV: ' + sv.mssv + ' · STT: ' + sv.stt;
    if ((el = document.getElementById('sv-chip')))
      el.textContent = '#' + sv.stt;
    if ((el = document.getElementById('sv-badge')))
      el.textContent = 'SV #' + sv.stt;
    stt = parseInt(sv.stt) || 1;
  } else {
    if ((el = document.getElementById('sv-display')))
      el.textContent = 'Chưa đăng nhập — về Trang chủ nhập thông tin';
    if ((el = document.getElementById('sv-chip')))
      el.textContent = '–';
    if ((el = document.getElementById('sv-badge')))
      el.textContent = '–';
  }

  /* Kiểm tra lịch chương */
  var isOpen = checkChapterSchedule(chapterId);
  if (!isOpen) {
    var cfg = (window.CHAPTER_SCHEDULE || {})[chapterId] || {};
    var now = new Date();
    var msg;
    if (!cfg.active) {
      msg = 'Chương này chưa được giảng viên mở.';
    } else if (cfg.open && new Date(cfg.open) > now) {
      msg = 'Chương sẽ mở lúc: <b>' + cfg.open.replace('T', ' ') + '</b>';
    } else {
      msg = 'Chương đã đóng lúc: <b>' + (cfg.close || '').replace('T', ' ') + '</b>';
    }
    var mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.innerHTML =
        '<div class="chapter-lock">'
        + '<i class="ti ti-lock lock-icon"></i>'
        + '<h2>Chương chưa mở</h2>'
        + '<p>' + msg + '</p>'
        + '<p style="margin-top:14px"><a href="../index.html">← Về trang chủ</a></p>'
        + '</div>';
    }
    var nav = document.querySelector('.sticky-nav');
    if (nav) nav.style.display = 'none';
  }

  /* Set nhãn ban đầu cho nút Nộp bài */
  var minPct = (typeof window.MIN_ATTEMPT_PCT !== 'undefined') ? window.MIN_ATTEMPT_PCT : 80;
  if ((el = document.getElementById('btn-nop')))
    el.innerHTML = '🔒 Nộp bài <span style="font-size:10px;opacity:.8">(0%/' + minPct + '%)</span>';

  return { stt: stt, sv: sv, isOpen: isOpen };
}

/* ── 10. XỬ LÝ CÂU HỎI TRẮC NGHIỆM MCQ ─────────────────────────── */
/*  name:    mã câu (vd 'q1', 'b2')                                    */
/*  picked:  chỉ số đáp án SV chọn (0-based)                           */
/*  correct: chỉ số đáp án đúng                                        */
/*  expText: (tùy chọn) HTML giải thích hiển thị sau khi chọn          */
function pickMCQ(name, picked, correct, expText) {
  if (ANS['mcq-' + name] != null) return;
  var ok = (picked === correct);
  document.querySelectorAll('[id^="mco-' + name + '-"]').forEach(function (el) {
    el.style.pointerEvents = 'none';
  });
  document.getElementById('mco-' + name + '-' + picked).className = 'mcq-opt ' + (ok ? 'ok' : 'no');
  if (!ok) {
    var revEl = document.getElementById('mco-' + name + '-' + correct);
    if (revEl) revEl.className = 'mcq-opt reveal';
  }
  var exp = document.getElementById('exp-' + name);
  if (exp) {
    exp.className = 'mcq-exp show ' + (ok ? 'ok-e' : 'no-e');
    if (expText) exp.innerHTML = expText;
  }
  ANS['mcq-' + name] = ok;
  updateProg();
}

/* ── 11. TẠO MCQ ĐỘNG (dùng trong bài 1.4 — gán vào id+'-opts') ──── */
/*  id:      mã câu (phần tử id+'-opts' phải tồn tại trong DOM)        */
/*  opts:    mảng các chuỗi văn bản lựa chọn                           */
/*  correct: chỉ số đáp án đúng (0-based)                              */
function makeMCQGeneric(id, opts, correct) {
  var html = opts.map(function (o, i) {
    return '<div class="mcq-opt" id="mco-' + id + '-' + i + '"'
      + ' onclick="pickMCQ(\'' + id + '\',' + i + ',' + correct + ')">'
      + '<span class="mkey">' + String.fromCharCode(65 + i) + '</span>'
      + '<span>' + o + '</span></div>';
  }).join('');
  var container = document.getElementById(id + '-opts');
  if (container) container.innerHTML = html;
  ANS['mcq-' + id] = null;
}
