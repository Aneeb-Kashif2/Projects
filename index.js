const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
const server = http.createServer(app);

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-email-password',
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

const wss = new WebSocket.Server({ server });

const activeUsers = new Map(); // Track active users and their WebSocket connections

// MongoDB Schema
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model('User', userSchema);

// Routes
app.post('/register', async (req, res) => {
  const { firstName, lastName, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const newUser = new User({ firstName, lastName, email, password });
    await newUser.save();

    // Send welcome email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Welcome to Live Chat Application',
      text: `Hi ${firstName},\n\nWelcome to our Live Chat Application! We're excited to have you on board.\n\nBest regards,\nThe Live Chat Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email, password });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Send login notification email
    const mailOptions = {
      from: 'your-email@gmail.com',
      to: email,
      subject: 'Login Notification',
      text: `Hi ${user.firstName},\n\nYou have successfully logged into your account.\n\nIf this was not you, please contact us immediately.\n\nBest regards,\nThe Live Chat Team`,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email:', error);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(200).json({ message: 'Login successful', user });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// WebSocket Logic
wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'username') {
      ws.username = data.username;
      activeUsers.set(data.username, ws);
      broadcastUserList();
    } else if (data.type === 'message') {
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'message', user: data.user, text: data.text }));
        }
      });
    } else if (data.type === 'privateMessage') {
      const recipientWs = activeUsers.get(data.recipient);
      const senderWs = activeUsers.get(data.sender);

      if (recipientWs) {
        recipientWs.send(JSON.stringify({
          type: 'privateMessage',
          sender: data.sender,
          text: data.text,
        }));
      }

      if (senderWs) {
        senderWs.send(JSON.stringify({
          type: 'privateMessage',
          sender: data.sender,
          text: data.text,
        }));
      }
    }
  });

  ws.on('close', () => {
    activeUsers.delete(ws.username);
    broadcastUserList();
  });
});

function broadcastUserList() {
  const userList = Array.from(activeUsers.keys());

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'userList', users: userList }));
    }
  });
}

// MongoDB Connection
mongoose.connect('mongodb://127.0.0.1:27017/Live-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB', err);
  });

// Start Server
const PORT = 8000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
