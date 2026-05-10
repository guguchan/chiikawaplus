# chiikawaplus — Claude 專案設定

## 專案概要

吉伊卡哇收藏紀錄 Web App。追蹤鐵牌（149 款）與娃娃收藏，支援行動裝置。

| 層級 | 技術 |
|------|------|
| 前端 | Vite + React 19 + TypeScript |
| 資料庫 | Supabase PostgreSQL（免費方案） |
| 部署 | GitHub Pages（GitHub Actions 自動部署） |
| 設計主題 | 和菓子茶屋（cream #EDE3D2 / peach #9A6B3F） |

**本地開發：** `npm run dev` → http://localhost:5173  
**Build：** `npm run build` → `dist/`  
**部署：** push to `main` → GitHub Actions 自動 build → GitHub Pages

---

## 重要檔案

```
src/
  App.tsx                  ← 根元件，Tab 切換 + 資料載入
  components/
    Header.tsx             ← 統計卡片（鐵牌主題數、各角色擁有數、娃娃隻數）
    BadgesTab.tsx          ← 鐵牌表格（桌面）+ 卡片（手機 <768px）
    DollsTab.tsx           ← 娃娃卡片網格
    BadgeForm.tsx          ← 鐵牌新增/編輯 Modal
    DollForm.tsx           ← 娃娃新增/編輯 Modal
    PhotoViewer.tsx        ← 照片全螢幕放大 Modal
    ConfirmModal.tsx       ← 刪除二次確認 Modal
    Toast.tsx              ← 底部通知（2.2s 自動消失）
  lib/
    supabase.ts            ← Supabase client（讀取 VITE_ env）
    imageUtils.ts          ← canvas 圖片壓縮（1024px / 0.82）
    useAddCharacter.ts     ← 新增角色共用 hook（badge + doll）
  styles/globals.css       ← CSS 變數 + 全域樣式
  types/index.ts           ← TypeScript 型別定義
scripts/
  import-excel.ts          ← 一次性 Excel 匯入腳本（已執行完畢）
openspec/
  specs/                   ← 已發佈規格（5 個 capability）
  changes/                 ← OpenSpec change 紀錄
```

---

## 設計系統

**色彩（CSS 變數）：**
```css
--cream: #EDE3D2  --surface: #F5EDDD  --card: #FAF3E2
--ink: #3F3528    --ink-soft: #766852  --muted: #A89A80
--peach: #9A6B3F  --line: #D2C2A5     --line-soft: #DDD0B7
```

**字體：** `var(--font-title)` = Shippori Mincho（標題）、`var(--font-body)` = Zen Maru Gothic（本文）

**觸控目標：** 所有互動元素 `min-height: 44px`（WCAG 2.5.5）

**RWD 斷點：**
- 鐵牌表格：`< 768px` → 卡片模式（`.badge-cards`）
- 娃娃網格：`auto-fill, minmax(160px, 1fr)`（手機約 2 欄）
- Modal：`< 640px` → `100dvw × 100dvh`

---

## Supabase 資料表

```
badge_themes        ← 鐵牌主題（含 image_base64）
badge_characters    ← 鐵牌角色（吉伊/小八/兔兔 + 自訂）
badge_ownership     ← 多對多：主題 × 角色 × owned bool
doll_characters     ← 娃娃角色（吉伊/小八/兔兔/師薩/小桃/谷本 + 自訂）
dolls               ← 娃娃（含 photo_base64）
```

**RLS：** `anon_all` policy，允許 anon key 全部 CRUD（個人使用）  
**注意：** 免費方案 90 天無活動自動暫停，從 Dashboard 手動喚醒

---

## 環境變數

| 變數 | 用途 |
|------|------|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon public key（可公開） |

本地：`.env.local`  
CI/CD：GitHub repo Secrets

---

## 開發紀律

- **照片**：前端壓縮至 1024px / JPEG 0.82（`src/lib/imageUtils.ts`）後存 Base64
- **Lazy load**：`photo_base64` 和 `image_base64` 不包含在列表查詢，由 DollsTab/BadgesTab 另行 batch fetch
- **樂觀更新**：`badge_ownership` toggle 先更新本地 state，Supabase 失敗時 revert
- **圖片 fetch 防重試**：用 `Map<id, string>` 存哨兵 `''` 防止因錯誤觸發無限 retry

---

## OpenSpec

規格文件位於 `openspec/specs/`，有 5 個 capability：
- `badge-collection` — 鐵牌表格、toggle、篩選、新增編輯
- `badge-import` — Excel 一次性種子匯入腳本
- `character-management` — 角色新增與排序
- `doll-collection` — 娃娃卡片、照片上傳、篩選
- `supabase-persistence` — DB schema、RLS、環境變數

Change 紀錄：`openspec/changes/chiikawa-collection-website/`（46/47 tasks 完成，待部署）

---

## Skill routing

當使用者要求符合以下情境時，透過 Skill tool 呼叫對應 skill：

- 視覺問題 / UI 無障礙 → `/design-review`
- 功能測試 / QA → `/qa`
- 程式碼審查 → `/review`
- Bug 調查 → `/investigate`
- 規格新增 / 變更 → `/openspec-new-change` 或 `/openspec-propose`
- 已完成的 change 要封存 → `/openspec-archive-change`
- 部署 / PR → `/ship`
