CREATE TABLE users (user_id TEXT PRIMARY KEY);

CREATE TABLE keys (
  key_id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  provider_user_id TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);

CREATE TABLE sessions (
  session_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users (user_id)
);
