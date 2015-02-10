var fs = require('fs');
var privateKey  = fs.readFileSync('ssl/server.key', 'utf8');
var certificate = fs.readFileSync('ssl/server.crt', 'utf8');
var options = {key: privateKey, cert: certificate};

// Setup basic express server
var express = require('express');
var app = express();
// var server = require('https').createServer(options, app);

var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

var passport = require('passport'), FacebookStrategy = require('passport-facebook').Strategy;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// passport

passport.use(new FacebookStrategy({
    clientID: "1545227259086169",
    clientSecret: "1cb30a7565c8ecdc367e1f222f62035b",
    callbackURL: "http://livechat-multiplatform.herokuapp.com/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    console.log("username ==> "+ profile.username)
  }
));

// Routing
app.use(express.static(__dirname + '/public'));

// Redirect the user to Facebook for authentication.  When complete,
// Facebook will redirect the user back to the application at
//     /auth/facebook/callback
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook', passport.authenticate('facebook',{scope:'email'}));

// Facebook will redirect the user to this URL after approval.  Finish the
// authentication process by attempting to obtain an access token.  If
// access was granted, the user will be logged in.  Otherwise,
// authentication has failed.
app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/', failureRedirect: '/login' }));

// Chatroom

// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;





// handle Sockets
io.on('connection', function (socket) {
  console.log("entre");
  var addedUser = false;

  // when the client emits 'new message', this listens and executes
  socket.on('new message', function (data) {
    // we tell the client to execute 'new message'
    socket.broadcast.emit('new message', {
      username: socket.username,
      message: data
    });
  });

    socket.on('new message map', function (data) {
    // we tell the client to execute 'new message map'
    console.log(data);
    socket.broadcast.emit('new message map', {
      username: socket.username,
      latitude: data.latitude,
      longitude: data.longitude
    });
  });


  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    // add the client's username to the global list
    usernames[username] = username;
    ++numUsers;
    addedUser = true;
    socket.emit('login', {
      numUsers: numUsers
    });
    // echo globally (all clients) that a person has connected
    socket.broadcast.emit('user joined', {
      username: socket.username,
      numUsers: numUsers
    });
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function () {
    socket.broadcast.emit('typing', {
      username: socket.username
    });
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function () {
    socket.broadcast.emit('stop typing', {
      username: socket.username
    });
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    // remove the username from global usernames list
    if (addedUser) {
      delete usernames[socket.username];
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
});
