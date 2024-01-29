import { Cookie } from "elysia";

export type UserId = string;

export interface UserCredentials {
  providerId: string;
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
  fresh: boolean;
}

export interface AuthInterface {
  signUpUser(
    userCredentials: UserCredentials,
    userInfo?: UserInfo,
  ): Promise<UserId>;
  signInUser(userCredentials: UserCredentials): Promise<Session>;
  signOutFromSession(session: Session): Promise<boolean>;
}

class fitAuth {
  
}
// export current authenticator
