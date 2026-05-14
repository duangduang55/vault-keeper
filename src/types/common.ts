/** 应用锁定状态 */
export type LockState = 'uninitialized' | 'locked' | 'unlocked';

/** 条目类型 */
export type EntryType = 'api_key' | 'password' | 'id_card' | 'license_key' | 'custom';

/** 分类配置 */
export interface CategoryTemplate {
  type: EntryType;
  label: string;
  icon: string;
  fields: FieldDefinition[];
}

/** 字段定义 */
export interface FieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'password' | 'url' | 'date';
  required: boolean;
  placeholder?: string;
  multiline?: boolean;
}

/** 应用配置 */
export interface AppConfig {
  auto_lock_seconds: number;
  theme: string;
  global_shortcut: string;
  lock_shortcut: string;
}
