-- Executar no banco Cloudflare D1 vinculado como PUNICOES_DB.
CREATE TABLE IF NOT EXISTS punicoes (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 tipo TEXT NOT NULL CHECK(tipo IN ('banimento','notificacao','historico')),
 nome TEXT NOT NULL,
 tag TEXT NOT NULL DEFAULT '',
 data TEXT NOT NULL DEFAULT '',
 motivo TEXT NOT NULL DEFAULT '',
 local TEXT NOT NULL DEFAULT '',
 prazo TEXT NOT NULL DEFAULT '',
 clube TEXT NOT NULL DEFAULT '',
 contato TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_punicoes_tipo ON punicoes(tipo);
CREATE INDEX IF NOT EXISTS idx_punicoes_nome ON punicoes(nome);