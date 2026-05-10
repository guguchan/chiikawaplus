import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
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
const MEDIA_DIR = 'C:/Temp/xlsx-inspect/xl/media'
const DRAWING_XML = 'C:/Temp/xlsx-inspect/xl/drawings/drawing1.xml'
const DRAWING_RELS = 'C:/Temp/xlsx-inspect/xl/drawings/_rels/drawing1.xml.rels'

// Thumbnail target: 160px, JPEG 70% — roughly 8–15KB per image
const THUMB_SIZE = 400
const THUMB_QUALITY = 85

function parseRels(xml: string): Map<string, string> {
  const map = new Map<string, string>()
  const re = /Id="(rId\d+)"[^>]*Target="\.\.\/media\/([^"]+)"/g
  let m
  while ((m = re.exec(xml)) !== null) map.set(m[1], m[2])
  return map
}

function parseDrawing(xml: string): Map<number, string> {
  const map = new Map<number, string>()
  const re = /<xdr:oneCellAnchor>([\s\S]*?)<\/xdr:oneCellAnchor>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const block = m[1]
    const rowM = /<xdr:row>(\d+)<\/xdr:row>/.exec(block)
    const rIdM = /r:embed="(rId\d+)"/.exec(block)
    if (rowM && rIdM) map.set(parseInt(rowM[1]), rIdM[1])
  }
  return map
}

async function main() {
  console.log('📖 解析 Excel 行數…')
  const wb = XLSX.readFile(XLSX_PATH)
  const ws = wb.Sheets['圖鑑-鐵牌']
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null }) as unknown[][]

  const rowToTheme = new Map<number, { locationName: string; themeName: string }>()
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const themeName = String(row[5] ?? '').trim()
    if (!themeName) continue
    rowToTheme.set(i, { locationName: String(row[4] ?? '').trim(), themeName })
  }

  const rIdToFile = parseRels(fs.readFileSync(DRAWING_RELS, 'utf8'))
  const rowToRId = parseDrawing(fs.readFileSync(DRAWING_XML, 'utf8'))

  const { data: themes, error } = await supabase
    .from('badge_themes').select('id, location_name, theme_name').order('id')
  if (error) { console.error('❌', error.message); process.exit(1) }
  console.log(`  → ${themes!.length} 筆主題`)

  let updated = 0
  let failed = 0

  for (const [excelRow, rId] of rowToRId) {
    const themeData = rowToTheme.get(excelRow)
    const filename = rIdToFile.get(rId)
    if (!themeData || !filename) continue

    const imgPath = path.join(MEDIA_DIR, filename)
    if (!fs.existsSync(imgPath)) continue

    const match = themes!.find(t =>
      t.location_name === themeData.locationName && t.theme_name === themeData.themeName
    ) ?? themes!.find(t => t.theme_name === themeData.themeName)

    if (!match) { console.log(`  ⚠️  找不到：${themeData.themeName}`); continue }

    try {
      const jpegBuf = await sharp(imgPath)
        .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: THUMB_QUALITY })
        .toBuffer()

      const base64 = `data:image/jpeg;base64,${jpegBuf.toString('base64')}`

      const { error: uErr } = await supabase
        .from('badge_themes').update({ image_base64: base64 }).eq('id', match.id)
      if (uErr) throw uErr

      updated++
      if (updated % 20 === 0) console.log(`  ✅ ${updated} 筆（最新：${themeData.themeName}，${Math.round(jpegBuf.length / 1024)}KB）`)
    } catch (e) {
      console.error(`  ❌ ${themeData.themeName}:`, e)
      failed++
    }
  }

  console.log(`\n✅ 完成！更新：${updated}，失敗：${failed}`)
}

main().catch(e => { console.error(e); process.exit(1) })
