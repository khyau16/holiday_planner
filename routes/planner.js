const express = require('express');
const bcrypt = require('bcrypt');
const validator = require('validator');
const moment = require('moment');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

const router = express.Router();

const db = require('../data/database');
const checkSuitability = require('../check-suitability');

router.get('/', (req, res) => {
    const signupError = Object.values(req.query).includes('signup');
    const loginError = Object.values(req.query).includes('login');

    res.render('../views/index', { signupError, loginError });
})

router.get('/trips', async (req, res) => {
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
})

router.post('/trips/search', async (req, res) => {
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

})

router.post('/trips/refresh', (req, res) => {
    res.redirect('/trips');
})

router.get('/addplan', (req, res) => {
    if (!req.session.isAuthenticated) {
        return res.status(401).send('You are not authenticated.')
    }
    const errorMessage = Object.values(req.query).includes('error')

    res.render('../views/add-plan', { errorMessage, errorMessage });
})

router.post('/addplan', async (req, res) => {
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
})

router.get('/profile', async (req, res) => {
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
})

router.post('/signup', async (req, res) => {
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
})

router.post('/login', async (req, res) => {
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
})

router.post('/logout', (req, res) => {
    req.session.user = null;
    req.session.isAuthenticated = false;
    res.redirect('/');
})

router.get('/trips/:id', async (req, res) => {

    const query = `
        SELECT customers.name, customers.phone, customers.email, plans.id AS invoice_id, 
        plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance
        FROM customers
        INNER JOIN plans ON customers.id = plans.customer_id
        WHERE plans.id = ?
    `
    const [invoice] = await db.query(query, [req.params.id]);

    const date = moment(new Date()).format('DD/MM/YYYY');

    try {
        // Render the EJS template with dynamic data
        const htmlContent = await ejs.renderFile('pdf-template.ejs', { invoice: invoice[0], date: date });

        // Launch Puppeteer to create a PDF
        const browser = await puppeteer.launch({headless: 'new'});
        const page = await browser.newPage();

        // Set the rendered HTML content to the page
        await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

        // Generate the PDF from the rendered page
        const pdfBuffer = await page.pdf({ format: 'A4' });

        // Close the browser
        await browser.close();

        // Send the PDF file back to the client as a download
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=generated.pdf',
        });
        res.send(pdfBuffer);
    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).send('Error generating the PDF');
    }

})

module.exports = router;  