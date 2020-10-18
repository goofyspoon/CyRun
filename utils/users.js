const users = [];

//Join user
function userJoin(id, username, lobby)  {
  const user = {id, username, lobby};

  users.push(user);

  return user;
}

// Get current user
function getCurrentUser(id) {
  return users.find(user => user.id === id);
}

// User leaves lobby
function userLeave(id)  {
  const index = users.findIndex(user => user.id === id);

  if (index !== -1) {
    return users.splice(index, 1)[0];
  }
}

//Get lobby Users
function getLobbyUsers(lobby) {
  return users.filter(user => user.lobby === lobby);
}

module.exports = {
  userJoin,
  getCurrentUser,
  userLeave,
  getLobbyUsers
};
