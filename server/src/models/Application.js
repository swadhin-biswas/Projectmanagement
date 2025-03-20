import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const applicationSchema = new Schema({
  name: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Application = models.Application || model('Application', applicationSchema);

export { Application };
