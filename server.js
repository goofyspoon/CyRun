
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
  getQueue,
  setQueue,
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

app.use(express.static('views')); // Set static folder to /views

// Run when client connects
io.on('connection', socket => {
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
      console.log('Lobby: ' + user.lobby + ' | ' + user.username + ' has joined'); // Development purposes only. DELETE THIS

      // Broadcast when a user connects
      socket.broadcast.to(user.lobby).emit('message', user.username + ' joined the lobby');

      // Send users and lobby info
      io.to(user.lobby).emit('lobbyUsers', {
        lobby: user.lobby,
        users: getLobbyUsers(user.lobby)
      });

      if(getLobbyUsers(user.lobby).length == 4) {
        console.log('Lobby: ' + user.lobby + ' | A game has started');
        createGameBoard();
        let users = getLobbyUsers(user.lobby);
        beginGame(user, users);
      }
    } // end else statement
  });

  // Choose a random level (1 or 2) and store a copy of that level as gameBoard
  function createGameBoard()  {
    let choice = Math.floor(Math.random() * (3 - 1)) + 1; // max 2 (exclusive) min 1 (inclusive)
    switch (choice) {
      case 1:
        gameBoard = Constants.LEVEL1.slice(); // copy LEVEL1 in Constants.js
        break;
      case 2:
        gameBoard = Constants.LEVEL2.slice(); // copy LEVEL2 in Constants.js
        break;
    }
    socket.emit('message', 'Map ' + choice + ' selected');
  }

  // Filter gameBoard and remove all stationary (wall) elements. Reduces lag since we are not sending stationary data in every packet
  function removeWalls(gameBoard) {
    return gameBoard != 1;
  }

  // Set the roles and starting positions of each player and begin the game
  function beginGame(user, users)  {
    for (let i = 0; i < 4; i++) {
      setPlayerNum(users[i].id, i + 1);

      if (i < 3) { // Players 0, 1, & 2 are ghosts
          respawn(gameBoard, users[i], false);
          setPrevIndex(users[i].id, getIndex(users[i].id));
          gameBoard[getIndex(users[i].id)] = i + 3;
          setPrevPosType(users[i].id, 8);
        }
      else  { // Last player will be pacman
        var pacmanStart = Math.floor(Math.random() * (292 - 288)) + 288;
        setIndex(users[i].id, pacmanStart);
        setPrevIndex(users[i].id, pacmanStart);
        gameBoard[getIndex(users[i].id)] = 7;
        setPrevPosType(users[i].id, 0);
      }
    }

    // Begin game
    io.to(user.lobby).emit('setRoles', {users: users});
    io.to(user.lobby).emit('loadBoard', ({users: users, gameBoard: gameBoard}));

    gameTimer = new Date();
    game(users, gameBoard);
  }

  // User acknowledged the game ended and left the lobby
  socket.on('ackGameEnd', (id) => {
    userLeave(id);
    socket.disconnect();
  });

  // Constant updates between clients and server (real-time game)
  function game(users, gameBoard) {
    // Iterate through players and determine their new position based on their direction
    users.forEach(user => {
      var update = false;

      if (getQueue(user.id) != 0 && getQueue(user.id) != getDirection(user.id)) { // Check queue direction and act accordingly
        if (getQueue(user.id) == -20)  { // Player is moving up
          if (gameBoard[getIndex(user.id) - 20 ] != 1)  { // Player is not colliding with wall
            update = true;
          }
        }
        else if (getQueue(user.id) == 1)  { // Player is moving to the Right
          if (gameBoard[getIndex(user.id) + 1] != 1)  { // Player is not colliding with wall
            update = true;
          }
        }
        else if (getQueue(user.id) == 20)  { // Player is moving down
          if (gameBoard[getIndex(user.id) + 20 ] != 1)  { // Player is not colliding with wall
            update = true;
          }
        }
        else if (getQueue(user.id) == -1)  { // Player is moving to the left
          if (gameBoard[getIndex(user.id) - 1] != 1)  { // Player is not colliding with wall
              update = true;
            }
          }

        if (update) {// Update user direction and clear queue
          setDirection(user.id, getQueue(user.id));
          setQueue(user.id, 0);
          update = false;
        }
      }
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
          users: getLobbyUsers(user.lobby),
          gameBoard: gameBoard.filter(removeWalls) // Sends array without walls (sending stationary data is pointless and causes lag)
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
      //setPrevPosType(user.id, gameBoard[index]);
      return true;
    } // Player collides with dot or pill
    else if (gameBoard[index] == 6 || gameBoard[index] == 2) {
      if (getCurrentUser(user.id).playerRole == 4)  { // Check if user is pacman
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
        incrementScore(user.id, 1);
        gameBoard[index] = 0; // dot or pill will be replaced with empty space after pacman moves again (prevPosType set after this function in game())
        return true;
      }
      else { // Ghost moved over pill/dot
        //setPrevPosType(user.id, gameBoard[index]);
        return true;
      }
    } // Player collides with another player
    else if (gameBoard[index] == 3 || gameBoard[index] == 4 || gameBoard[index] == 5 || gameBoard[index] == 7) {
      if (getCurrentUser(user.id).playerRole == 4)  {
        if (getStatus(user.id) == 1)  {
          // Pacman collides with (eats) ghost
          incrementScore(user.id, 2);
          var pointUnderGhost = false;
          getLobbyUsers(user.lobby).forEach(user =>  {
            if (index == getIndex(user.id)) {
              // Check to see if ghost was passing over dot or pill. if so, pacman gains points
              if (getPrevPosType(user.id) == 2 || getPrevPosType(user.id) == 6) {
                pointUnderGhost = true;
              }
              respawn(gameBoard, user); // Ghost repawns
            }
          });
          if (pointUnderGhost) incrementScore(user.id, 1);
        }
        else { // Pacman collided with ghost
          getLobbyUsers(user.lobby).forEach((user) => {
            if (index == getIndex(user.id)) {
              incrementScore(user.id, 15); // Ghost killed pacman and increases score
              //setPrevPosType(user.id, 0); // Replace pacman with empty space after ghost moves
            }
          });
          gameBoard[getIndex(user.id)] = 0; // Pacman ran into ghost. Their character disappears
          respawn(gameBoard, user); // Pacman respawns
        }
        return true; // Pacman collided with another player. One of them respawns.
      }
      else { // A ghost collided with another player
        if (gameBoard[index] == 7)  { // A ghost collided with pacman
          if (getStatus(user.id) == 1)  { // Pacman ate a pill and can eat ghosts
            getLobbyUsers(user.lobby).forEach(user =>  {
              if (index == getIndex(user.id)) {
                incrementScore(user.id, 2); // Pacman ate this ghost and increases score
                setPrevPosType(user.id, 0); // Replace ghost with empty space after pacman moves
              }
            });
            respawn(gameBoard, user); // This ghost respawns
          }
          else { // Pacman can't eat ghosts and is killed
            incrementScore(user.id, 15); // Ghost killed pacman
            //setPrevPosType(user.id, 0); // Ensures that ghost does not drop a dot or pill after moving again
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

  // Handle player respawn (default value for gameStart is true since it is only false for one call)
  function respawn(gameBoard, user, gameStart = true)  {
    var foundSpawn = false;
    var spawn = Math.floor(Math.random() * gameBoard.length);
    if (user.playerRole == 4) {
      // choose a random spawn point for Pacman in map
      // ensures that player is not spawning in a wall or play
      while (!foundSpawn)  {
        spawn = Math.floor(Math.random() * gameBoard.length);
        foundSpawn = (gameBoard[spawn] == 0 && spawn != getIndex(user.id)); // Break out of while loop if empty cell (or dot cell) found and not in the same cell
      }
      setPrevPosType(user.id, 0);
    }
    else {
      // Spawn within ghost lair
      while (!foundSpawn)  {
        spawn = Math.floor(Math.random() * gameBoard.length);
        foundSpawn = (gameBoard[spawn] == 8); // Break out of while loop if empty lair cell found
      }
      setPrevPosType(user.id, 8);
    }
    if (gameStart) gameBoard[getIndex(user.id)] = 0; // Replace old position with blank spot (only if game has started)
    setIndex(user.id, spawn);
    setPrevIndex(user.id, getIndex(user.id));
    gameBoard[getIndex(user.id)] = (user.playerRole == 4)? 7: user.playerRole + 2;
    // Player is not moving when they first respawn
    setDirection(user.id, 0);
    setQueue(user.id, 0);
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
    gameTimer = (new Date()) - gameTimer - 5000; // Subtract 5 second delay at beginning of game
    gameTimer /= 1000; //Strip the ms
    gameTimer = Math.round(gameTimer);
    return true;
  }

  // Handle player direction changes (keypresses)
  socket.on('changeDirection', (direction) => {
    const user = getCurrentUser(socket.id);

    if (direction === 'up') setQueue(user.id, -20);
    else if (direction === 'right') setQueue(user.id, 1);
    else if (direction === 'down') setQueue(user.id, 20);
    else if (direction === 'left') setQueue(user.id, -1);
  });

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
