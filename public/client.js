let currentRoute = '/login';

window.addEventListener('popstate', function (event) {
    changeRoute(event.state);
});

function getCookieValue(name) {
    const val = document.cookie.match('(^|[^;]+)\\s*' + name + '\\s*=\\s*([^;]+)');
    return val ? val.pop() : '';
}

function post(uri, body, errorElement, successCallback) {
    const httpReq = new XMLHttpRequest();
    httpReq.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            if (successCallback) {
                successCallback(JSON.parse(this.responseText));
            }
        } else if (this.readyState === 4) {
            if (errorElement) {
                document.getElementById(errorElement).innerHTML = `Server responded with error code ${this.status}`;
            }
        }
    };
    httpReq.open('POST', uri, true);
    httpReq.setRequestHeader('Content-Type', 'application/json');
    httpReq.setRequestHeader('X-XSRF-TOKEN', getCookieValue('XSRF-TOKEN'));
    httpReq.send(body);
}

function get(uri, errorElement, successCallback) {
    const httpReq = new XMLHttpRequest();
    httpReq.onreadystatechange = function () {
        if (this.readyState === 4 && this.status === 200) {
            if (successCallback) {
                successCallback(JSON.parse(this.responseText));
            }
        } else if (this.readyState === 4) {
            if (errorElement) {
                document.getElementById(errorElement).innerHTML = `Server responded with error code ${this.status}`;
            }
        }
    };
    httpReq.open('GET', uri, true);
    httpReq.send();
}


window.onload = function () {

    changeRoute('/login');

    document.getElementById('login-button').addEventListener('click', function () {
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const body = JSON.stringify({ username: username, password: password });
        post('/login', body, 'login-error', function (res) {
            sessionStorage.setItem('username', res.username);
            changeRoute('/secret');
        });
    });

    document.getElementById('logout-button').addEventListener('click', function () {
        sessionStorage.clear();
        post('/logout', null, 'error', null);
        changeRoute('/login');
    });

    document.getElementById('fetch-secret-button').addEventListener('click', function () {
        document.getElementById('error').innerHTML = '';
        document.getElementById('secret').innerHTML = '';
        get('/secret', 'error', function (response) {
            document.getElementById('secret').innerHTML = response.secret;
        });
    });

}



function displayLogin() {
    document.getElementById('login-error').innerHTML = '';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    document.getElementById('login-result').innerHTML = '';
    document.getElementById('secret-div').style.display = 'none';
    document.getElementById('login-div').style.display = 'block';
}

function displaySecretView() {
    document.getElementById('secret').innerHTML = '';
    document.getElementById('error').innerHTML = '';
    document.getElementById('secret-div').style.display = 'block';
    document.getElementById('login-div').style.display = 'none';
}

// Function to change to a different view within the application. Currently we have just 2 views.

function changeRoute(uri) {
    switch(uri) {
        case '/login':
            displayLogin();
            window.history.pushState(currentRoute, 'Minimal JWT - Login', '/login');
            break;
        case '/secret':
            displaySecretView();
            window.history.pushState(currentRoute, 'Minimal JWT - Secret', '/secret');
            break;
        default:
            throw new Error('Unknown route');
    }
    currentRoute = uri;
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

