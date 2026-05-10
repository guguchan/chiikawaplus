import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
import XLSX from 'xlsx'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const XLSX_PATH = path.resolve(process.cwd(), '吉伊卡哇鐵牌收集紀錄.xlsx')
const EXTRACTED_DIR = 'C:/Temp/xlsx-inspect'
const MEDIA_DIR = path.join(EXTRACTED_DIR, 'xl/media')
const DRAWING_XML = path.join(EXTRACTED_DIR, 'xl/drawings/drawing1.xml')
const DRAWING_RELS = path.join(EXTRACTED_DIR, 'xl/drawings/_rels/drawing1.xml.rels')

function parseRels(xml: string): Map<string, string> {
  // rId → filename (e.g. "image2.png")
  const map = new Map<string, string>()
  const re = /Id="(rId\d+)"[^>]*Target="\.\.\/media\/([^"]+)"/g
  let m
  while ((m = re.exec(xml)) !== null) {
    map.set(m[1], m[2])
  }
  return map
}

function parseDrawing(xml: string): Map<number, string> {
  // Excel row index (0-based) → rId
  const map = new Map<number, string>()
  // Each anchor: <xdr:from><xdr:col>3</xdr:col>...<xdr:row>N</xdr:row>...r:embed="rIdX"
  const anchorRe = /<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g
  let m
  while ((m = anchorRe.exec(xml)) !== null) {
    const block = m[1]
    const rowM = /<xdr:row>(\d+)<\/xdr:row>/.exec(block)
    const rIdM = /r:embed="(rId\d+)"/.exec(block)
    if (rowM && rIdM) {
      map.set(parseInt(rowM[1]), rIdM[1])
    }
  }
  return map
}

async function main() {
  console.log('📖 解析 Excel 行數與主題資料…')
  const wb = XLSX.readFile(XLSX_PATH)
  const ws = wb.Sheets['圖鑑-鐵牌']
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]

  // Build mapping: excel data row index (0=first data row) → theme identifiers
  // Excel rows: index 0 = header, index 1+ = data rows
  const rowToTheme = new Map<number, { locationName: string; themeName: string; japaneseName: string | null }>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const themeName = String(row[5] ?? '').trim()
    if (!themeName) continue
    rowToTheme.set(i, {
      locationName: String(row[4] ?? '').trim(),
      themeName,
      japaneseName: row[7] != null ? String(row[7]).trim() : null,
    })
  }
  console.log(`  → 找到 ${rowToTheme.size} 筆主題資料`)

  console.log('📖 解析圖片映射…')
  const relsXml = fs.readFileSync(DRAWING_RELS, 'utf8')
  const drawingXml = fs.readFileSync(DRAWING_XML, 'utf8')

  const rIdToFile = parseRels(relsXml)
  const rowToRId = parseDrawing(drawingXml)
  console.log(`  → rels 映射：${rIdToFile.size} 筆，drawing 錨點：${rowToRId.size} 筆`)

  // Build: excel row index → image file path
  const rowToImagePath = new Map<number, string>()
  for (const [row, rId] of rowToRId) {
    const filename = rIdToFile.get(rId)
    if (filename) {
      rowToImagePath.set(row, path.join(MEDIA_DIR, filename))
    }
  }

  console.log('📡 讀取 Supabase 主題列表…')
  const { data: themes, error } = await supabase
    .from('badge_themes')
    .select('id, location_name, theme_name, japanese_name')
    .order('id')
  if (error) { console.error('❌ 讀取失敗:', error.message); process.exit(1) }
  console.log(`  → 共 ${themes!.length} 筆主題`)

  let updated = 0
  let skipped = 0
  let failed = 0

  for (const [excelRow, imageFilePath] of rowToImagePath) {
    const themeData = rowToTheme.get(excelRow)
    if (!themeData) { skipped++; continue }

    // Find matching theme in Supabase
    const match = themes!.find(t =>
      t.location_name === themeData.locationName &&
      t.theme_name === themeData.themeName
    ) ?? themes!.find(t =>
      t.theme_name === themeData.themeName &&
      t.japanese_name === themeData.japaneseName
    )

    if (!match) {
      console.log(`  ⚠️  找不到主題：${themeData.themeName}（${themeData.locationName}）`)
      skipped++
      continue
    }

    if (!fs.existsSync(imageFilePath)) {
      console.log(`  ⚠️  圖片不存在：${imageFilePath}`)
      skipped++
      continue
    }

    try {
      const imgBuffer = fs.readFileSync(imageFilePath)
      const ext = path.extname(imageFilePath).slice(1).toLowerCase()
      const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
      const base64 = `data:${mime};base64,${imgBuffer.toString('base64')}`

      const { error: uErr } = await supabase
        .from('badge_themes')
        .update({ image_base64: base64 })
        .eq('id', match.id)

      if (uErr) throw uErr
      updated++
      if (updated % 10 === 0) console.log(`  ✅ 已更新 ${updated} 筆…`)
    } catch (e) {
      console.error(`  ❌ 更新失敗（row ${excelRow}, ${themeData.themeName}）:`, e)
      failed++
    }
  }

  console.log('\n✅ 圖片匯入完成！')
  console.log(`   更新：${updated} 筆`)
  console.log(`   略過：${skipped} 筆`)
  if (failed > 0) console.log(`   失敗：${failed} 筆`)
}

main().catch(e => { console.error(e); process.exit(1) })
