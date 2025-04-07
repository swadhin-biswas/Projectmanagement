import Joi from 'joi';

// Project submission validation schema
export const projectSubmissionSchema = Joi.object({
  title: Joi.string().required().min(3).max(200),
  submissionType: Joi.string().valid(
    'proposal',
    'progress_report',
    'final_report',
    'presentation',
    'code',
    'prototype'
  ).required(),
  description: Joi.string().required().min(10).max(2000),
  submissionFiles: Joi.array().items(
    Joi.object({
      fileName: Joi.string().required(),
      fileUrl: Joi.string().required().uri(),
      fileType: Joi.string().required(),
      fileSize: Joi.number().required(),
      uploadedAt: Joi.date().default(Date.now)
    })
  ).when('submissionType', {
    is: Joi.valid('proposal', 'progress_report', 'final_report'),
    then: Joi.array().min(1).required()
  }),
  githubUrl: Joi.when('submissionType', {
    is: 'code',
    then: Joi.string().required().uri().pattern(/^https:\/\/github\.com\//)
  }),
  deployedUrl: Joi.string().uri().optional(),
  version: Joi.number().integer().min(1).default(1),
  submissionNotes: Joi.string().max(1000).optional(),
  teamMembers: Joi.array().items(
    Joi.object({
      memberId: Joi.string().required(),
      contribution: Joi.string().required(),
      role: Joi.string().required()
    })
  ).min(1).required()
});

// Supervisor evaluation schema
export const supervisorEvaluationSchema = Joi.object({
  submissionId: Joi.string().required(),
  evaluationType: Joi.string().valid(
    'proposal',
    'progress',
    'final',
    'presentation'
  ).required(),
  marks: Joi.number().required().min(0).max(100),
  feedback: Joi.string().required().min(10).max(2000),
  evaluationCriteria: Joi.array().items(
    Joi.object({
      criterion: Joi.string().required(),
      score: Joi.number().required().min(0).max(100),
      weight: Joi.number().required().min(0).max(100),
      comments: Joi.string().required()
    })
  ).required(),
  strengths: Joi.array().items(Joi.string()).min(1).required(),
  improvements: Joi.array().items(Joi.string()).optional(),
  recommendations: Joi.array().items(Joi.string()).optional(),
  decision: Joi.string().valid(
    'approved',
    'needs_revision',
    'rejected'
  ).required(),
  revisionInstructions: Joi.when('decision', {
    is: 'needs_revision',
    then: Joi.string().required().min(10).max(1000)
  })
});

// Progress report validation schema
export const progressReportSchema = Joi.object({
  reportPeriod: Joi.object({
    startDate: Joi.date().required(),
    endDate: Joi.date().required().greater(Joi.ref('startDate'))
  }).required(),
  completedWork: Joi.array().items(
    Joi.object({
      task: Joi.string().required(),
      description: Joi.string().required(),
      completionDate: Joi.date().required(),
      contributors: Joi.array().items(Joi.string()).required()
    })
  ).min(1).required(),
  plannedWork: Joi.array().items(
    Joi.object({
      task: Joi.string().required(),
      description: Joi.string().required(),
      targetDate: Joi.date().required(),
      assignees: Joi.array().items(Joi.string()).required()
    })
  ).min(1).required(),
  challenges: Joi.array().items(
    Joi.object({
      description: Joi.string().required(),
      impact: Joi.string().valid('low', 'medium', 'high').required(),
      mitigation: Joi.string().required()
    })
  ).optional(),
  progress: Joi.object({
    overall: Joi.number().required().min(0).max(100),
    byComponent: Joi.array().items(
      Joi.object({
        component: Joi.string().required(),
        progress: Joi.number().required().min(0).max(100),
        status: Joi.string().valid('on_track', 'at_risk', 'delayed').required()
      })
    ).required()
  }).required()
});

// Final submission validation schema
export const finalSubmissionSchema = Joi.object({
  projectId: Joi.string().required(),
  submissionType: Joi.string().valid('final_report', 'complete_project').required(),
  deliverables: Joi.array().items(
    Joi.object({
      type: Joi.string().valid(
        'documentation',
        'source_code',
        'presentation',
        'demo_video',
        'deployment',
        'other'
      ).required(),
      files: Joi.array().items(
        Joi.object({
          fileName: Joi.string().required(),
          fileUrl: Joi.string().required().uri(),
          fileType: Joi.string().required(),
          fileSize: Joi.number().required()
        })
      ).min(1).required(),
      description: Joi.string().required()
    })
  ).min(1).required(),
  codeRepository: Joi.object({
    url: Joi.string().required().uri().pattern(/^https:\/\/github\.com\//),
    branch: Joi.string().required(),
    readme: Joi.boolean().required(),
    documentation: Joi.boolean().required()
  }).required(),
  deployment: Joi.object({
    url: Joi.string().uri().optional(),
    instructions: Joi.string().optional(),
    environment: Joi.object().optional()
  }).optional(),
  teamContributions: Joi.array().items(
    Joi.object({
      memberId: Joi.string().required(),
      roles: Joi.array().items(Joi.string()).required(),
      contributions: Joi.array().items(
        Joi.object({
          area: Joi.string().required(),
          description: Joi.string().required(),
          percentage: Joi.number().min(0).max(100).required()
        })
      ).required()
    })
  ).required(),
  completionChecklist: Joi.object({
    requirementsMet: Joi.boolean().required(),
    testingComplete: Joi.boolean().required(),
    documentationComplete: Joi.boolean().required(),
    presentationReady: Joi.boolean().required(),
    supervisorApproved: Joi.boolean().required()
  }).required()
});

// Revision submission validation schema
export const revisionSubmissionSchema = Joi.object({
  originalSubmissionId: Joi.string().required(),
  revisionNumber: Joi.number().integer().min(1).required(),
  changesDescription: Joi.string().required().min(10).max(2000),
  addressedFeedback: Joi.array().items(
    Joi.object({
      feedbackItem: Joi.string().required(),
      resolution: Joi.string().required(),
      files: Joi.array().items(
        Joi.object({
          fileName: Joi.string().required(),
          fileUrl: Joi.string().required().uri(),
          fileType: Joi.string().required(),
          fileSize: Joi.number().required()
        })
      ).optional()
    })
  ).min(1).required()
});