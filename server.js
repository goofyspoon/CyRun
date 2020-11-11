
const http = require('http');
const express = require('express');
const socket = require('socket.io');
const Constants = require('./Constants.js');
const {
  userJoin,
  getCurrentUser,
  userLeave,
  getLobbyUsers,
  setPlayerNum,
  setDirection,
  getIndex,
  setIndex,
  getPrevPosType,
  setPrevPosType,
  getStatus,
  setStatus,
} = require('./utils/users');
const { create } = require('hbs');

var gameBoard;
var dotCount;

const app = express();
const server = http.createServer(app);
const io = socket(server);
const PORT = 3000 || process.anv.PORT;
const CANVAS_HEIGHT = 650;
const CANVAS_WIDTH = 550;

app.use(express.static('views')); // Set static folder to /views

// Run when client connects
io.on('connection', socket => {
  console.log('New socket connection', socket.id); // Development purposes only. Delete this.
  socket.on('joinLobby', ({username, lobby}) => {
    // Check the lobby to ensure there will not be two users with the same name or there are already 4 users in the lobby
    var entranceFailure = false;
    let usersInLobby = getLobbyUsers(lobby);
	if (usersInLobby.length >= 4)	{
    console.log("Rejected player because lobby is full.");
		socket.emit('message', 'The lobby, ' + lobby + ', is full')
		entranceFailure = true;
	}
    for (var i = 0; i < usersInLobby.length && !(entranceFailure); i++) {
      if (usersInLobby[i].username === username) {
        socket.emit('message', 'There already exists a user in lobby: \"' + lobby + '\" with the name: \"' + username + '\"');
        entranceFailure = true;
        console.log("Rejected player due to repeat of username.");
        break;
      }
    }
    if (entranceFailure) socket.disconnect();
    else {
      const user = userJoin(socket.id, username, lobby);
      //console.log("Starting position is: " + startingPos);
      socket.join(user.lobby);

      // Welcome current user to lobby
      socket.emit('message', 'Welcome to CyRun lobby ' + user.lobby);
      console.log("User "+ user.username+ "joined.");

      // Broadcast when a user connects
      socket.broadcast.to(user.lobby).emit('message', user.username + ' joined the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
      console.log("Sent users in lobby the user and lobby information from server.");

      //socket.emit('loadBoard');
      //console.log("Asked users to loadbBoard.");

      if(getLobbyUsers(user.lobby).length == 4) {
        console.log("There are now four users. Let's get started.");
        let users = getLobbyUsers(user.lobby);
        setRoles(user, users);
      }
    }// end else statement
  });

  function setRoles(user, users){
    for (let i = 0; i < 4; i++) {
      setPlayerNum(users[i].id, i + 1);
      setDirection(users[i].id, 0, 0);

    //First player will start at left ghost spot
    if (i == 0) {
        setIndex(users[i].id, 229);
        console.log("Setting " + users[i].username + " as red ghost.");
      //Second player will start at middle ghost spot
      } else if (i == 1)  {
        setIndex(users[i].id, 231);
        console.log("Setting " + users[i].username + " as blue ghost.");
      //Third player will start at right ghost spot
      } else if (i == 2)  {
        setIndex(users[i].id, 232);
        console.log("Setting " + users[i].username + " as orange ghost.");
      //Last player will be pacman
      } else  {
        setIndex(users[i].id, 290);
        console.log("Setting " + users[i].username + " as pacman.");
      }
  }

  io.to(user.lobby).emit('setRoles', {users : users});

  createGameBoard();
  //socket.broadcast.to(user.lobby).emit('drawGameBoard', ({gameBoard}));
    //io.to(user.lobby).emit('startGame', (getLobbyUsers(user.lobby)));
    io.to(user.lobby).emit('drawGameBoard', ({gameBoard}));
    console.log("Emit to users to drawGameBoard, passing gameBoard array.");

    //socket.broadcast.to(user.lobby).emit('hey', ({}));
    io.to(user.lobby).emit('hey', ({}));
    //gameloop();
  }

  function createGameBoard(){
    //gameBoard
    console.log("in createGameBoard.");
    gameBoard = Constants.LEVEL1.slice(); // copy LEVEL1 in constants
  }

  // Unused methods
  /*
  function addObject(position, object){
    gameBoard[position].classList.add(...classes);
  }

  function removeObject(position, object){
    gameBoard[position].classList.remove(...classes);
  }

  function objectExist(position, object){
    return gameBoard[position].classList.contains(object);
  }
  */

  // Handle player movement
  socket.on('changeDirection', (direction) => {
    const user = getCurrentUser(socket.id);
    const prevIndex = getIndex(user.id);
    var update = false;
    if (direction === 'up') {
      if (getIndex(user.id) > 19) { // Check that user is not in top row (there exists an index above)
        if (gameBoard[getIndex(user.id) - 20] != 1) { // Check if index above is a wall
          if (gameBoard[getIndex(user.id) - 20] != 6) { // Check if user accessed a pill

          }
          setIndex(user.id, getIndex(user.id) - 20);
          update = true;
        }
      }
    }
    else if (direction === 'down') {
      if (getIndex(user.id) < 439) { // Check that user is not in bottom row (there exists an index below)
        if (gameBoard[getIndex(user.id) + 20] != 1) { // Check if index below is a wall
          setIndex(user.id, getIndex(user.id) + 20);
          update = true;
        }
      }
    }
    else if (direction === 'left') {
      if (gameBoard[getIndex(user.id) - 1] != 1)  { // Check if index to the left is a wall
        setIndex(user.id, getIndex(user.id) - 1);
        update = true;
      }
    }
    else if (direction === 'right')  {
      if (gameBoard[getIndex(user.id) + 1] != 1)  { // Check if index to the right is a wall
        setIndex(user.id, getIndex(user.id) + 1);
        update = true;
      }
    }

    // Send new Player position to all users
    if (update)  { // Server only emits gameBoard update if player movement was valid
      gameBoard[prevIndex] = 0; // Set previous position to blank
      if (getCurrentUser(user.id).playerRole === 1) {
        gameBoard[getIndex(user.id)] = 3;
      }
      else if (getCurrentUser(user.id).playerRole === 2) {
        gameBoard[getIndex(user.id)] = 4;
      }
      else if (getCurrentUser(user.id).playerRole === 3) {
        gameBoard[getIndex(user.id)] = 5;
      }
      else if (getCurrentUser(user.id).playerRole === 4) {
        gameBoard[getIndex(user.id)] = 7;
      }
      io.to(user.lobby).emit('gameUpdate', {
        Lobby: user.lobby,
        users: getLobbyUsers(user.lobby),
        gameBoard: gameBoard
      });
    }
  }); // End handle player movement

  // Lobby chat
  // lobby chat -- normal message
  socket.on('lobbyMessage', ({username, message}) => {
    const user = getCurrentUser(socket.id);
    io.to(user.lobby).emit('message', username + ': ' + message);
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.lobby).emit('message', user.username + ' left the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });
    }
  });// Do not put anything below socket.on(disconnect)
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
