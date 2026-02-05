const mongoose = require('mongoose');

const ReportingManagerSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }
});

module.exports = mongoose.model('ReportingManager', ReportingManagerSchema);