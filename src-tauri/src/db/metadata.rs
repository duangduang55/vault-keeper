use rusqlite::params;

use crate::error::AppResult;

/// 元数据仓库
pub struct MetadataRepo;

impl MetadataRepo {
    /// 获取元数据值
    pub fn get(conn: &rusqlite::Connection, key: &str) -> AppResult<Option<String>> {
        match conn.query_row(
            "SELECT value FROM metadata WHERE key = ?1",
            params![key],
            |row| row.get(0),
        ) {
            Ok(v) => Ok(Some(v)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.into()),
        }
    }

    /// 设置元数据值
    pub fn set(conn: &rusqlite::Connection, key: &str, value: &str) -> AppResult<()> {
        conn.execute(
            "INSERT OR REPLACE INTO metadata (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    /// 删除元数据
    #[allow(dead_code)]
    pub fn delete(conn: &rusqlite::Connection, key: &str) -> AppResult<()> {
        conn.execute("DELETE FROM metadata WHERE key = ?1", params![key])?;
        Ok(())
    }
}
