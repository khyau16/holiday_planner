const path = require('path');

const express = require('express');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);

const plannerRoutes = require('./routes/planner');

const app = express();

const sessionStore = new MySQLStore({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'rootuser',
    database: 'holiday_planner'
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({extended: true}));
app.use(express.static('public'));

app.use(session({
    secret: 'ThisIsASecretKey',
    resave: false,
    saveUninitialized: false,
    store: sessionStore
}));

app.use(plannerRoutes);

app.listen(3000);