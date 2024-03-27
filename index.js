const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();
// const cors = require('cors');
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
// const corsOptions = {
//   origin: process.env.CLIENT_URL,
//   credentials: true, //access-control-allow-credentials:true
//   optionSuccessStatus: 200,
// };

app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CLIENT_URL);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', true);

  //console.log('Request received:', req.method, req.url);

  next();
});
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use('/auth', userRouter);
app.use('/profile', userProfileRouter);
app.use('/messages', messageRouter);

const server = app.listen(process.env.PORT || 5000, () => {
  console.log(`Server is running on port ${process.env.PORT}...`);
});

const wss = new ws.WebSocketServer({ server });
wss.on('connection', (connection, req) => {
  const notifyAboutOnlinePeople = () => {
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

  //read usename and id from the cookie for this connection
  const cookies = req.headers.cookie;
  if (cookies) {
    const tokenCookieString = cookies
      .split(';')
      .find((str) => str.startsWith('token='));
    if (tokenCookieString) {
      const token = tokenCookieString.split('=')[1];
      if (token) {
        try {
          const userData = jwt.verify(token, jwtSecret);
          const { userId, username } = userData;
          connection.userId = userId;
          connection.username = username;
        } catch (err) {
          console.log(err);
        }
      }
    }
  }
  connection.on('message', async (message) => {
    const parsedMessage = JSON.parse(message.toString());
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
        //console.log(createdMessage);
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

  //notify everyone about online people (when someone connects)
  notifyAboutOnlinePeople();
});
