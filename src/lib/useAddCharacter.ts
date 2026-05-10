import { useState } from 'react'
import { supabase } from './supabase'

/**
 * Shared hook for adding a new character (badge or doll) from within a form.
 * Uses onRefreshChars (chars-only reload) instead of onSaved (full reload)
 * so that the parent form's own state is not disrupted mid-edit.
 */
export function useAddCharacter(
  table: 'badge_characters' | 'doll_characters',
  characters: { name: string }[],
  onRefreshChars: () => void,
  onToast: (text: string, type?: 'success' | 'error') => void,
) {
  const [newCharName, setNewCharName] = useState('')
  const [addingChar, setAddingChar] = useState(false)

  async function handleAddChar() {
    const name = newCharName.trim()
    if (!name) return
    if (characters.some(c => c.name === name)) {
      onToast('該角色已存在', 'error')
      return
    }
    setAddingChar(true)
    try {
      const { error } = await supabase.from(table).insert({ name, sort_order: 100 })
      if (error) throw error
      setNewCharName('')
      onRefreshChars()
      onToast(`已新增角色「${name}」`)
    } catch (e: unknown) {
      onToast(`新增失敗：${e instanceof Error ? e.message : '未知錯誤'}`, 'error')
    } finally {
      setAddingChar(false)
    }
  }

  return { newCharName, setNewCharName, addingChar, handleAddChar }
}
