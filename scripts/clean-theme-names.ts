import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)

const { data } = await sb.from('badge_themes').select('id, theme_name').order('id')
const needs = (data ?? []).filter((d: { id: number; theme_name: string }) =>
  d.theme_name.includes('「') || d.theme_name.includes('」')
)
console.log(`需要清理：${needs.length} 筆`)

let updated = 0
for (const row of needs as { id: number; theme_name: string }[]) {
  const cleaned = row.theme_name.replace(/「|」/g, '')
  const { error } = await sb.from('badge_themes').update({ theme_name: cleaned }).eq('id', row.id)
  if (error) { console.error('❌', row.theme_name, error.message) } else { updated++ }
}
console.log(`✅ 完成，更新 ${updated} 筆`)
