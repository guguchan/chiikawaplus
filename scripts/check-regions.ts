import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })
const sb = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!)
const { data } = await sb.from('badge_themes').select('region').order('id')
const regions = [...new Set(data?.map((d: { region: string }) => d.region))]
for (const r of regions) {
  const codes = [...r].map((c: string) => 'U+' + c.charCodeAt(0).toString(16).toUpperCase()).join(' ')
  console.log(JSON.stringify(r), '|', codes)
}
