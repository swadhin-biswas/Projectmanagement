import { User } from '../models/User.js';
import { UnauthorizedError } from '../utils/errors.js';

/**
 * Authentication middleware for Elysia
 * Validates JWT tokens and adds user to request context
 * Configurable public paths that bypass authentication
 */
export const auth = (options = { publicPaths: [] }) => (app) => {
  return app.derive(async ({ request, jwt, set }) => {
    const path = new URL(request.url).pathname;
    
    // Check if path is public
    if (options.publicPaths.includes(path)) {
      return {};
    }

    const token = request.headers.get('Authorization')?.split(' ')[1];
    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    try {
      const decoded = await jwt.verify(token);
      const user = await User.findById(decoded.userId)
        .select('-password')
        .lean();

      if (!user) {
        throw new UnauthorizedError('User not found');
      }

      if (!user.isApproved && user.role === 'supervisor') {
        throw new UnauthorizedError('Account pending approval');
      }

      // Add user to request context
      return { user };
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
      throw new UnauthorizedError('Invalid token');
    }
  });
};
