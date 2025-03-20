import { Elysia, t } from 'elysia';
import * as sessionController from '../controllers/sessionController.js';

// Validation functions
const validateSessionDuration = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const durationInMonths = (end.getFullYear() - start.getFullYear()) * 12 + 
    (end.getMonth() - start.getMonth());
  
  if (durationInMonths < 4 || durationInMonths > 5) {
    throw new Error('Session duration must be between 4 and 5 months');
  }
};

const validateDeadlineInSession = (sessionStart, sessionEnd, deadlineDate) => {
  const deadline = new Date(deadlineDate);
  const start = new Date(sessionStart);
  const end = new Date(sessionEnd);
  
  if (deadline < start || deadline > end) {
    throw new Error('Deadline must be within the session duration');
  }
};

// Validation schemas
const sessionSchema = {
  name: t.String({ minLength: 3, maxLength: 100 }),
  startDate: t.String({ format: 'date-time' }),
  endDate: t.String({ format: 'date-time' }),
  description: t.Optional(t.String()),
  academicYear: t.Optional(t.String()),
  semester: t.Optional(t.Union([
    t.Literal('Spring'),
    t.Literal('Summer'),
    t.Literal('Fall'),
    t.Literal('Winter')
  ]))
};

const deadlineSchema = {
  name: t.String({ minLength: 3, maxLength: 100 }),
  date: t.String({ format: 'date-time' }),
  type: t.Union([
    t.Literal('project_submission'),
    t.Literal('report_submission'),
    t.Literal('presentation'),
    t.Literal('other')
  ]),
  description: t.Optional(t.String()),
  deadlineId: t.Optional(t.String())
};

// Response types
const sessionResponse = t.Object({
  name: t.String(),
  startDate: t.String(),
  endDate: t.String(),
  isActive: t.Boolean(),
  deadlines: t.Array(t.Object({
    name: t.String(),
    date: t.String(),
    type: t.String()
  }))
});

const paginatedResponse = t.Object({
  data: t.Array(sessionResponse),
  pagination: t.Object({
    total: t.Number(),
    page: t.Number(),
    pages: t.Number()
  })
});

// Create session routes plugin
export const sessionRoutes = app => {
  // Admin role check middleware
  app.derive(({ user, set }) => {
    if (!user || user.role !== 'admin') {
      set.status = 403;
      return { error: 'Access denied. Admin privileges required.' };
    }
    return { user };
  });

  // Validation middleware
  app.derive(({ body, path, set }) => {
    try {
      // Validate session duration for create/update operations
      if (body && (path === '/' || path.match(/^\/[^/]+$/))) {
        validateSessionDuration(body.startDate, body.endDate);
      }
      
      // Validate deadline for deadline operations
      if (body && path.includes('/deadlines')) {
        validateDeadlineInSession(body.sessionStart, body.sessionEnd, body.date);
      }
    } catch (error) {
      set.status = 400;
      return {
        error: true,
        message: error.message
      };
    }
  })
  // Create new session (Admin only)
  app.post('/', 
    { 
      body: t.Object(sessionSchema),
      response: sessionResponse
    },
    async ({ body, user }) => await sessionController.createSession({ body, user })
  );
  
  // Get all sessions with filters
  app.get('/', 
    { 
      query: t.Object({
        page: t.Optional(t.Number()),
        limit: t.Optional(t.Number()),
        status: t.Optional(t.String()),
        search: t.Optional(t.String())
      }),
      response: paginatedResponse
    },
    async ({ query, user }) => await sessionController.getSessions({ query, user })
  );
  
  // Get session by ID
  app.get('/:id',
    { 
      params: t.Object({ id: t.String() }),
      response: sessionResponse
    },
    async ({ params, user }) => await sessionController.getSessionById({ params, user })
  );
  
  // Update session (Admin only)
  app.put('/:id',
    { 
      params: t.Object({ id: t.String() }),
      body: t.Partial(t.Object(sessionSchema)),
      response: sessionResponse
    },
    async ({ params, body, user }) => await sessionController.updateSession({ params, body, user })
  );
  
  // Add/Update deadline (Admin only)
  app.post('/:id/deadlines',
    { 
      params: t.Object({ id: t.String() }),
      body: t.Object(deadlineSchema),
      response: sessionResponse
    },
    async ({ params, body, user }) => await sessionController.manageDeadline({ params, body, user })
  );
  
  // Delete deadline (Admin only)
  app.delete('/:sessionId/deadlines/:deadlineId',
    { 
      params: t.Object({ 
        sessionId: t.String(),
        deadlineId: t.String()
      }),
      response: sessionResponse
    },
    async ({ params, user }) => await sessionController.deleteDeadline({ params, user })
  );
  
  // Activate session (Admin only)
  app.post('/:id/activate',
    { 
      params: t.Object({ id: t.String() }),
      response: sessionResponse
    },
    async ({ params, user }) => await sessionController.activateSession({ params, user })
  );
  
  // Get session analytics
  app.get('/:id/analytics',
    { 
      params: t.Object({ id: t.String() }),
      response: t.Object({
        totalTeams: t.Number(),
        totalStudents: t.Number(),
        submissionRate: t.Number(),
        averageGrade: t.Number(),
        deadlinesMet: t.Number()
      })
    },
    async ({ params, user }) => await sessionController.getSessionAnalytics({ params, user })
  );

  return app;
};
