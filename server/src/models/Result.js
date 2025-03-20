import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  marks: [{
    category: {
      type: String,
      required: true,
      trim: true
    },
    score: {
      type: Number,
      required: true,
      min: 0
    },
    maxScore: {
      type: Number,
      required: true,
      min: 0
    },
    givenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  }],
  published: {
    type: Boolean,
    default: false
  },
  publishedAt: Date
}, {
  timestamps: true
});

// Add methods
resultSchema.methods.getTotalScore = function() {
  return this.marks.reduce((total, mark) => total + mark.score, 0);
};

resultSchema.methods.getTotalMaxScore = function() {
  return this.marks.reduce((total, mark) => total + mark.maxScore, 0);
};

resultSchema.methods.getPercentage = function() {
  const totalScore = this.getTotalScore();
  const totalMaxScore = this.getTotalMaxScore();
  return totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;
};

// Check if model exists already to prevent overwrite error
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);

// Export as named export only
export { Result };
