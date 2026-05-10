import { createClient } from '@supabase/supabase-js'
import XLSX from 'xlsx'
import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
)

const EXCEL_PATH = path.resolve(process.cwd(), '吉伊卡哇鐵牌收集紀錄.xlsx')

async function main() {
  console.log('📖 讀取 Excel 檔案…')
  const wb = XLSX.readFile(EXCEL_PATH)
  const ws = wb.Sheets['圖鑑-鐵牌']
  if (!ws) { console.error('❌ 找不到工作表「圖鑑-鐵牌」'); process.exit(1) }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { header: 1, defval: null }) as unknown[][]
  // 跳過第一列（標題）
  const dataRows = rows.slice(1).filter(r => r[5] != null && String(r[5]).trim() !== '')

  console.log(`📊 找到 ${dataRows.length} 筆資料，開始匯入…`)

  // 取得角色 ID
  const { data: chars, error: charErr } = await supabase.from('badge_characters').select('id, name').order('sort_order')
  if (charErr) { console.error('❌ 取得角色失敗:', charErr.message); process.exit(1) }

  const chiikawa = chars!.find(c => c.name === '吉伊')
  const hachiware = chars!.find(c => c.name === '小八')
  const usagi = chars!.find(c => c.name === '兔兔')
  if (!chiikawa || !hachiware || !usagi) {
    console.error('❌ 找不到預設角色，請確認 Supabase 種子資料已建立')
    process.exit(1)
  }

  let inserted = 0
  let updated = 0
  let failed = 0

  for (const row of dataRows) {
    // A=0, B=1, C=2, D=3, E=4, F=5, G=6, H=7
    const ownedChiikawa = Boolean(row[0])
    const ownedHachiware = Boolean(row[1])
    const ownedUsagi = Boolean(row[2])
    const locationName = String(row[4] ?? '').trim()
    const themeName = String(row[5] ?? '').trim()
    const region = String(row[6] ?? '').trim()
    const japaneseName = row[7] != null ? String(row[7]).trim() : null

    if (!themeName) continue

    try {
      // Upsert badge_theme
      const { data: existing } = await supabase
        .from('badge_themes')
        .select('id')
        .eq('location_name', locationName)
        .eq('japanese_name', japaneseName ?? '')
        .maybeSingle()

      let themeId: number

      if (existing) {
        const { error } = await supabase.from('badge_themes').update({
          location_name: locationName,
          theme_name: themeName,
          region,
          japanese_name: japaneseName,
        }).eq('id', existing.id)
        if (error) throw error
        themeId = existing.id
        updated++
      } else {
        const { data, error } = await supabase.from('badge_themes').insert({
          location_name: locationName,
          theme_name: themeName,
          region,
          japanese_name: japaneseName,
        }).select('id').single()
        if (error) throw error
        themeId = data.id
        inserted++
      }

      // Upsert ownership
      await supabase.from('badge_ownership').upsert([
        { badge_theme_id: themeId, character_id: chiikawa.id, owned: ownedChiikawa },
        { badge_theme_id: themeId, character_id: hachiware.id, owned: ownedHachiware },
        { badge_theme_id: themeId, character_id: usagi.id, owned: ownedUsagi },
      ])
    } catch (e) {
      console.error(`  ❌ 失敗：${themeName}`, e)
      failed++
    }
  }

  console.log(`\n✅ 匯入完成！`)
  console.log(`   新增：${inserted} 筆`)
  console.log(`   更新：${updated} 筆`)
  if (failed > 0) console.log(`   失敗：${failed} 筆`)
}

main().catch(e => { console.error(e); process.exit(1) })
