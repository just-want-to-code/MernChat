const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User.js');
const bcrypt = require('bcryptjs');

const router = express.Router();
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
      username,
      password: hashedPassword,
    });
    const token = jwt.sign({ userId: createdUser._id, username }, jwtSecret);
    res.status(201).json({
      token,
      id: createdUser._id,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json('error');
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const response = await User.findOne({ username });
    if (response) {
      const passOk = bcrypt.compareSync(password, response.password);
      if (passOk) {
        const token = jwt.sign({ userId: response._id, username }, jwtSecret);
        res.json({
          token,
          id: response._id,
        });
      } else res.json('wrong');
    } else res.json('wrong');
  } catch (err) {
    console.log(err);
    res.json('error');
  }
});

module.exports = router;
