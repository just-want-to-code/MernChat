const express = require('express');
const MessageModel = require('../models/Message');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const router = express.Router();

router.post('/:id', async (req, res) => {
  try {
    const ourUserId = req.params.id;
    const messages = await MessageModel.find({
      $or: [{ sender: ourUserId }, { recipient: ourUserId }],
    });
    res.json(messages);
  } catch (err) {
    console.log(err);
    res.json('fail');
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.body.userId;
    const ourUserId = req.params.id;
    const response = await MessageModel.updateMany(
      { $and: [{ sender: userId }, { recipient: ourUserId }] },
      { seen: true }
    );
    res.json('success');
  } catch (err) {
    console.log(err);
    res.json('fail');
  }
});

module.exports = router;
