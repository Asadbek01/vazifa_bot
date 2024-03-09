require('dotenv').config({path: './config/.env'});
const mongoose = require('mongoose');
const { setUpBot } = require('./bot.js');


(async function () {
    try {
        await mongoose.connect(process.env.MONGO_URI, { 
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await setUpBot().launch();
    } catch (error) {
        
    }    
}())







// mongoose.connect('mongodb+srv://asadbek:kn14qv0f15ePJ06f@cluster0.u5cof9s.mongodb.net/vazifa', { useNewUrlParser: true, useUnifiedTopology: true });
// const db = mongoose.connection;
// db.on('error', console.error.bind(console, 'MongoDB connection error:'));
// db.once('open', () => console.log('Connected to MongoDB'));

// // Define a schema for the submissions
// const submissionSchema = new mongoose.Schema({
//     student: String,
//     fileId: String,
//     fileName: String,
//     timestamp: { type: Date, default: Date.now }
//   });
//   const Submission = mongoose.model('Submission', submissionSchema);
  

// // Create a new Telegraf instance with your bot token
// const bot = new Telegraf('6733777426:AAE_VnSzv1bS4h1O8zat_Edj4DH_Qgn_6ew');

// bot.start((ctx) => {
//   ctx.reply("Assalomu alaykum va rohmatulloh, hush kelibsiz. Boshlash uchun, bundan /upload foydalaning!");
// });

// // Command to upload homework
// bot.command('upload', (ctx) => {
//   const chatId = ctx.chat.id;
//   ctx.reply('Iltimos vazifalaringizni (pdf yoki doc) formatda joylang!');
// });

// // Handle file uploads
// bot.on('document', async (ctx) => {
//     const chatId = ctx.chat.id;
//     const file = ctx.message.document;
//     const fileId = file.file_id;
  
//     try {
//       // Save submission to database
//       const submission = new Submission({
//         student: ctx.from.username,
//         fileId: fileId,
//         fileName: file.file_name
//       });
//       await submission.save();
  
//       // Respond to the user
//       ctx.reply('MashaAlloh! Siz muvaffaqiyatli✅ vazifalaringizni joyladingiz!');
//     //   Markup.button.callback('Vazifalarni ko\'rish', 'get'),
//     } catch (error) {
//       console.error('Error saving submission to database:', error);
//       ctx.reply('Xatolik yuz berdi, iltimos qaytadan urinib ko\'ring.');
//     }
//   });

  
// // Command to check submissions
// bot.command('getall', async (ctx) => {
//     const chatId = ctx.chat.id;
//     try {
//       // Find all submissions
//       const submissions = await Submission.find({});
  
//       if (submissions.length === 0) {
//         ctx.reply('Hali hech qanday vazifa joylanmagan.');
//         return;
//       }
  
//       // Send all files to the teacher/admin
//       submissions.forEach(submission => {
//         ctx.telegram.sendDocument(chatId, submission.fileId, { filename: submission.fileName });
//       });
  
//     } catch (error) {
//       console.error('Error fetching submissions:', error);
//       ctx.reply('Xatolik yuz berdi, iltimos qaytadan urinib ko\'ring.');
//     }
//   });
// // Start the bot
// bot.launch().then(() => console.log('Bot started'));
