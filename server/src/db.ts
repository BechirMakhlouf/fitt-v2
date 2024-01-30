import { Session, UserCredentials, UserId, CredentialsState } from "./auth";
import { Database } from "bun:sqlite";
import { alphabet, generateRandomString } from "oslo/crypto";
import { password as bunPassword } from "bun";

export interface DBInterface {
  addUser(userCredentials: UserCredentials): Promise<UserId>;
  getUserIdFromCredentials(
    userCredentials: UserCredentials,
  ): Promise<UserId | null>;
  verifyUserCredentials(
    userCredentials: UserCredentials,
  ): Promise<UserId>;
  deleteUser(userId: UserId): Promise<UserId>;
  addSession(session: Session): Promise<Session>;
  deleteSession(session: Session): Promise<Session>;
}

const DB_NAME = "db.sqlite";

interface usersTable {
  user_id: string;
}
interface sessionsTable {
  user_id: string;
  session_id: string;
  expires_at: string;
}
interface keysTable {
  user_id: string;
  provider_id: string;
  provider_user_id: string;
  password: string;
}

enum TableNames {
  USERS = "users",
  KEYS = "keys",
  SESSIONS = "sessions",
}

type TableName = "users" | "keys" | "sessions";
type TableColumns = usersTable | keysTable | sessionsTable;

interface TableRow<Columns = TableColumns> {
  name: TableName;
  columns: Columns;
}

class sqliteDB {
  private db;

  private insertIntoTable<ColumnType extends TableColumns>(
    row: TableRow<ColumnType>,
  ) {
    const query: string = `INSERT INTO ${row.name} 
      (${Object.keys(row.columns).join(", ")})
      VALUES (${
      Object.values(row.columns).map((value) =>
        typeof value === "string" ? `"${value}"` : value
      ).join(", ")
    })`;

    this.db.exec(query);
  }

  private generateUserId(): string {
    return generateRandomString(15, alphabet("a-z", "A-Z", "0-9"));
  }

  private async hashPassword(password: string): Promise<string> {
    return await bunPassword.hash(password);
  }

  private async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return await bunPassword.verify(password, hashedPassword);
  }

  private async isProviderUserIdUnique(providerUserId: string) {
    return !Boolean(
      this.db.query(
        `select * from keys where provider_user_id = "${providerUserId}"`,
      ).get(),
    );
  }

  async userExists(userId: UserId): Promise<any> {
    return this.db.query(
      `select * from ${TableNames.USERS} where user_id = "${userId}"`,
    ).get();
  }

  async addCredentialstoUser(
    userId: UserId,
    { providerUserId, providerId, password }: UserCredentials,
  ) {
    if (!await this.userExists(userId)) {
      throw new Error("Can't add key to non-existant user.");
    }
    if (!await this.isProviderUserIdUnique(providerUserId)) {
      throw new Error("providerUserId already exists.");
    }

    this.insertIntoTable<keysTable>({
      name: "keys",
      columns: {
        user_id: userId,
        provider_id: providerId,
        provider_user_id: providerUserId,
        password: await this.hashPassword(password),
      },
    });

    return true;
  }
  async addUser(
    userCredentials: UserCredentials,
    id?: UserId,
  ): Promise<UserId> {
    if (!await this.isProviderUserIdUnique(userCredentials.providerUserId)) {
      throw new Error("providerUserId already exists");
    }

    const userId: UserId = id || this.generateUserId();

    if (await this.userExists(userId)) {
      throw new Error("Can't add user, user already exists.");
    }

    this.insertIntoTable<usersTable>({
      name: "users",
      columns: {
        user_id: userId,
      },
    });

    await this.addCredentialstoUser(userId, userCredentials);

    return userId;
  }

  async getUserIdFromCredentials(
    { providerUserId, providerId }: UserCredentials,
  ): Promise<UserId | null> {
    const query = `
    SELECT user_id FROM ${TableNames.KEYS}
    WHERE (provider_user_id = '${providerUserId}') AND (provider_id = '${providerId}')
`;
    const result = this.db.query<{ user_id: string; password: string }, any>(
      query,
    ).get();

    return result?.user_id || null;
  }
  async verifyUserCredentials(
    { providerUserId, providerId, password }: UserCredentials,
  ): Promise<CredentialsState> {
    
    const query = `
    SELECT * FROM ${TableNames.KEYS}
    WHERE (provider_user_id = '${providerUserId}') AND (provider_id = '${providerId}')
    `;

    const result = this.db.query<
      { user_id: string; provider_user_id: string; password: string },
      any
    >(
      query,
    ).get();

    if (!result) return "inexistant";
    if (!await this.verifyPassword(password, result.password)) {
      return "invalid";
    }
    return "valid";
  }

  constructor(db: Database) {
    this.db = db;
  }
}
export const db = new sqliteDB(new Database(DB_NAME));
