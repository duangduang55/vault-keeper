import { invoke } from '@tauri-apps/api/core'

export async function copyToClipboard(entryId: string, fieldKey: string): Promise<{ copied: boolean; expiresAt: number }> {
  return invoke('copy_to_clipboard', { entryId, fieldKey })
}
