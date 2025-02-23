const socket = new WebSocket('ws://localhost:8000');

const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const userList = document.getElementById('user-list');
const authPopup = document.getElementById('auth-popup');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginSubmit = document.getElementById('login-submit');
const signupFirstname = document.getElementById('signup-firstname');
const signupLastname = document.getElementById('signup-lastname');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const signupConfirmPassword = document.getElementById('signup-confirm-password');
const signupSubmit = document.getElementById('signup-submit');
const showSignup = document.getElementById('show-signup');
const showLogin = document.getElementById('show-login');
const chatContainer = document.querySelector('.chat-container');
const recipientSelect = document.getElementById('recipient-select');

let username = '';

authPopup.style.display = 'flex';

showSignup.addEventListener('click', (e) => {
  e.preventDefault();
  loginForm.style.display = 'none';
  signupForm.style.display = 'block';
});

showLogin.addEventListener('click', (e) => {
  e.preventDefault();
  signupForm.style.display = 'none';
  loginForm.style.display = 'block';
});

loginSubmit.addEventListener('click', () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value.trim();

  if (email && password) {
    fetch('/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'Login successful') {
          username = data.user.firstName;
          authPopup.style.display = 'none';
          chatContainer.style.display = 'flex';
          socket.send(JSON.stringify({ type: 'username', username: username }));
        } else {
          alert('Invalid credentials');
        }
      })
      .catch(error => console.error('Error:', error));
  } else {
    alert('Please fill in all fields');
  }
});

signupSubmit.addEventListener('click', () => {
  const firstName = signupFirstname.value.trim();
  const lastName = signupLastname.value.trim();
  const email = signupEmail.value.trim();
  const password = signupPassword.value.trim();
  const confirmPassword = signupConfirmPassword.value.trim();

  if (firstName && lastName && email && password && confirmPassword) {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ firstName, lastName, email, password, confirmPassword }),
    })
      .then(response => response.json())
      .then(data => {
        if (data.message === 'User registered successfully') {
          alert('Registration successful. Please login.');
          signupForm.style.display = 'none';
          loginForm.style.display = 'block';
        } else {
          alert('Registration failed');
        }
      })
      .catch(error => console.error('Error:', error));
  } else {
    alert('Please fill in all fields');
  }
});

sendButton.addEventListener('click', () => {
  const message = messageInput.value.trim();
  const recipient = recipientSelect.value;

  if (message) {
    if (recipient === 'all') {
      socket.send(JSON.stringify({ type: 'message', user: username, text: message }));
    } else {
      socket.send(JSON.stringify({
        type: 'privateMessage',
        sender: username,
        recipient: recipient,
        text: message,
      }));
    }
    messageInput.value = '';
  }
});

messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendButton.click();
  }
});

socket.addEventListener('message', (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'message' || data.type === 'privateMessage') {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message');

    if (data.type === 'privateMessage') {
      // Private message styling
      if (data.sender === username) {
        // Sent by the current user (private)
        messageElement.textContent = `[Private to ${data.recipient}]: ${data.text}`;
        messageElement.classList.add('self', 'private');
      } else {
        // Received from another user (private)
        messageElement.textContent = `[Private from ${data.sender}]: ${data.text}`;
        messageElement.classList.add('other', 'private');
      }
    } else if (data.user === username) {
      // Regular message sent by the current user
      messageElement.textContent = `You: ${data.text}`;
      messageElement.classList.add('self');
    } else {
      // Regular message sent by another user
      messageElement.textContent = `${data.user}: ${data.text}`;
      messageElement.classList.add('other');
    }

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } else if (data.type === 'userList') {
    // Update the user list and recipient dropdown
    userList.innerHTML = '';
    recipientSelect.innerHTML = '<option value="all">Everyone</option>';
    data.users.forEach(user => {
      const userElement = document.createElement('li');
      userElement.textContent = user;
      userList.appendChild(userElement);

      if (user !== username) {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        recipientSelect.appendChild(option);
      }
    });
  }
});

socket.addEventListener('error', (error) => {
  console.error('WebSocket error:', error);
});

socket.addEventListener('close', () => {
  console.log('WebSocket connection closed');
});