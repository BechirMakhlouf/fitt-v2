import { Cookie } from "elysia";
import { DBInterface } from "./db";
import { alphabet, generateRandomString } from "oslo/crypto";

export type UserId = string;
export type providerIds = "email" | "github" | "google";
export type CredentialsState = "valid" | "invalid" | "inexistant";

export interface UserCredentials {
  providerId: providerIds;
  providerUserId: string;
  password: string;
}

export interface UserInfo {
  UserId: string;
  username: string;
}

export interface Session {
  sessionId: string;
  userId: string;
  // expiresAt: Date;
  // fresh: boolean;
}

export interface AuthInterface {
  signUpUser(
    userCredentials: UserCredentials,
    userInfo?: UserInfo,
  ): Promise<UserId>;
  signInUser(userCredentials: UserCredentials): Promise<Session>;
  signOutFromSession(session: Session): Promise<void>;
  deleteUser(userId: UserId): Promise<void>;
}

class fitAuth implements AuthInterface{
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
    await this.db.deleteUser(userId);
  }

  async signOutFromSession(session: Session): Promise<void> {
    this.db.deleteSession(session);
  }

  // async signOutFromSession(session: Session): Promise<boolean> {
  //
  // }
}
// export current authenticator
