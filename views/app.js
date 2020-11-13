const socket = io();

const lobbyName = document.getElementById('gamelobby');
const userList = document.getElementById('users');
const leaveLobbyBtn = document.getElementById('leave');
const chat = document.getElementById('chat');
const chatbox = document.getElementById('chatbox')
const sendChat = document.getElementById('send');
const gameGrid = document.querySelector('#game');
const winnerText = document.getElementById('winner');
const finalScoreboard = document.getElementById('finalScoreboard');
const matchTime = document.getElementById('matchTime');
const gameOver = document.getElementById('endgameboard');
gameOver.style.display = "none";


const GRID_SIZE = 20;
const CELL_SIZE = 20;

var playerEnabled = -1;

const SQUARE_TYPE = {
  BLANK: 'blank',
  WALL: 'wall',
  DOT: 'dot',
  GHOST1: 'ghost1',
  GHOST2: 'ghost2',
  GHOST3: 'ghost3',
  PILL: 'pill',
  PACMAN: 'pacman',
  GHOST: 'ghost',
  SCARED: 'scared',
  GHOSTLAIR: 'lair'
};

// Lookup array for classes
const SQUARE_LIST = [
  SQUARE_TYPE.BLANK,
  SQUARE_TYPE.WALL,
  SQUARE_TYPE.DOT,
  SQUARE_TYPE.GHOST1,
  SQUARE_TYPE.GHOST2,
  SQUARE_TYPE.GHOST3,
  SQUARE_TYPE.PILL,
  SQUARE_TYPE.PACMAN,
  SQUARE_TYPE.GHOSTLAIR
];

// Get username and lobby from URL
const {username, lobby} = Qs.parse(location.search, {ignoreQueryPrefix: true});

// Join lobby
socket.emit('joinLobby', {username, lobby});

// DEVELOPMENT - should get deleted after the end game works
function callEnd() {
  console.log("here");
  socket.emit('simEnd', {lobby : lobby});
}

// Get lobby and Users
socket.on('lobbyUsers', ({lobby, users}) => {
  let countdown = document.getElementById('countdown');
  countdown.innerHTML = "Waiting for more players...";

  outputLobbyName(lobby);
  outputUsers(users);
});

// Load board
socket.on('loadBoard', () => {
  drawBoard();
});

//io.to(user.lobby).emit('drawGameBoard', (gameBoard));
socket.on('drawGameBoard',({gameBoard}) =>{
  console.log("Received drawGameBoard");
  drawGameBoard(gameBoard);
});

function drawGameBoard(gameBoard){
  console.log("Drawing gameBoard");

  const board = document.querySelector('#game');
  const grid = [];

    board.innerHTML = '';
    // First set correct amount of columns based on Grid Size and Cell Size
    board.style.cssText = `grid-template-columns: repeat(${GRID_SIZE}, ${CELL_SIZE}px);`;
    //console.log(gameBoard); // Development purposes only
    gameBoard.forEach((square) => {
      const div = document.createElement('div');
      div.classList.add('square', SQUARE_LIST[square]);
      div.style.cssText = `width: ${CELL_SIZE}px; height: ${CELL_SIZE}px;`;
      // div.innerText = square; // Development purposes only. DELETE THIS
      div.setAttribute("class", SQUARE_LIST[square]);
      board.appendChild(div);
      grid.push(div);
    });
}

function rotateDiv(position, degree){
  this.grid[position].style.transform = `rotate({deg}deg)`;
}

// Messages from Server
socket.on('message', message => {
  const p = document.createElement('p');
  p.innerText = message;
  chat.appendChild(p);
  chat.scrollTop = chat.scrollHeight; // automatically scroll to bottom of chat messages
});

// gameUpdates from server (i.e. player position change)
socket.on('gameUpdate', ({lobby, users, gameBoard}) => {
  drawGameBoard(gameBoard);
  updateScores(users);
});

// gameOver from server
socket.on('gameOver', ({lobby, users, gameTime}) => {
  socket.emit('ackGameEnd', {id : socket.id});
  playerEnabled = -1;
  let ghostTotal = 0;
  for(let i = 0; i < 3; i++)
    ghostTotal += users[i].score;
  if(users[3].score > ghostTotal)
  winnerText.innerHTML = "Pacman wins!!!";
  else
  winnerText.innerHTML = "The ghosts win!!!";

  let spacer = document.createElement('br');
  // endgamebox.appendChild(spacer);
  // spacer = document.createElement('br');
  // endgamebox.appendChild(spacer);

  for(let i = 0; i < 4; i ++){
    let p = document.createElement('p');
    if(users[i].playerRole == 1)
      p.innerHTML = "Red Ghost Score: " + users[i].score;
    else if(users[i].playerRole == 2)
      p.innerHTML = "Blue Ghost Score: " + users[i].score;
    else if(users[i].playerRole == 3)
      p.innerHTML = "Orange Ghost Score: " + users[i].score;
    else if(users[i].playerRole == 4)
      p.innerHTML = "Pacman Score: " + users[i].score;
    // spacer.appendChild(p);
    finalScoreboard.appendChild(p);
  }
  gameOver.style.display = "block";
  // Maybe take in a timer parameter as well?
  matchTime.innerText = 'Match time: ' + gameTime + ' seconds'; // DELETE THIS
  // winnerText.appendChild(test); // DELETE THIS
  // socket.disconnect();
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

// Send message if user hits 'enter' key
document.addEventListener('keydown', function(event)	{
	if(event.key == "Enter")	{
		sendChat.click();
	}
}, true);

// Add lobby name to page
function outputLobbyName(lobby) {
  lobbyName.innerText = "Lobby " + lobby;
}

socket.on('setRoles', ({users}) => {
  //appendRoles(users);
  startCountDown();
  updateScores(users);
  document.getElementById("pregameMsg").innerHTML = "Controls: Use the arrow keys to move your character.<br />";
});

function startCountDown(){
  //Start 5 second countdown to start game
  let countdown = document.getElementById('countdown');
  let second = 5;
  var interval = setInterval(function() {
    if(second > 0)
      countdown.innerHTML = "Match starting in: " + second;
    else if(second == 0)
      countdown.innerHTML = "GO!";
    else 
      clearInterval(interval);
    second--;
  }, 1000);
  
  //Enable player so that they can send direction update to server
  playerEnabled = 1;
}

/*function appendRoles(users){
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
}*/

function updateScores(users)  {
  var scores = [0, 0, 0, 0];
  var fakeUsers = [0, 0, 0, 0];
  users.forEach(user => {
    scores[user.playerRole - 1] = user.score;
    if (user.playerRole == 1)
      var scoreName = "Red Ghost: " + user.username + "\nScore: " + user.score ;
    if (user.playerRole == 2)
      var scoreName = "Blue Ghost: " + user.username + "\nScore: " + user.score;
    if (user.playerRole == 3)
      var scoreName = "Orange Ghost: " + user.username + "\nScore: " + user.score;
    if (user.playerRole == 4)
      var scoreName = "Pacman: " + user.username + "\nScore: " + user.score;

    //scoreName = user.status + " " + scoreName; // Development purposes only. DELETE THIS
    fakeUsers[user.playerRole - 1] = {username: scoreName, id : user.id};
  });
  outputUsers(fakeUsers);
}


// Add users list to lobby page
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach(user => {
    const li = document.createElement('li');
    li.innerText = user.username;
    li.setAttribute("id", user.username);
    if (user.id === socket.id) {
      li.style.fontWeight = "bold";
    }
    userList.appendChild(li);
  });
}

this.document.addEventListener('keydown', function(event) {
  event.preventDefault();
  if (!event.repeat)  { // event.repeat is true if user is holding down key (this causes issues with server)
    if(playerEnabled != -1){ // check to make sure that the game has started
      if (event.key == "ArrowLeft") {
        socket.emit('changeDirection', ('left'));
      }
      else if (event.key == "ArrowUp") {
        socket.emit('changeDirection', ('up'));
      }
      else if (event.key == "ArrowRight") {
        socket.emit('changeDirection', ('right'));
      }
      else if (event.key == "ArrowDown") {
        socket.emit('changeDirection', ('down'));
      }
    }
  }
}, true);
