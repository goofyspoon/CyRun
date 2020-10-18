const socket = io();

const lobbyName = document.getElementById('gamelobby');
const userList = document.getElementById('users');
const leaveLobbyBtn = document.getElementById('leave');
const chat = document.getElementById('chat');
const chatbox = document.getElementById('chatbox')
const sendChat = document.getElementById('send');

// Get username and lobby from URL
const {username, lobby} = Qs.parse(location.search, {ignoreQueryPrefix: true});


// Join lobby
socket.emit('joinLobby', {username, lobby});

// Get lobby and Users
socket.on('lobbyUsers', ({lobby, users}) => {
  outputLobbyName(lobby);
  outputUsers(users);
});

// Messages from Server
socket.on('message', message => {
  const p = document.createElement('p');
  p.innerText = message;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight; // automatically scroll to bottom of chat messages
});

// Send message
sendChat.addEventListener('click', (e) => {
  e.preventDefault();
  if (chatbox.value !== '') {
    socket.emit('lobbyMessage', {username: {username, lobby}.username, message: chatbox.value});
    chatbox.value = '';
    chatbox.focus();
  }
});

// Add lobby name to page
function outputLobbyName(lobby) {
  lobbyName.innerText = "Lobby " + lobby;
}

// Add users list to lobby page
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerText = user.username;
    if (user.username === username) {
      li.style.color = "red";
    }
    userList.appendChild(li);
  });
}
