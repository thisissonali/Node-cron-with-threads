const mongoose = require('mongoose');

const EmailValidationResultSchema = new mongoose.Schema({
  email: String,
  validationResponse: Object
});

module.exports = mongoose.model('EmailValidationResult', EmailValidationResultSchema);
    