import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "pixel-ai.db");

let _db: Database.Database | null = null;

function getRawDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      email TEXT,
      full_name TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      preferences TEXT DEFAULT '',
      subscription_tier TEXT DEFAULT 'free',
      subscription_status TEXT DEFAULT 'inactive',
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT,
      messages_used_hourly INTEGER DEFAULT 0,
      messages_used_weekly INTEGER DEFAULT 0,
      hourly_reset_at TEXT,
      weekly_reset_at TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT DEFAULT 'Новый чат',
      model TEXT DEFAULT 'llama3-70b-8192',
      project_id TEXT,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS ton_orders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount REAL NOT NULL,
      comment TEXT UNIQUE NOT NULL,
      status TEXT DEFAULT 'pending',
      tier TEXT NOT NULL,
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      instructions TEXT DEFAULT '',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      language TEXT DEFAULT 'html',
      type TEXT DEFAULT 'code',
      created_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
      updated_at TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
    );
  `);
}

interface QueryRow {
  [key: string]: unknown;
}

class QueryBuilder {
  private table: string;
  private selectCols: string[] = [];
  private whereClauses: Array<{ col: string; op: string; val: unknown }> = [];
  private orderByCol: string | null = null;
  private orderAsc = true;
  private limitN: number | null = null;
  private isDelete = false;

  constructor(table: string) {
    this.table = table;
  }

  select(cols: string) {
    this.selectCols = cols === "*" ? ["*"] : cols.split(",").map((c) => c.trim());
    return this;
  }

  eq(col: string, val: unknown) {
    this.whereClauses.push({ col, op: "=", val });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this.whereClauses.push({ col, op: "IN", val: vals });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderByCol = col;
    this.orderAsc = opts?.ascending ?? true;
    return this;
  }

  single() {
    this.limitN = 1;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  private buildWhere(): { where: string; params: unknown[] } {
    const parts: string[] = [];
    const params: unknown[] = [];

    for (const w of this.whereClauses) {
      if (w.op === "IN" && Array.isArray(w.val)) {
        const placeholders = w.val.map(() => "?").join(", ");
        parts.push(`${w.col} IN (${placeholders})`);
        params.push(...w.val);
      } else {
        parts.push(`${w.col} = ?`);
        params.push(w.val);
      }
    }

    return { where: parts.join(" AND "), params };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then(resolve: (result: { data: any; error: null } | { data: null; error: unknown }) => void) {
    try {
      const result = this.execute();
      resolve({ data: result, error: null });
    } catch (err) {
      resolve({ data: null, error: err });
    }
  }

  execute(): unknown {
    const db = getRawDb();
    const { where, params } = this.buildWhere();

    if (this.isDelete) {
      const sql = `DELETE FROM ${this.table}${where ? " WHERE " + where : ""}`;
      db.prepare(sql).run(...params);
      return null;
    }

    const cols = this.selectCols.length > 0 ? this.selectCols.join(", ") : "*";
    let sql = `SELECT ${cols} FROM ${this.table}${where ? " WHERE " + where : ""}`;
    if (this.orderByCol) sql += ` ORDER BY ${this.orderByCol} ${this.orderAsc ? "ASC" : "DESC"}`;
    if (this.limitN) sql += ` LIMIT ${this.limitN}`;

    const rows = db.prepare(sql).all(...params) as QueryRow[];
    return this.limitN === 1 ? (rows[0] ?? null) : rows;
  }
}

class InsertBuilder {
  constructor(private table: string, private data: Record<string, unknown>) {}

  then(resolve: (result: { error: null } | { error: unknown }) => void) {
    try {
      const db = getRawDb();
      const keys = Object.keys(this.data);
      const cols = keys.join(", ");
      const placeholders = keys.map(() => "?").join(", ");
      const sql = `INSERT INTO ${this.table} (${cols}) VALUES (${placeholders})`;
      db.prepare(sql).run(...Object.values(this.data));
      resolve({ error: null });
    } catch (err) {
      resolve({ error: err });
    }
  }
}

class UpdateBuilder {
  private whereClauses: Array<{ col: string; val: unknown }> = [];

  constructor(private table: string, private data: Record<string, unknown>) {}

  eq(col: string, val: unknown) {
    this.whereClauses.push({ col, val });
    return this;
  }

  then(resolve: (result: { error: null } | { error: unknown }) => void) {
    try {
      const db = getRawDb();
      const setParts = Object.keys(this.data).map((k) => `${k} = ?`);
      const setVals = Object.values(this.data);
      const whereParts = this.whereClauses.map((w) => `${w.col} = ?`);
      const whereVals = this.whereClauses.map((w) => w.val);
      const sql = `UPDATE ${this.table} SET ${setParts.join(", ")}${whereParts.length ? " WHERE " + whereParts.join(" AND ") : ""}`;
      db.prepare(sql).run(...setVals, ...whereVals);
      resolve({ error: null });
    } catch (err) {
      resolve({ error: err });
    }
  }
}

class TableAccessor {
  constructor(private table: string) {}

  select(cols?: string) {
    return new QueryBuilder(this.table).select(cols || "*");
  }

  insert(data: Record<string, unknown>) {
    return new InsertBuilder(this.table, data);
  }

  update(data: Record<string, unknown>) {
    return new UpdateBuilder(this.table, data);
  }

  delete() {
    return new QueryBuilder(this.table).delete();
  }
}

interface SupaLike {
  from(table: string): TableAccessor;
}

function getDb(): SupaLike {
  getRawDb(); // ensure initialized
  return {
    from(table: string) {
      return new TableAccessor(table);
    },
  };
}

export default getDb;
