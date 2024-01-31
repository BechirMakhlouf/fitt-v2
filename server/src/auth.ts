import { Cookie } from "elysia";
import { db } from "./db";
import { alphabet, generateRandomString } from "oslo/crypto";
import {
  AuthInterface,
  CredentialsState,
  DBInterface,
  Session,
  UserCredentials,
  UserId,
  UserInfo,
} from "./types";
import { addDaysToDate, compareDates } from "./libs/date";

class fitAuth implements AuthInterface {
  private db: DBInterface;

  constructor(db: DBInterface) {
    this.db = db;
  }
  private generateSessionId(): string {
    return generateRandomString(15, alphabet("a-z", "A-Z", "0-9"));
  }

  private async createSession(userId: UserId): Promise<Session> {
    const session: Session = {
      userId: userId,
      sessionId: this.generateSessionId(),
      expiresAt: addDaysToDate(new Date(), 30),
    };

    await this.db.addSession(session);

    return session;
  }

  async signUpUser(
    userCredentials: UserCredentials,
    userInfo?: UserInfo,
  ): Promise<UserId> {
    const userId: UserId = await this.db.addUser(userCredentials);
    return userId;
  }

  async signInUser(userCredentials: UserCredentials): Promise<Session> {
    const credentialsState: CredentialsState = await this.db
      .verifyUserCredentials(userCredentials);

    if (credentialsState !== "valid") {
      throw new Error(`User Credentials is ${credentialsState}`);
    }

    const userId = await this.db.getUserIdFromCredentials(userCredentials);

    if (!userId) throw new Error("couldn't find userId when signingIn");

    return this.createSession(userId);
  }

  async deleteUser(userId: UserId): Promise<void> {
    this.db.deleteUser(userId);
  }

  async signOutFromSession(session: Session): Promise<void> {
    this.db.deleteSession(session);
  }

  async validateSession(sessionId: string): Promise<boolean> {
    const session: Session | null = await this.db.getSessionFromId(sessionId);
    if (!session) return false;
    return compareDates(session.expiresAt, new Date());
  }
}
// export current authenticator
export const auth: AuthInterface = new fitAuth(db);
