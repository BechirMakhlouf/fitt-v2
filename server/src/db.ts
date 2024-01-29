import { Session, UserCredentials, UserId } from "./auth";
import { Database } from "bun:sqlite";
import { alphabet, generateRandomString } from "oslo/crypto";

export interface DBInterface {
  addUser(userCredentials: UserCredentials): Promise<UserId>;
  deleteUser(UserId: UserId): Promise<UserId>;
  addSession(session: Session): Promise<Session>;
  deleteSession(session: Session): Promise<Session>;
}

const DB_NAME = "db.sqlite";

interface Table {
  name: string;
  column_names: string[];
}
interface authTables {
  users: Table;
  sessions: Table;
  keys: Table;
}

class sqliteDB {
  private db;
  private tables: authTables = {
    users: { name: "users", column_names: ["user_id"] },
    sessions: {
      name: "sessions",
      column_names: ["session_id", "user_id", "expires_at"],
    },
    keys: {
      name: "keys",
      column_names: ["provider_id", "provider_user_id", "user_id"],
    },
  };

  private generateUserId(): string {
    return generateRandomString(15, alphabet("a-z", "A-Z", "0-9"));
  }
  private insertIntoKeysTable(
    userId: UserId,
    { providerId, providerUserId }: UserCredentials,
  ) {
    const keysTable = this.tables.keys;

    this.db.exec(
      `INSERT INTO ${this.tables.keys} (${keysTable.column_names.join(", ")}) 
       VALUES ("${providerId}", "${providerUserId}", "${userId}");`,
    );
  }

  private insertIntoUsersTable(
    userId: UserId,
  ) {
    const usersTable = this.tables.users;
    this.db.exec(
      `INSERT INTO ${usersTable} (${usersTable.column_names.join(", ")}) 
       VALUES ("${userId}");`,
    );
  }

  async addUser(userCredentials: UserCredentials): Promise<UserId> {
    const userId: UserId = this.generateUserId();

    this.insertIntoUsersTable(userId);
    this.insertIntoKeysTable(userId, userCredentials);

    return new Promise(() => userId);
  }

  constructor(db: Database) {
    this.db = db;
  }
}
