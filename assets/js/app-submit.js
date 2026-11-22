/* ═══════════════════════════════════════════════════════════════════
   app-submit.js — HP CHDNM · Hệ thống Bài tập Online BMCHDNM-ĐHXDHN
   Xử lý nộp bài: kiểm tra điều kiện → gửi lên Cloudflare Worker
   Yêu cầu: app-engine.js đã được tải trước (cần ANS, _submitted, TOTAL_QUESTIONS)
   Mỗi trang bài tập cần khai báo: window.CHAPTER_ID = 'CX-XX-TenBai'
   v1.1 — 2026 (thêm localStorage chặn nộp lại sau reload)
   ═══════════════════════════════════════════════════════════════════ */

/* Gọi sau khi trang load để disable nút nếu đã nộp rồi */
function checkSubmittedOnLoad() {
  try {
    var sv = getSV();
    if (!sv || !sv.mssv) return;
    var chapId = window.CHAPTER_ID || 'UNKNOWN';
    var lsKey = 'submitted_' + chapId + '_' + sv.mssv;
    if (localStorage.getItem(lsKey)) {
      _submitted = true;
      var btn = document.getElementById('btn-nop');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '✓ Đã nộp';
        btn.style.background = 'rgba(46,125,50,.5)';
      }
    }
  } catch(e) {}
}

function submitResult() {
  var sv = getSV();
  if (!sv || !sv.name) {
    alert('⚠️ Chưa đăng nhập. Về trang chủ nhập thông tin trước!');
    return;
  }
  if (_submitted) return;

  /* Kiểm tra localStorage — chặn nộp lại sau khi reload trang */
  var chapterIdEarly = window.CHAPTER_ID || 'UNKNOWN';
  var lsKey = 'submitted_' + chapterIdEarly + '_' + (sv.mssv || '');
  if (localStorage.getItem(lsKey)) {
    alert('ℹ️ Bạn đã nộp bài "' + chapterIdEarly + '" rồi!\nKết quả đã được ghi nhận.');
    return;
  }

  /* Đếm số câu đã làm và số câu đúng */
  var total    = TOTAL_QUESTIONS || Object.keys(ANS).length;
  var attempted = 0, done = 0;
  Object.keys(ANS).forEach(function (k) {
    if (ANS[k] !== null && ANS[k] !== undefined) {
      attempted++;
      if (ANS[k] === true) done++;
    }
  });

  var attemPct = total ? Math.round(attempted / total * 100) : 0;
  var scorePct = total ? Math.round(done / total * 100) : 0;

  if (attempted === 0) {
    alert('⚠️ Chưa làm câu nào! Hãy thử làm ít nhất một câu trước khi nộp.');
    return;
  }

  var minPct = (typeof window.MIN_ATTEMPT_PCT !== 'undefined') ? window.MIN_ATTEMPT_PCT : 80;
  if (attemPct < minPct) {
    alert('⚠️ Cần làm tối thiểu ' + minPct + '% số câu mới được nộp!\nHiện tại: ' + attemPct + '%');
    return;
  }

  var chapterId = window.CHAPTER_ID || 'UNKNOWN';
  var workerUrl = (typeof window.WORKER_URL !== 'undefined') ? window.WORKER_URL : '';
  if (!workerUrl) { alert('⚠️ Chưa cấu hình Worker URL. Liên hệ giảng viên!'); return; }

  /* Vô hiệu hóa nút trong lúc gửi để tránh click nhiều lần */
  var btn = document.getElementById('btn-nop');
  if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Đang nộp...'; }

  fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name:      sv.name,
      mssv:      sv.mssv,
      stt:       Number(sv.stt) || 0,
      classId:   sv.classId,
      chapterId: chapterId,
      score:     scorePct,
      correct:   done,
      total:     total,
      duration:  0
    })
  })
  .then(function (r) { return r.json(); })
  .then(function (d) {
    if (d.ok) {
      _submitted = true;
      /* Ghi localStorage để chặn nộp lại sau reload */
      try { localStorage.setItem(lsKey, Date.now()); } catch(e) {}
      if (btn) {
        btn.innerHTML = '✓ Đã nộp (' + scorePct + '%)';
        btn.disabled  = true;
        btn.style.background = 'rgba(46,125,50,.5)';
      }
      alert('✅ Nộp thành công!\nĐúng: ' + scorePct + '% (' + done + '/' + total + ' câu)');
    } else {
      if (btn) { btn.disabled = false; updateProg(); }
      alert('❌ Lỗi từ server: ' + (d.error || 'Không rõ nguyên nhân'));
    }
  })
  .catch(function (err) {
    if (btn) { btn.disabled = false; updateProg(); }
    alert('❌ Không kết nối được Worker.\nKiểm tra mạng Internet và thử lại.\n(' + err.message + ')');
  });
}
