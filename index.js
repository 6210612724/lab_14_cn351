const express = require('express');
const app = express();
const port = 3003;
const bodyParser = require('body-parser');
const argon2 = require('argon2');

const users = [{ username: 'foouser', password: '111', passwordHash: '' }];
users.forEach(function (userObj) {
    argon2.hash(userObj.password).then(function (hash) {
        userObj.passwordHash = hash;
        delete userObj.password;
        console.log('User', userObj.username, 'has password hash', userObj.passwordHash);
    });
});

app.use(bodyParser.json())
app.use(express.static('public'));
app.post('/login', function (req, res) {
    console.log('Got login request with body', req.body);
    if (req.body && req.body.username && req.body.password) {
        const matchingUsers = users.filter(obj => { return obj.username === req.body.username });
        if (matchingUsers.length == 0) {
            console.log('Got POST /login for username not found in user database');
            res.sendStatus(400);
        } else {
            const userObj = matchingUsers[0];
            argon2.verify(userObj.passwordHash, req.body.password).then((success) => {
                if (success) {
                    console.log('Successful hash verification');
                    res.send({ message: 'Success!' });
                } else {
                    console.log('Bad password for user', userObj.username);
                    res.sendStatus(400);
                }
            }).catch((error) => {
                console.log('Unexpected error validating hash:', error);
                res.sendStatus(500);
            });
        }
    } else {
        console.log('Got POST /login without username and password in body');
        res.sendStatus(400);
    }
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));