import { ForbiddenError } from "../utils/errors.js";

export const roleMiddleware = (allowedRoles) => ({
  name: "role-check",
  beforeHandle: ({ request }) => {
    const user = request.user;

    if (!user) {
      throw new ForbiddenError("User not authenticated");
    }

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenError("Insufficient permissions");
    }
  },
});
