const { Telegraf, session } = require('telegraf');
const { start, startRegistration, cancelRegistration, handleGroupNumber, checkGroup,
    addTheme, handleTopic, displayTopics, selectTopic, uploadHomework, restart, checkGroups, getStudentsHomeworksByTopicAndGroup,
    displayHomeworksForTopicAndGroup} = require('./controllers/commands.js');
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
const { CMD_TEXT } = require('./config/consts.js');
const User = require('./models/user.js');
const Topics = require('./models/topics.js');

const { Markup } = require('telegraf');



const setUpBot = () => {
    bot.use(session());
    bot.use((ctx, next) => {
        return next();
    });
   
    
    bot.command("start", start); 
    bot.command("register", startRegistration); 
    bot.command("cancel", cancelRegistration); 
    bot.command("checkGroup", checkGroup);
    bot.command("addTheme", addTheme);
    bot.command("restart", restart);
    bot.command("admin", async (ctx) => {
        const user = await User.findOne({ userId: ctx.from.id });
        if (!user || !user.isAdmin) {
            await ctx.reply('Sizda admin qo\'shish huquqi mavjud emas.');
            return;
        }
    
        ctx.session = {addNewAdministrator: true};
        await ctx.reply('Iltimos, yangi adminning foydalanuvchi ID sini kiriting:');
    });

    bot.command('edit', async (ctx) => {
        const user = await User.findOne({ userId: ctx.from.id });
        if (!user || !user.isAdmin) {
            await ctx.reply('Sizda mavzularni tahrirlash huquqi mavjud emas.');
            return;
        }
    
        ctx.session = {isEditingTopic: true}; // Set a flag that the admin is in the process of editing a topic
        await displayTopics(ctx); // Display the topics to choose which one to edit
    });
    
    

    bot.hears(CMD_TEXT.register, (ctx) => startRegistration(ctx));
    bot.hears(CMD_TEXT.checkGroup, (ctx) => checkGroups(ctx));
    bot.hears(CMD_TEXT.chooseTopic, (ctx) => displayTopics(ctx));
    bot.hears(CMD_TEXT.restart, (ctx) => restart(ctx));
    bot.hears(CMD_TEXT.updateYourGroup, (ctx) => startRegistration(ctx));
    
    
    bot.hears(CMD_TEXT.checkGroups, (ctx) => checkGroups(ctx));
    bot.hears(CMD_TEXT.addTheme, (ctx) => addTheme(ctx));
    bot.hears(CMD_TEXT.getHomeworks, (ctx) => getStudentsHomeworksByTopicAndGroup(ctx));

    bot.on('text', async (ctx) => {
        const textCommand = ctx.message.text.trim();
        if (Object.values(CMD_TEXT).includes(textCommand)) {
            return;
        }
        if (ctx.session.registrationState === true) {
            await handleGroupNumber(ctx);
        }else if (ctx.session.isAddingTheme === true) {
            await handleTopic(ctx);
        }else if (ctx.session.addNewAdministrator) {
                const userIdToUpgrade = ctx.message.text.trim();
                await addNewAdministrator(ctx, userIdToUpgrade);
                ctx.session.addNewAdministrator = false;
        }else  if (ctx.session.selectedTopicForEditing) {
            const newTitle = ctx.message.text;
            const selectedTopic = ctx.session.selectedTopicForEditing;
            
            // Update the topic in the database
            await Topics.updateOne({ _id: selectedTopic._id }, { $set: { title: newTitle } });
            await ctx.reply(`Mavzu "${selectedTopic.title}" yangi nomi bilan yangilandi: "${newTitle}"`);
    
            // Reset the session state
            ctx.session.selectedTopicForEditing = null;
            ctx.session.isEditingTopic = false;
        }
    });

    async function addNewAdministrator(ctx, userIdToUpgrade) {
        const user = await User.find({});
       // we should check if user exists 
        if (!user.find((user) => user.userId === userIdToUpgrade)) {
            await ctx.reply('Foydalanuvchi mavjud emas.');
            return;
        }else if(!user.isAdmin) {
            await ctx.reply('Sizda admin qo\'shish huquqi mavjud emas.');
            return;
        }

        user.isAdmin = true;
        await user.save();
    
        await ctx.reply(`${userIdToUpgrade} ID li foydalanuvchi endi admin.`);
    }

    bot.action(/^select_(\d+)$/, async (ctx) => {
        if(ctx.session.awaitingTopicSelection === true) {
            await selectTopic(ctx);
        } 
    });

    bot.action(/^page_(\d+)$/, async (ctx) => {
        const newPage = parseInt(ctx.match[1]);
        await displayTopics(ctx, newPage);
        ctx.answerCbQuery();
    });

    bot.action('close', async (ctx) => {
        if (ctx.callbackQuery.message.message_id) {
            await ctx.deleteMessage(ctx.session.lastTitlesMessageId).catch(() => {});
            delete ctx.session.lastTitlesMessageId;
        }
        await ctx.deleteMessage().catch(() => {/* Handle deletion errors */});
        ctx.answerCbQuery();
    });

    bot.on('document', async (ctx) => {
        if (ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
            await uploadHomework(ctx);
        }
    });
    bot.action('upload_homework', async (ctx) => {
        if (ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
            await ctx.reply('Iltimos, vazifangizni yuklang (PDF yoki DOC faylini jo\'nating):');
            ctx.session.awaitingFileUpload = true;
        } else {
            await ctx.reply('Avval mavzu tanlang.');
        }
    });


    bot.action('select_group', async (ctx) => {
        const selectedTopic = ctx.session.selectedTopic;
        if (!selectedTopic) {
            await ctx.reply('Iltimos, avval mavzu tanlang.');
            return;
        }
    
        const ITEMS_PER_PAGE = 10;
        let currentPage = 0; // Ensure currentPage is properly scoped
    
        const groupNumbers = await User.distinct('groupNumber');
        groupNumbers.sort((a, b) => a - b); // Sort group numbers
    
        const pageCount = Math.ceil(groupNumbers.length / ITEMS_PER_PAGE);
        const pageGroups = groupNumbers.slice(
            currentPage * ITEMS_PER_PAGE,
            (currentPage + 1) * ITEMS_PER_PAGE
        );
    
        let messageText = 'Groupni tanlang:\n';
        pageGroups.forEach((number, index) => {
            messageText += `${index + 1}. Group ${number}\n`;
        });
    
        // Generate buttons for each group number on the current page
        const groupButtons = pageGroups.map(number =>
            Markup.button.callback(`Group ${number}`, `choose_group_${number}`)
        );
    
        // Pagination buttons if needed
        const paginationButtons = [];
        if (currentPage > 0) {
            paginationButtons.push(Markup.button.callback('⬅️ Prev', `select_group_${currentPage - 1}`));
        }
        if (currentPage < pageCount - 1) {
            paginationButtons.push(Markup.button.callback('Next ➡️', `select_group_${currentPage + 1}`));
        }
    
        const inlineKeyboard = Markup.inlineKeyboard([...groupButtons, ...paginationButtons]);
    
        await ctx.reply(messageText, inlineKeyboard);
    });
    
    bot.action(/^choose_group_(\d+)$/, async (ctx) => {
        const groupNumber = parseInt(ctx.match[1]);
        const selectedTopic = ctx.session.selectedTopic;
        console.log(groupNumber, selectedTopic);
    
        if (!selectedTopic) {
            await ctx.reply('Iltimos, avval mavzu tanlang.');
            return;
        }
    
        // Assuming you have a function to fetch and display homeworks for the selected topic and group
        await displayHomeworksForTopicAndGroup(ctx, selectedTopic, groupNumber);
    });

    
    
    bot.action(/^select_group_(\d+)$/, async (ctx) => {
        const page = parseInt(ctx.match[1]);
        const ITEMS_PER_PAGE = 10;
        
        const groupNumbers = await User.distinct('groupNumber');
        groupNumbers.sort((a, b) => a - b); // Ensure group numbers are sorted
    
        const pageCount = Math.ceil(groupNumbers.length / ITEMS_PER_PAGE);
        const pageGroups = groupNumbers.slice(
            page * ITEMS_PER_PAGE,
            (page + 1) * ITEMS_PER_PAGE
        );
    
        let messageText = 'Groupni tanlang:\n';
        pageGroups.forEach((number, index) => {
            messageText += `${index + 1 + page * ITEMS_PER_PAGE}. Group ${number}\n`;
        });
    
        // Generate buttons for each group number on the current page
        const groupButtons = pageGroups.map(number =>
            Markup.button.callback(`Group ${number}`, `choose_group_${number}`)
        );
    
        const paginationButtons = [];
        if (page > 0) {
            paginationButtons.push(Markup.button.callback('⬅️ Prev', `select_group_${page - 1}`));
        }
        if (page < pageCount - 1) {
            paginationButtons.push(Markup.button.callback('Next ➡️', `select_group_${page + 1}`));
        }
    
        const inlineKeyboard = Markup.inlineKeyboard([...groupButtons, ...paginationButtons]);
    
        // Update the message with the new page of groups
        await ctx.editMessageText(messageText, { reply_markup: inlineKeyboard });
    });
    
    

    bot.action('restart', async (ctx) => {
        ctx.session = {}; 
        await start(ctx);
    });

    bot.action('display_topics', async (ctx) => {
        await displayTopics(ctx);
        ctx.answerCbQuery();
    });

     


   
    bot.action(/^select_(\d+)$/, async (ctx) => {
        if(ctx.session.awaitingTopicSelection === true) {
            await selectTopic(ctx);
        } else if (ctx.session.isEditingTopic === true) {
            // await selectTopicForEditing(ctx);
        }
    });
    
    // async function selectTopicForEditing(ctx) {
    //     const selectedNumber = parseInt(ctx.match[1].split('_')[1]);
    //     const topics = await Topics.find({});
    //     const selectedTopic = topics[selectedNumber - 1];
    
    //     if (selectedTopic) {
    //         ctx.session.selectedTopicForEditing = selectedTopic;
    //         await ctx.reply(`You have selected "${selectedTopic.title}". Please enter the new title for this topic:`);
    //     } else {
    //         await ctx.reply('Mavzu tanlanmadi.');
    //     }
    // }

    return bot;
}



module.exports = { setUpBot };
