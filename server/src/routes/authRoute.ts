import { Cookie, Elysia, t } from "elysia";
import { AuthInterface, UserCredentials, UserId } from "../types";
import { addDaysToDate } from "../libs/date";
import { sessionHandlerPlugin } from "../plugins/sessionValidatorPlugin";
import { AUTH_COOKIE_NAME } from "../constants";

const userCredentialsBodySchema = t.Object({
  providerId: t.Union([
    t.Literal("email"),
    t.Literal("github"),
    t.Literal("google"),
  ]),
  providerUserId: t.String(),
  password: t.String(),
});

export const authRoute = (routeName: string, authProvider: AuthInterface) =>
  new Elysia()
    .decorate("auth", authProvider)
    .use(sessionHandlerPlugin(authProvider))
    .post(
      `${routeName}/sign-in`,
      async ({ body, isAuthenticated, set, jwt, cookie, auth }) => {
        if (isAuthenticated) {
          set.status = "Forbidden";
          return {
            message: "already signed in",
          };
        }
        try {
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
        } catch (e) {
          set.status = "Unauthorized";
          return {
            message: (e as Error).message,
          };
        }
      },
      {
        body: userCredentialsBodySchema,
      },
    )
    .post(`${routeName}/sign-up`, async ({ body, set, auth }) => {
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
    .get(`${routeName}/sign-out`, ({ cookie, sessionId, auth }) => {
      cookie[AUTH_COOKIE_NAME].remove();
      if (sessionId) auth.removeSession(sessionId);
    });
