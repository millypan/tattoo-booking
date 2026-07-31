#!/usr/bin/env node
// 搬家助手：幫不熟程式的人（例如米粒）把自己 Notion 帳號底下的資料庫 id 抓出來，
// 產生一份可以直接複製貼進 Vercel 環境變數設定畫面的清單。
//
// 使用方式：
//   node scripts/setup-env.mjs <NOTION_TOKEN> <Notion頁面網址或id>
//
// 純 Node 腳本，不依賴 Next.js，用內建 fetch 打 Notion API，不需要額外安裝套件。

const NOTION_VERSION = "2022-06-28";
const NOTION_API = "https://api.notion.com/v1";

// --- 規則設定 ---
// 標題「包含」這個關鍵字（不是完全比對，因為複製/duplicate 頁面 Notion 常會加「(1)」之類後綴）
// 就對應到某個環境變數；SKIP 代表「這個資料庫不需要環境變數，略過」。
// 順序有意義：由上往下比對，第一個命中的規則就是結果。
const RULES = [
  { keyword: "系列", envKey: "SERIES_DB" },
  { keyword: "作品", envKey: "WORKS_DB" },
  { keyword: "時段", envKey: "SLOTS_DB" },
  { keyword: "預約", envKey: "BOOKINGS_DB" },
  { keyword: "訂單", envKey: "BOOKINGS_DB" },
  { keyword: "客戶", envKey: "CUSTOMERS_DB" },
  { keyword: "收款", envKey: "SKIP" },
  { keyword: "支出", envKey: "SKIP" },
  { keyword: "系統設定", envKey: "SETTINGS_DB" },
];

// 必須要有的環境變數（決定最後輸出清單的順序，也決定缺了哪個要警告）
const REQUIRED_KEYS = ["SERIES_DB", "WORKS_DB", "BOOKINGS_DB", "SLOTS_DB", "CUSTOMERS_DB", "SETTINGS_DB"];

const LABELS = {
  SERIES_DB: "系列",
  WORKS_DB: "作品",
  BOOKINGS_DB: "預約／訂單",
  SLOTS_DB: "時段",
  CUSTOMERS_DB: "客戶",
  SETTINGS_DB: "系統設定",
};

// 依標題判斷對應的環境變數 key；比對不到任何規則回傳 "UNKNOWN"
export function classifyTitle(title) {
  const t = title || "";
  for (const rule of RULES) {
    if (t.includes(rule.keyword)) return rule.envKey;
  }
  return "UNKNOWN";
}

// 從使用者貼的完整 Notion 網址或裸 id 裡，把 32 碼的頁面 id 抓出來。
// 支援：純 32 碼十六進位、有 dash 的 UUID、或網址結尾帶 id（可能還帶 ?pvs=4 之類的 query）。
// 找到多個候選時取「最後一個」（Notion 網址通常是 標題-id 的格式，id 在最後）。
export function extractPageId(input) {
  if (!input) return null;
  const cleaned = String(input).trim().split("?")[0].split("#")[0];
  const matches = cleaned.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}|[0-9a-fA-F]{32}/g
  );
  if (!matches || matches.length === 0) return null;
  const raw = matches[matches.length - 1].replace(/-/g, "");
  if (raw.length !== 32) return null;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}

// 呼叫 Notion API 取得某個頁面底下所有 child_database 區塊（分頁抓全部）。
// 注意：Notion 的 child_database 區塊本身就直接帶 title（block.child_database.title），
// 不需要再對每個 block 多打一次 API 拿標題——一開始設計時以為可能要多一次呼叫，
// 實測 Notion API 回傳結構後發現標題已經內建在 children 回應裡，所以拿掉了多餘的呼叫。
export async function fetchAllChildDatabases({ token, pageId, fetchImpl = fetch }) {
  const found = [];
  let cursor;
  do {
    const url = new URL(`${NOTION_API}/blocks/${pageId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetchImpl(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        "Notion-Version": NOTION_VERSION,
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(json.message || `Notion API 回傳錯誤（狀態碼 ${res.status}）`);
      err.status = res.status;
      throw err;
    }

    for (const block of json.results || []) {
      if (block.type === "child_database") {
        found.push({
          id: block.id,
          title: block.child_database?.title || "(無標題)",
        });
      }
    }

    cursor = json.has_more ? json.next_cursor : undefined;
  } while (cursor);

  return found;
}

// 把抓到的資料庫清單分類，組出最後要印出來的內容。
export function buildReport(token, databases) {
  const found = {}; // envKey -> {id, title}
  const duplicates = {}; // envKey -> [{id,title}, ...]（第二個以後命中同一 key 的）
  const skipped = [];
  const unknown = [];

  for (const db of databases) {
    const key = classifyTitle(db.title);
    if (key === "SKIP") {
      skipped.push(db);
    } else if (key === "UNKNOWN") {
      unknown.push(db);
    } else if (found[key]) {
      (duplicates[key] ||= []).push(db);
    } else {
      found[key] = db;
    }
  }

  const lines = [`NOTION_TOKEN=${token}`];
  const warnings = [];
  for (const key of REQUIRED_KEYS) {
    if (found[key]) {
      lines.push(`${key}=${found[key].id}`);
    } else {
      const extra = key === "SETTINGS_DB" ? "，後台密碼功能將無法運作" : "";
      warnings.push(`⚠️ 找不到『${LABELS[key]}』資料庫，${key} 未設定${extra}`);
    }
  }

  return { lines, warnings, skipped, unknown, duplicates, found };
}

function friendlyErrorMessage(err) {
  if (err.status === 401) {
    return (
      "❌ 驗證失敗（401 Unauthorized）：這組 NOTION_TOKEN 不正確、已失效，或複製時漏了字/多了空白。\n" +
      "請回到 Notion 的 My Integrations 頁面重新複製一次 token。"
    );
  }
  if (err.status === 404) {
    return (
      "❌ 找不到頁面（404 Not Found）：最常見的原因是「這個 Notion integration 還沒有被 Connect 到這個頁面」。\n" +
      "請到那個 Notion 頁面右上角的「⋯」選單 →「Connections」→ 把這個 integration 加進去，再重新執行一次這支腳本。\n" +
      "（也有可能是頁面網址/id 貼錯了，請確認網址是完整複製的。）"
    );
  }
  return `❌ 呼叫 Notion API 時發生錯誤：${err.message}`;
}

function printUsage() {
  console.log("用法：node scripts/setup-env.mjs <NOTION_TOKEN> <Notion頁面網址或id>");
  console.log("");
  console.log("範例：");
  console.log('  node scripts/setup-env.mjs "ntn_xxxxxxxx" "https://www.notion.so/我的頁面-abc123..."');
  console.log("");
  console.log("這支腳本會列出這個 Notion 頁面底下所有的子資料庫，");
  console.log("自動判斷每個資料庫對應到哪個環境變數，產生一份可以直接貼進 Vercel 的清單。");
}

export async function run(argv) {
  const [token, pageInput] = argv;
  if (!token || !pageInput) {
    printUsage();
    return { ok: false, code: 1 };
  }

  const pageId = extractPageId(pageInput);
  if (!pageId) {
    console.error("❌ 沒辦法從你貼的網址或 id 裡找到有效的 Notion 頁面 id，請確認網址是完整複製的（包含最後那一長串亂碼）。");
    return { ok: false, code: 1 };
  }

  console.log(`🔍 正在讀取頁面（id: ${pageId}）底下的資料庫，請稍等...`);

  let databases;
  try {
    databases = await fetchAllChildDatabases({ token, pageId });
  } catch (err) {
    console.error(friendlyErrorMessage(err));
    return { ok: false, code: 1 };
  }

  console.log(`✅ 找到 ${databases.length} 個子資料庫。\n`);

  const report = buildReport(token, databases);

  console.log("========================================");
  console.log("請把下面這段整段複製，貼進 Vercel 專案的");
  console.log("Settings → Environment Variables 設定畫面：");
  console.log("========================================\n");
  console.log(report.lines.join("\n"));

  if (report.warnings.length > 0) {
    console.log("\n----------------------------------------");
    console.log(report.warnings.join("\n"));
  }

  if (Object.keys(report.duplicates).length > 0) {
    console.log("\n----------------------------------------");
    for (const key of Object.keys(report.duplicates)) {
      console.log(`⚠️ 有不只一個資料庫的標題符合「${LABELS[key]}」規則，只採用第一個找到的，請自行確認是否正確：`);
      for (const db of report.duplicates[key]) {
        console.log(`   - ${db.title}（${db.id}）`);
      }
    }
  }

  if (report.unknown.length > 0) {
    console.log("\n----------------------------------------");
    console.log("以下資料庫比對不到任何規則（未知，不需處理）：");
    for (const db of report.unknown) {
      console.log(`   - ${db.title}`);
    }
  }

  if (report.skipped.length > 0) {
    console.log("\n----------------------------------------");
    console.log("以下資料庫依規則略過（收款／支出，不需要環境變數）：");
    for (const db of report.skipped) {
      console.log(`   - ${db.title}`);
    }
  }

  console.log("");
  return { ok: true, code: 0, report };
}

const isMainModule = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  run(process.argv.slice(2)).then((result) => {
    process.exit(result.code);
  });
}
