const mongoose = require('mongoose');

const EmailTaskSchema = new mongoose.Schema({
  id: String,
  status: { type: String, default: 'pending' },
  filePath: String
});

module.exports = mongoose.model('EmailTask', EmailTaskSchema);
