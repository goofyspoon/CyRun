
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
  getIndex,
  setIndex,
  getDirection,
  setDirection,
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
var gameTimer;
var gameUpdateTimer;
var statusTimer;

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
      socket.join(user.lobby);

      // Welcome current user to lobby
      socket.emit('message', 'Welcome to CyRun lobby ' + user.lobby);
      console.log("User "+ user.username+ " joined."); // Development purposes only. DELETE THIS

      // Broadcast when a user connects
      socket.broadcast.to(user.lobby).emit('message', user.username + ' joined the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });

      if(getLobbyUsers(user.lobby).length == 4) {
        createGameBoard();
        let users = getLobbyUsers(user.lobby);
        beginGame(user, users);
      }
    } // end else statement
  });

  // Choose a random level (1 or 2) and store a copy of that level as gameBoard
  function createGameBoard()  {
    let choice = Math.floor(Math.random() * (3 - 1)) + 1; // max 2 (exclusive) min 1 (inclusive)
    socket.emit('message', 'Map ' + choice + ' selected');
    switch (choice) {
      case 1:
        gameBoard = Constants.LEVEL1.slice(); // copy LEVEL1 in Constants.js
        break;
      case 2:
        gameBoard = Constants.LEVEL2.slice();
        break;
    }
  }

  // Set the roles and starting positions of each player and begin the game
  function beginGame(user, users)  {
    for (let i = 0; i < 4; i++) {
      setPlayerNum(users[i].id, i + 1);
      setDirection(users[i].id, 0);

    if (i < 3) { // Players 0, 1, & 2 are ghosts
        respawn(gameBoard, users[i]);
        setPrevIndex(users[i].id, getIndex(users[i].id));
        gameBoard[getIndex(users[i].id)] = i + 3;
        setPrevPosType(users[i].id, 8);
      } else  { // Last player will be pacman
        var pacmanStart = Math.floor(Math.random() * (292 - 288)) + 288;
        setIndex(users[i].id, pacmanStart);
        setPrevIndex(users[i].id, pacmanStart);
        gameBoard[getIndex(users[i].id)] = 7;
        setPrevPosType(users[i].id, 0);
      }
  }

  // Begin game
  io.to(user.lobby).emit('setRoles', {users : users});
  io.to(user.lobby).emit('drawGameBoard', ({users: users, gameBoard: gameBoard}));

  gameTimer = new Date();
  game(users, gameBoard);
  console.log('Beginning game');
  }

  // Constant updates between clients and server (real-time game)
  function game(users, gameBoard) {
    users.forEach(user => {
      var update = false;

      if (getDirection(user.id) == -20)  { // Player is moving up
        if (checkCollisions(gameBoard, (getIndex(user.id) - 20), user)) {
          if (gameBoard[getIndex(user.id) - 20 ] != 1)  { // Player is not colliding with wall
            setIndex(user.id, (getIndex(user.id) - 20));
            update = true;
          }
        }
      }
      else if (getDirection(user.id) == 1)  { // Player is moving to the Right
        if (getIndex(user.id) == 239) { // Player is passing through portal on right side
          if (checkCollisions(gameBoard, 220, user)) {
            setIndex(user.id, 220);
            setDirection(user.id, 1);
            update = true;
          }
        }
        else if (checkCollisions(gameBoard, (getIndex(user.id) + 1), user))  {
          if (gameBoard[getIndex(user.id) + 1] != 1)  { // Player is not colliding with wall
            setIndex(user.id, (getIndex(user.id) + 1));
            update = true;
          }
        }
      }
      else if (getDirection(user.id) == 20)  { // Player is moving down
        if (checkCollisions(gameBoard, (getIndex(user.id) + 20), user)) {
          if (gameBoard[getIndex(user.id) + 20 ] != 1)  { // Player is not colliding with wall
            setIndex(user.id, (getIndex(user.id) + 20));
            update = true;
          }
        }
      }
      else if (getDirection(user.id) == -1)  { // Player is moving to the left
        if (getIndex(user.id) == 220) { // Player is passing through portal on right side
          if (checkCollisions(gameBoard, 239, user)) {
            setIndex(user.id, 239);
            setDirection(user.id, -1);
            update = true;
          }
        }
        else if (checkCollisions(gameBoard, (getIndex(user.id) - 1), user))  {
          if (gameBoard[getIndex(user.id) - 1] != 1)  { // Player is not colliding with wall
            setIndex(user.id, (getIndex(user.id) - 1));
            update = true;
          }
        }
      }

      if (update) {
        gameBoard[getPrevIndex(user.id)] = getPrevPosType(user.id);
        setPrevPosType(user.id, gameBoard[getIndex(user.id)]);
        setPrevIndex(user.id, getIndex(user.id));
        gameBoard[getIndex(user.id)] = (user.playerRole == 4)? 7: user.playerRole + 2;
        io.to(user.lobby).emit('gameUpdate', {
          lobby: user.lobby,
          users: getLobbyUsers(user.lobby),
          gameBoard: gameBoard
        });
      }
    }); // End forEach

    if (checkGameStatus(gameBoard))  { // Check if game is over and respond accordingly
      io.to(users[0].lobby).emit('gameOver', {
        lobby: users[0].lobby,
        users: getLobbyUsers(users[0].lobby),
        gameTime: gameTimer
      });
      clearInterval(gameUpdateTimer);
    }
    else {
      clearInterval(gameUpdateTimer);
      gameUpdateTimer = setInterval(function() {game(users, gameBoard);}, 220); //Loop function
    }
  }

  // Handle player movement over a pill or dot. Returns false if two ghosts run into each other
  function checkCollisions(gameBoard, index, user) {
    // First check if player is colliding with nothing
    if (gameBoard[index] == 0 || (gameBoard[index] == 8 && user.playerRole != 4)) {
      setPrevPosType(user.id, gameBoard[index]);
      return true;
    } // Player collides with dot or pill
    else if (gameBoard[index] == 6 || gameBoard[index] == 2) {
      if (getCurrentUser(user.id).playerRole == 4)  { // Check if user is pacman
        incrementScore(user.id, 1);
        if (gameBoard[index] == 6) { // pacman consumed pill
          statusTimer = setTimeout(() => statusChange(user), 10000);
          if (user.status == 0) {
            statusChange(user); // change status (ghosts edible)
            statusChange(statusTimer); // change status with timer
          }
          else { // Pacman recently consumed pill. Reset timer
            clearTimeout(statusTimer);
            statusChange(statusTimer);
          }
        }
        setPrevPosType(user.id, 0); // dot or pill will be replaced with empty space after pacman moves again
        return true;
      }
      else { // Ghost moved over pill/dot
        setPrevPosType(user.id, gameBoard[index]);
        return true;
      }
    } // Player collides with another player
    else if (gameBoard[index] == 3 || gameBoard[index] == 4 || gameBoard[index] == 5 || gameBoard[index] == 7) {
      if (getCurrentUser(user.id).playerRole == 4)  {
        if (getStatus(user.id) == 1)  {
          // Pacman collides with (eats) ghost
          incrementScore(user.id, 5);
          getLobbyUsers(user.lobby).forEach(user =>  {
            if (index == getIndex(user.id)) {
              respawn(gameBoard, user); // Ghost repawns
            }
          });
        }
        else { // Pacman collided with ghost
          getLobbyUsers(user.lobby).forEach((user) => {
            if (index == getIndex(user.id)) {
              incrementScore(user.id, 10); // Ghost killed pacman and increases score
            }
          });
          gameBoard[getPrevIndex(user.id)] = 0; // Pacman ran into ghost. Old index is set to blank
          respawn(gameBoard, user); // Pacman respawns
        }
        return true; // Pacman collided with another player. One of them respawns.
      }
      else { // A ghost collided with another player
        if (gameBoard[index] == 7)  { // A ghost collided with pacman
          if (getStatus(user.id) == 1)  { // Pacman ate a pill and can eat ghosts
            getLobbyUsers(user.lobby).forEach(user =>  {
              if (index == getIndex(user.id)) {
                incrementScore(user.id, 5); // Pacman ate this ghost
              }
            });
            respawn(gameBoard, user); // This ghost respawns
          }
          else { // Pacman can't eat ghosts and is killed
            incrementScore(user.id, 10); // Ghost killed pacman
            setPrevPosType(user.id, 0); // Ensures that ghost does not drop a dot or pill after moving again
            getLobbyUsers(user.lobby).forEach(user => {
              if (index == getIndex(user.id)) {
                respawn(gameBoard, user); // Pacman respawns
              }
            });
          }
          return true; // Ghost collided with pacman. one of them respawns.
        }
        else { // Lastly, a ghost collides with another ghost
          getLobbyUsers(user.lobby).forEach(user => {
            if (index == getIndex(user.id)) {
                return false; // no update made between these two players
            }
          });
        }
      }
    }
    else if (gameBoard[index] == 1 || (gameBoard[index] == 8 && getCurrentUser(user.id).playerRole == 4)) {
      setDirection(user.id, 0); // Player is no longer moving when they run into wall
      return false; // No update made since player ran into wall
    }
  }

  // Handle player respawn
  function respawn(gameBoard, user)  {
    var foundSpawn = false;
    if (user.playerRole == 4) {
      // choose a random spawn point for Pacman in map
      // ensures that player is not spawning in a wall or play
      var spawn = Math.floor(Math.random() * gameBoard.length);
      while (!foundSpawn)  {
        spawn = Math.floor(Math.random() * gameBoard.length);
        foundSpawn = (gameBoard[spawn] == 0 && spawn != getIndex(user.id)); // Break out of while loop if empty cell (or dot cell) found and not in the same cell
      }
      setIndex(user.id, spawn);
      setPrevPosType(user.id, 0);
    }
    else {
      // Spawn within middle ghost area (indices: min: 188, max: 251)
      var spawn = Math.floor(Math.random() * gameBoard.length);
      while (!foundSpawn)  {
        spawn = Math.floor(Math.random() * gameBoard.length);
        foundSpawn = (gameBoard[spawn] == 8); // Break out of while loop if empty lair cell found
      }
      setIndex(user.id, spawn);
      setPrevPosType(user.id, 8);
    }
    setPrevIndex(user.id, getIndex(user.id));
    gameBoard[getIndex(user.id)] = (user.playerRole == 4)? 7: user.playerRole + 2;
    setDirection(user.id, 0); // Player is not moving when they first respawn
  }

  // Handle Pacman eating a pill and becoming super
  function statusChange(user)  {
    getLobbyUsers(user.lobby).forEach((user) =>   {
      if (getStatus(user.id) == 0)  {
        setStatus(user.id, 1); // Ghosts are edible and Pacman has pill effect
      }
      else {
        setStatus(user.id, 0); // Ghosts are not edible and pacman doesn't have pill effect
      }
    });
  }

  // check the status of the game (pacman collected all dots/pills or not)
  function checkGameStatus(gameBoard) {
    for (var i = 0; i < gameBoard.length; i++) {
      if (gameBoard[i] == 2 || gameBoard[i] == 6)  {
        return false;
      }
    }
    // Game is over, record how long game was and return true
    gameTimer = (new Date()) - gameTimer;
    gameTimer /= 1000; //Strip the ms
    gameTimer = Math.round(gameTimer);
    return true;
  }

  // Handle player direction changes (keypresses). Collision handling is done within the game() function
  socket.on('changeDirection', (direction) => {
    const user = getCurrentUser(socket.id);
    // Set the user (server-side) direction to direction from parameter.
    // Only sets the users direction if the user is not trying to move into a wall
    if (direction === 'up' && gameBoard[getIndex(user.id) - 20] != 1) setDirection(user.id, -20);
    else if (direction === 'right' && gameBoard[getIndex(user.id) + 1] != 1) setDirection(user.id, 1);
    else if (direction === 'down' && gameBoard[getIndex(user.id) + 20] != 1) setDirection(user.id, 20);
    else if (direction === 'left' && gameBoard[getIndex(user.id) - 1] != 1) setDirection(user.id, -1);
  }); // End handle player movement

  // Lobby chat
  // lobby chat -- normal message
  socket.on('lobbyMessage', ({username, message}) => {
    const user = getCurrentUser(socket.id);
    io.to(user.lobby).emit('message', username + ': ' + message);
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    clearInterval(gameUpdateTimer); // Stop constant server-client communication
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
