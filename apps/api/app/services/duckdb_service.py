from __future__ import annotations

import re
import time
from pathlib import Path
from typing import Any

import duckdb


class DuckDBService:
    def __init__(self, db_path: str = ":memory:"):
        self.db = duckdb.connect(db_path)
        self._init_metadata()

    def _init_metadata(self):
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS _dai_datasets (
                id VARCHAR PRIMARY KEY,
                name VARCHAR,
                source_type VARCHAR,
                table_name VARCHAR,
                row_count INTEGER,
                column_count INTEGER,
                created_at TIMESTAMP DEFAULT now()
            )
        """)

    def load_sample_data(self, sample_dir: str):
        sample_path = Path(sample_dir)
        if not sample_path.exists():
            return

        for parquet_file in sample_path.glob("*.parquet"):
            table_name = parquet_file.stem
            try:
                self.db.execute(
                    f"CREATE OR REPLACE TABLE {table_name} AS SELECT * FROM read_parquet('{parquet_file}')"
                )
                info = self.db.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
                row_count = info[0] if info else 0
                cols = self.db.execute(f"DESCRIBE {table_name}").fetchall()
                col_count = len(cols)

                self.db.execute(
                    """INSERT OR REPLACE INTO _dai_datasets (id, name, source_type, table_name, row_count, column_count)
                       VALUES (?, ?, 'sample', ?, ?, ?)""",
                    [table_name, table_name.replace("_", " ").title(), table_name, row_count, col_count],
                )
            except Exception as e:
                print(f"Warning: Could not load {parquet_file}: {e}")

    def ingest_csv(self, file_path: str, table_name: str) -> dict[str, Any]:
        safe_name = re.sub(r"[^a-zA-Z0-9_]", "_", table_name).lower()
        self.db.execute(
            f"CREATE OR REPLACE TABLE {safe_name} AS SELECT * FROM read_csv_auto('{file_path}')"
        )
        info = self.db.execute(f"SELECT COUNT(*) FROM {safe_name}").fetchone()
        row_count = info[0] if info else 0
        cols = self.db.execute(f"DESCRIBE {safe_name}").fetchall()
        col_count = len(cols)

        self.db.execute(
            """INSERT OR REPLACE INTO _dai_datasets (id, name, source_type, table_name, row_count, column_count)
               VALUES (?, ?, 'csv', ?, ?, ?)""",
            [safe_name, safe_name.replace("_", " ").title(), safe_name, row_count, col_count],
        )

        schema = [{"name": c[0], "type": c[1], "nullable": c[2] == "YES"} for c in cols]
        return {"table_name": safe_name, "schema": schema, "row_count": row_count, "column_count": col_count}

    def get_schema(self, table_name: str) -> list[dict[str, Any]]:
        cols = self.db.execute(f"DESCRIBE {table_name}").fetchall()
        schema = []
        for col in cols:
            entry: dict[str, Any] = {"name": col[0], "type": col[1], "nullable": col[2] == "YES"}
            try:
                samples = self.db.execute(
                    f'SELECT DISTINCT "{col[0]}" FROM {table_name} WHERE "{col[0]}" IS NOT NULL LIMIT 5'
                ).fetchall()
                entry["sample_values"] = [s[0] for s in samples]
            except Exception:
                entry["sample_values"] = []
            schema.append(entry)
        return schema

    def preview(self, table_name: str, limit: int = 100, offset: int = 0) -> dict[str, Any]:
        total = self.db.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()
        total_count = total[0] if total else 0

        result = self.db.execute(f"SELECT * FROM {table_name} LIMIT {limit} OFFSET {offset}")
        columns = [desc[0] for desc in result.description]
        col_types = []
        for desc in result.description:
            col_types.append(str(desc[1]) if desc[1] else "VARCHAR")

        rows = []
        for row in result.fetchall():
            rows.append([self._serialize_value(v) for v in row])

        return {
            "columns": columns,
            "column_types": col_types,
            "rows": rows,
            "total_count": total_count,
            "page": (offset // limit) + 1 if limit > 0 else 1,
            "page_size": limit,
        }

    def execute_query(self, sql: str, limit: int = 1000) -> dict[str, Any]:
        cleaned = sql.strip().rstrip(";")
        if not self._is_safe_query(cleaned):
            raise ValueError("Only SELECT queries are allowed")

        start = time.time()
        result = self.db.execute(cleaned)
        columns = [desc[0] for desc in result.description]
        rows_raw = result.fetchmany(limit)
        elapsed = (time.time() - start) * 1000

        rows = [[self._serialize_value(v) for v in row] for row in rows_raw]

        return {
            "columns": columns,
            "rows": rows,
            "row_count": len(rows),
            "execution_time_ms": round(elapsed, 2),
            "sql": cleaned,
        }

    def apply_transform(self, sql: str, target_table: str) -> dict[str, Any]:
        safe_target = re.sub(r"[^a-zA-Z0-9_]", "_", target_table).lower()
        self.db.execute(f"CREATE OR REPLACE TABLE {safe_target} AS {sql}")

        info = self.db.execute(f"SELECT COUNT(*) FROM {safe_target}").fetchone()
        row_count = info[0] if info else 0
        cols = self.db.execute(f"DESCRIBE {safe_target}").fetchall()

        self.db.execute(
            """INSERT OR REPLACE INTO _dai_datasets (id, name, source_type, table_name, row_count, column_count)
               VALUES (?, ?, 'transform', ?, ?, ?)""",
            [safe_target, safe_target.replace("_", " ").title(), safe_target, row_count, len(cols)],
        )

        return {
            "table_name": safe_target,
            "row_count": row_count,
            "column_count": len(cols),
            "columns": [c[0] for c in cols],
        }

    def get_tables(self) -> list[dict[str, Any]]:
        results = self.db.execute(
            "SELECT id, name, source_type, table_name, row_count, column_count, created_at FROM _dai_datasets ORDER BY created_at"
        ).fetchall()
        return [
            {
                "name": r[3],
                "display_name": r[1],
                "source_type": r[2],
                "row_count": r[4],
                "column_count": r[5],
                "created_at": str(r[6]) if r[6] else None,
            }
            for r in results
        ]

    def get_column_stats(self, table_name: str) -> list[dict[str, Any]]:
        schema = self.get_schema(table_name)
        stats = []
        for col in schema:
            col_name = col["name"]
            col_type = col["type"]
            stat: dict[str, Any] = {"name": col_name, "type": col_type}

            try:
                result = self.db.execute(f"""
                    SELECT
                        COUNT(DISTINCT "{col_name}") as distinct_count,
                        COUNT(*) - COUNT("{col_name}") as null_count
                    FROM {table_name}
                """).fetchone()
                stat["distinct_count"] = result[0] if result else 0
                stat["null_count"] = result[1] if result else 0

                if col_type in ("INTEGER", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "HUGEINT"):
                    num_result = self.db.execute(f"""
                        SELECT MIN("{col_name}"), MAX("{col_name}"), AVG("{col_name}")
                        FROM {table_name}
                    """).fetchone()
                    if num_result:
                        stat["min_value"] = self._serialize_value(num_result[0])
                        stat["max_value"] = self._serialize_value(num_result[1])
                        stat["avg_value"] = round(float(num_result[2]), 2) if num_result[2] is not None else None
            except Exception:
                stat["distinct_count"] = 0
                stat["null_count"] = 0

            stats.append(stat)
        return stats

    def close(self):
        if self.db:
            self.db.close()

    @staticmethod
    def _is_safe_query(sql: str) -> bool:
        upper = sql.upper().strip()
        return upper.startswith("SELECT") or upper.startswith("WITH")

    @staticmethod
    def _serialize_value(value: Any) -> Any:
        if value is None:
            return None
        if isinstance(value, (int, float, str, bool)):
            return value
        return str(value)
