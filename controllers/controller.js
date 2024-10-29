const moment = require('moment');
const validator = require('validator');
const bcrypt = require('bcrypt');
const pdf = require('html-pdf');

const checkSuitability = require('../check-suitability');
const db = require('../data/database');

const getHome = (req, res) => {
    const signupError = Object.values(req.query).includes('signup');
    const loginError = Object.values(req.query).includes('login');

    res.render('../views/index', { signupError, loginError });
}

const getTrips = async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('You are not authenticated.')
    }

    const query = `
    SELECT customers.id AS customer_id, customers.name AS customer_name,
    plans.customer_language, plans.country, plans.datetime, plans.total_people, plans.suitability,
    plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance, plans.id AS plan_id
    FROM customers
    INNER JOIN plans ON customers.id = plans.customer_id
    `;

    const [trips] = await db.query(query);

    for (const trip of trips) {
        trip.formattedDatetime = moment(trip.datetime).format('DD/MM/YYYY');
    }

    let order = req.query.order;
    let nextOrder = 'desc';

    if (order !== 'asc' && order !== 'desc') {
        order = 'asc';
    }

    if (order === 'desc') {
        nextOrder = 'asc';
    }

    trips.sort((trip1, trip2) => {
        if (order === 'asc' && trip1.datetime > trip2.datetime) {
            return 1;
        } else if (order === 'desc' && trip2.datetime > trip1.datetime) {
            return 1;
        }
        return -1;
    });


    res.render('../views/trips', { trips: trips, nextOrder: nextOrder });
}

const searchTrips =  async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('You are not authenticated.')
    }
    const query = `
    SELECT customers.id AS customer_id, customers.name AS customer_name,
    plans.customer_language, plans.country, plans.datetime, plans.total_people, plans.suitability,
    plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance, plans.id AS plan_id
    FROM customers
    INNER JOIN plans ON customers.id = plans.customer_id
    WHERE customers.id = ?
    `;

    const [trips] = await db.query(query, [req.body.id]);

    for (const trip of trips) {
        trip.formattedDatetime = moment(trip.datetime).format('DD/MM/YYYY');
    }

    let order = req.query.order;
    let nextOrder = 'desc';

    if (order !== 'asc' && order !== 'desc') {
        order = 'asc';
    }

    if (order === 'desc') {
        nextOrder = 'asc';
    }

    trips.sort((trip1, trip2) => {
        if (order === 'asc' && trip1.datetime > trip2.datetime) {
            return 1;
        } else if (order === 'desc' && trip2.datetime > trip1.datetime) {
            return 1;
        }
        return -1;
    });

    res.render('../views/trips', { trips: trips, nextOrder: nextOrder });

}

const getAddPlan = (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('You are not authenticated.')
    }
    const errorMessage = Object.values(req.query).includes('error')

    res.render('../views/add-plan', { errorMessage, errorMessage });
}

const addPlan = async (req, res) => {
    try {

        const currentDate = new Date();
        const inputDate = new Date(req.body.datetime);
        if (inputDate < currentDate) {
            return res.redirect('/addplan?message=error');
        }

        const suitability = await checkSuitability(req.body.language, req.body.country);

        const accommodation = req.body.accommodation === 'true';
        const transport = req.body.transport === 'true';
        const entertainment = req.body.entertainment === 'true';
        const meal = req.body.meal === 'true';
        const insurance = req.body.insurance === 'true';

        const data = [
            parseInt(req.session.user.id),
            req.body.language,
            req.body.country,
            req.body.datetime,
            req.body.numberOfTraveller,
            suitability,
            accommodation,
            transport,
            entertainment,
            meal,
            insurance
        ]

        const query = `
        INSERT INTO plans 
        (customer_id, customer_language, country, 
        datetime, total_people, suitability, accommodation,
        transport, entertainment, meal, insurance) VALUES (?)`;

        await db.query(query, [data]);

        return res.redirect('/trips');
    } catch (err) {
        return res.status(500).send('database error');
    }
}

const getProfile = async (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('You are not authenticated.')
    }

    const tripQuery = `
    SELECT customers.id AS customer_id, customers.name AS customer_name, customers.phone, customers.email,
    plans.customer_language, plans.country, plans.datetime, plans.total_people, plans.suitability,
    plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance, plans.id AS plan_id
    FROM customers
    INNER JOIN plans ON customers.id = plans.customer_id
    WHERE customers.id = ?
    `;

    const userQuery = `
    SELECT customers.id AS customer_id, customers.name AS customer_name, customers.phone, customers.email
    FROM customers
    WHERE customers.id = ?
    `;

    const [trips] = await db.query(tripQuery, [req.session.user.id]);
    const [user] = await db.query(userQuery, [req.session.user.id]);

    for (const trip of trips) {
        trip.formattedDatetime = moment(trip.datetime).format('DD/MM/YYYY');
    }

    res.render('../views/profile', { trips: trips, user: user });
}

const signup = async (req, res) => {
    const hashedpassword = await bcrypt.hash(req.body.password, 8);
    const { name, email, phone, password } = req.body;

    const existingUser = await db.query('SELECT * FROM customers WHERE email = ?', [req.body.email]);
    if (
        existingUser[0].length !== 0 ||
        !validator.isEmail(email) ||
        !validator.isMobilePhone(phone)
    ) {
        console.log('Please check your information.');
        return res.redirect('/?error=signup');
    }

    const data = [
        req.body.name,
        req.body.email,
        req.body.phone,
        hashedpassword,
    ]
    await db.query('INSERT INTO customers (name, email, phone, password) VALUE (?)', [data]);
    res.redirect('/');
}

const login =  async (req, res) => {
    const email = req.body.email;

    const result = await db.query('SELECT * FROM customers WHERE email = ?', [email], (error, results) => {
        if (error) {
            console.log('Database error');
            return res.redirect('/?error=login');
        }
    })

    if (result[0].length === 0) {
        console.log('Incorrect email');
        return res.redirect('/?error=login');
    }

    const user = result[0][0];

    const isMatch = await bcrypt.compare(req.body.password, user.password);

    if (!isMatch) {
        console.log('Incorrect password');
        return res.redirect('/?error=login');
    }

    req.session.user = { id: user.id.toString(), email: user.email };
    req.session.isAuthenticated = true;
    req.session.save(function () {
        res.redirect('/trips');
    });
}

const logout = (req, res) => {
    req.session.user = null;
    req.session.isAuthenticated = false;
    res.redirect('/');
}

const getInvoice = async (req, res) => {

    const query = `
    SELECT customers.name, customers.phone, customers.email, plans.id AS invoice_id, 
    plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance
    FROM customers
    INNER JOIN plans ON customers.id = plans.customer_id
    WHERE plans.id = ?
    `
    const [invoice] = await db.query(query, [req.params.id]);

    const date = moment(new Date()).format('DD/MM/YYYY');

    let total = 0;
    
    if(invoice[0].accommodation){
        total += 150;
    }

    if(invoice[0].transport){
        total += 50;
    }

    if(invoice[0].entertainment){
        total += 100;
    }

    if(invoice[0].meal){
        total += 60;
    }

    if(invoice[0].insurance){
        total += 30;
    }

    const subtotal = total += 25;

    const tax = subtotal*8/100;

    const totalDue = subtotal + tax;

    res.render('../views/pdf-template.hbs',
        {
            invoice: invoice[0], 
            date:date, 
            subtotal: subtotal.toFixed(2), 
            tax: tax.toFixed(2), 
            totalDue: totalDue.toFixed(2)
        } ,
        (err, html) => {
        if (err) {
            console.log(err);
            return res.send('template rendering error');
        }

        pdf.create(html,{}).toStream((err, pdfStream) => {
            if (err) {
                return res.send('pdf generation error');
            }

            res.setHeader('Content-type', 'application/pdf');
            pdfStream.pipe(res);
        })
    })
}

module.exports = {
    getHome: getHome,
    getTrips: getTrips,
    searchTrips: searchTrips,
    getAddPlan: getAddPlan,
    addPlan: addPlan,
    getProfile: getProfile,
    signup: signup,
    login: login,
    logout: logout,
    getInvoice: getInvoice,
}