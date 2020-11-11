
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
  getPrevIndex,
  setPrevIndex,
  getPrevPosType,
  setPrevPosType,
  getStatus,
  setStatus,
  getScore,
  incrementScore
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
        setIndex(users[i].id, 209);
        console.log("Setting " + users[i].username + " as red ghost.");
      //Second player will start at middle ghost spot
      } else if (i == 1)  {
        setIndex(users[i].id, 210);
        console.log("Setting " + users[i].username + " as blue ghost.");
      //Third player will start at right ghost spot
      } else if (i == 2)  {
        setIndex(users[i].id, 211);
        console.log("Setting " + users[i].username + " as orange ghost.");
      //Last player will be pacman
      } else  {
        setIndex(users[i].id, 290);
        console.log("Setting " + users[i].username + " as pacman.");
      }
  }

  io.to(user.lobby).emit('setRoles', {users : users});
  createGameBoard();
  io.to(user.lobby).emit('drawGameBoard', ({gameBoard}));
  //gameloop();
  }

  function createGameBoard()  {
    gameBoard = Constants.LEVEL1.slice(); // copy LEVEL1 in Constants.js
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

  // Handle player movement over a pill or dot. Returns false if two ghosts run into each other
  function checkCollisions(gameBoard, index, user) {
    // First check if player is colliding with nothing
    if (gameBoard[index] == 0 || gameBoard[index] == 8) {
      console.log("player colliding with nothing!");
      setPrevPosType(user.id, gameBoard[index]);
    }
    // Player collides with dot or pill
    else if (gameBoard[index] == 6 || gameBoard[index] == 2) {
      if (getCurrentUser(user.id).playerRole == 4)  { // Check if user is pacman
        incrementScore(user.id, 1);
        if (gameBoard[index] == 6) { // pacman consumed pill
          console.log("pacman consumed pill!");
          getLobbyUsers(user.id).forEach((user) =>   {
            setStatus(user.id, 1); // Ghosts are edible and Pacman has pill effect
          });
        }
        setPrevPosType(user.id, 0); // dot or pill will be replaced with empty space after pacman moves again
      }
      else { // Ghost moved over pill/dot
        console.log("ghost moved over pill or dot");
        setPrevPosType(user.id, gameBoard[index]);
      }
    }
    // Player collides with another player
    else if (gameBoard[index] != 0 || gameBoard[index] != 8) {
      if (getCurrentUser(user.id).playerRole == 4)  {
        if (getStatus(user.id) == 1)  {
          // Pacman eats ghost
          incrementScore(user.id, 5);
          getLobbyUsers(user.id).forEach(user =>  {
            if (index == getIndex(user.id)) {
              respawn(user); // Ghost repawns
            }
          });
        }
        else {
          // Pacman ran into ghost
          getLobbyUsers(user.id).forEach((user) => {
            if (index == getIndex(user.id)) {
              incrementScore(user.id, 10); // Ghost killed pacman
            }
          });
          respawn(user); // Pacman respawns
        }
      }
      else {
        // A ghost collided with pacman
        if (gameBoard[index] == 7)  {
          // Pacman ate a pill and can eat ghosts
          if (getStatus(user.id) == 1)  {
            getLobbyUsers(user.id).forEach(user =>  {
              if (index == getIndex(user.id)) {
                incrementScore(user.id, 5); // Pacman ate this ghost
              }
            });
            respawn(user); // This ghost respawns
          }
          // Pacman can't eat ghosts and is killed
          else {
            incrementScore(user.id, 10); // Ghost killed pacman
            getLobbyUsers(user.id).forEach(user => {
              if (index == getIndex(user.id)) {
                respawn(user);
              }
            });
          }
        }
        // Lastly, a ghost collides with another ghost
        else {
          getLobbyUsers(user.id).forEach(user => {
            if (index == getIndex(user.id)) {
                return false; // no update made between these two players
            }
          });
        }
      }
    }
    return true;
  }

  // Handle player respawn
  function respawn(user)  {
    console.log("respawn funtion called on: " + user.username);
    // TODO
    // Will ensure player has an open spot to spawn (ghosts spawn in middle and pacman spawns randomly)
  }


  // Handle player movement
  socket.on('changeDirection', (direction) => {
    const user = getCurrentUser(socket.id);
    const prevType = getPrevPosType(user.id);
    console.log("prevType: " + prevType);
    var update = false;
    if (direction === 'up') {
      if (getIndex(user.id) > 19) { // Check that user is not in top row (there exists an index above)
        if (gameBoard[getIndex(user.id) - 20] != 1) { // Check if index above is a wall
          if (checkCollisions(gameBoard, (getIndex(user.id) - 20), user)) {
            setIndex(user.id, getIndex(user.id) - 20);
            update = true;
          }
        }
      }
    }
    else if (direction === 'down') {
      if (getIndex(user.id) < 439) { // Check that user is not in bottom row (there exists an index below)
        if (gameBoard[getIndex(user.id) + 20] != 1) { // Check if index below is a wall
          if (checkCollisions(gameBoard, (getIndex(user.id) + 20), user)) {
            setIndex(user.id, getIndex(user.id) + 20);
            update = true;
          }
        }
      }
    }
    else if (direction === 'left') {
      if (gameBoard[getIndex(user.id) - 1] != 1)  { // Check if index to the left is a wall
        if (checkCollisions(gameBoard, (getIndex(user.id) - 1), user))  {
          setIndex(user.id, getIndex(user.id) - 1);
          update = true;
        }
      }
    }
    else if (direction === 'right')  {
      if (gameBoard[getIndex(user.id) + 1] != 1)  { // Check if index to the right is a wall
        if (checkCollisions(gameBoard, (getIndex(user.id) + 1), user))  {
          setIndex(user.id, getIndex(user.id) + 1);
          update = true;
        }
      }
    }

    // Send new Player position to all users
    if (update)  { // Server only emits gameBoard update if player movement was valid
      gameBoard[getPrevIndex(user.id)] = prevType; // Set previous position to blank
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

      setPrevIndex(user.id, getIndex(user.id));
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
