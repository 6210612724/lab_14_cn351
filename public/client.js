let currentRoute = '/login';

window.addEventListener('popstate', function (event) {
    changeRoute(event.state);
});

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
    httpReq.send(body);
}

window.onload = function () {
    changeRoute('/login');
    document.getElementById('login-button').addEventListener('click', function () {
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const body = JSON.stringify({ username: username, password: password });
        post('/login', body, 'login-error', function (res) {
            sessionStorage.setItem('username', res.username);
            sessionStorage.setItem('token', res.token);
            changeRoute('/secret');
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