var io = require('socket.io-client'),
    assert = require('assert'),
    expect = require('chai').expect,
    serverJs = require('./server.js');

describe('Socketio tests', function() {

    var socket;

    beforeEach(function(done) {
        // Setup
        document.body.innerHTML = '<form action="lobby.html">' +
        ' <input class="form-control" type="text" size="40" placeholder="Type your username" id="username" name="username" required><br />' +
        '<input class="form-control" type="text" size="40" placeholder="Type the name of the game lobby" id="gamelobby" name="lobby" required></br /> ' +
        '<button type="submit" id="submit" class="btn btn-primary">Join lobby</button>' +
        '</form>';
        socket = io.connect('http://localhost:3000', {
            'reconnection delay' : 0,
            'reopen delay' : 0,
            'force new connection' : true
        });
        socket.on('connect', function() {
            console.log('socket connected');
            done();
        });
        socket.on('disconnect', function() {
            console.log('socket disconnected');
        })
    });

    afterEach(function(done) {
        // Cleanup
        if(socket.connected) {
            console.log('disconnecting...');
            socket.disconnect();
        } else {
            // There will not be a connection unless you have done() in beforeEach, socket.on('connect'...)
            console.log('no connection to break...');
        }
        done();
    });

    describe('Testing user entrance (joining a lobby)', function() {

        it('Testing username input', function(done) {
           var test = false;
            document.getElementById('username').value = 'test Username';
            if (document.getElementById('username').value === 'test Username') {
              test = true;
            }
            expect(test).to.be.true
            done();
        });

        it('Testing lobby name input', function(done)  {
          var test = false;
          document.getElementById('gamelobby').value = 'test lobby';
          if (document.getElementById('gamelobby').value === 'test lobby') test = true;
          expect(test).to.be.true;
          done();
        });
    });

});
