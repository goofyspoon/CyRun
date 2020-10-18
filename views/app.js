const socket = io();

const lobbyName = document.getElementById('gamelobby');
const userList = document.getElementById('users');
const leaveLobbyBtn = document.getElementById('leave');

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
  console.log(message);
});

// Add lobby name to page
function outputLobbyName(lobby) {

  lobbyName.innerText = "Lobby " + lobby;
}

// Add users list to page
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });

}
