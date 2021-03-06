
// Minimal NodeJS + Express server handling user logins and JWT auth tokens

// Load dependencies

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const csurf = require('csurf');

// Port the server will listen on

const port = 3003;

// Initialize Express, tell it to automatically parse Content-Type: application/json body data,
// tell it to automatically parse incoming cookie data, and ask it to generate and check CSRF
// tokens.

const app = express();
app.use(bodyParser.json());
app.use(cookieParser());

// Use the double submit cookie pattern.

const csrfFilter = csurf({ cookie: true, ignoreMethods: [ 'GET', 'HEAD', 'OPTIONS' ] });

// Apply CSRF checking to all routes (except GET/HEAD/OPTIONS routes)

app.use(csrfFilter);

// Add the XSRF-TOKEN header to all responses

app.all("*", function (req, res, next) {
    res.cookie("XSRF-TOKEN", req.csrfToken());
    next();
});

// Give a nice error message when CSRF token checking fails

app.use(function (err, req, res, next) {
    if (err.code !== 'EBADCSRFTOKEN') return next(err);
    res.status(403);
    res.send('Error: invalid CSRF token');
});

// Ask Express to serve static resources from the public/ subdirectory.

app.use(express.static('public'));

// Load RSA public/private keypair for JWT generation and verification, or tell the user
// how to generate them if not found

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

// A hard-coded sample user database using argon2 for password hashing

const users = [{ username: 'foouser', password: '111', passwordHash: '' }];
users.forEach(function (userObj) {
    argon2.hash(userObj.password).then(function (hash) {
        userObj.passwordHash = hash;
        delete userObj.password;
        console.log('User', userObj.username, 'has password hash', userObj.passwordHash);
    });
});


// Generate a JWT for given username that is valid for 6 hours

function generateJwt(username) {
    const expires = new Date().valueOf() + (1000 * 60 * 60 * 6) // 6 hours
    return {
        token: jwt.sign({
            username: username,
            exp: expires,
        }, jwtPrivateKey, { algorithm: 'RS256' }),
        expires: expires
    };
}

// POST /login handler. Verify the username and password, and if successful, respond with a new JWT

app.post('/login', csrfFilter, function (req, res) {
    console.log('Got login request with body', req.body);
    if (req.body && req.body.username && req.body.password) {
        const matchingUsers = users.filter(obj => { return obj.username === req.body.username });
        if (matchingUsers.length === 0) {
            console.log('Got POST /login for username not found in user database');
            res.sendStatus(400);
        } else {
            const userObj = matchingUsers[0];
            argon2.verify(userObj.passwordHash, req.body.password).then((success) => {
                if (success) {
                    console.log('Successful hash verification');
                    const tokenObj = generateJwt(userObj.username);
                    res.cookie('authToken', tokenObj.token, { httpOnly: true, expires: new Date(tokenObj.expires) });
                    res.send({ username: userObj.username });
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

// POST /logout handler

app.post('/logout', function (req, res) {
    if (req.cookies && req.cookies.authToken) {
        const expiration = Date.now() - 60 * 60 * 1000;
        res.cookie('authToken', req.cookies.authToken, { httpOnly: true, expires: new Date(expiration) });
        res.sendStatus(200);
    } else {
        res.sendStatus(400);
    }
});

// Express filter to check authorization header

function checkToken(req, res, next) {
    if (req.cookies && req.cookies.authToken) {
        const token = req.cookies.authToken;
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
    res.sendStatus(403);
}

// Function to look up the secret stored in the user "database" for username

function userSecret(username) {
    const matchingUsers = users.filter(obj => { return obj.username === username });
    if (matchingUsers.length > 0) {
        return matchingUsers[0].secret;
    }
    return null;
}

// GET /secret handler. checkToken() filter is used to ensure the request is authentic.

app.get('/secret', csrfFilter, checkToken, function (req, res) {
    console.log('Request for secret by', req.username);
    res.send({ username: req.username, secret: userSecret(req.username) });
});

// Listen for incoming requests from clients

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));