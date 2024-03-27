const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');
const jwtSecret = process.env.JWT_SECRET;

router.get('/', (req, res) => {
  const token = req.cookies?.token;
  //console.log(token);
  if (token) {
    try {
      const userData = jwt.verify(token, jwtSecret);
      const { id, username } = userData;
      res.json({ userData });
    } catch (err) {
      console.log(err);
      res.json('error');
    }
  } else {
    res.status(401).json('no token');
  }
});

router.get('/people', async (req, res) => {
  try {
    const response = await UserModel.find({}, { _id: 1, username: 1 });
    res.json(response);
  } catch (err) {
    throw err;
  }
});

module.exports = router;
