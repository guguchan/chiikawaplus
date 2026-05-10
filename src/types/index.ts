export interface BadgeCharacter {
  id: number
  name: string
  sort_order: number
}

export interface BadgeOwnership {
  badge_theme_id: number
  character_id: number
  owned: boolean
  badge_characters?: BadgeCharacter
}

export interface BadgeTheme {
  id: number
  location_name: string
  theme_name: string
  region: string
  japanese_name: string | null
  image_base64?: string | null
  created_at: string
  badge_ownership?: BadgeOwnership[]
}

export interface DollCharacter {
  id: number
  name: string
  sort_order: number
}

export interface Doll {
  id: number
  character_id: number
  photo_base64?: string | null
  acquired_date: string | null
  notes: string | null
  created_at: string
  doll_characters?: DollCharacter
}

export interface ToastMessage {
  id: number
  text: string
  type: 'success' | 'error'
}
