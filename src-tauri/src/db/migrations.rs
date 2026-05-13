use crate::error::AppResult;
use rusqlite::Connection;

/// 当前数据库 schema 版本
const CURRENT_SCHEMA_VERSION: i64 = 1;

/// 执行数据库迁移，创建所有必要的表
pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    // 创建元数据表
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS metadata (
            key   TEXT PRIMARY KEY NOT NULL,
            value TEXT NOT NULL
        );",
    )?;

    // 创建条目表
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS entries (
            id          TEXT PRIMARY KEY NOT NULL,
            entry_type  TEXT NOT NULL CHECK(entry_type IN ('api_key','password','id_card','license_key','custom')),
            name        TEXT NOT NULL,
            fields      TEXT NOT NULL,
            created_at  INTEGER NOT NULL,
            updated_at  INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(entry_type);
        CREATE INDEX IF NOT EXISTS idx_entries_name ON entries(name);",
    )?;

    // 设置 schema 版本
    set_schema_version(conn, CURRENT_SCHEMA_VERSION)?;

    Ok(())
}

/// 设置 schema 版本
fn set_schema_version(conn: &Connection, version: i64) -> AppResult<()> {
    conn.execute(
        "INSERT OR REPLACE INTO metadata (key, value) VALUES ('schema_version', ?1)",
        [version.to_string()],
    )?;
    Ok(())
}

