import Elysia from "elysia";
import { getTeamDetails } from "../controllers/teamController";

// TODO: Add actual JWT configuration if not handled globally in startup.js
// const jwtConfig = {
//   name: 'jwt',
//   secret: process.env.JWT_SECRET!,
// };

export const teamRoutes = new Elysia({ prefix: "/teams" })
  // Apply JWT middleware to all routes in this group if needed globally,
  // or apply individually as shown below.
  // .use(jwt(jwtConfig))
  // .derive(async ({ jwt, cookie: { auth } }) => {
  //   const profile = await jwt.verify(auth?.value);
  //   return { user: profile };
  // })
  // .onRequest(({ user, set }) => {
  //    if (!user) {
  //      set.status = 401;
  //      return "Unauthorized";
  //    }
  //  })

  // GET /teams/:teamId - Authentication handled by global guard in src/index.js
  .get("/:teamId", getTeamDetails);
// No need for specific beforeHandle here as global guard covers /teams/*

// Add other team routes here (POST /, POST /:teamId/invite, etc.)
