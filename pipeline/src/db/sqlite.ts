import { Database } from "bun:sqlite";
import { writeFile } from "node:fs/promises";

const schemaFile = Bun.file(new URL("./schema.sql", import.meta.url));
if (!(await schemaFile.exists())) {
  try {
    await writeFile(new URL("./schema.sql", import.meta.url), `CREATE TABLE IF NOT EXISTS abstractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_text TEXT,
  background TEXT,
  objective TEXT,
  methodology TEXT,
  results TEXT,
  conclusion TEXT,
  keywords TEXT
);
`, { flag: "wx" });
  } catch (error) {
    // Another process may have created the file while this process was starting.
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
}
const schema = await Bun.file(new URL("./schema.sql", import.meta.url)).text();

const db = new Database(Bun.env.DB_PATH ?? "research.sqlite", { create: true });

export function initializeDatabase() {
  db.run(schema);
  // Preserve databases created before original_text was introduced.
  const columns = db.query<{ name: string }, []>(
    "PRAGMA table_info(abstractions)",
  ).all();
  if (!columns.some((column) => column.name === "original_text")) {
    db.run("ALTER TABLE abstractions ADD COLUMN original_text TEXT");
  }
}

export function saveAbstraction(abstraction: {
  background: string | null;
  objective: string | null;
  methodology: string | null;
  results: string | null;
  conclusion: string | null;
  keywords: string | null;
  original_text: string;
}) {
  const statment = db.query(
    `INSERT INTO abstractions (background, objective, methodology, results, conclusion, keywords, original_text) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const saved = statment.run(
    abstraction.background,
    abstraction.objective,
    abstraction.methodology,
    abstraction.results,
    abstraction.conclusion,
    abstraction.keywords,
    abstraction.original_text
  );

  return saved.lastInsertRowid;
}

export type StoredAbstraction = {
  id: number;
  original_text: string | null;
  background: string | null;
  objective: string | null;
  methodology: string | null;
  results: string | null;
  conclusion: string | null;
  keywords: string | null;
};

export function listAbstractions() {
  return db.query<{ id: number; preview: string }, []>(`
    SELECT id, substr(original_text, 1, 160) AS preview
    FROM abstractions
    WHERE original_text IS NOT NULL AND trim(original_text) <> ''
    ORDER BY id DESC
  `).all();
}

export function getAbstraction(id: number): StoredAbstraction {
  const abstraction = db.query<StoredAbstraction, [number]>(
    "SELECT * FROM abstractions WHERE id = ?",
  ).get(id);
  if (!abstraction) {
    throw new Error(`Abstrak dengan ID ${id} tidak ditemukan.`);
  }
  if (!abstraction.original_text?.trim()) {
    throw new Error(`Abstrak dengan ID ${id} belum memiliki teks sumber. Ekstrak ulang abstrak ini.`);
  }
  return abstraction;
}