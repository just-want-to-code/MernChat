const express = require('express');
const MessageModel = require('../models/Message');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const router = express.Router();

const getUserData = async (req) => {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    //console.log(token);
    if (token) {
      try {
        const userData = jwt.verify(token, jwtSecret);
        resolve(userData);
      } catch (err) {
        throw err;
      }
    } else {
      reject('no token');
    }
  });
};

router.get('/', async (req, res) => {
  try {
    const userData = await getUserData(req);
    const ourUserId = userData.userId;
    const messages = await MessageModel.find({
      $or: [{ sender: ourUserId }, { recipient: ourUserId }],
    });
    res.json(messages);
  } catch (err) {
    throw err;
  }
});

router.put('/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const userData = await getUserData(req);
    const ourUserId = userData.userId;

    const response = await MessageModel.updateMany(
      { $or: [{ sender: userId }, { recipient: ourUserId }] },
      { seen: true }
    );
    res.json('success');
  } catch (err) {
    throw err;
  }
});

module.exports = router;
