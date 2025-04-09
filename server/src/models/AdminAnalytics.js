import mongoose from "mongoose";

// Schema for storing dashboard analytics data
const adminAnalyticsSchema = new mongoose.Schema(
  {
    session: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Student analytics
    studentMetrics: {
      totalRegistered: Number,
      activeThisWeek: Number,
      teamsFormed: Number,
      pendingAssignments: Number,
      completedAssignments: Number,
      averageProgress: Number, // percentage
      atRiskCount: Number,
      departmentDistribution: mongoose.Schema.Types.Mixed, // { "CS": 45, "EE": 30, ... }
      activityByTimeOfDay: mongoose.Schema.Types.Mixed, // { "morning": 30, "afternoon": 45, ... }
    },
    // Supervisor analytics
    supervisorMetrics: {
      totalActive: Number,
      pendingApproval: Number,
      averageResponseTime: Number, // in hours
      averageRating: Number,
      feedbackProvided: Number,
      meetingsScheduled: Number,
      workloadDistribution: mongoose.Schema.Types.Mixed, // { "0-2 teams": 10, "3-5 teams": 5, ... }
      topPerformers: [
        {
          supervisor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          metrics: mongoose.Schema.Types.Mixed, // { responseRate: 98, avgRating: 4.8, ... }
        },
      ],
    },
    // Team analytics
    teamMetrics: {
      totalActive: Number,
      pendingSupervisorAssignment: Number,
      onTrackPercentage: Number,
      atRiskPercentage: Number,
      completedMilestones: Number,
      upcomingDeadlines: Number,
      projectTypeDistribution: mongoose.Schema.Types.Mixed, // { "Research": 15, "Development": 25, ... }
    },
    // System analytics
    systemMetrics: {
      activeUsers: Number,
      apiRequests: Number,
      averageResponseTime: Number, // in ms
      errorRate: Number, // percentage
      storageUsed: Number, // in MB
      cpuUsage: Number, // percentage
      memoryUsage: Number, // percentage
    },
    // Cache for quick dashboard access
    dashboardMetricsCache: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
adminAnalyticsSchema.index({ session: 1, date: 1 });

// Custom methods for data analysis
adminAnalyticsSchema.statics.getAggregatedMetrics = async function (
  sessionId,
  startDate,
  endDate,
  groupBy = "day"
) {
  const matchStage = {
    session: mongoose.Types.ObjectId(sessionId),
  };

  if (startDate && endDate) {
    matchStage.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  let dateFormat;
  switch (groupBy) {
    case "day":
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
      break;
    case "week":
      dateFormat = {
        $dateToString: {
          format: "%Y-W%U",
          date: "$date",
        },
      };
      break;
    case "month":
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$date" } };
      break;
    default:
      dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$date" } };
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: dateFormat,
        studentCount: { $avg: "$studentMetrics.totalRegistered" },
        activeStudents: { $avg: "$studentMetrics.activeThisWeek" },
        supervisorCount: { $avg: "$supervisorMetrics.totalActive" },
        teamsCount: { $avg: "$teamMetrics.totalActive" },
        avgStudentProgress: { $avg: "$studentMetrics.averageProgress" },
        avgSupervisorResponseTime: {
          $avg: "$supervisorMetrics.averageResponseTime",
        },
        teamProgress: { $avg: "$teamMetrics.onTrackPercentage" },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Method to get performance metrics
adminAnalyticsSchema.statics.getPerformanceMetrics = async function (
  sessionId,
  timeRange
) {
  const endDate = new Date();
  let startDate;

  switch (timeRange) {
    case "week":
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "month":
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      break;
    case "semester":
      // Get from session start date
      const session = await mongoose.model("Session").findById(sessionId);
      startDate = session
        ? session.startDate
        : new Date(endDate.getFullYear(), 0, 1);
      break;
    default:
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30); // Default to 30 days
  }

  const lastRecord = await this.findOne({
    session: mongoose.Types.ObjectId(sessionId),
    date: { $lte: endDate },
  }).sort({ date: -1 });

  if (!lastRecord) {
    return null;
  }

  // Get trend by comparing with earlier record
  const earlierRecord = await this.findOne({
    session: mongoose.Types.ObjectId(sessionId),
    date: {
      $gte: startDate,
      $lt: new Date(lastRecord.date),
    },
  }).sort({ date: 1 });

  // Calculate trends
  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    currentMetrics: {
      studentEngagement: lastRecord.studentMetrics.activeThisWeek,
      supervisorResponsiveness:
        lastRecord.supervisorMetrics.averageResponseTime,
      teamProgress: lastRecord.teamMetrics.onTrackPercentage,
      atRiskTeams: lastRecord.teamMetrics.atRiskPercentage,
    },
    trends: earlierRecord
      ? {
          studentEngagement: calculateTrend(
            lastRecord.studentMetrics.activeThisWeek,
            earlierRecord.studentMetrics.activeThisWeek
          ),
          supervisorResponsiveness:
            calculateTrend(
              earlierRecord.supervisorMetrics.averageResponseTime,
              lastRecord.supervisorMetrics.averageResponseTime
            ) * -1, // Invert since lower response time is better
          teamProgress: calculateTrend(
            lastRecord.teamMetrics.onTrackPercentage,
            earlierRecord.teamMetrics.onTrackPercentage
          ),
          atRiskTeams:
            calculateTrend(
              earlierRecord.teamMetrics.atRiskPercentage,
              lastRecord.teamMetrics.atRiskPercentage
            ) * -1, // Invert since lower at-risk percentage is better
        }
      : null,
  };
};

// Create and export the model
const AdminAnalytics =
  mongoose.models.AdminAnalytics ||
  mongoose.model("AdminAnalytics", adminAnalyticsSchema);

export { AdminAnalytics };
