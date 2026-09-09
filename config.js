// ═══════════════════════════════════════════════════════
//  config.js — Cơ Học Đất · Nền Móng
//  ► GV chỉ cần sửa file này → git commit → git push
//  ► Tất cả SV thấy ngay (~1 phút sau khi push)
//  ► KHÔNG cần sửa index.html hay các file bài tập
// ═══════════════════════════════════════════════════════

// ── Cloudflare Worker URL ─────────────────────────────────────────
// Lấy từ Cloudflare Dashboard → Workers → tên worker → URL
// Phải khớp với WORKER_URL trong DEF_CFG của index.html (fallback khi config.js chưa load)
window.WORKER_URL = "https://dqt-chdnm.bm-cdnm.workers.dev";  // ← cập nhật nếu đổi Worker

// ── % số câu phải LÀM (không cần đúng) để được nộp bài ─
//    Test: 5   |   Chính thức: 70 hoặc 80
window.MIN_ATTEMPT_PCT = 80;

// ── Danh sách lớp (hiện trong dropdown đăng ký của SV) ──────────────
//    id   = classId gửi lên Worker → PHẢI KHỚP ALLOWED_CLASSES trong worker.js VÀ GAS_V4.js
//    name = tên hiển thị cho sinh viên chọn
//    Thêm/xoá lớp → sửa cả 3 chỗ: config.js · worker.js · GAS_V4.js
window.CLASS_LIST = [
  { id: "KT1",  name: "KT1"  },
  { id: "KT2",  name: "KT2"  },
  { id: "KT3",  name: "KT3"  },
  { id: "KT4",  name: "KT4"  },
  { id: "KT5",  name: "KT5"  },
  { id: "KT6",  name: "KT6"  },
  { id: "KT7",  name: "KT7"  },
  { id: "KT8",  name: "KT8"  },
  { id: "KT9",  name: "KT9"  },
  { id: "KT10", name: "KT10" },
  { id: "BDS1", name: "BDS1" },
  { id: "BDS2", name: "BDS2" },
  { id: "QD1",  name: "QD1"  },
  { id: "QD2",  name: "QD2"  },
  { id: "KTE",  name: "KTE"  },
  { id: "CDQ1", name: "CDQ1" },
  { id: "CDQ2", name: "CDQ2" },
  { id: "NV01", name: "NV01" },
  { id: "NV02", name: "NV02" },
  { id: "NV03", name: "NV03" },
];

window.CHAPTER_SCHEDULE = {

  // ── PHẦN I: CƠ HỌC ĐẤT ─────────────────────────────
  c0: {          // Chương Mở Đầu
    active: true,
    open:   null,          // null = mở ngay, không giới hạn
    close:  null,          // null = không tự đóng
  },
  c1: {          // Chương 1 — Tính Chất Vật Lý
    active: true,
    open:   null,
    close:  null,
  },
  c2: {          // Chương 2 — Ứng Suất Trong Đất
    active: true,
    open:   null,
    close:  null,
  },
  c3: {          // Chương 3 — Tính Chất Cơ Học
    active: true,
    open:   null,
    close:  null,
  },
  c4: {          // Chương 4 — Độ Lún
    active: true,
    open:   null,
    close:  null,
  },
  c5: {          // Chương 5 — SCT & Ổn Định Mái
    active: true,
    open:   null,
    close:  null,
  },
  c6: {          // Chương 6 — Áp Lực Đất Lên Tường Chắn
    active: true,          // ← TEST: đã mở tất cả
    open:   null,
    close:  null,
  },

  // ── PHẦN II: NỀN MÓNG ───────────────────────────────
  c7: {          // Chương 7 — Vấn Đề Chung Nền & Móng
    active: true,
    open:   null,
    close:  null,
  },
  c8: {          // Chương 8 — Móng Nông
    active: true,
    open:   null,
    close:  null,
  },
  c9: {          // Chương 9 — Nền Đất Yếu
    active: true,
    open:   null,
    close:  null,
  },
  c10: {         // Chương 10 — Móng Cọc
    active: true,
    open:   null,
    close:  null,
  },

};

// ═══════════════════════════════════════════════════════
//  VÍ DỤ ĐẶT LỊCH CÓ GIỜ MỞ/ĐÓNG:
//
//  c3: {
//    active: true,
//    open:  "2025-10-01T07:00:00",   ← mở lúc 7h sáng 01/10
//    close: "2025-10-08T23:59:00",   ← đóng cuối ngày 08/10
//  },
//
//  CẤU TRÚC THƯ MỤC GITHUB:
//
//  📁 BT_CHDNM_DHXDHN/
//  ├── index.html          ← Trang chủ
//  ├── config.js           ← File này — GV chỉ sửa ở đây
//  ├── chuong-02/
//  │   ├── index_C2.html   ← Trang chương 2
//  │   ├── 2.1_DANG_1.html
//  │   └── ...
//  └── chuong-XX/
//
// ═══════════════════════════════════════════════════════
