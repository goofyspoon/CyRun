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

// Load board
socket.on('loadBoard', () => {
  drawBoard();
});

// Draw in characters and start timer for game
socket.on('startGame', (users) => {
  drawCharacters(users);
  appendRoles(users);
  startGame();
});

// Messages from Server
socket.on('message', message => {
  const p = document.createElement('p');
  p.innerText = message;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight; // automatically scroll to bottom of chat messages
});

// gameUpdates from server (i.e. player position change)
socket.on('gameUpdate', ({lobby, users}) => {
	updateBoard(users);
})

// Send message
sendChat.addEventListener('click', (e) => {
  e.preventDefault();
  if (chatbox.value !== '') {
    socket.emit('lobbyMessage', {username: {username, lobby}.username, message: chatbox.value});
    chatbox.value = '';
    chatbox.focus();
  }
});

// Send message if user hits 'enter' key
document.addEventListener('keydown', function(event)	{
	if(event.keyCode == 13)	{
		sendChat.click();
	}
}, true);

// Add lobby name to page
function outputLobbyName(lobby) {
  lobbyName.innerText = "Lobby " + lobby;
}

function appendRoles(users){
   var descendants = userList.getElementsByTagName('li');
   if ( descendants.length > 0){
     for(let i = 0; i < descendants.length; i ++){
       if(users[i].playerRole == 1)
          descendants[i].textContent += ' - Red Ghost';
       else if(users[i].playerRole == 2)
          descendants[i].textContent += ' - Blue Ghost';
       else if(users[i].playerRole == 3)
          descendants[i].textContent += ' - Orange Ghost';
       else if(users[i].playerRole == 4)
          descendants[i].textContent += ' - PacMan';
     }
   }
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

function startGame(){
  var timer = setInterval(updateBoard,100);
}

function updateBoard(users){
	drawBoard(); // redraw board
  drawCharacters(users); // redraw characters
}

function drawBoard(){
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var img1 = new Image();
  img1.src = './PacmanLevel.png';
  img1.onload = function () {
      //draw background image
      ctx.drawImage(img1, 0, 0, canvas.width, canvas.height);
  };
}

function drawCharacters(users){
  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");
  var characters = ["red_ghost", "blue_ghost", "orange_ghost", "pacman"];

  let i = 0;
  users.forEach(user => {
    drawCharacter(user.xCoord, user.yCoord, canvas, ctx, characters[i++]);
  });
}

function drawCharacter(xCoord, yCoord, canvas, context, name){
  var image = new Image();
  var path = './' + name + '.png';
  image.src = path;
  image.onload = function () {
      //draw background image
      context.drawImage(image, xCoord, yCoord, 35, 35);
  };
}

this.document.addEventListener('keydown', function(event) {
  if (event.keyCode == 37) {
    socket.emit('changeDirection', ('left'));
  }
  else if (event.keyCode == 38) {
    socket.emit('changeDirection', ('up'));
  }
  else if (event.keyCode == 39) {
    socket.emit('changeDirection', ('right'));
  }
  else if (event.keyCode == 40) {
    socket.emit('changeDirection', ('down'));
  }
}, true);
