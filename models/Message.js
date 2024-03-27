const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'users' },
    text: String,
    file: String,
    seen: Boolean,
  },
  { timestamps: true }
);

const MessageModel = mongoose.model('messages', MessageSchema);

module.exports = MessageModel;
