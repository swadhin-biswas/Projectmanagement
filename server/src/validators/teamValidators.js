import Joi from 'joi';

// Team creation validation schema
export const teamCreationSchema = Joi.object({
  name: Joi.string().required().min(3).max(100),
  description: Joi.string().required().min(10).max(1000),
  projectType: Joi.string().valid(
    'research',
    'development',
    'analysis',
    'design'
  ).required(),
  sessionId: Joi.string().required(),
  supervisor: Joi.object({
    id: Joi.string().required(),
    confirmationStatus: Joi.string().valid('pending', 'confirmed').default('pending')
  }).required(),
  members: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required(),
      role: Joi.string().valid('leader', 'member').required(),
      responsibilities: Joi.array().items(Joi.string()).min(1).required(),
      skills: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          level: Joi.string().valid('beginner', 'intermediate', 'advanced').required()
        })
      ).optional()
    })
  ).min(2).max(6).required(),
  preferences: Joi.object({
    communicationChannel: Joi.string().valid('microsoft_teams', 'slack', 'discord', 'other').required(),
    meetingFrequency: Joi.string().valid('daily', 'weekly', 'biweekly').required(),
    workStyle: Joi.string().valid('in_person', 'remote', 'hybrid').required()
  }).required(),
  projectProposal: Joi.object({
    title: Joi.string().required().min(5).max(200),
    objectives: Joi.array().items(Joi.string()).min(1).required(),
    scope: Joi.string().required().min(100).max(2000),
    technologies: Joi.array().items(Joi.string()).min(1).required(),
    timeline: Joi.array().items(
      Joi.object({
        phase: Joi.string().required(),
        duration: Joi.number().required(),
        deliverables: Joi.array().items(Joi.string()).required()
      })
    ).min(1).required()
  }).required()
});

// Team member update validation schema
export const teamMemberUpdateSchema = Joi.object({
  action: Joi.string().valid('add', 'remove', 'update_role', 'update_responsibilities').required(),
  memberId: Joi.string().required(),
  changes: Joi.when('action', {
    is: 'update_role',
    then: Joi.object({
      newRole: Joi.string().valid('leader', 'member').required(),
      reason: Joi.string().required()
    }).required(),
    otherwise: Joi.when('action', {
      is: 'update_responsibilities',
      then: Joi.object({
        responsibilities: Joi.array().items(Joi.string()).min(1).required()
      }).required(),
      otherwise: Joi.object({
        reason: Joi.string().required()
      }).required()
    })
  })
});

// Team settings validation schema
export const teamSettingsSchema = Joi.object({
  visibility: Joi.string().valid('public', 'private', 'unlisted').default('private'),
  joinSettings: Joi.object({
    allowRequests: Joi.boolean().default(false),
    requireApproval: Joi.boolean().default(true),
    maxMembers: Joi.number().min(2).max(6).required()
  }).required(),
  communicationPreferences: Joi.object({
    primaryPlatform: Joi.string().required(),
    meetingSchedule: Joi.array().items(
      Joi.object({
        day: Joi.number().min(0).max(6).required(),
        time: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        duration: Joi.number().min(15).max(180).required(), // in minutes
        type: Joi.string().valid('standup', 'review', 'planning').required()
      })
    ).optional(),
    notificationSettings: Joi.object({
      mentions: Joi.boolean().default(true),
      deadlines: Joi.boolean().default(true),
      updates: Joi.boolean().default(true)
    }).required()
  }).required(),
  collaboration: Joi.object({
    repositories: Joi.array().items(
      Joi.object({
        platform: Joi.string().valid('github', 'gitlab', 'bitbucket').required(),
        url: Joi.string().uri().required(),
        access: Joi.string().valid('read', 'write', 'admin').required()
      })
    ).optional(),
    tools: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        url: Joi.string().uri().required(),
        purpose: Joi.string().required()
      })
    ).optional()
  }).optional(),
  progress: Joi.object({
    trackingMethod: Joi.string().valid('milestones', 'sprints', 'kanban').required(),
    reviewFrequency: Joi.string().valid('daily', 'weekly', 'biweekly').required(),
    requireApproval: Joi.boolean().default(true)
  }).required()
});

// Team progress update validation schema
export const teamProgressSchema = Joi.object({
  reportingPeriod: Joi.object({
    start: Joi.date().required(),
    end: Joi.date().greater(Joi.ref('start')).required()
  }).required(),
  overall: Joi.object({
    status: Joi.string().valid('on_track', 'at_risk', 'delayed').required(),
    completion: Joi.number().min(0).max(100).required(),
    challenges: Joi.array().items(
      Joi.object({
        description: Joi.string().required(),
        impact: Joi.string().valid('low', 'medium', 'high').required(),
        mitigation: Joi.string().required()
      })
    ).optional()
  }).required(),
  memberContributions: Joi.array().items(
    Joi.object({
      memberId: Joi.string().required(),
      tasks: Joi.array().items(
        Joi.object({
          description: Joi.string().required(),
          status: Joi.string().valid('completed', 'in_progress', 'blocked').required(),
          hours: Joi.number().min(0).required()
        })
      ).required(),
      attendance: Joi.number().min(0).max(100).required()
    })
  ).required(),
  deliverables: Joi.array().items(
    Joi.object({
      name: Joi.string().required(),
      status: Joi.string().valid('completed', 'in_progress', 'pending', 'delayed').required(),
      quality: Joi.number().min(1).max(5).optional(),
      feedback: Joi.string().optional()
    })
  ).required(),
  nextSteps: Joi.array().items(
    Joi.object({
      action: Joi.string().required(),
      assignee: Joi.string().required(),
      dueDate: Joi.date().greater('now').required()
    })
  ).min(1).required()
});

// Team evaluation validation schema
export const teamEvaluationSchema = Joi.object({
  evaluationType: Joi.string().valid(
    'milestone',
    'presentation',
    'deliverable',
    'peer'
  ).required(),
  evaluator: Joi.object({
    id: Joi.string().required(),
    role: Joi.string().valid('supervisor', 'team_member', 'external').required()
  }).required(),
  metrics: Joi.object({
    technicalSkills: Joi.number().min(1).max(5).required(),
    collaboration: Joi.number().min(1).max(5).required(),
    communication: Joi.number().min(1).max(5).required(),
    problemSolving: Joi.number().min(1).max(5).required(),
    initiative: Joi.number().min(1).max(5).required()
  }).required(),
  feedback: Joi.object({
    strengths: Joi.array().items(Joi.string()).min(1).required(),
    improvements: Joi.array().items(Joi.string()).min(1).required(),
    recommendations: Joi.string().required()
  }).required(),
  individual: Joi.when('evaluationType', {
    is: 'peer',
    then: Joi.array().items(
      Joi.object({
        memberId: Joi.string().required(),
        metrics: Joi.object({
          participation: Joi.number().min(1).max(5).required(),
          reliability: Joi.number().min(1).max(5).required(),
          quality: Joi.number().min(1).max(5).required()
        }).required(),
        comments: Joi.string().required()
      })
    ).required()
  })
});

// Team formation validation schema
export const teamFormationSchema = Joi.object({
  name: Joi.string().required().min(3).max(50),
  sessionId: Joi.string().required(),
  leaderId: Joi.string().required(),
  members: Joi.array().items(
    Joi.object({
      studentId: Joi.string().required(),
      role: Joi.string().valid('leader', 'member').required(),
      specialization: Joi.array().items(Joi.string()).optional(),
      skills: Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          level: Joi.string().valid('beginner', 'intermediate', 'advanced').required()
        })
      ).optional()
    })
  ).min(2).max(6).required(),
  projectPreferences: Joi.array().items(
    Joi.object({
      projectId: Joi.string().required(),
      priority: Joi.number().min(1).max(3).required(),
      justification: Joi.string().required()
    })
  ).max(3).optional(),
  supervisorPreferences: Joi.array().items(
    Joi.object({
      supervisorId: Joi.string().required(),
      priority: Joi.number().min(1).max(3).required()
    })
  ).max(3).optional(),
  workingStyle: Joi.object({
    meetingPreference: Joi.string().valid('in_person', 'remote', 'hybrid').required(),
    availableHoursPerWeek: Joi.number().min(10).max(40).required(),
    preferredMeetingTimes: Joi.array().items(
      Joi.object({
        day: Joi.string().valid(
          'monday', 'tuesday', 'wednesday',
          'thursday', 'friday', 'saturday', 'sunday'
        ).required(),
        slots: Joi.array().items(
          Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
        ).required()
      })
    ).required()
  }).required()
});

// Team update validation schema
export const teamUpdateSchema = Joi.object({
  teamId: Joi.string().required(),
  updates: Joi.object({
    name: Joi.string().min(3).max(50).optional(),
    leaderId: Joi.string().optional(),
    addMembers: Joi.array().items(
      Joi.object({
        studentId: Joi.string().required(),
        role: Joi.string().valid('member').required(),
        reason: Joi.string().required()
      })
    ).optional(),
    removeMembers: Joi.array().items(
      Joi.object({
        studentId: Joi.string().required(),
        reason: Joi.string().required()
      })
    ).optional(),
    workingStyle: Joi.object({
      meetingPreference: Joi.string().valid('in_person', 'remote', 'hybrid'),
      availableHoursPerWeek: Joi.number().min(10).max(40),
      preferredMeetingTimes: Joi.array().items(
        Joi.object({
          day: Joi.string().valid(
            'monday', 'tuesday', 'wednesday',
            'thursday', 'friday', 'saturday', 'sunday'
          ),
          slots: Joi.array().items(
            Joi.string().pattern(/^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
          )
        })
      )
    }).optional()
  }).required(),
  requestedBy: Joi.object({
    id: Joi.string().required(),
    role: Joi.string().valid('student', 'supervisor', 'admin').required()
  }).required(),
  justification: Joi.string().required()
});

// Team evaluation validation schema
export const teamEvaluationSchema = Joi.object({
  teamId: Joi.string().required(),
  evaluationType: Joi.string().valid(
    'proposal_defense',
    'progress_review',
    'final_presentation'
  ).required(),
  evaluatedBy: Joi.array().items(
    Joi.object({
      evaluatorId: Joi.string().required(),
      role: Joi.string().valid('supervisor', 'panel_member', 'external').required()
    })
  ).min(1).required(),
  criteria: Joi.array().items(
    Joi.object({
      criterion: Joi.string().required(),
      score: Joi.number().min(0).max(100).required(),
      weight: Joi.number().min(0).max(100).required(),
      feedback: Joi.string().required(),
      improvements: Joi.array().items(Joi.string()).optional()
    })
  ).required(),
  overallScore: Joi.number().min(0).max(100).required(),
  generalFeedback: Joi.string().required(),
  strengths: Joi.array().items(Joi.string()).min(1).required(),
  weaknesses: Joi.array().items(Joi.string()).optional(),
  recommendations: Joi.array().items(Joi.string()).optional(),
  decision: Joi.string().valid(
    'approved',
    'approved_with_minor_changes',
    'major_revision_needed',
    'rejected'
  ).required()
});

// Team meeting validation schema
export const teamMeetingSchema = Joi.object({
  teamId: Joi.string().required(),
  meetingType: Joi.string().valid(
    'supervisor_meeting',
    'team_meeting',
    'progress_review',
    'presentation_practice'
  ).required(),
  date: Joi.date().required(),
  duration: Joi.number().min(15).max(180).required(), // in minutes
  mode: Joi.string().valid('in_person', 'online', 'hybrid').required(),
  location: Joi.when('mode', {
    is: 'in_person',
    then: Joi.string().required(),
    otherwise: Joi.string().optional()
  }),
  meetingLink: Joi.when('mode', {
    is: Joi.valid('online', 'hybrid'),
    then: Joi.string().uri().required(),
    otherwise: Joi.string().optional()
  }),
  attendees: Joi.array().items(
    Joi.object({
      userId: Joi.string().required(),
      role: Joi.string().valid('student', 'supervisor', 'guest').required(),
      attendance: Joi.string().valid('present', 'absent', 'late').required()
    })
  ).min(2).required(),
  agenda: Joi.array().items(
    Joi.object({
      topic: Joi.string().required(),
      duration: Joi.number().required(), // in minutes
      presenter: Joi.string().required()
    })
  ).required(),
  minutes: Joi.object({
    discussions: Joi.array().items(
      Joi.object({
        topic: Joi.string().required(),
        points: Joi.array().items(Joi.string()).required(),
        decisions: Joi.array().items(Joi.string()).optional()
      })
    ).required(),
    actionItems: Joi.array().items(
      Joi.object({
        task: Joi.string().required(),
        assignedTo: Joi.array().items(Joi.string()).required(),
        dueDate: Joi.date().greater('now').required(),
        priority: Joi.string().valid('high', 'medium', 'low').required()
      })
    ).required(),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        url: Joi.string().uri().required()
      })
    ).optional()
  }).required()
});

// Team communication validation schema
export const teamCommunicationSchema = Joi.object({
  teamId: Joi.string().required(),
  channelType: Joi.string().valid(
    'announcement',
    'discussion',
    'query',
    'feedback'
  ).required(),
  message: Joi.object({
    senderId: Joi.string().required(),
    content: Joi.string().required(),
    attachments: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        type: Joi.string().required(),
        url: Joi.string().uri().required()
      })
    ).optional(),
    mentions: Joi.array().items(Joi.string()).optional(),
    priority: Joi.string().valid('normal', 'important', 'urgent').default('normal')
  }).required(),
  visibility: Joi.string().valid(
    'team_only',
    'with_supervisor',
    'with_admin'
  ).required(),
  requiresResponse: Joi.boolean().default(false),
  dueDate: Joi.when('requiresResponse', {
    is: true,
    then: Joi.date().greater('now').required()
  }),
  category: Joi.string().valid(
    'general',
    'technical',
    'administrative',
    'academic'
  ).required()
});

// Peer evaluation validation schema
export const peerEvaluationSchema = Joi.object({
  evaluatorId: Joi.string().required(),
  evaluatedId: Joi.string().required(),
  teamId: Joi.string().required(),
  period: Joi.string().required(), // e.g., "2025-Q1"
  criteria: Joi.array().items(
    Joi.object({
      criterion: Joi.string().required(),
      rating: Joi.number().min(1).max(5).required(),
      comment: Joi.string().required()
    })
  ).required(),
  contributions: Joi.object({
    taskCompletion: Joi.number().min(0).max(100).required(),
    qualityOfWork: Joi.number().min(0).max(100).required(),
    teamwork: Joi.number().min(0).max(100).required(),
    communication: Joi.number().min(0).max(100).required(),
    initiative: Joi.number().min(0).max(100).required()
  }).required(),
  strengths: Joi.array().items(Joi.string()).min(1).required(),
  areasForImprovement: Joi.array().items(Joi.string()).min(1).required(),
  overallRating: Joi.number().min(1).max(5).required(),
  additionalComments: Joi.string().optional(),
  willWorkAgain: Joi.boolean().required(),
  confidentialFeedback: Joi.string().optional()
});