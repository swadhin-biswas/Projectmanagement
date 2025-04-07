import Joi from 'joi';

// Session creation validation schema
export const createSessionSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  academicYear: Joi.string()
    .required()
    .pattern(/^\d{4}(-\d{4})?$/)
    .message('Academic year must be in format YYYY or YYYY-YYYY'),
  term: Joi.string().valid('fall', 'spring', 'summer', 'winter', 'year_long').required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
  registrationStartDate: Joi.date().required().less(Joi.ref('startDate')),
  registrationEndDate: Joi.date().required()
    .greater(Joi.ref('registrationStartDate'))
    .less(Joi.ref('startDate')),
  teamFormationStartDate: Joi.date().required()
    .greater(Joi.ref('registrationStartDate')),
  teamFormationEndDate: Joi.date().required()
    .greater(Joi.ref('teamFormationStartDate'))
    .less(Joi.ref('endDate')),
  minTeamSize: Joi.number().min(2).max(4).default(2),
  maxTeamSize: Joi.number().min(2).max(4).default(4)
    .greater(Joi.ref('minTeamSize')),
  description: Joi.string().optional(),
  academicPrograms: Joi.array().items(Joi.string()).optional(),
  departments: Joi.array().items(Joi.string()).optional(),
  projectCategories: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    })
  ).optional(),
  researchDomains: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    })
  ).optional(),
  supervisorCapacity: Joi.number().min(1).default(5),
  supervisorMinimumLoad: Joi.number().min(0).default(1),
  projectsPerStudent: Joi.number().min(1).max(3).default(1),
  teamsPerSupervisor: Joi.number().min(1).default(5),
  notificationSettings: Joi.object({
    sendDeadlineReminders: Joi.boolean().default(true),
    reminderDaysBeforeDeadline: Joi.number().min(1).default(7),
    sendWeeklySummaries: Joi.boolean().default(true),
    notifyAdminsOnTeamChanges: Joi.boolean().default(true),
    notifySupervisorsOnSubmissions: Joi.boolean().default(true)
  }).optional(),
  evaluationScheme: Joi.object({
    proposalWeight: Joi.number().min(0).max(100).default(15),
    progressWeight: Joi.number().min(0).max(100).default(20),
    finalSubmissionWeight: Joi.number().min(0).max(100).default(40),
    presentationWeight: Joi.number().min(0).max(100).default(25),
    customEvaluationCriteria: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().optional(),
        weight: Joi.number().min(0).max(100).required()
      })
    ).optional()
  }).optional()
});

// Deadline validation schema
export const deadlineSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().optional().max(500),
  dueDate: Joi.date().required(),
  type: Joi.string().valid(
    'team_formation',
    'proposal_submission',
    'progress_report',
    'mid_evaluation',
    'final_submission',
    'presentation',
    'demo',
    'peer_review',
    'supervisor_feedback',
    'other'
  ).required(),
  forRoles: Joi.array().items(
    Joi.string().valid('student', 'supervisor', 'admin')
  ).default(['student']),
  submissionType: Joi.string().valid(
    'document',
    'presentation',
    'code',
    'prototype',
    'video',
    'combination',
    'other',
    'none'
  ).default('document'),
  submissionOptions: Joi.object({
    allowLateSubmission: Joi.boolean().default(false),
    latePenaltyPercentage: Joi.when('allowLateSubmission', {
      is: true,
      then: Joi.number().min(0).max(100).required()
    }),
    maxSubmissionAttempts: Joi.number().min(1).default(1),
    requireApproval: Joi.boolean().default(false)
  }).optional(),
  reminderDays: Joi.number().min(1).default(7)
});

// Session update validation schema
export const updateSessionSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().optional(),
  status: Joi.string().valid(
    'upcoming',
    'registration',
    'team_formation',
    'active',
    'evaluation',
    'completed',
    'archived'
  ).optional(),
  projectCategories: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    })
  ).optional(),
  researchDomains: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      isActive: Joi.boolean().default(true)
    })
  ).optional(),
  notificationSettings: Joi.object({
    sendDeadlineReminders: Joi.boolean(),
    reminderDaysBeforeDeadline: Joi.number().min(1),
    sendWeeklySummaries: Joi.boolean(),
    notifyAdminsOnTeamChanges: Joi.boolean(),
    notifySupervisorsOnSubmissions: Joi.boolean()
  }).optional(),
  evaluationScheme: Joi.object({
    proposalWeight: Joi.number().min(0).max(100),
    progressWeight: Joi.number().min(0).max(100),
    finalSubmissionWeight: Joi.number().min(0).max(100),
    presentationWeight: Joi.number().min(0).max(100),
    customEvaluationCriteria: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        description: Joi.string().optional(),
        weight: Joi.number().min(0).max(100).required()
      })
    )
  }).optional()
}).min(1);

// Milestone template validation schema
export const milestoneTemplateSchema = Joi.object({
  title: Joi.string().required().min(3).max(100),
  description: Joi.string().optional(),
  dueDateOffset: Joi.number().required(), // Days from session start
  required: Joi.boolean().default(true),
  deliverables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().optional(),
      type: Joi.string().valid('document', 'code', 'presentation', 'other').required()
    })
  ).optional()
});

// Academic session validation schema
export const academicSessionSchema = Joi.object({
  year: Joi.number().required().min(2024).max(2030),
  term: Joi.string().valid('Fall', 'Spring', 'Summer').required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().greater(Joi.ref('startDate')).required(),
  status: Joi.string().valid('upcoming', 'active', 'completed', 'archived').required(),
  maxTeamSize: Joi.number().min(2).max(6).required(),
  minTeamSize: Joi.number().min(2).max(6).required(),
  registrationDeadline: Joi.date().greater('now').required(),
  metadata: Joi.object({
    academicYear: Joi.string().required(), // e.g., "2024-2025"
    semester: Joi.number().valid(1, 2, 3).required(),
    courseCode: Joi.string().required(),
    courseTitle: Joi.string().required(),
    creditHours: Joi.number().required()
  }).required(),
  departments: Joi.array().items(
    Joi.object({
      id: Joi.string().required(),
      name: Joi.string().required(),
      coordinators: Joi.array().items(Joi.string()).min(1).required()
    })
  ).required(),
  milestones: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid(
        'team_formation',
        'proposal_submission',
        'progress_review',
        'final_submission',
        'presentation'
      ).required(),
      dueDate: Joi.date().greater('now').required(),
      description: Joi.string().required(),
      weightage: Joi.number().min(0).max(100).optional()
    })
  ).required()
});

// Session milestone validation schema
export const milestoneDateSchema = Joi.object({
  sessionId: Joi.string().required(),
  milestoneUpdates: Joi.array().items(
    Joi.object({
      milestoneId: Joi.string().required(),
      changes: Joi.object({
        dueDate: Joi.date().greater('now').required(),
        description: Joi.string().optional(),
        weightage: Joi.number().min(0).max(100).optional()
      }).required(),
      reason: Joi.string().required()
    })
  ).required(),
  notifyStakeholders: Joi.boolean().default(true)
});

// Session enrollment validation schema
export const sessionEnrollmentSchema = Joi.object({
  sessionId: Joi.string().required(),
  students: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required(),
      department: Joi.string().required(),
      semester: Joi.number().required(),
      enrollmentType: Joi.string().valid('regular', 'repeat', 'improve').required()
    })
  ).required(),
  supervisors: Joi.array().items(
    Joi.object({
      supervisorId: Joi.string().required(),
      department: Joi.string().required(),
      maxTeams: Joi.number().min(1).max(10).required(),
      specializations: Joi.array().items(Joi.string()).optional()
    })
  ).required()
});

// Session configuration validation schema
export const sessionConfigSchema = Joi.object({
  sessionId: Joi.string().required(),
  teamSettings: Joi.object({
    minMembers: Joi.number().min(2).max(4).required(),
    maxMembers: Joi.number().min(Joi.ref('minMembers')).max(6).required(),
    allowCrossDepartment: Joi.boolean().default(false),
    requireSupervisorApproval: Joi.boolean().required(),
    formationDeadline: Joi.date().required(),
    allowStudentInitiated: Joi.boolean().required(),
    allowSkillPreferences: Joi.boolean().required(),
    allowProjectPreferences: Joi.boolean().required(),
    maxProjectPreferences: Joi.number().min(1).max(5).required(),
    maxSupervisorPreferences: Joi.number().min(1).max(5).required()
  }).required(),
  submissionSettings: Joi.object({
    allowLateSubmissions: Joi.boolean().default(false),
    latePenaltyPerDay: Joi.when('allowLateSubmissions', {
      is: true,
      then: Joi.number().min(0).max(100).required()
    }),
    maxLateSubmissionDays: Joi.when('allowLateSubmissions', {
      is: true,
      then: Joi.number().min(1).max(14).required()
    }),
    requirePlagiarismCheck: Joi.boolean().default(true)
  }).required(),
  evaluationSettings: Joi.object({
    proposalWeight: Joi.number().min(0).max(100).required(),
    progressWeight: Joi.number().min(0).max(100).required(),
    finalWeight: Joi.number().min(0).max(100).required(),
    requireExternalEvaluator: Joi.boolean().required(),
    minimumPassingScore: Joi.number().min(0).max(100).required()
  }).required(),
  evaluationCriteria: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      description: Joi.string().required(),
      weightage: Joi.number().min(0).max(100).required(),
      subCriteria: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          weightage: Joi.number().min(0).max(100).required()
        })
      ).optional()
    })
  ).required(),
  presentationSchedule: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    slotDuration: Joi.number().valid(15, 20, 30, 45, 60).required(),
    breakDuration: Joi.number().min(5).max(30).required(),
    evaluationPanel: Joi.object({
      minEvaluators: Joi.number().min(2).max(5).required(),
      includeExternalEvaluator: Joi.boolean().default(false)
    }).required()
  }).required(),
  notificationSettings: Joi.object({
    enableEmailNotifications: Joi.boolean().required(),
    deadlineReminders: Joi.array().items(
      Joi.object({
        days: Joi.number().required(),
        type: Joi.string().valid('email', 'in_app', 'both').required()
      })
    ).required(),
    automaticProgressReminders: Joi.boolean().required()
  }).required()
});

// Session progress tracking validation schema
export const sessionProgressSchema = Joi.object({
  sessionId: Joi.string().required(),
  metrics: Joi.object({
    teamsFormed: Joi.number().required(),
    proposalsSubmitted: Joi.number().required(),
    activeProjects: Joi.number().required(),
    completedProjects: Joi.number().required(),
    averageProgress: Joi.number().min(0).max(100).required()
  }).required(),
  departmentStats: Joi.array().items(
    Joi.object({
      departmentId: Joi.string().required(),
      metrics: Joi.object({
        totalTeams: Joi.number().required(),
        averageProgress: Joi.number().min(0).max(100).required(),
        completionRate: Joi.number().min(0).max(100).required()
      }).required()
    })
  ).required(),
  milestoneStats: Joi.array().items(
    Joi.object({
      milestoneId: Joi.string().required(),
      submissionRate: Joi.number().min(0).max(100).required(),
      averageScore: Joi.number().min(0).max(100).optional(),
      lateSubmissions: Joi.number().min(0).required()
    })
  ).required(),
  issues: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        'delayed_teams',
        'low_performance',
        'supervision_concerns',
        'resource_constraints'
      ).required(),
      count: Joi.number().min(0).required(),
      affectedTeams: Joi.array().items(Joi.string()).required(),
      status: Joi.string().valid('identified', 'addressing', 'resolved').required()
    })
  ).optional()
});

// Academic milestone validation schema
export const milestoneSchema = Joi.object({
  sessionId: Joi.string().required(),
  name: Joi.string().required(),
  description: Joi.string().required(),
  type: Joi.string().valid(
    'proposal_submission',
    'proposal_defense',
    'progress_review',
    'final_submission',
    'final_presentation'
  ).required(),
  startDate: Joi.date().required(),
  dueDate: Joi.date().greater(Joi.ref('startDate')).required(),
  weightage: Joi.number().min(0).max(100).required(),
  deliverables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('document', 'presentation', 'code', 'other').required(),
      format: Joi.array().items(Joi.string()).required(), // e.g., ["pdf", "docx"]
      maxSize: Joi.number().required(), // in MB
      required: Joi.boolean().default(true)
    })
  ).required(),
  evaluationCriteria: Joi.array().items(
    Joi.object({
      criterion: Joi.string().required(),
      weight: Joi.number().min(0).max(100).required(),
      rubric: Joi.array().items(
        Joi.object({
          score: Joi.number().required(),
          description: Joi.string().required()
        })
      ).required()
    })
  ).required()
});

// Session progress tracking schema
export const progressTrackingSchema = Joi.object({
  sessionId: Joi.string().required(),
  trackingPeriod: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required(),
    weekNumber: Joi.number().required()
  }).required(),
  metrics: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid('numeric', 'percentage', 'boolean', 'status').required(),
      value: Joi.alternatives().conditional('type', {
        switch: [
          {
            is: 'numeric',
            then: Joi.number().required()
          },
          {
            is: 'percentage',
            then: Joi.number().min(0).max(100).required()
          },
          {
            is: 'boolean',
            then: Joi.boolean().required()
          },
          {
            is: 'status',
            then: Joi.string().valid('on_track', 'at_risk', 'behind', 'completed').required()
          }
        ]
      })
    })
  ).required(),
  risks: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('schedule', 'technical', 'resource', 'other').required(),
      description: Joi.string().required(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
      mitigation: Joi.string().required(),
      status: Joi.string().valid('identified', 'being_addressed', 'mitigated', 'resolved').required()
    })
  ).optional(),
  achievements: Joi.array().items(
    Joi.object({
      milestone: Joi.string().required(),
      completionDate: Joi.date().required(),
      quality: Joi.string().valid('excellent', 'good', 'satisfactory', 'needs_improvement').required(),
      feedback: Joi.string().required()
    })
  ).optional()
});