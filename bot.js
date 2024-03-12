const { Telegraf, session } = require('telegraf');
const { start, startRegistration, handleGroupNumber, checkGroup,
    addTheme, handleTopic, displayTopics, selectTopic, uploadHomework, restart, checkGroups, getStudentsHomeworksByTopicAndGroup,
    displayHomeworksForTopicAndGroup, handleEditTopicTitle} = require('./controllers/commands.js');
// const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN_DEV);
const bot  = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
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
    
        ctx.session = {isEditingTopic: true}; 
        await displayTopics(ctx); 
    });
    
    

    bot.hears(CMD_TEXT.register, (ctx) => startRegistration(ctx));
    bot.hears(CMD_TEXT.checkGroup, (ctx) => checkGroups(ctx));
    bot.hears(CMD_TEXT.chooseTopic, (ctx) => chooseTopic(ctx));
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
        
        // Ensure ctx.session is defined
        if (!ctx.session) {
            ctx.session = {};
        }
    
        if (ctx.session.registrationState === true) {
            await handleGroupNumber(ctx);
        } else if (ctx.session.isAddingTheme === true) {
            await handleTopic(ctx);
        } else if (ctx.session.addNewAdministrator) {
            const userIdToUpgrade = parseInt(ctx.message.text.trim());
            await addNewAdministrator(ctx, userIdToUpgrade);
            ctx.session.addNewAdministrator = false;
        } else if (ctx.session.topicId) {
            console.log(ctx.session);
            await handleEditTopicTitle(ctx, ctx.session.topicId);
        } else {
            // Inform the user about the technical issue in Uzbek
            await ctx.reply('Afsus, bir muammo yuz berdi. Iltimos, keyinroq urinib ko\'ring.');
        }
    });
    

    async function addNewAdministrator(ctx, userIdToUpgrade) {
        const newAdminuser = await User.findOne({userId: userIdToUpgrade});
        const user = await User.findOne({ userId: ctx.from.id });
        if (newAdminuser.userId != userIdToUpgrade) {
            console.log(newAdminuser, "user");
            await ctx.reply('Foydalanuvchi mavjud emas.');
            return;
        }else if(!user.isAdmin){ 
            await ctx.reply('Sizda admin qo\'shish huquqi mavjud emas.');
            return;
        }

        newAdminuser.isAdmin = true;
        await newAdminuser.save();
    
        await ctx.reply(`${userIdToUpgrade} ID li foydalanuvchi endi admin.`);
    }

    async function chooseTopic(ctx) {
         ctx.session = {awaitingTopicSelection: true} 
         await displayTopics(ctx);
        }

        bot.action(/^select_(\d+)$/, async (ctx) => {
            try {
                if (ctx.session) {
                    if (ctx.session.awaitingTopicSelection === true || ctx.session.awaitingTopicSelectionForCheckingHomeworks === true || ctx.session.isEditingTopic === true) {
                        await selectTopic(ctx);
                    } else {
                        await ctx.reply('Mavzu tanlash jarayonida xatolik yuz berdi. Iltimos, qaytadan urinib ko`ring.');
                    }
                } else {
                    await ctx.reply('Mavzu tanlash jarayonida xatolik yuz berdi. Iltimos, qaytadan urinib ko`ring.');
                }
            } catch (error) {
                console.error('Error selecting topic:', error);
                await ctx.reply('Mavzu tanlash jarayonida xatolik yuz berdi. Iltimos, qaytadan urinib ko`ring.');
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
        if (ctx.session && ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
            await uploadHomework(ctx);
        } else {
            await ctx.reply('Aniq qo`shimcha ma`lumotlar kiritilmagan yoki noto`g`ri kiritilgan. Iltimos, qaytadan urinib ko`ring.');
        }
    });
    bot.on('photo', async (ctx) => {
        if (ctx.session && ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
            await uploadHomework(ctx);
        } else {
            await ctx.reply('Aniq qo`shimcha ma`lumotlar kiritilmagan yoki noto`g`ri kiritilgan. Iltimos, qaytadan urinib ko`ring.');
        }
    });
    bot.action('upload_homework', async (ctx) => {
        if (ctx.session.awaitingFileUpload && ctx.session.selectedTopic) {
          await ctx.reply('Iltimos, vazifangizni yuklang (PDF, DOC yoki rasm faylini jo\'nating):');
          ctx.session.awaitingFileUpload = true;
        } else {
          await ctx.reply('Avval mavzu tanlang.');
        }
      });
      bot.action('edit_topic', async (ctx) => {
        try {
            const selectedTopic = ctx.session.selectedTopicForEditing;
            if (ctx.session.isEditingTopic && selectedTopic) {
                ctx.session.isAdminEditingTopic = true;
                ctx.session.topicId = selectedTopic.topicId;
                await ctx.reply("Mavzuni tahrirlashingiz mumkin. Iltimos, yangi mavzu nomini kiriting!");
            } else {
                await ctx.reply('Mavzu tanlash jarayonida xatolik yuz berdi. Iltimos, qaytadan urinib ko`ring.');
            }
        } catch (error) {
            console.error('Error editing topic:', error);
            await ctx.reply('Mavzu tahrir qilishda xatolik yuz berdi. Iltimos, qaytadan urinib ko`ring.');
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
            messageText += `${index + 1}. Guruh ${number}\n`;
        });
    
        // Generate buttons for each group number on the current page
        const groupButtons = pageGroups.map(number =>
            Markup.button.callback(`${number}`, `choose_group_${number}`)
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
        await ctx.answerCbQuery();
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
        await ctx.answerCbQuery();
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
            messageText += `${index + 1 + page * ITEMS_PER_PAGE}. Guruh ${number}\n`;
        });
    
        // Generate buttons for each group number on the current page
        const groupButtons = pageGroups.map(number =>
            Markup.button.callback(`${number}`, `choose_group_${number}`)
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
        if (ctx.session.awaitingTopicSelectionForCheckingHomeworks === true) {
            await displayTopics(ctx);
            ctx.answerCbQuery();
        }
    });

    


    return bot;
}



module.exports = { setUpBot };
