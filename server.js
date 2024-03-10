const { Telegraf } = require('telegraf');
const botCode = require('index'); // Assuming your bot code is in index.js

const bot = new Telegraf(process.env.BOT_TOKEN);
botCode(bot); // Pass the bot instance to your existing code if it's modularized

module.exports = async (req, res) => {
    if (req.method === 'POST') {
        const update = req.body;
        await bot.handleUpdate(update);
        res.status(200).send('OK');
    } else {
        // GET request handling if necessary, e.g., for webhook verification
        res.status(200).send('Hello from bot!');
    }
};
