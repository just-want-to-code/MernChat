const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const jwtSecret = process.env.JWT_SECRET;

router.get('/people', async (req, res) => {
  try {
    const response = await UserModel.find({}, { _id: 1, username: 1 });
    res.json(response);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
