import postgres from "postgres";

type QueryRow = Record<string, unknown>;
type QueryResult = QueryRow[] & { count?: number };
type SqlExecutor = {
  unsafe(query: string, parameters?: unknown[]): Promise<QueryResult>;
};

let client: ReturnType<typeof postgres> | null = null;

function databaseUrl() {
  const value = process.env.DATABASE_URL?.trim();
  if (!value) {
    throw new Error(
      "Game database is unavailable. Add the Supabase transaction-pooler DATABASE_URL in Netlify."
    );
  }
  return value;
}

function sqlClient() {
  if (!client) {
    client = postgres(databaseUrl(), {
      max: 1,
      prepare: false,
      connect_timeout: 10,
      idle_timeout: 20,
      ssl: "require",
    });
  }
  return client;
}

function postgresPlaceholders(query: string) {
  let position = 0;
  return query.replace(/\?/g, () => `$${++position}`);
}

function normalizeValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return Number(value);
  return value;
}

function normalizeRows<T>(rows: QueryResult): T[] {
  return rows.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, normalizeValue(value)])
    )
  ) as T[];
}

class PreparedStatement {
  readonly query: string;
  readonly parameters: unknown[];

  constructor(query: string, parameters: unknown[] = [], converted = false) {
    this.query = converted ? query : postgresPlaceholders(query);
    this.parameters = parameters;
  }

  bind(...parameters: unknown[]) {
    return new PreparedStatement(this.query, parameters, true);
  }

  async execute(executor: SqlExecutor) {
    return executor.unsafe(this.query, this.parameters);
  }

  async first<T>() {
    const rows = await this.execute(sqlClient() as unknown as SqlExecutor);
    return normalizeRows<T>(rows)[0] ?? null;
  }

  async all<T>() {
    const rows = await this.execute(sqlClient() as unknown as SqlExecutor);
    return { results: normalizeRows<T>(rows) };
  }

  async run() {
    const rows = await this.execute(sqlClient() as unknown as SqlExecutor);
    return { success: true, meta: { changes: rows.count ?? rows.length } };
  }
}

class PostgresDatabase {
  prepare(query: string) {
    return new PreparedStatement(query);
  }

  async batch(statements: PreparedStatement[]) {
    return sqlClient().begin(async (transaction) => {
      const executor = transaction as unknown as SqlExecutor;
      const results: QueryResult[] = [];
      for (const statement of statements) results.push(await statement.execute(executor));
      return results;
    });
  }
}

const database = new PostgresDatabase();

export function getRawDb() {
  return database;
}
