import { Cookie, Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthInterface, Session, UserCredentials, UserId } from "./types";
import { jwt } from "@elysiajs/jwt";
import { auth } from "./auth";
import { addDaysToDate } from "./libs/date";
const SERVER_PORT: number = 3000;

const AUTH_COOKIE_NAME = "auth-cookie";

const credentialsRequestBody = t.Object({
  providerId: t.String(),
  providerUserId: t.String(),
  password: t.Pick(t.Date(), t.String()),
});

const sessionValidator = (authProvider: AuthInterface) =>
  new Elysia()
    .decorate("auth", authProvider)
    .use(jwt({
      name: "jwt",
      secret: process.env.JWT_SECRET!,
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

const authRoute = (routeName: string, authProvider: AuthInterface) =>
  new Elysia() 
    .decorate("auth", authProvider)
    .use(sessionValidator(auth))
    .post(
      `${routeName}/sign-in`,
      async ({ body, isAuthenticated, set, jwt, cookie }) => {
        if (isAuthenticated) {
          set.status = "Forbidden";
          return {
            message: "already signed in",
          };
        }

        const session = await auth.signInUser(body as UserCredentials);

        const authCookie = new Cookie(
          await jwt.sign({
            ...session,
            expiresAt: session.expiresAt.toISOString(),
          }),
          {
            expires: addDaysToDate(new Date(), 30),
            path: "/",
            secure: true,
            httpOnly: true,
          },
        );

        cookie[AUTH_COOKIE_NAME] = authCookie;
        set.status = "OK";
        return;
      },
      {
        body: t.Object({
          providerId: t.String(),
          providerUserId: t.String(),
          password: t.String(),
        }),
      },
    )
    .post(`${routeName}/sign-up`, async ({ body, set }) => {
      const userCredentials: UserCredentials = body as UserCredentials;
      try {
        const userId: UserId = await auth.signUpUser(userCredentials);
        set.status = "OK";
        return {
          message: "user created.",
        };
      } catch (e) {
        set.status = "Not Acceptable";
        return {
          message: (e as Error).message,
        };
      }
    }, {
      body: t.Object({
        providerId: t.String(),
        providerUserId: t.String(),
        password: t.String(),
      }),
    })
    .get(`${routeName}/sign-out`, ({ cookie, sessionId }) => {
      cookie[AUTH_COOKIE_NAME].remove();
      if (sessionId) auth.removeSession(sessionId)
    });

const app = new Elysia()
  // .use(cors())
  .use(authRoute("/auth", auth))
  .listen(
    SERVER_PORT,
    () => console.log("Server starting at PORT:", SERVER_PORT),
  );

export type ServerApp = typeof app;
