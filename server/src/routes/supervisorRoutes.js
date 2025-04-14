import { t } from "elysia";
import {
  getAssignedProjects,
  getAssignedStudents,
  getAssignedTeams,
  getProjectDetails,
  getProjectSubmissions,
  getSupervisorAnalytics,
  getSupervisorMeetings,
  getSupervisorProfile,
  getTeamDetails,
  recordFeedback,
  reviewProjectSubmission,
  scheduleMeeting,
  sendEmailToStudents,
  sendNotificationToStudents,
  updateProjectStatus,
  updateSupervisorProfile,
  updateTeamProgress,
  uploadDocument,
} from "../controllers/supervisorController.js";
import { ForbiddenError, UnauthorizedError } from "../utils/errors.js";

// Define reusable guards (similar to authRoutes)
const isAuthenticated = ({ jwt, set }) => {
  if (!jwt) {
    set.status = 401;
    throw new UnauthorizedError("Authentication required");
  }
};

const isSupervisor = ({ jwt, set }) => {
  // This guard assumes isAuthenticated has already run or is run just before it
  if (jwt?.payload?.role !== "supervisor") {
    set.status = 403;
    throw new ForbiddenError("Forbidden: Supervisor access required");
  }
};

// Define common response schemas using 't'
const SupervisorProfileSchema = t.Object({
  // Define based on expected output of getSupervisorProfile
  // This is a placeholder - adjust based on actual controller response
  _id: t.String(),
  fullName: t.String(),
  email: t.String(),
  department: t.String(),
  specialization: t.Optional(t.String()),
  // ... add other fields ...
});

const StudentSchema = t.Object({
  /* Define student structure */ _id: t.String(),
  name: t.String(),
});
const TeamSchema = t.Object({
  /* Define team structure */ _id: t.String(),
  name: t.String(),
});

const ProjectSchema = t.Object({
  _id: t.String(),
  name: t.String(),
  type: t.String(),
  description: t.String(),
  status: t.String(),
  team: t.Object({
    _id: t.String(),
    name: t.String(),
  }),
});

const SubmissionSchema = t.Object({
  _id: t.String(),
  title: t.String(),
  description: t.Optional(t.String()),
  fileUrl: t.String(),
  submissionType: t.String(),
  submittedBy: t.Object({
    _id: t.String(),
    name: t.String(),
  }),
  submittedAt: t.String(),
  feedback: t.Optional(
    t.Object({
      content: t.String(),
      givenBy: t.String(),
      givenAt: t.String(),
    })
  ),
});

const FeedbackSchema = t.Object({
  content: t.String(),
  marks: t.Optional(t.Number()),
  outOf: t.Optional(t.Number()),
  status: t.Optional(t.String()),
});

const MeetingSchema = t.Object({
  _id: t.String(),
  title: t.String(),
  description: t.Optional(t.String()),
  date: t.String(),
  startTime: t.String(),
  endTime: t.String(),
  location: t.Optional(t.String()),
  meetingUrl: t.Optional(t.String()),
  attendees: t.Array(
    t.Object({
      _id: t.String(),
      name: t.String(),
      role: t.String(),
    })
  ),
  status: t.String(),
  createdBy: t.Object({
    _id: t.String(),
    name: t.String(),
  }),
});

const DocumentSchema = t.Object({
  _id: t.String(),
  title: t.String(),
  description: t.Optional(t.String()),
  fileUrl: t.String(),
  fileType: t.String(),
  uploadedBy: t.Object({
    _id: t.String(),
    name: t.String(),
  }),
  uploadedAt: t.String(),
});

// --- Supervisor Routes ---
export default function supervisorRoutes(app) {
  return app.group("/api/supervisor", (group) =>
    group
      // Apply authentication and role check to the entire group
      .onBeforeHandle([isAuthenticated, isSupervisor])

      // GET /api/supervisor/students
      .get(
        "/students",
        async ({ jwt, query }) => {
          // Pass necessary context parts to controller
          return getAssignedStudents({ user: jwt.payload, query });
        },
        {
          detail: { tags: ["Supervisor"], summary: "Get assigned students" },
          response: { 200: t.Array(StudentSchema) /* Placeholder */ },
          // Add query schema if needed: query: t.Object({...})
        }
      )

      // GET /api/supervisor/teams
      .get(
        "/teams",
        async ({ jwt, query }) => {
          return getAssignedTeams({ user: jwt.payload, query });
        },
        {
          detail: { tags: ["Supervisor"], summary: "Get assigned teams" },
          response: { 200: t.Array(TeamSchema) /* Placeholder */ },
          // Add query schema if needed
        }
      )

      // GET /api/supervisor/teams/:teamId
      .get(
        "/teams/:teamId",
        async ({ jwt, params }) => {
          return getTeamDetails({ user: jwt.payload, params });
        },
        {
          params: t.Object({ teamId: t.String() }),
          detail: {
            tags: ["Supervisor"],
            summary: "Get specific team details",
          },
          response: { 200: TeamSchema /* Placeholder */ },
        }
      )

      // GET /api/supervisor/projects
      .get(
        "/projects",
        async ({ jwt, query }) => {
          return getAssignedProjects({ user: jwt.payload, query });
        },
        {
          detail: { tags: ["Supervisor"], summary: "Get assigned projects" },
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(ProjectSchema),
            }),
          },
          query: t.Optional(
            t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              type: t.Optional(t.String()),
              search: t.Optional(t.String()),
            })
          ),
        }
      )

      // GET /api/supervisor/projects/:projectId
      .get(
        "/projects/:projectId",
        async ({ jwt, params }) => {
          return getProjectDetails({ user: jwt.payload, params });
        },
        {
          params: t.Object({ projectId: t.String() }),
          detail: {
            tags: ["Supervisor"],
            summary: "Get project details",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: ProjectSchema,
            }),
          },
        }
      )

      // GET /api/supervisor/projects/:projectId/submissions
      .get(
        "/projects/:projectId/submissions",
        async ({ jwt, params }) => {
          return getProjectSubmissions({ user: jwt.payload, params });
        },
        {
          params: t.Object({ projectId: t.String() }),
          detail: {
            tags: ["Supervisor"],
            summary: "Get project submissions",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(SubmissionSchema),
            }),
          },
        }
      )

      // POST /api/supervisor/projects/:projectId/submissions/:submissionId/review
      .post(
        "/projects/:projectId/submissions/:submissionId/review",
        async ({ jwt, params, body }) => {
          return reviewProjectSubmission({ user: jwt.payload, params, body });
        },
        {
          params: t.Object({
            projectId: t.String(),
            submissionId: t.String(),
          }),
          body: t.Object({
            feedback: t.String(),
            marks: t.Optional(t.Number()),
            outOf: t.Optional(t.Number()),
            status: t.Optional(
              t.String({
                enum: ["approved", "needs_revision", "rejected"],
              })
            ),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Review project submission",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: SubmissionSchema,
            }),
          },
        }
      )

      // PATCH /api/supervisor/projects/:projectId/status
      .patch(
        "/projects/:projectId/status",
        async ({ jwt, params, body }) => {
          return updateProjectStatus({ user: jwt.payload, params, body });
        },
        {
          params: t.Object({ projectId: t.String() }),
          body: t.Object({
            status: t.String({
              enum: ["approved", "rejected", "in_progress", "completed"],
            }),
            comments: t.Optional(t.String()),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Update project status",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: ProjectSchema,
            }),
          },
        }
      )

      // GET /api/supervisor/analytics
      .get(
        "/analytics",
        async ({ jwt, query }) => {
          return getSupervisorAnalytics({ user: jwt.payload, query });
        },
        {
          detail: {
            tags: ["Supervisor"],
            summary: "Get supervisor analytics",
          },
          response: { 200: t.Object({}) /* Placeholder */ },
          // Add query schema if needed
        }
      )

      // GET /api/supervisor/profile
      .get(
        "/profile",
        async ({ jwt }) => {
          return getSupervisorProfile({ user: jwt.payload });
        },
        {
          detail: { tags: ["Supervisor"], summary: "Get supervisor profile" },
          response: { 200: SupervisorProfileSchema /* Placeholder */ },
        }
      )

      // POST /api/supervisor/feedback
      .post(
        "/feedback",
        async ({ jwt, body }) => {
          return recordFeedback({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            student: t.String(),
            project: t.Optional(t.String()),
            milestone: t.Optional(t.String()),
            marks: t.Optional(t.Number()),
            comments: t.String(),
            status: t.Optional(t.String()),
            categories: t.Optional(t.Array(t.String())),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Record feedback for student",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: t.Object({}),
            }),
          },
        }
      )

      // PUT /api/supervisor/profile
      .put(
        "/profile",
        async ({ jwt, body }) => {
          return updateSupervisorProfile({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            fullName: t.Optional(t.String()),
            department: t.Optional(t.String()),
            specialization: t.Optional(t.String()),
            biography: t.Optional(t.String()),
            contactDetails: t.Optional(
              t.Object({
                phone: t.Optional(t.String()),
                office: t.Optional(t.String()),
                email: t.Optional(t.String()),
              })
            ),
            availability: t.Optional(
              t.Object({
                officeHours: t.Optional(t.String()),
              })
            ),
            researchInterests: t.Optional(t.Array(t.String())),
            expertise: t.Optional(t.Array(t.String())),
            profilePicture: t.Optional(t.String()),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Update supervisor profile",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: SupervisorProfileSchema,
            }),
          },
        }
      )

      // PUT /api/supervisor/teams/:teamId/progress
      .put(
        "/teams/:teamId/progress",
        async ({ jwt, params, body }) => {
          return updateTeamProgress({ user: jwt.payload, params, body });
        },
        {
          params: t.Object({ teamId: t.String() }),
          body: t.Object({
            milestone: t.String(),
            status: t.String({
              enum: ["not_started", "in_progress", "completed", "delayed"],
            }),
            completionPercentage: t.Optional(t.Number()),
            feedback: t.Optional(t.String()),
            riskLevel: t.Optional(
              t.String({
                enum: ["low", "medium", "high", "critical"],
              })
            ),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Update team progress on milestones",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: t.Object({}),
            }),
          },
        }
      )

      // POST /api/supervisor/meetings
      .post(
        "/meetings",
        async ({ jwt, body }) => {
          return scheduleMeeting({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            title: t.String(),
            description: t.Optional(t.String()),
            date: t.String(),
            startTime: t.String(),
            endTime: t.String(),
            location: t.Optional(t.String()),
            meetingUrl: t.Optional(t.String()),
            attendees: t.Array(t.String()),
            notifyAttendees: t.Optional(t.Boolean()),
            project: t.Optional(t.String()),
            team: t.Optional(t.String()),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Schedule a meeting",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: MeetingSchema,
            }),
          },
        }
      )

      // GET /api/supervisor/meetings
      .get(
        "/meetings",
        async ({ jwt, query }) => {
          return getSupervisorMeetings({ user: jwt.payload, query });
        },
        {
          detail: {
            tags: ["Supervisor"],
            summary: "Get supervisor's meetings",
          },
          query: t.Optional(
            t.Object({
              page: t.Optional(t.String()),
              limit: t.Optional(t.String()),
              status: t.Optional(t.String()),
              from: t.Optional(t.String()),
              to: t.Optional(t.String()),
              project: t.Optional(t.String()),
              team: t.Optional(t.String()),
            })
          ),
          response: {
            200: t.Object({
              success: t.Boolean(),
              data: t.Array(MeetingSchema),
              pagination: t.Optional(
                t.Object({
                  total: t.Number(),
                  page: t.Number(),
                  limit: t.Number(),
                  pages: t.Number(),
                })
              ),
            }),
          },
        }
      )

      // POST /api/supervisor/email
      .post(
        "/email",
        async ({ jwt, body }) => {
          return sendEmailToStudents({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            to: t.Array(t.String()),
            subject: t.String(),
            message: t.String(),
            attachments: t.Optional(t.Array(t.String())),
            cc: t.Optional(t.Array(t.String())),
            bcc: t.Optional(t.Array(t.String())),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Send email to students or team",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
            }),
          },
        }
      )

      // POST /api/supervisor/notifications
      .post(
        "/notifications",
        async ({ jwt, body }) => {
          return sendNotificationToStudents({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            recipients: t.Array(t.String()),
            title: t.String(),
            message: t.String(),
            type: t.String({
              enum: ["info", "warning", "success", "error"],
            }),
            relatedTo: t.Optional(
              t.Object({
                type: t.String({
                  enum: ["project", "submission", "meeting", "feedback"],
                }),
                id: t.String(),
              })
            ),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Create notification for students or team",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
            }),
          },
        }
      )

      // POST /api/supervisor/documents
      .post(
        "/documents",
        async ({ jwt, body }) => {
          return uploadDocument({ user: jwt.payload, body });
        },
        {
          body: t.Object({
            title: t.String(),
            description: t.Optional(t.String()),
            fileUrl: t.String(),
            fileType: t.String(),
            project: t.Optional(t.String()),
            team: t.Optional(t.String()),
            accessLevel: t.Optional(
              t.String({
                enum: ["public", "team", "private"],
              })
            ),
          }),
          detail: {
            tags: ["Supervisor"],
            summary: "Upload document for students or team",
          },
          response: {
            200: t.Object({
              success: t.Boolean(),
              message: t.String(),
              data: DocumentSchema,
            }),
          },
        }
      )
  );
}
