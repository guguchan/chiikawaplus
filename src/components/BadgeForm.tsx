import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageUtils'
import { useAddCharacter } from '../lib/useAddCharacter'
import type { BadgeTheme, BadgeCharacter } from '../types'
import ConfirmModal from './ConfirmModal'

interface Props {
  badge?: BadgeTheme | null
  characters: BadgeCharacter[]
  onClose: () => void
  onSaved: () => void
  onRefreshChars: () => void
  onToast: (text: string, type?: 'success' | 'error') => void
}

const REGIONS = ['關東', '關西', '北海道．東北', '中部', '九州．沖繩', '中國．四國', '其他']

export default function BadgeForm({ badge, characters, onClose, onSaved, onRefreshChars, onToast }: Props) {
  const isEdit = !!badge
  const [locationName, setLocationName] = useState(badge?.location_name ?? '')
  const [themeName, setThemeName] = useState(badge?.theme_name ?? '')
  const [region, setRegion] = useState(badge?.region ?? '')
  const [japaneseName, setJapaneseName] = useState(badge?.japanese_name ?? '')
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fetchingPhoto, setFetchingPhoto] = useState(false)

  // A2: shared add-character hook (fixes DRY + A3 timing)
  const { newCharName, setNewCharName, addingChar, handleAddChar } = useAddCharacter(
    'badge_characters',
    characters,
    onRefreshChars,   // A3: only refreshes chars, not the whole badge list
    onToast,
  )

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Q2: stable primitive dep (badge?.id) — lazy-fetch image for edit mode
  useEffect(() => {
    if (!badge?.id) return
    setFetchingPhoto(true)
    supabase.from('badge_themes').select('image_base64').eq('id', badge.id).single()
      .then(({ data }) => { if (data?.image_base64) setImageBase64(data.image_base64) })
      .then(() => setFetchingPhoto(false), () => setFetchingPhoto(false))
  }, [badge?.id])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const b64 = await compressImage(file)
      setImageBase64(b64)
    } catch {
      onToast('圖片處理失敗', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!themeName.trim() || !locationName.trim() || !region) {
      onToast('請填寫主題名稱、地區地名與所屬區域', 'error')
      return
    }
    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('badge_themes').update({
          location_name: locationName.trim(),
          theme_name: themeName.trim(),
          region,
          japanese_name: japaneseName.trim() || null,
          image_base64: imageBase64,
        }).eq('id', badge!.id)
        if (error) throw error
        onToast('已更新主題')
      } else {
        const { data, error } = await supabase.from('badge_themes').insert({
          location_name: locationName.trim(),
          theme_name: themeName.trim(),
          region,
          japanese_name: japaneseName.trim() || null,
          image_base64: imageBase64,
        }).select('id').single()
        if (error) throw error
        const ownerships = characters.map(c => ({
          badge_theme_id: data.id,
          character_id: c.id,
          owned: false,
        }))
        if (ownerships.length) {
          const { error: oErr } = await supabase.from('badge_ownership').insert(ownerships)
          if (oErr) throw oErr
        }
        onToast('已新增主題')
      }
      onSaved()
      onClose()
    } catch (e: unknown) {
      onToast(`儲存失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const { error } = await supabase.from('badge_themes').delete().eq('id', badge!.id)
      if (error) throw error
      onToast('已刪除主題')
      onSaved()
      onClose()
    } catch (e: unknown) {
      onToast(`刪除失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--line-soft)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 18, color: 'var(--ink)' }}>
            {isEdit ? '編輯鐵牌主題' : '新增鐵牌主題'}
          </h2>
          <button onClick={onClose} style={{ color: 'var(--muted)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="field-label">主題名稱 *</label>
            <input className="field-input" value={themeName} onChange={e => setThemeName(e.target.value)} placeholder="例：花生" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="field-label">地區／地名 *</label>
              <input className="field-input" value={locationName} onChange={e => setLocationName(e.target.value)} placeholder="例：千葉" />
            </div>
            <div>
              <label className="field-label">所屬區域 *</label>
              <select className="field-input" value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">請選擇</option>
                {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">日文原名</label>
            <input className="field-input" value={japaneseName} onChange={e => setJapaneseName(e.target.value)} placeholder="例：落花生　ダイカットキーホルダー" />
          </div>

          <div>
            <label className="field-label">附圖</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 120, borderRadius: 'var(--radius-sm)',
              border: '2px dashed var(--line)', cursor: 'pointer',
              background: 'var(--cream)', overflow: 'hidden', position: 'relative',
            }}>
              {uploading && <div className="spinner" />}
              {!uploading && imageBase64 && (
                <img src={imageBase64} alt="附圖預覽" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              )}
              {!uploading && !imageBase64 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>點擊上傳附圖</div>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            {imageBase64 && (
              <button className="btn-ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setImageBase64(null)}>移除附圖</button>
            )}
          </div>

          <div>
            <label className="field-label">追蹤角色</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {characters.map(c => (
                <span key={c.id} className="chip active" style={{ cursor: 'default' }}>{c.name}</span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="field-input"
                style={{ flex: 1 }}
                value={newCharName}
                onChange={e => setNewCharName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddChar() }}
                placeholder="新增角色名稱…"
              />
              <button className="btn-ghost" onClick={handleAddChar} disabled={addingChar}>
                {addingChar ? '新增中…' : '+ 新增'}
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '12px 24px 20px', borderTop: '1px solid var(--line-soft)',
        }}>
          <div>
            {isEdit && (
              <button className="btn-danger" onClick={() => setConfirmDelete(true)} disabled={deleting}>
                {deleting ? '刪除中…' : '刪除'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-ghost" onClick={onClose}>取消</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving || fetchingPhoto}>
              {fetchingPhoto ? '載入圖片…' : saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>

      {/* S2: ConfirmModal replaces window.confirm */}
      {confirmDelete && (
        <ConfirmModal
          message={`確定刪除「${badge!.theme_name}」？此操作無法復原。`}
          confirmLabel="刪除"
          danger
          onConfirm={() => { setConfirmDelete(false); handleDelete() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
