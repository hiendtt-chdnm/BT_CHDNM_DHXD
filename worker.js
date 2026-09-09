// ═══════════════════════════════════════════════════════════════════
//  worker.js  –  Cloudflare Worker
//  Proxy giữa frontend và Google Apps Script
//
//  Cloudflare Dashboard → Settings → Variables & Secrets:
//    GAS_URL        = https://script.google.com/macros/s/AKf.../exec
//    SECRET_TOKEN   = chuỗi bí mật (giống trong GAS_V4.js)
//
//  Cloudflare Dashboard → Workers KV → tạo namespace "NCM_KV"
//    → Bind vào Worker với tên biến: NCM_KV
//    (namespace này dùng cho cả chặn trùng lần nộp + rate limit)
// ═══════════════════════════════════════════════════════════════════

// Domain được phép gọi Worker — thêm repo GitHub Pages mới vào đây
// VD: "https://ten-khac.github.io"
const ALLOWED_ORIGINS = [
  "https://bmchdnm-dhxd.github.io",
  "http://127.0.0.1",
  "http://localhost",
  "null"                // file:// kéo thả test
];

// ── Chặn nộp trùng: key KV = "sub:mssv:chapterId", không TTL → lưu vĩnh viễn
// ── Rate-limit: chặn spam nhiều chương liên tiếp trong 1 cửa sổ thời gian
const RATE_LIMIT_REQUESTS = 5;    // ← tối đa N lần/cửa sổ (tăng nếu test nhiều)
const RATE_LIMIT_WINDOW   = 300;  // ← cửa sổ thời gian tính bằng giây (300 = 5 phút)

const ALLOWED_FIELDS = new Set([
  "name","mssv","stt","classId","chapterId",
  "score","total","correct","duration"
]);

// ── Danh sách classId hợp lệ ─────────────────────────────────────────
// PHẢI KHỚP với ALLOWED_CLASSES trong GAS_V4.js VÀ CLASS_LIST trong config.js
// Thêm/xoá lớp → sửa cả 3 chỗ: worker.js · GAS_V4.js · config.js
const ALLOWED_CLASSES = new Set([
  "KT1","KT2","KT3","KT4","KT5","KT6","KT7","KT8","KT9","KT10",
  "BDS1","BDS2",
  "QD1","QD2",
  "KTE",
  "CDQ1","CDQ2",
  "NV01","NV02","NV03"
]);

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "null";

    if (request.method === "OPTIONS") return preflight(origin);

    if (request.method !== "POST") {
      return corsResp(JSON.stringify({ ok:false, error:"Method not allowed" }), 405, origin);
    }

    if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
      return corsResp(JSON.stringify({ ok:false, error:"Forbidden origin" }), 403, origin);
    }

    // Parse body
    let body;
    try { body = await request.json(); }
    catch {
      return corsResp(JSON.stringify({ ok:false, error:"Invalid JSON" }), 400, origin);
    }

    // ── Validate: các field bắt buộc ──────────────────────────────
    const required = ["name","mssv","stt","classId","chapterId","score","total","correct"];
    for (const f of required) {
      if (body[f] === undefined || body[f] === null || body[f] === "") {
        return corsResp(JSON.stringify({ ok:false, error:`Missing field: ${f}` }), 400, origin);
      }
    }

    // ── Sanity checks — chặn payload giả mạo/vô lý ──────────────
    // Điều chỉnh giới hạn total/stt nếu số câu hỏi hoặc số SV vượt ngưỡng
    const score   = Number(body.score);
    const total   = Number(body.total);
    const correct = Number(body.correct);
    const stt     = Number(body.stt);

    if (isNaN(score)   || score < 0   || score > 100)    return corsResp(JSON.stringify({ ok:false, error:"Invalid score"   }), 400, origin);
    if (isNaN(total)   || total <= 0  || total > 500)    return corsResp(JSON.stringify({ ok:false, error:"Invalid total"   }), 400, origin);
    if (isNaN(correct) || correct < 0 || correct > total) return corsResp(JSON.stringify({ ok:false, error:"Invalid correct" }), 400, origin);
    if (isNaN(stt)     || stt < 1     || stt > 500)      return corsResp(JSON.stringify({ ok:false, error:"Invalid stt"     }), 400, origin);

    // MSSV: chấp nhận bất kỳ chuỗi không rỗng (đã kiểm tra ở required phía trên)

    // classId: phải nằm trong danh sách
    if (!ALLOWED_CLASSES.has(String(body.classId))) {
      return corsResp(JSON.stringify({ ok:false, error:"Invalid classId" }), 400, origin);
    }

    // ── #5: Chặn nộp trùng (mssv + chapterId) ────────────────────
    if (env.NCM_KV) {
      const subKey = `sub:${body.mssv}:${body.chapterId}`;
      const already = await env.NCM_KV.get(subKey);
      if (already) {
        return corsResp(
          JSON.stringify({ ok:false, error:"Bạn đã nộp bài chương này rồi." }),
          409, origin
        );
      }
    }

    // ── Rate-limit: chặn spam nhiều lần trong cùng cửa sổ thời gian
    if (env.NCM_KV) {
      const rlKey = `rl:${body.mssv}:${body.chapterId}`;
      const count = parseInt(await env.NCM_KV.get(rlKey) || "0");
      if (count >= RATE_LIMIT_REQUESTS) {
        return corsResp(
          JSON.stringify({ ok:false, error:"Quá nhiều lần nộp. Thử lại sau 5 phút." }),
          429, origin
        );
      }
      ctx.waitUntil(
        env.NCM_KV.put(rlKey, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW })
      );
    }

    // ── Lọc field, thêm IP + token ────────────────────────────────
    const payload = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED_FIELDS.has(k)) payload[k] = v;
    }
    payload.ip    = request.headers.get("CF-Connecting-IP") || "unknown";
    payload.token = env.SECRET_TOKEN;

    // ── Forward tới GAS ───────────────────────────────────────────
    let gasResp;
    try {
      gasResp = await fetch(env.GAS_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload)
      });
    } catch (err) {
      return corsResp(JSON.stringify({ ok:false, error:"GAS unreachable: " + err.message }), 502, origin);
    }

    let gasData;
    try   { gasData = await gasResp.json(); }
    catch { gasData = { ok: gasResp.ok };   }

    // ── #5: Chỉ đánh dấu "đã nộp" khi GAS xác nhận ghi thành công
    //   → nếu GAS lỗi, SV vẫn được thử lại
    if (gasData.ok && env.NCM_KV) {
      const subKey = `sub:${body.mssv}:${body.chapterId}`;
      ctx.waitUntil(
        env.NCM_KV.put(subKey, JSON.stringify({ score, ts: Date.now() }))
        // không có expirationTtl = lưu vĩnh viễn
      );
    }

    return corsResp(
      JSON.stringify(gasData),
      gasResp.ok ? 200 : 502,
      origin
    );
  }
};

// ── CORS helpers ───────────────────────────────────────────────────
function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGINS.some(o => origin.startsWith(o)) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age":       "86400",
  };
}
function corsResp(body, status, origin) {
  return new Response(body, { status, headers: { "Content-Type":"application/json", ...corsHeaders(origin) } });
}
function preflight(origin) {
  return new Response(null, { status:204, headers: corsHeaders(origin) });
}
