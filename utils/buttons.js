const { Markup } = require('telegraf');
const { CMD_TEXT } = require('../config/consts.js');
const User = require('../models/user.js');

async function generateMainMenu(ctx) {
    const keyboard = [];
    ctx.session = { isAuth: false, isAdmin: false };
    // Fetch user information from the database
    const userId = ctx.from.id;
    const existingUser = await User.findOne({ userId });

    // Set session properties based on user information
    ctx.session.isAuth = existingUser !== null && existingUser.groupNumber !== undefined;
    ctx.session.isAdmin = existingUser ? existingUser.isAdmin : false;

    // Add registration option if the user is not authenticated
    if (!ctx.session.isAuth) {
        keyboard.push([CMD_TEXT.register]);
        keyboard.push([CMD_TEXT.checkGroup]);
    } else if (ctx.session.isAuth && !ctx.session.isAdmin) {
        const userButtons = [
            [CMD_TEXT.chooseTopic,CMD_TEXT.restart],
            [CMD_TEXT.updateYourGroup]
        ]
        keyboard.push(...userButtons);
    } else if (ctx.session.isAuth && ctx.session.isAdmin) {
        const adminButtons = [
            [CMD_TEXT.addTheme, CMD_TEXT.getHomeworks],
            [CMD_TEXT.checkGroups]
        ];
        keyboard.push(...adminButtons);
    } 
    return Markup.keyboard(keyboard).resize();
}

module.exports = { 
    generateMainMenu
};
