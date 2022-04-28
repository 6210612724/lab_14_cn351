const express = require('express');
const app = express();
const port = 3003;
const bodyParser = require('body-parser');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const fs = require('fs');

const users = [{ username: 'foouser', password: '111', passwordHash: '' }];
users.forEach(function (userObj) {
    argon2.hash(userObj.password).then(function (hash) {
        userObj.passwordHash = hash;
        delete userObj.password;
        console.log('User', userObj.username, 'has password hash', userObj.passwordHash);
    });
});


let jwtPrivateKey = null;
let jwtPublicKey = null;
try {
    jwtPrivateKey = fs.readFileSync('jwt_priv.pem');
    jwtPublicKey = fs.readFileSync('jwt_pub.pem');
} catch (e) {
    // Need to generate public/private keypair for JWT
    console.log('Need to generate key! Run the following commands:');
    console.log('openssl genrsa -des3 -out jwt.pem -passout pass:foobar 2048');
    console.log('openssl rsa -in jwt.pem -outform PEM -pubout -out jwt_pub.pem -passin pass:foobar');
    console.log('openssl rsa -in jwt.pem -outform PEM -out jwt_priv.pem -passin pass:foobar');
    console.log('rm -f jwt.pem');
    throw new Error('Generate RSA keys first');
}


function generateJwt(username) {
    return jwt.sign({
        username: username,
        exp: new Date().valueOf() + (1000 * 60 * 60 * 6) // 6 hours
    }, jwtPrivateKey, { algorithm: 'RS256' });
}

function checkToken(req, res, next) {
    if (req.headers && req.headers.authorization) {
        const headerValues = req.headers.authorization.split(' ');
        if (headerValues.length === 2) {
            const token = headerValues[1];
            jwt.verify(token, jwtPublicKey, function (error, payload) {
                if (error) {
                    console.log('Error decoding JWT:', error);
                    res.sendStatus(403);
                } else {
                    const dateNow = Date.now();
                    if (dateNow < payload.exp) {
                        // You might want to regenerate the token with a fresh expiration here.
                        console.log('Verified JWT for user', payload.username);
                        req.username = payload.username;
                        next();
                    } else {
                        console.log('Expired token for user', payload.username);
                        res.sendStatus(403);
                    }
                }
            });
            return;
        }
    }
    res.sendStatus(403);
}

function userSecret(username) {
    const matchingUsers = users.filter(obj => { return obj.username === username });
    if (matchingUsers.length > 0) {
        return matchingUsers[0].secret;
    }
    return null;
}


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
                    res.send({
                        username: userObj.username,
                        token: generateJwt(userObj.username)
                    });
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

app.get('/secret', checkToken, function (req, res) {
    console.log('Request for secret by', req.username);
    res.send({ username: req.username, secret: userSecret(req.username) });
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));