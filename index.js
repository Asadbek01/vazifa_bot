require('dotenv').config({path: './config/.env'});
const mongoose = require('mongoose');
const { setUpBot } = require('./bot.js');

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI, { 
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');
}

async function startBot() {
    await connectDB(); // Ensure DB is connected
    const bot = await setUpBot();
    await bot.launch(); // Polling mode for local development
    console.log('Bot launched in polling mode.');
}

// This checks if the file is being run directly in Node, which is true for local development
if (require.main === module) {
    startBot();
} else {
    // Export the handler for serverless function (Vercel, AWS Lambda, etc.)
    module.exports = async (req, res) => {
        await connectDB(); // Ensure DB is connected

        const bot = await setUpBot();
        
        if (req.method === 'POST') {
            const update = req.body;
            await bot.handleUpdate(update);
            res.status(200).send({ status: 'ok' });
        } else {
            res.status(200).send('Telegram bot is running');
        }
    };
}