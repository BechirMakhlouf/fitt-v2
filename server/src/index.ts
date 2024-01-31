import { Cookie, Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";
import { AuthInterface } from "./types";
import { auth } from "./auth";
import { addDaysToDate } from "./libs/date";

const SERVER_PORT: number = 3000;

// is-authenticated how are we going to do that

const authenticationState = new Elysia()
  .state("isAuthenticated", false);

const authRoute = (authProvider: AuthInterface) =>
  new Elysia({ name: "auth-route" })
    .decorate("auth", authProvider)
    .use(authenticationState)
    .post("/sign-in", ({ body }) => {
      return body;
    }, {
      body: t.Object({
        providerId: t.String(),
        providerUserId: t.String(),
        password: t.String(),
      }),
    })
    .get("/cookie", ({ cookie }) => {
      const authCookie = new Cookie("hello ladies", {
        expires: addDaysToDate(new Date(), 14),
        httpOnly: true,
      });
      cookie["authCookie"] = authCookie;
      return {
        result: "received",
      };
    })
    .post("/sign-up", ({ store, cookie: { name } }) => {
    })
    .get("/sign-out", () => "signing out");

const app = new Elysia()
  // .use(cors())
  .use(authenticationState)
  .mount("/auth", authRoute(auth))
  .listen(
    SERVER_PORT,
    () => console.log("Server starting at PORT:", SERVER_PORT),
  );

// export type ServerApp = typeof app;
