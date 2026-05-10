import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error(
    '缺少 Supabase 環境變數。請確認 .env.local 已設定 VITE_SUPABASE_URL 與 VITE_SUPABASE_ANON_KEY。'
  )
}

export const supabase = createClient(url, key)
