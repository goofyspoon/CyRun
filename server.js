const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client = redis.createClient();
const router = express.Router();
const app = express();

app.use(session({
    secret: 'ssshhhhh',
    //Create a new redis store:
    store: new redisStore({ host: 'localhost', port: 6379, client: client, ttl : 260}),
    saveUninitialized: false,
    resave: false
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(__dirname + '/views'));

router.get('/', (req, res) => {
    let sess = req.session;
    if(sess.username){
        return res.redirect('/lobby');
    }
    res.sendFile('index.html');
});

router.post('/username', (req, res) => {
    req.session.username = req.body.username;
    console.log("At /username");
    res.end('done');
});

router.get('/lobby', (req, res) => {
    if(req.session.username){
        res.write(`<h1>Welcome to Game Lobby,  ${req.session.username} </h1><br>`);
        res.end('<a href='+'/logout'+'>Logout</a>');
    }else{
        res.write('<h1>Please enter username first.</h1>');
        res.end('<a href='+'/'+'>Login</a>');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if(err){
            return console.log(err);
        }
        res.redirect('/');
    });
});

app.use('/', router);

app.listen(process.env.PORT || 3000, () => {
    console.log(`App Started on PORT ${process.env.PORT || 3000}`);
});
