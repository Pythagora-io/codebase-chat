const mongoose = require('mongoose');
const uuid = require('uuid');

const repositorySchema = new mongoose.Schema({
  githubUrl: { type: String, required: true },
  uuid: { type: String, default: function genUUID() { return uuid.v4(); }, unique: true },
  emails: [{ type: String }],
  summary: { type: String, default: '' },
  fileSummaries: [{ type: String }], // Added field for file summaries
  isProcessed: { type: Boolean, default: false }
}, { timestamps: true });

repositorySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    console.error('MongoDB duplicate key error:', error.message, error.stack); // gpt_pilot_error_log
    next(new Error('There was a duplicate key error'));
  } else {
    next(error);
  }
});

repositorySchema.post('save', function(doc, next) {
  console.log('Repository saved:', doc.uuid); // Adjusted for clarity in log
  next();
});

repositorySchema.post('validate', function(error, doc, next) {
  if (error) {
    console.error('Validation error:', error.message, error.stack); // gpt_pilot_error_log
  }
  next(error);
});

const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;