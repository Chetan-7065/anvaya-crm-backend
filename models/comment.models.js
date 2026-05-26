const mongoose = require("mongoose");

// Comment Schema
const commentSchema = new mongoose.Schema({
  lead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: [true, 'Lead reference is required'],
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'salesAgent',
    required: [true, 'Author is required'],
  },
  commentText: {
    type: String,
    required: [true, 'Comment text is required'],
  },
  createdAt: {
    type: Date,
    default: Date.now, 
  }
});

module.exports = mongoose.model('Comment', commentSchema);
