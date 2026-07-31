# 刺青預約系統（tattoo-booking）

給獨立刺青師用的極簡預約網站：客人在網站上看圖（價格／尺寸／建議部位都標在圖上）、選 3D 部位、上傳試貼照、選時段送單；刺青師的後台就是 Notion＋一頁 `/admin` 批次時段管理。

- 前端：Next.js 15（App Router）
- 資料庫：Notion（作品／系列／時段／預約訂單／客戶／系統設定 六個資料庫）
- 部署：Vercel（免費 Hobby 方案即可）

## 部署

1. Fork 本 repo
2. 在 Notion 準備好六個資料庫並建立 integration 金鑰（資料庫欄位結構見 `lib/notion.js` 各 map 函式）
3. Vercel Import 專案，環境變數對照 [`.env.example`](.env.example) 逐一填入
4. Deploy

已有現成 Notion 頁面要搬家的話，可用小工具自動產出環境變數清單：

```bash
node scripts/setup-env.mjs <NOTION_TOKEN> <Notion頁面網址或id>
```

## 後台

- `/admin`：批次開時段（勾星期×時間×週數→預覽→建立）、關閉時段、更改密碼
- 密碼正本存於 Notion「系統設定」資料庫「後台密碼」列，`ADMIN_SECRET` 環境變數為備援
