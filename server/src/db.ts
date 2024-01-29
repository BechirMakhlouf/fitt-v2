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
  columnNames: string[];
}
interface authTables {
  users: Table;
  sessions: Table;
  keys: Table;
}

class sqliteDB {
  private db;
  private tables: authTables = {
    users: { name: "users", columnNames: ["user_id"] },
    sessions: {
      name: "sessions",
      columnNames: ["session_id", "user_id", "expires_at"],
    },
    keys: {
      name: "keys",
      columnNames: ["provider_id", "provider_user_id", "user_id"],
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
      `INSERT INTO ${keysTable.name} (${keysTable.columnNames.join(", ")}) 
       VALUES ("${providerId}", "${providerUserId}", "${userId}");`,
    );
  }
  async isProviderUserIdUnique(providerUserId: string) {
    return !Boolean(
      this.db.query(
        `select * from keys where provider_user_id = "${providerUserId}"`,
      )
        .get(),
    );
  }
  private insertIntoUsersTable(
    userId: UserId,
  ) {
    const usersTable = this.tables.users;
    this.db.exec(
      `INSERT INTO ${usersTable.name} (${usersTable.columnNames.join(", ")}) 
       VALUES ("${userId}");`,
    );
  }

  async addUser(userCredentials: UserCredentials): Promise<UserId> {
    if (!this.isProviderUserIdUnique(userCredentials.providerUserId)) {
      throw new Error("providerUserId already exists");
    }

    const userId: UserId = this.generateUserId();

    console.log("new userId: ", userId);

    this.insertIntoUsersTable(userId);
    this.insertIntoKeysTable(userId, userCredentials);

    return new Promise(() => userId);
  }

  constructor(db: Database) {
    this.db = db;
  }
}
export const db = new sqliteDB(new Database(DB_NAME));
