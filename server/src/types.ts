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
  expiresAt: Date;
  // fresh: boolean;
}

export interface AuthInterface {
  signUpUser(
    userCredentials: UserCredentials,
    userInfo?: UserInfo,
  ): Promise<UserId>;
  signInUser(userCredentials: UserCredentials): Promise<Session>;
  removeSession(sessionId: string): Promise<void>;
  handleSession(sessionId: string): Promise<boolean>;
  deleteUser(userId: UserId): Promise<void>;
}

export interface DBInterface {
  addUser(userCredentials: UserCredentials): Promise<UserId>;
  getUserIdFromCredentials(
    userCredentials: UserCredentials,
  ): Promise<UserId | null>;
  verifyUserCredentials(
    userCredentials: UserCredentials,
  ): Promise<CredentialsState>;
  deleteUser(userId: UserId): void;
  deleteSession(sessionId: string): void;
  deleteAllUserSessions(userId: string): void;

  getSessionFromId(sessionId: string): Promise<Session | null>;
  addSession(session: Session): Promise<boolean>;
}
