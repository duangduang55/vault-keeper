/** 条目实体 */
export interface Entry {
  id: string;
  entry_type: string;
  name: string;
  fields: string; // JSON string
  created_at: number;
  updated_at: number;
}

/** 字段键值对（解析后） */
export interface EntryFields {
  [key: string]: string;
}

/** 创建条目参数 */
export interface CreateEntryParams {
  entry_type: string;
  name: string;
  fields: string;
}

/** 更新条目参数 */
export interface UpdateEntryParams {
  name?: string;
  fields?: string;
}
