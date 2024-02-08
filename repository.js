const mongoose = require('mongoose');
const uuid = require('uuid');

const repositorySchema = new mongoose.Schema({
  githubUrl: { type: String, required: true },
  uuid: { type: String, default: function genUUID() { return uuid.v4(); }, unique: true },
  email: { type: String, required: true },
  summary: { type: String, default: '' },
  isProcessed: { type: Boolean, default: false }
}, { timestamps: true });

repositorySchema.post('save', function(error, doc, next) {
  if (error.name === 'MongoError' && error.code === 11000) {
    next(new Error('There was a duplicate key error'));
  } else {
    next(error);
  }
});

repositorySchema.post('save', function(error, doc, next) {
  console.log('Repository saved:', doc);
  next();
});

repositorySchema.post('validate', function(error, doc, next) {
  console.error('Validation error:', error);
  next(error);
});

const Repository = mongoose.model('Repository', repositorySchema);

module.exports = Repository;
