require('dotenv').config({path: './config/.env'});
const mongoose = require('mongoose');
const { setUpBot } = require('./bot.js');
const express = require('express');

(async function () {
    try {
  
    } catch (error) {
        
    }    
}())



async function main () {
    await mongoose.connect(process.env.MONGO_URI, { 
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    // await setUpBot().launch();
	const app = express();
	// Set the bot API endpoint
	app.use(await bot.createWebhook({ domain: '' }));
	app.listen('5000', () => console.log("Listening on port", port));
}

main();





