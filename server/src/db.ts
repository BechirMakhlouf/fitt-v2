import {
  CredentialsState,
  DBInterface,
  Session,
  UserCredentials,
  UserId,
} from "./types";

import { Database } from "bun:sqlite";
import { alphabet, generateRandomString } from "oslo/crypto";
import { password as bunPassword } from "bun";
import { formatDateForSQLDateTime } from "./libs/date";

const DB_NAME = "db.sqlite";

interface UsersTable {
  user_id: string;
}
interface SessionsTable {
  user_id: string;
  session_id: string;
  expires_at: string;
}
interface KeysTable {
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
type TableColumns = UsersTable | KeysTable | SessionsTable;

interface TableRow<Columns = TableColumns> {
  name: TableName;
  columns: Columns;
}

class bunSQLiteDB implements DBInterface {
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

  private async userExists(userId: UserId): Promise<boolean> {
    return Boolean(
      this.db.query(
        `select * from ${TableNames.USERS} where user_id = "${userId}"`,
      ).get(),
    );
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

    this.insertIntoTable<KeysTable>({
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

    this.insertIntoTable<UsersTable>({
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

  // move this to the auth provider
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

  async addSession(
    { sessionId, userId, expiresAt }: Session,
  ): Promise<boolean> {
    // !!! TEST THIS
    this.insertIntoTable<SessionsTable>({
      name: "sessions",
      columns: {
        session_id: sessionId,
        user_id: userId,
        expires_at: formatDateForSQLDateTime(expiresAt),
      },
    });

    return true;
  }
  async deleteSession(session: Session): Promise<void> {
    const query = `
      DELETE FROM ${TableNames.SESSIONS} WHERE session_id = '${session.sessionId}'
    `;
    this.db.exec(query);
  }
  async deleteUser(userId: UserId): Promise<void> {
    const deleteKeysQuery: string =
      `DELETE FROM ${TableNames.KEYS} WHERE user_id = '${userId}'`;
    const deleteUserSessionsQuery: string =
      `DELETE FROM ${TableNames.SESSIONS} WHERE user_id = '${userId}'`;
    const deleteUserQuery: string =
      `DELETE FROM ${TableNames.USERS} WHERE user_id = '${userId}'`;

    this.db.exec(deleteKeysQuery);
    this.db.exec(deleteUserSessionsQuery);
    this.db.exec(deleteUserQuery);
  }

  async getSessionFromId(sessionId: string): Promise<Session | null> {
    const query = `
    select * from ${TableNames.SESSIONS} WHERE session_id = '${sessionId}'
`;
    const sessionRetreived = this.db.query<SessionsTable, any>(query).get();

    if (!sessionRetreived) return null;

    const session: Session = {
      sessionId: sessionRetreived.session_id,
      userId: sessionRetreived.user_id,
      expiresAt: new Date(sessionRetreived.expires_at),
    };

    return session;
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    const query = `
    DELETE FROM ${TableNames.SESSIONS} WHERE user_id = '${userId}'
    `;

    this.db.exec(query);
  }
  constructor(db: Database) {
    this.db = db;
  }
}
export const db = new bunSQLiteDB(new Database(DB_NAME));
