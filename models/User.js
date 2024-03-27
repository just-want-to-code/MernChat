const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, require: true },
    password: { type: String, require: true },
  },
  { timestamps: true }
);

const UserModel = mongoose.model('users', UserSchema);
module.exports = UserModel;
