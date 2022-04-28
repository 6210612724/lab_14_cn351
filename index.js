const express = require('express');
const app = express();
const port = 3003;
const bodyParser = require('body-parser');

app.use(bodyParser.json())
app.use(express.static('public'));
app.post('/login', function (req, res) {
    console.log('Got login request with body', req.body);
    if (req.body && req.body.username && req.body.password) {
        res.send({ message: 'Hello!' });
    } else {
        res.sendStatus(400);
    }
});

app.listen(port, () => console.log(`Listening at http://localhost:${port}`));