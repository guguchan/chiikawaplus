import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageUtils'
import { useAddCharacter } from '../lib/useAddCharacter'
import type { Doll, DollCharacter } from '../types'
import ConfirmModal from './ConfirmModal'

interface Props {
  doll?: Doll | null
  characters: DollCharacter[]
  onClose: () => void
  onSaved: () => void
  onRefreshChars: () => void
  onToast: (text: string, type?: 'success' | 'error') => void
}

export default function DollForm({ doll, characters, onClose, onSaved, onRefreshChars, onToast }: Props) {
  const isEdit = !!doll
  const [characterId, setCharacterId] = useState<number | null>(doll?.character_id ?? null)
  // A1: initialize to null; lazy-fetch from DB below
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [acquiredDate, setAcquiredDate] = useState(doll?.acquired_date ?? '')
  const [notes, setNotes] = useState(doll?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // A2: shared add-character hook (fixes DRY + A3 timing)
  const { newCharName, setNewCharName, addingChar, handleAddChar } = useAddCharacter(
    'doll_characters',
    characters,
    onRefreshChars,   // A3: only refreshes chars, not the whole doll list
    onToast,
  )

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // A1: lazy-fetch photo for edit mode (keeps main dolls list photo_base64-free)
  useEffect(() => {
    if (!doll?.id) return
    supabase.from('dolls').select('photo_base64').eq('id', doll.id).single()
      .then(({ data }) => { if (data?.photo_base64) setPhotoBase64(data.photo_base64) })
  }, [doll?.id])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const b64 = await compressImage(file)
      setPhotoBase64(b64)
    } catch {
      onToast('圖片處理失敗', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function handleSave() {
    if (!characterId) { onToast('請選擇角色', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        character_id: characterId,
        photo_base64: photoBase64,
        acquired_date: acquiredDate || null,
        notes: notes.trim() || null,
      }
      if (isEdit) {
        const { error } = await supabase.from('dolls').update(payload).eq('id', doll!.id)
        if (error) throw error
        onToast('已更新娃娃')
      } else {
        const { error } = await supabase.from('dolls').insert(payload)
        if (error) throw error
        onToast('已新增娃娃')
      }
      onSaved(); onClose()
    } catch (e: unknown) {
      onToast(`儲存失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const { error } = await supabase.from('dolls').delete().eq('id', doll!.id)
      if (error) throw error
      onToast('已刪除娃娃'); onSaved(); onClose()
    } catch (e: unknown) {
      onToast(`刪除失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px 16px', borderBottom: '1px solid var(--line-soft)',
        }}>
          <h2 style={{ fontFamily: 'var(--font-title)', fontSize: 18 }}>{isEdit ? '編輯娃娃' : '新增娃娃'}</h2>
          <button onClick={onClose} style={{ color: 'var(--muted)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 照片 */}
          <div>
            <label className="field-label">照片</label>
            <label style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: 180, borderRadius: 'var(--radius-sm)',
              border: '2px dashed var(--line)', cursor: 'pointer',
              background: 'var(--cream)', overflow: 'hidden', position: 'relative',
            }}>
              {uploading && <div className="spinner" />}
              {!uploading && photoBase64 && (
                <img src={photoBase64} alt="預覽" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {!uploading && !photoBase64 && (
                <div style={{ textAlign: 'center', color: 'var(--muted)' }}>
                  <div style={{ fontSize: 32, marginBottom: 6 }}>🐾</div>
                  <div style={{ fontSize: 13 }}>點擊上傳照片</div>
                </div>
              )}
              <input type="file" accept="image/*" onChange={handlePhoto} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            </label>
            {photoBase64 && (
              <button className="btn-ghost" style={{ fontSize: 12, marginTop: 6 }} onClick={() => setPhotoBase64(null)}>移除照片</button>
            )}
          </div>

          {/* 角色選擇 */}
          <div>
            <label className="field-label">角色 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {characters.map(c => (
                <button
                  key={c.id}
                  className={`chip ${characterId === c.id ? 'active' : ''}`}
                  onClick={() => setCharacterId(c.id)}
                >
                  {c.name}
                </button>
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

          {/* 入手日期 */}
          <div>
            <label className="field-label">入手日期</label>
            <input type="date" className="field-input" value={acquiredDate} onChange={e => setAcquiredDate(e.target.value)} />
          </div>

          {/* 備註 */}
          <div>
            <label className="field-label">備註</label>
            <textarea className="field-input" rows={4} value={notes} onChange={e => setNotes(e.target.value)} placeholder="款式名稱、購入地點、價格…" style={{ resize: 'vertical' }} />
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
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '儲存中…' : '儲存'}
            </button>
          </div>
        </div>
      </div>

      {/* S2: ConfirmModal replaces window.confirm */}
      {confirmDelete && (
        <ConfirmModal
          message="確定刪除這隻娃娃？此操作無法復原。"
          confirmLabel="刪除"
          danger
          onConfirm={() => { setConfirmDelete(false); handleDelete() }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  )
}
