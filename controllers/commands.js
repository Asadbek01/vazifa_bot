const { generateMainMenu } = require('../utils/buttons.js');
const { Markup } = require('telegraf');
const User = require('../models/user.js');
const Topics = require('../models/topics.js');
const Submissions = require('../models/submissions.js');

const start = async ctx => {
    const mainMenuKeyboard =  await generateMainMenu(ctx);
    ctx.session = { registrationState: false };
    ctx.reply('Assalomu alaykum va rohmatulloh, Xush kelibsiz. Boshlash uchun, ro\'yhatdan /register o\'ting!', {
        ...mainMenuKeyboard
    });
};

const startRegistration = async ctx => {
    const userId = ctx.from.id;
    const existingUser = await User.findOne({ userId });
    if (existingUser && existingUser.isAdmin) {
        ctx.reply('Siz admin sifatida ro\'yxatdan o\'tgansiz, ro\'yxatdan o\'tish zarur emas.');
    } else {
        ctx.session = { registrationState: true };
        ctx.reply('Iltimos guruh raqamingizni yozing!');
    }
};

const cancelRegistration = ctx => {
    ctx.session = { registrationState: false };
    const chatId = ctx.chat.id;
    ctx.reply('Ro`yxatdan o`tish bekor qilindi.');
};

const restart = async ctx => {
    const mainMenuKeyboard =  await generateMainMenu(ctx);
    ctx.session = { registrationState: false };
    ctx.reply('Assalomu alaykum va rohmatulloh, Xush kelibsiz. Boshlash uchun, ro\'yhatdan /register o\'ting!', {
        ...mainMenuKeyboard
    });
};

const handleGroupNumber = async (ctx, next) => {
    const chatId = ctx.chat.id;
    const groupNumber = ctx.message.text.trim();
    
    if (!/^\d+$/.test(groupNumber)) {
        ctx.reply('Iltimos raqam kiriting! Guruh raqamingizni yozing.');
        return;
    }

    try {
        let existingUser = await User.findOne({ userId: ctx.from.id });

        if (!existingUser) {
            // Create a new user if not found
            const name = ctx.from.first_name || ctx.from.username || ''; // Use first_name, username, or empty string
            existingUser = new User({
                userId: ctx.from.id,
                name: name,
                groupNumber: parseInt(groupNumber), // Parse groupNumber to integer
                isAdmin: false // Set isAdmin to false for new user
            });
            await existingUser.save();
            const mainMenuKeyboard =  await generateMainMenu(ctx);
            ctx.reply("Siz muvaffaqiyatli ro'yxatdan o'tdingiz!", {
                ...mainMenuKeyboard
            });
            await sendProfileDetails(ctx, existingUser);
        } else {
            // Update existing user's groupNumber
            existingUser.groupNumber = parseInt(groupNumber);
            await existingUser.save();
            const mainMenuKeyboard =  await generateMainMenu(ctx);
            ctx.reply("Guruh raqamingiz muvaffaqiyatli yangilandi!", {
                ...mainMenuKeyboard
            });
            await sendProfileDetails(ctx, existingUser);
        }
        
        ctx.session = { registrationState: false };
    } catch (error) {
        console.error('Error handling group number:', error);
    }
};

const checkGroup = async (ctx) => {
    try {
        const existingUser = await User.findOne({ userId: ctx.from.id });
        existingUser ? await sendProfileDetails(ctx, existingUser) : ctx.reply("Siz hali ro'yxatdan o'tmadingiz, o'tish uchun /register tugmasini bosing! ");
    } catch (error) {
        console.error('Error checking group:', error);
        ctx.reply('Xatolik yuz berdi. Iltimos qayta urinib ko`ring.');
    }
};


async function sendProfileDetails(ctx, user) {
    const message = `
🆔 ID: ${user.userId}
👤 Name: ${user.name}
🔢 Group Number: ${user.groupNumber}
    `;

    await ctx.reply(message);
}
async function sendTopicDetails(ctx, topic) {
    const message = `
   
�� Title: ${topic.title}
    `;
    await ctx.reply(message);
}


async function isAuthenticated(ctx) {
    const userId = ctx.from.id;
    const existingUser = await User.findOne({ userId });
    return existingUser !== null && existingUser.groupNumber !== undefined;
}

 const  addTheme = (ctx)  => {
    ctx.session = {isAddingTheme: true};
    ctx.reply("Studentlar vazifasi uchun, o'tilgan mavzuni joylang!");
}

const handleTopic = async (ctx, next) => {
    const chatId = ctx.chat.id;
    const topicTitle = ctx.message.text.trim();
    console.log(ctx.session.isAddingTheme);
    try {
        let existingTopic = await Topics.findOne({ title: topicTitle });

        if (!existingTopic) {
            const newTopic = new Topics({
                title: topicTitle,
            });
            await newTopic.save();
            const mainMenuKeyboard = await generateMainMenu(ctx);
            ctx.reply("Siz muvaffaqiyatli mavzuni joyladingiz", {
                ...mainMenuKeyboard
            });
            await sendTopicDetails(ctx, newTopic);
        } else {
            ctx.reply("Mavzu allaqachon mavjud!");
        }

        ctx.session = {isAddingTheme: false};
    } catch (error) {
        console.error('Error handling topic:', error);
    }
};

const getTopics = async () => {
    try {
        const topics = await Topics.find({});
        return topics;
    } catch (error) {
        console.error('Error fetching topics:', error);
        throw new Error('Failed to fetch topics');
    }
};

const ITEMS_PER_PAGE = 10;
const CLOSE_COMMAND = 'close';

const displayTopics = async (ctx, currentPage = 0) => {
    ctx.session = { awaitingTopicSelection: true };
    try {
        const topics = await Topics.find({});
        const pageCount = Math.ceil(topics.length / ITEMS_PER_PAGE);
        const pageTopics = topics.slice(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE
        );
        let messageText = 'Mavzu tanlang:\n';
        pageTopics.forEach((topic, index) => {
            const itemNumber = index + 1 + currentPage * ITEMS_PER_PAGE;
            messageText += `${itemNumber}. ${topic.title}\n`;
        });
        
        await ctx.reply(messageText);
        ctx.session.lastTopicMessageId = messageText.message_id;
        
        let keyboardInline = pageTopics.map((_, index) => {
            const buttonNumber = index + 1 + currentPage * ITEMS_PER_PAGE;
            return Markup.button.callback(`${buttonNumber}`, `select_${buttonNumber}`);
        });
        
        keyboardInline = chunkArray(keyboardInline, 5);
        const paginationButtons = [];
        if (currentPage > 0) {
            paginationButtons.push(Markup.button.callback('⬅️ Prev', `page_${currentPage - 1}`));
        } else {
            paginationButtons.push(Markup.button.callback(' ', 'no_action'));
        }
        paginationButtons.push(Markup.button.callback('❌', CLOSE_COMMAND));
        
        if (currentPage < pageCount - 1) {
            paginationButtons.push(Markup.button.callback('Next ➡️', `page_${currentPage + 1}`));
        } else {
            paginationButtons.push(Markup.button.callback(' ', 'no_action'));
        }
        
        keyboardInline.push(paginationButtons);
       await ctx.reply('───────────────', Markup.inlineKeyboard(keyboardInline));

    } catch (error) {
        console.error('Error displaying topics with numbers:', error);
    }
};

function chunkArray(array, size) {
   const chunkedArr = [];
   for (let i = 0; i < array.length; i += size) {
       chunkedArr.push(array.slice(i, i + size));
   }
   return chunkedArr;
}


async function selectTopic(ctx) {
    const selectedNumber = parseInt(ctx.match[1]);
    // Fetch topics from the database
    const topics = await Topics.find({});
    const selectedTopic = topics[selectedNumber - 1];

    if (!selectedTopic) {
        await ctx.reply('Siz tanlagan mavzu hozirda mavjud emas.');
        return;
    }

    const user = await User.findOne({ userId: ctx.from.id });
    if (user && user.isAdmin) {
        ctx.session.selectedTopic = selectedTopic.title; // Store selected topic for further actions
        await ctx.reply(`Siz tanlagan mavzu: ${selectedTopic.title}. Iltimos, guruh raqamini kiriting:`,
            Markup.inlineKeyboard([
                Markup.button.callback('Guruhni tanlang', 'select_group')
            ])
        );
    } else {
        // Regular user interaction
        ctx.session.selectedTopic = selectedTopic;
        ctx.session.awaitingFileUpload = true;
        await ctx.reply(`Siz tanlagan mavzu: ${selectedTopic.title}.`,
            Markup.inlineKeyboard([
                Markup.button.callback('Vazifani yuklash', 'upload_homework') // Button for uploading homework
            ])
        );
    }

    // Reset session states accordingly
    ctx.session.awaitingTopicSelection = false;
}




async function uploadHomework(ctx) {
  if (ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
    const document = ctx.message.document;
    const selectedTopic = ctx.session.selectedTopic;
    const user = await User.findOne({ userId: ctx.from.id });
    try {
      const submission = new Submissions({
        student: ctx.from.first_name,
        groupNumber: user.groupNumber,
        topicTitle: selectedTopic.title,
        file: ctx.message.document,
        fileName: ctx.message.document.file_name,
        fileId: ctx.message.document.file_id,
        submittedAt: new Date(),
      });
      await submission.save();

      await ctx.reply(
        `MashaAlloh! Siz muvaffaqiyatli✅ vazifalaringizni joyladingiz: ${selectedTopic.title}`
      );
    } catch (error) {
      console.error("Error saving submission to database:", error);
      ctx.reply("Xatolik yuz berdi, iltimos qaytadan urinib ko'ring.");
    }
  }
}

async function checkGroups(ctx) {
    try {
        // Find all unique group numbers
        const groupNumbers = await User.distinct('groupNumber');
        groupNumbers.sort((a, b) => a - b);

        // Prepare the header for the message
        let messageText = "👥 Group List with Student Counts:\n";

        // For each group, count the number of students
        for (const groupNumber of groupNumbers) {
            const studentCount = await User.countDocuments({ groupNumber: groupNumber });
            messageText += `Group -${groupNumber}: ------------ Bola soni - ${studentCount}\n`;
        }

        // Send the compiled list to the user
        await ctx.reply(messageText);
    } catch (error) {
        console.error('Error checking groups:', error);
        await ctx.reply('Sorry, an error occurred while fetching the groups and student counts.');
    }
}

async function getStudentsHomeworksByTopicAndGroup(ctx) {
     ctx.session = { isAdminSelectingTitle: true };
    const message = 'Uyga vazifalarni mavzu bilan olish uchun👇';
    const topicSelectionButton = Markup.inlineKeyboard([
        Markup.button.callback('Mavzular', 'display_topics')
    ]);

    await ctx.reply(message, topicSelectionButton);

}


async function displayHomeworksForTopicAndGroup(ctx, topicTitle, groupNumber) {
    const chatId = ctx.chat.id;
    try {
        const homeworks = await Submissions.find({ topicTitle: topicTitle, groupNumber: groupNumber });

        if (homeworks.length === 0) {
            await ctx.reply('Hech qanday uyga vazifa joylanmagan.');
            return;
        }

        homeworks.forEach(submission => {
            ctx.telegram.sendDocument(chatId, submission.fileId, {
                caption: `Uyga vazifa: ${submission.topicTitle} guruh nomer: ${submission.groupNumber}`
            });
        });
    } catch (error) {
        console.error('Error retrieving homework submissions:', error);
        await ctx.reply('An error occurred while fetching the homework submissions.');
    }
}



//  here Admin should be able to addNew Administrators




module.exports = { start, startRegistration, cancelRegistration, handleGroupNumber, checkGroup, 
    addTheme, handleTopic, displayTopics, selectTopic, uploadHomework, restart, checkGroups,
    displayHomeworksForTopicAndGroup, getStudentsHomeworksByTopicAndGroup };
