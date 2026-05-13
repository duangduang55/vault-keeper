use rusqlite::params;
use serde::{Deserialize, Serialize};

use crate::error::{AppError, AppResult};

/// 条目实体
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub entry_type: String,
    pub name: String,
    pub fields: String, // JSON string
    pub created_at: i64,
    pub updated_at: i64,
}

/// 创建条目的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateEntryParams {
    pub entry_type: String,
    pub name: String,
    pub fields: String,
}

/// 更新条目的参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateEntryParams {
    pub name: Option<String>,
    pub fields: Option<String>,
}

/// 条目仓库
pub struct EntryRepo;

impl EntryRepo {
    /// 列出所有条目
    pub fn list_all(conn: &rusqlite::Connection) -> AppResult<Vec<Entry>> {
        let mut stmt = conn.prepare(
            "SELECT id, entry_type, name, fields, created_at, updated_at
             FROM entries ORDER BY updated_at DESC",
        )?;

        let entries = stmt
            .query_map([], |row| {
                Ok(Entry {
                    id: row.get(0)?,
                    entry_type: row.get(1)?,
                    name: row.get(2)?,
                    fields: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// 根据 ID 获取单个条目
    pub fn get_by_id(conn: &rusqlite::Connection, id: &str) -> AppResult<Entry> {
        conn.query_row(
            "SELECT id, entry_type, name, fields, created_at, updated_at
             FROM entries WHERE id = ?1",
            params![id],
            |row| {
                Ok(Entry {
                    id: row.get(0)?,
                    entry_type: row.get(1)?,
                    name: row.get(2)?,
                    fields: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            },
        )
        .map_err(|e| match e {
            rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("条目 {} 不存在", id)),
            other => AppError::Database(other),
        })
    }

    /// 创建新条目
    pub fn create(conn: &rusqlite::Connection, params: &CreateEntryParams) -> AppResult<Entry> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono_now();

        conn.execute(
            "INSERT INTO entries (id, entry_type, name, fields, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![id, params.entry_type, params.name, params.fields, now, now],
        )?;

        Ok(Entry {
            id,
            entry_type: params.entry_type.clone(),
            name: params.name.clone(),
            fields: params.fields.clone(),
            created_at: now,
            updated_at: now,
        })
    }

    /// 更新条目
    pub fn update(
        conn: &rusqlite::Connection,
        id: &str,
        params: &UpdateEntryParams,
    ) -> AppResult<Entry> {
        // 先获取当前条目
        let mut entry = Self::get_by_id(conn, id)?;

        let now = chrono_now();

        if let Some(ref name) = params.name {
            entry.name = name.clone();
        }
        if let Some(ref fields) = params.fields {
            entry.fields = fields.clone();
        }
        entry.updated_at = now;

        conn.execute(
            "UPDATE entries SET name = ?1, fields = ?2, updated_at = ?3 WHERE id = ?4",
            params![entry.name, entry.fields, entry.updated_at, id],
        )?;

        Ok(entry)
    }

    /// 删除条目
    pub fn delete(conn: &rusqlite::Connection, id: &str) -> AppResult<()> {
        let affected = conn.execute("DELETE FROM entries WHERE id = ?1", params![id])?;
        if affected == 0 {
            return Err(AppError::NotFound(format!("条目 {} 不存在", id)));
        }
        Ok(())
    }

    /// 搜索条目（按名称、字段内容、类型模糊匹配）
    pub fn search(conn: &rusqlite::Connection, query: &str) -> AppResult<Vec<Entry>> {
        let pattern = format!("%{}%", query);
        let mut stmt = conn.prepare(
            "SELECT id, entry_type, name, fields, created_at, updated_at
             FROM entries WHERE name LIKE ?1 OR fields LIKE ?1 OR entry_type LIKE ?1
             ORDER BY updated_at DESC",
        )?;

        let entries = stmt
            .query_map(params![pattern], |row| {
                Ok(Entry {
                    id: row.get(0)?,
                    entry_type: row.get(1)?,
                    name: row.get(2)?,
                    fields: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }

    /// 按类型过滤条目
    pub fn list_by_type(conn: &rusqlite::Connection, entry_type: &str) -> AppResult<Vec<Entry>> {
        let mut stmt = conn.prepare(
            "SELECT id, entry_type, name, fields, created_at, updated_at
             FROM entries WHERE entry_type = ?1
             ORDER BY updated_at DESC",
        )?;

        let entries = stmt
            .query_map(params![entry_type], |row| {
                Ok(Entry {
                    id: row.get(0)?,
                    entry_type: row.get(1)?,
                    name: row.get(2)?,
                    fields: row.get(3)?,
                    created_at: row.get(4)?,
                    updated_at: row.get(5)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(entries)
    }
}

/// 获取当前时间戳（秒）
fn chrono_now() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64
}
