import { Cookie, Elysia, t } from "elysia";
import { AuthInterface } from "../types";
import { jwt } from "@elysiajs/jwt";
import { auth } from "../auth";
import { AUTH_COOKIE_NAME } from "../constants";
import ENV from "../env";

export const sessionHandlerPlugin = (authProvider: AuthInterface) =>
  new Elysia()
    .decorate("auth", authProvider)
    .use(jwt({
      name: "jwt",
      secret: ENV.JWT_SECRET,
      schema: t.Object({
        userId: t.String(),
        sessionId: t.String(),
        expiresAt: t.String(),
      }),
    }))
    .derive(async ({ cookie, jwt }) => {
      const authCookie = cookie[AUTH_COOKIE_NAME];
      const jwtPayload = await jwt.verify(authCookie.value);
      if (!jwtPayload) {
        authCookie.remove();
        return {
          isAuthenticated: false,
          sessionId: null,
        };
      }

      return {
        isAuthenticated: await auth.handleSession(jwtPayload.sessionId),
        sessionId: jwtPayload.sessionId,
      };
    });
