import { AuthorizationError } from "../utils/errors.js";

export const adminAccessRequired = async ({ user, set }) => {
  if (!set) {
    throw new Error("Invalid context: set is undefined");
  }

  if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
    set.status = 403;
    throw new AuthorizationError("Admin access required");
  }
  return { user };
};

export const superAdminAccessRequired = async ({ user, set }) => {
  if (!set) {
    throw new Error("Invalid context: set is undefined");
  }

  if (!user || user.role !== "superadmin") {
    set.status = 403;
    throw new AuthorizationError("Super admin access required");
  }
  return { user };
};
