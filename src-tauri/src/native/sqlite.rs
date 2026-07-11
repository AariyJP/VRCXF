use base64::Engine;
use parking_lot::Mutex;
use rusqlite::types::ValueRef;
use rusqlite::Connection;
use serde_json::{Map, Number, Value};
use std::path::Path;

pub struct SqliteDb {
    conn: Mutex<Connection>,
}

impl SqliteDb {
    pub fn new(path: &Path) -> Result<Self, String> {
        let conn = Connection::open(path).map_err(|e| e.to_string())?;
        conn.execute_batch(
            "PRAGMA locking_mode=NORMAL; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
        )
        .map_err(|e| e.to_string())?;
        Ok(Self {
            conn: Mutex::new(conn),
        })
    }

    fn bind_args(
        stmt: &mut rusqlite::Statement<'_>,
        args: Option<&Map<String, Value>>,
    ) -> Result<(), String> {
        if let Some(map) = args {
            for (key, value) in map {
                let idx = match stmt.parameter_index(key).map_err(|e| e.to_string())? {
                    Some(idx) => idx,
                    None => continue,
                };
                let result = match value {
                    Value::Null => stmt.raw_bind_parameter(idx, rusqlite::types::Null),
                    Value::Bool(b) => stmt.raw_bind_parameter(idx, *b as i64),
                    Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            stmt.raw_bind_parameter(idx, i)
                        } else {
                            stmt.raw_bind_parameter(idx, n.as_f64().unwrap_or(0.0))
                        }
                    }
                    Value::String(s) => stmt.raw_bind_parameter(idx, s.as_str()),
                    other => stmt.raw_bind_parameter(idx, other.to_string()),
                };
                result.map_err(|e| e.to_string())?;
            }
        }
        Ok(())
    }

    fn value_ref_to_json(value: ValueRef<'_>) -> Value {
        match value {
            ValueRef::Null => Value::Null,
            ValueRef::Integer(i) => Value::Number(Number::from(i)),
            ValueRef::Real(f) => Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null),
            ValueRef::Text(t) => Value::String(String::from_utf8_lossy(t).to_string()),
            ValueRef::Blob(b) => {
                Value::String(base64::engine::general_purpose::STANDARD.encode(b))
            }
        }
    }

    pub fn execute(
        &self,
        sql: &str,
        args: Option<&Map<String, Value>>,
    ) -> Result<Vec<Vec<Value>>, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        Self::bind_args(&mut stmt, args)?;
        let column_count = stmt.column_count();
        let mut rows = stmt.raw_query();
        let mut result = Vec::new();
        loop {
            match rows.next() {
                Ok(Some(row)) => {
                    let mut values = Vec::with_capacity(column_count);
                    for i in 0..column_count {
                        let value = row.get_ref(i).map_err(|e| e.to_string())?;
                        values.push(Self::value_ref_to_json(value));
                    }
                    result.push(values);
                }
                Ok(None) => break,
                Err(e) => return Err(e.to_string()),
            }
        }
        Ok(result)
    }

    pub fn execute_json(
        &self,
        sql: &str,
        args: Option<&Map<String, Value>>,
    ) -> Result<String, String> {
        let rows = self.execute(sql, args)?;
        serde_json::to_string(&rows).map_err(|e| e.to_string())
    }

    pub fn execute_non_query(
        &self,
        sql: &str,
        args: Option<&Map<String, Value>>,
    ) -> Result<i64, String> {
        let conn = self.conn.lock();
        let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
        Self::bind_args(&mut stmt, args)?;
        let changed = stmt.raw_execute().map_err(|e| e.to_string())?;
        Ok(changed as i64)
    }
}
