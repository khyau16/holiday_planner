const express = require('express');
const moment = require('moment');
const ejs = require('ejs');
const puppeteer = require('puppeteer');
const pdf = require('html-pdf');
const router = express.Router();

const db = require('../data/database');
const controller = require('../controllers/controller');


router.get('/', controller.getHome);

router.get('/trips', controller.getTrips);

router.post('/trips/search', controller.searchTrips);

router.post('/trips/refresh', (req, res) => {
    res.redirect('/trips');
})

router.get('/addplan', controller.getAddPlan);

router.post('/addplan', controller.addPlan);

router.get('/profile', controller.getProfile);

router.post('/signup', controller.signup);

router.post('/login', controller.login);

router.post('/logout', controller.logout);

// router.get('/trips/:id', async (req, res) => {

//     const query = `
//         SELECT customers.name, customers.phone, customers.email, plans.id AS invoice_id, 
//         plans.accommodation, plans.transport, plans.entertainment, plans.meal, plans.insurance
//         FROM customers
//         INNER JOIN plans ON customers.id = plans.customer_id
//         WHERE plans.id = ?
//     `
//     const [invoice] = await db.query(query, [req.params.id]);

//     const date = moment(new Date()).format('DD/MM/YYYY');

//     try {
//         const htmlContent = await ejs.renderFile('./views/pdf-template.ejs', { invoice: invoice[0], date: date });

//         const browser = await puppeteer.launch({ headless: 'new' });
//         const page = await browser.newPage();

//         await page.setContent(htmlContent, { waitUntil: 'domcontentloaded' });

//         const pdfBuffer = await page.pdf({ format: 'A4' });

//         await browser.close();

//         // Send the PDF file back to the client as a download
//         res.set({
//             'Content-Type': 'application/pdf',
//             'Content-Disposition': 'attachment; filename=generated.pdf',
//         });
//         res.send(pdfBuffer);
//     } catch (err) {
//         console.error('Error generating PDF:', err);
//         res.status(500).send('Error generating the PDF');
//     }

// })

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
            return res.send('template rendering error');
        }

        pdf.create(html, {}).toStream((err, pdfStream) => {
            if (err) {
                return res.send('pdf generation error');
            }

            res.setHeader('Content-type', 'application/pdf');
            pdfStream.pipe(res);
        })
    })
})

module.exports = router;  