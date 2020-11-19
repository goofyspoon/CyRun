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
const playAgain = document.getElementById('playagain');
gameOver.style.display = "none";

var localBoard;
var playerEnabled = -1;

const GRID_SIZE = 20; // Grid size never changes
const CELL_SIZE = 20; // CELL SIZE increases on mobile

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
  GHOSTLAIR: 'lair',
  OUTOFBOUNDS: 'outside'
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
  SQUARE_TYPE.GHOSTLAIR,
  SQUARE_TYPE.OUTOFBOUNDS
];

// Get username and lobby from URL
const {username, lobby} = Qs.parse(location.search, {ignoreQueryPrefix: true});

// Join lobby
socket.emit('joinLobby', {username, lobby});

//Reloads the page once play again button is closed which preserves the lobby and username
playAgain.onclick = function() {
  location.reload();
};

// Get lobby and Users
socket.on('lobbyUsers', ({lobby, users}) => {
  let countdown = document.getElementById('countdown');
  countdown.innerHTML = "Waiting for more players...";

  outputLobbyName(lobby);
  outputUsers(users);
});

// Initial drawing of gameBoard (Beginning of game)
socket.on('loadBoard',({users, gameBoard}) => {
  localBoard = gameBoard.slice(); // Save gameBoard to client side (walls are important here). This is going to be used to help reduce lag between
                                  // server and client because going forward we will only have the server send array updates
                                  // on non-stationary elements (everything except walls). This should reduce lag drastically - Christian
  drawGameBoard(users, localBoard);
});

// gameUpdates from server (i.e. player position change). This is constant
socket.on('gameUpdate', ({users, gameBoard}) => {
  for (var i = j = 0; i < localBoard.length && j < gameBoard.length; i++) {
    if (localBoard[i] != 1) { // if element in localBoard is not a wall update it
      localBoard[i] = gameBoard[j++];
    }
  }
  drawGameBoard(users, localBoard);
  updateScores(users);
});

function drawGameBoard(users, gameBoard){
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
      if (SQUARE_LIST[square] == SQUARE_TYPE.PACMAN)  { // customize pacman
        users.forEach(user => {
          if (user.playerRole == 4 && user.direction != 0) { // Pacman rotates depending on direction
            var rotation = 0;
            if (user.direction == -1) rotation = 180; // facing left
            else if (user.direction == 20) rotation = 90; // facing up
            else if (user.direction == -20) rotation = 270; // facing down
            div.style.transform = "rotate(" + rotation + "deg)";
          }
        });
      } // Customize the three ghosts: (make the ghosts flash if pacman ate pill)
      else if (SQUARE_LIST[square] == SQUARE_TYPE.GHOST1 || SQUARE_LIST[square] == SQUARE_TYPE.GHOST2 || SQUARE_LIST[square] == SQUARE_TYPE.GHOST3)  {
        users.forEach(user => {
          if (user.status == 1) {
            div.style.backgroundImage = "url('edible_ghost.png')";
            div.style.filter = "drop-shadow(1px 4px 1px #616161);"
          }
        });
      }
      //div.innerText = square; // Development purposes only. DELETE THIS
      div.setAttribute("class", SQUARE_LIST[square]);
      board.appendChild(div);
      grid.push(div);
    });
    console.log(gameBoard);
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

// gameOver from server
socket.on('gameOver', ({lobby, users, gameTime}) => {
  socket.emit('ackGameEnd', {id : socket.id});
  playerEnabled = -1; // Player movement disabled
  let ghostTotal = 0;
  for(let i = 0; i < 3; i++)
    ghostTotal += users[i].score;
  if(users[3].score > ghostTotal)
  winnerText.innerHTML = "Pacman wins!!!";
  else
  winnerText.innerHTML = "The ghosts win!!!";

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
    finalScoreboard.appendChild(p);
  }
  gameOver.style.display = "block";
  matchTime.innerText = 'Match time: ' + gameTime + ' seconds';
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
  // Start 5 second countdown to start game
  let countdown = document.getElementById('countdown');
  let second = 5;
  var interval = setInterval(function() {
    if(second > 0)
      countdown.innerHTML = "Match starting in: " + second;
    else if(second == 0)  {
      countdown.innerHTML = "GO!";
      playerEnabled = 1; // Enable player so that they can send direction update to server
    }
    else
      clearInterval(interval);
    second--;
  }, 1000);
}

function updateScores(users)  {
  var scores = [0, 0, 0, 0];
  var usersWithScore = [0, 0, 0, 0];
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

    usersWithScore[user.playerRole - 1] = {username: scoreName, id : user.id};
  });
  outputUsers(usersWithScore);
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

// Mobile input detection (swiping) taken from: // Swipe Detect function taken from: http://www.javascriptkit.com/javatutors/touchevents2.shtml
window.addEventListener('load', function(){
    var game = document.getElementById('game');
    swipedetect(game, function(swipedir){
        if (swipedir != 'none' && playerEnabled != -1) {
            socket.emit('changeDirection', (swipedir));
        }
    })
}, false);

function swipedetect(el, callback){

    var touchsurface = el,
    swipedir,
    startX,
    startY,
    distX,
    distY,
    threshold = 150, //required min distance traveled to be considered swipe
    restraint = 100, // maximum distance allowed at the same time in perpendicular direction
    allowedTime = 300, // maximum time allowed to travel that distance
    elapsedTime,
    startTime,
    handleswipe = callback || function(swipedir){}

    touchsurface.addEventListener('touchstart', function(e){
        var touchobj = e.changedTouches[0]
        swipedir = 'none'
        dist = 0
        startX = touchobj.pageX
        startY = touchobj.pageY
        startTime = new Date().getTime() // record time when finger first makes contact with surface
        e.preventDefault()
    }, false)

    touchsurface.addEventListener('touchmove', function(e){
        e.preventDefault() // prevent scrolling when inside DIV
    }, false)

    touchsurface.addEventListener('touchend', function(e){
        var touchobj = e.changedTouches[0]
        distX = touchobj.pageX - startX // get horizontal dist traveled by finger while in contact with surface
        distY = touchobj.pageY - startY // get vertical dist traveled by finger while in contact with surface
        elapsedTime = new Date().getTime() - startTime // get time elapsed
        if (elapsedTime <= allowedTime){ // first condition for awipe met
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint){ // 2nd condition for horizontal swipe met
                swipedir = (distX < 0)? 'left' : 'right' // if dist traveled is negative, it indicates left swipe
            }
            else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint){ // 2nd condition for vertical swipe met
                swipedir = (distY < 0)? 'up' : 'down' // if dist traveled is negative, it indicates up swipe
            }
        }
        handleswipe(swipedir)
        e.preventDefault()
    }, false)
}
