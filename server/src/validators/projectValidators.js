import Joi from 'joi';

// Project creation validation schema
export const createProjectSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(2000),
  type: Joi.string().valid('research_based', 'project_based').required(),
  supervisorId: Joi.string().optional(),
  objectives: Joi.array().items(Joi.string()).min(1).max(10),
  technologies: Joi.array().items(Joi.string()).optional(),
  researchComponents: Joi.when('type', {
    is: 'research_based',
    then: Joi.object().optional()
  }),
  projectComponents: Joi.when('type', {
    is: 'project_based',
    then: Joi.object().optional()
  })
});

// Project submission validation schema
export const projectSubmissionSchema = Joi.object({
  submissionLink: Joi.string().required().uri(),
  githubUrl: Joi.string().uri().optional(),
  deployedUrl: Joi.string().uri().optional(),
  description: Joi.string().required().min(10).max(1000),
  version: Joi.number().optional(),
  submissionType: Joi.string().valid('project', 'report', 'presentation').required(),
  files: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      url: Joi.string().required().uri(),
      type: Joi.string().required(),
      size: Joi.number().required()
    })
  ).optional(),
  submissionNote: Joi.string().optional().max(500)
});

// Project feedback validation schema
export const projectFeedbackSchema = Joi.object({
  feedback: Joi.string().required().min(10).max(2000),
  marks: Joi.number().required().min(0).max(100),
  feedbackType: Joi.string().valid('general', 'implementation', 'research', 'presentation').required(),
  recommendations: Joi.array().items(Joi.string()).optional(),
  milestone: Joi.string().optional(),
  requiresRevision: Joi.boolean().default(false),
  revisionInstructions: Joi.when('requiresRevision', {
    is: true,
    then: Joi.string().required().min(10).max(1000)
  })
});

// Project milestone validation schema
export const projectMilestoneSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().required(),
  dueDate: Joi.date().required(),
  deliverables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().valid(
        'document',
        'presentation',
        'prototype',
        'code',
        'design',
        'other'
      ).required(),
      description: Joi.string().required(),
      format: Joi.string().required(),
      submissionGuidelines: Joi.string().optional()
    })
  ).required(),
  evaluationCriteria: Joi.array().items(
    Joi.object({
      criterion: Joi.string().required(),
      weightage: Joi.number().min(0).max(100).required(),
      rubric: Joi.array().items(
        Joi.object({
          score: Joi.number().required(),
          description: Joi.string().required()
        })
      ).optional()
    })
  ).required(),
  dependencies: Joi.array().items(
    Joi.object({
      milestoneId: Joi.string().required(),
      type: Joi.string().valid('finish_to_start', 'start_to_start').required()
    })
  ).optional()
});

// Progress update validation schema
export const progressUpdateSchema = Joi.object({
  completed: Joi.number().required().min(0).max(100),
  status: Joi.string().valid('on_track', 'at_risk', 'blocked').required(),
  notes: Joi.string().optional().max(500),
  blockers: Joi.when('status', {
    is: 'blocked',
    then: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        severity: Joi.string().valid('low', 'medium', 'high'),
        needsAssistance: Joi.boolean()
      })
    ).min(1).required()
  }),
  achievements: Joi.array().items(Joi.string()).optional(),
  nextSteps: Joi.array().items(Joi.string()).optional()
});

// Student evaluation schema
export const studentEvaluationSchema = Joi.object({
  studentId: Joi.string().required(),
  projectId: Joi.string().required(),
  category: Joi.string().valid('report', 'presentation', 'implementation', 'overall').required(),
  marks: Joi.number().required().min(0).max(100),
  feedback: Joi.string().required().min(10).max(1000),
  strengths: Joi.array().items(Joi.string()).optional(),
  areasForImprovement: Joi.array().items(Joi.string()).optional(),
  recommendations: Joi.array().items(Joi.string()).optional()
});

// Supervisor feedback schema
export const supervisorFeedbackSchema = Joi.object({
  message: Joi.string().required().min(10).max(2000),
  type: Joi.string().valid('general', 'warning', 'praise').default('general'),
  isUrgent: Joi.boolean().default(false),
  requiresAction: Joi.boolean().default(false),
  dueDate: Joi.when('requiresAction', {
    is: true,
    then: Joi.date().greater('now').required()
  }),
  category: Joi.string().valid('academic', 'technical', 'professional', 'other').default('other')
});

// Project proposal validation schema
export const projectProposalSchema = Joi.object({
  title: Joi.string().required().min(5).max(200),
  abstract: Joi.string().required().min(100).max(2000),
  type: Joi.string().valid(
    'research',
    'development',
    'design',
    'analysis',
    'industry'
  ).required(),
  domain: Joi.array().items(
    Joi.string().valid(
      'web_development',
      'mobile_development',
      'artificial_intelligence',
      'machine_learning',
      'data_science',
      'cybersecurity',
      'iot',
      'cloud_computing',
      'blockchain',
      'other'
    )
  ).min(1).required(),
  teamId: Joi.string().required(),
  supervisorId: Joi.string().required(),
  objectives: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      measurementCriteria: Joi.string().required(),
      priority: Joi.string().valid('high', 'medium', 'low').required()
    })
  ).min(2).max(10).required(),
  scope: Joi.object({
    includes: Joi.array().items(Joi.string()).min(1).required(),
    excludes: Joi.array().items(Joi.string()).optional(),
    constraints: Joi.array().items(Joi.string()).optional(),
    assumptions: Joi.array().items(Joi.string()).optional()
  }).required(),
  methodology: Joi.object({
    approach: Joi.string().required(),
    tools: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        purpose: Joi.string().required(),
        expertise: Joi.string().valid('beginner', 'intermediate', 'advanced').required()
      })
    ).required(),
    technologies: Joi.array().items(
      Joi.object({
        category: Joi.string().required(),
        stack: Joi.array().items(Joi.string()).required()
      })
    ).required()
  }).required(),
  timeline: Joi.array().items(
    Joi.object({
      phase: Joi.string().required(),
      startWeek: Joi.number().required(),
      duration: Joi.number().required(),
      activities: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          deliverables: Joi.array().items(Joi.string()).required(),
          assignees: Joi.array().items(Joi.string()).required()
        })
      ).required()
    })
  ).min(3).required(),
  risks: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      impact: Joi.string().valid('high', 'medium', 'low').required(),
      probability: Joi.string().valid('high', 'medium', 'low').required(),
      mitigation: Joi.string().required()
    })
  ).optional(),
  resources: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('hardware', 'software', 'data', 'access', 'other').required(),
      details: Joi.string().required(),
      status: Joi.string().valid('available', 'needed', 'pending').required()
    })
  ).optional()
});

// Project tracking validation schema
export const projectTrackingSchema = Joi.object({
  projectId: Joi.string().required(),
  reportingPeriod: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().greater(Joi.ref('startDate')).required()
  }).required(),
  progress: Joi.object({
    overallCompletion: Joi.number().min(0).max(100).required(),
    phaseProgress: Joi.array().items(
      Joi.object({
        phase: Joi.string().required(),
        completion: Joi.number().min(0).max(100).required(),
        status: Joi.string().valid(
          'not_started',
          'in_progress',
          'completed',
          'delayed'
        ).required(),
        actualStartDate: Joi.date().optional(),
        actualEndDate: Joi.date().optional(),
        variance: Joi.object({
          schedule: Joi.number().required(), // in days
          effort: Joi.number().required()    // in person-hours
        }).optional()
      })
    ).required()
  }).required(),
  deliverables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      type: Joi.string().required(),
      status: Joi.string().valid(
        'pending',
        'in_progress',
        'review',
        'completed',
        'delayed'
      ).required(),
      dueDate: Joi.date().required(),
      submissionDate: Joi.date().optional(),
      reviewStatus: Joi.string().valid(
        'pending',
        'approved',
        'rejected',
        'revision_needed'
      ).optional(),
      feedback: Joi.string().optional()
    })
  ).required(),
  teamActivity: Joi.object({
    meetings: Joi.array().items(
      Joi.object({
        date: Joi.date().required(),
        duration: Joi.number().required(), // in minutes
        attendees: Joi.array().items(Joi.string()).required(),
        agenda: Joi.string().required(),
        outcomes: Joi.string().required()
      })
    ).optional(),
    contributions: Joi.array().items(
      Joi.object({
        memberId: Joi.string().required(),
        tasks: Joi.array().items(
          Joi.object({
            description: Joi.string().required(),
            hours: Joi.number().required(),
            status: Joi.string().valid(
              'completed',
              'in_progress',
              'blocked'
            ).required()
          })
        ).required(),
        weeklyHours: Joi.number().required()
      })
    ).required()
  }).required(),
  issues: Joi.array().items(
    Joi.object({
      title: Joi.string().required(),
      description: Joi.string().required(),
      type: Joi.string().valid(
        'technical',
        'resource',
        'team',
        'scope',
        'other'
      ).required(),
      severity: Joi.string().valid('low', 'medium', 'high', 'critical').required(),
      status: Joi.string().valid(
        'open',
        'in_progress',
        'resolved',
        'blocked'
      ).required(),
      assignee: Joi.string().optional(),
      resolution: Joi.string().optional()
    })
  ).optional(),
  supervisorFeedback: Joi.object({
    lastMeeting: Joi.date().required(),
    progress: Joi.string().valid(
      'excellent',
      'satisfactory',
      'needs_improvement',
      'concerning'
    ).required(),
    comments: Joi.string().required(),
    recommendations: Joi.array().items(Joi.string()).optional()
  }).optional()
});

// Project change request validation schema
export const projectChangeSchema = Joi.object({
  projectId: Joi.string().required(),
  requestedBy: Joi.object({
    id: Joi.string().required(),
    role: Joi.string().valid('student', 'supervisor', 'admin').required()
  }).required(),
  type: Joi.string().valid(
    'scope',
    'timeline',
    'resources',
    'team',
    'technical',
    'other'
  ).required(),
  changes: Joi.object({
    current: Joi.object().required(),
    proposed: Joi.object().required(),
    justification: Joi.string().required()
  }).required(),
  impact: Joi.object({
    schedule: Joi.string().required(),
    resources: Joi.string().required(),
    quality: Joi.string().required(),
    risks: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        mitigation: Joi.string().required()
      })
    ).optional()
  }).required(),
  approvals: Joi.array().items(
    Joi.object({
      role: Joi.string().valid('supervisor', 'admin').required(),
      status: Joi.string().valid('pending', 'approved', 'rejected').required(),
      comments: Joi.string().optional()
    })
  ).required()
});