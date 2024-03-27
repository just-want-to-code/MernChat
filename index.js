const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');
const ws = require('ws');
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const fs = require('fs');

const MessageModel = require('./models/Message.js');

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log('Database is connected'))
  .catch((err) => console.log('Database connection error!'));

const app = express();

const userRouter = require('./routes/UserAuth.js');
const userProfileRouter = require('./routes/UserProfile.js');
const messageRouter = require('./routes/MessageRouter.js');
const corsOptions = {
  origin: process.env.CLIENT_URL,
  credentials: true, //access-control-allow-credentials:true
  optionSuccessStatus: 200,
};

app.use(express.json());
app.use(cors(corsOptions));
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/auth', userRouter);
app.use('/profile', userProfileRouter);
app.use('/messages', messageRouter);

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT}...`);
});

const wss = new ws.WebSocketServer({ server });

wss.on('connection', (connection) => {
  const notifyAboutOnlinePeople = () => {
    //console.log([...wss.clients].map((el) => el.id));
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  };
  //console.log(console.log([...wss.clients].map((el) => el.username)));
  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyAboutOnlinePeople();
      console.log('dead');
    }, 1000);
  }, 5000);

  connection.on('pong', () => {
    clearTimeout(connection.deathTimer);
  });

  connection.on('message', async (message) => {
    const parsedMessage = JSON.parse(message.toString());
    if (parsedMessage.id) {
      connection.userId = parsedMessage.id;
      connection.username = parsedMessage.logUsername;
      notifyAboutOnlinePeople();
    }
    const { recipient, text, file } = parsedMessage;
    let filename = null;
    if (file) {
      const parts = file.name.split('.');
      const ext = parts[parts.length - 1];
      filename = Date.now() + '.' + ext;
      const path = __dirname + '/uploads/' + filename;
      const bufferData = Buffer.from(file.data.split(',')[1], 'base64');
      fs.writeFile(path, bufferData, () => {
        console.log('file saved: ' + path);
      });
    }
    if (recipient && (text || file)) {
      try {
        const createdMessage = await MessageModel.create({
          sender: connection.userId,
          recipient,
          text,
          file: file ? filename : null,
          seen: false,
        });
        [...wss.clients]
          .filter(
            (c) => c.userId === recipient || c.userId === connection.userId
          )
          .forEach((c) =>
            c.send(
              JSON.stringify({
                text,
                sender: connection.userId,
                recipient,
                file: file ? filename : null,
                seen: false,
                _id: createdMessage._id,
              })
            )
          );
      } catch (err) {
        console.log(err);
      }
    }
  });
});
