window.onload = function () {
    document.getElementById('login-button').addEventListener('click', function () {
        const username = document.getElementById('username').value
        const password = document.getElementById('password').value
        const body = JSON.stringify({ username: username, password: password });
        const httpReq = new XMLHttpRequest();
        httpReq.onreadystatechange = function () {
            if (this.readyState === 4 && this.status === 200) {
                document.getElementById('login-error').innerHTML = '';
                document.getElementById('login-result').innerHTML = `Login request succeeded with response ${this.responseText}`;
            } else if (this.readyState === 4) {
                document.getElementById('login-error').innerHTML = `Server responded with error code ${this.status}`;
                document.getElementById('login-result').innerHTML = '';
            }
        };
        httpReq.open('POST', '/login', true);
        httpReq.setRequestHeader('Content-Type', 'application/json');
        httpReq.send(body);
    });
}