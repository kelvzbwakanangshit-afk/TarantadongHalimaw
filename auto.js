
const fs = require('fs');
const path = require('path');
const login = require('ws3-fca');
const express = require('express');
const app = express();
const chalk = require('chalk');
const bodyParser = require('body-parser');
const script = path.join(__dirname, 'script');
const cron = require('node-cron');

const config = fs.existsSync('./data') &&
    fs.existsSync('./data/config.json')
    ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8'))
    : createConfig();

const dev = JSON.parse(fs.readFileSync('./dev.json'));

const Utils = {
    commands: new Map(),
    handleEvent: new Map(),
    account: new Map(),
    cooldowns: new Map(),
};

// Initialize required directories and files.
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data', { recursive: true });
}

if (!fs.existsSync('./data/history.json')) {
    fs.writeFileSync('./data/history.json', '[]', 'utf-8');
}

if (!fs.existsSync('./data/session')) {
    fs.mkdirSync('./data/session', { recursive: true });
}

if (!fs.existsSync('./data/database.json')) {
    fs.writeFileSync('./data/database.json', '[]', 'utf-8');
}

// Typing indicator helper.
// This works only if the installed FCA library supports the method.
function showTyping(api, threadID) {
    try {
        if (typeof api.sendTypingIndicator !== 'function') {
            return;
        }

        api.sendTypingIndicator(threadID, (err) => {
            if (err) {
                console.error('[TYPING] Indicator error:', err);
            }
        });
    } catch (error) {
        console.error('[TYPING] Failed:', error.message);
    }
}

// Load commands and event handlers.
fs.readdirSync(script).forEach((file) => {
    const scripts = path.join(script, file);
    const stats = fs.statSync(scripts);

    const loadCommand = (filePath, fileName) => {
        try {
            const {
                config,
                run,
                handleEvent
            } = require(filePath);

            if (!config) return;

            const {
                name = [],
                role = '0',
                version = '1.0.0',
                hasPrefix = true,
                aliases = [],
                description = '',
                usage = '',
                credits = '',
                cooldown = '5',
                dev = false
            } = Object.fromEntries(
                Object.entries(config).map(([key, value]) => [
                    key.toLowerCase(),
                    value
                ])
            );

            const commandAliases = Array.isArray(aliases)
                ? aliases
                : [];

            if (Array.isArray(name)) {
                commandAliases.push(...name);
            } else {
                commandAliases.push(name);
            }

            const commandConfig = {
                name,
                role,
                aliases: commandAliases,
                description,
                usage,
                version,
                hasPrefix,
                credits,
                cooldown,
                dev
            };

            if (run) {
                Utils.commands.set(commandAliases, {
                    ...commandConfig,
                    run
                });
            }

            if (handleEvent) {
                Utils.handleEvent.set(commandAliases, {
                    ...commandConfig,
                    handleEvent
                });
            }
        } catch (error) {
            console.error(
                chalk.red(
                    `Error installing command from file ${fileName}: ${error.message}`
                )
            );
        }
    };

    if (stats.isDirectory()) {
        fs.readdirSync(scripts).forEach((nestedFile) => {
            loadCommand(
                path.join(scripts, nestedFile),
                nestedFile
            );
        });
    } else {
        loadCommand(scripts, file);
    }
});

// Dashboard setup.
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(express.json());

const routes = [
    { path: '/', file: 'index.html' },
    { path: '/step_by_step_guide', file: 'guide.html' },
    { path: '/online_user', file: 'online.html' }
];

routes.forEach((route) => {
    app.get(route.path, (req, res) => {
        res.sendFile(
            path.join(__dirname, 'public', route.file)
        );
    });
});

app.get('/info', (req, res) => {
    const data = Array.from(Utils.account.values()).map(account => ({
        name: account.name,
        profileUrl: account.profileUrl,
        thumbSrc: account.thumbSrc,
        time: account.time
    }));

    res.json(data);
});

app.get('/commands', (req, res) => {
    const commands = [
        ...new Set(
            [...Utils.commands.values()].map(item => item.name)
        )
    ];

    const handleEvent = [
        ...new Set(
            [...Utils.handleEvent.values()]
                .map(item => item.name)
                .filter(name => !commands.includes(name))
        )
    ];

    const roles = [...Utils.commands.values()].map(item => item.role);
    const aliases = [...Utils.commands.values()].map(item => item.aliases);

    res.json({
        commands,
        handleEvent,
        role: roles,
        aliases
    });
});

app.post('/login', async (req, res) => {
    const { state, commands, prefix, admin } = req.body;

    try {
        if (!state) {
            throw new Error('Missing app state data');
        }

        const cUser = state.find(item => item.key === 'c_user');

        if (!cUser) {
            return res.status(400).json({
                error: true,
                message: "There's an issue with the appstate data; it's invalid."
            });
        }

        const existingUser = Utils.account.get(cUser.value);

        if (existingUser) {
            return res.status(400).json({
                error: false,
                message: 'Active user session detected; already logged in',
                user: existingUser
            });
        }

        try {
            await accountLogin(state, commands, prefix, [admin]);

            return res.status(200).json({
                success: true,
                message: 'Authentication process completed successfully; login achieved.'
            });
        } catch (error) {
            console.error(error);

            return res.status(400).json({
                error: true,
                message: error.message
            });
        }
    } catch (error) {
        return res.status(400).json({
            error: true,
            message: "There's an issue with the appstate data; it's invalid."
        });
    }
});

// Use the same port for the dashboard.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
});

async function accountLogin(
    state,
    enableCommands = [],
    prefix,
    admin = []
) {
    enableCommands = [
        {
            commands: Array.from(Utils.commands.values())
                .map(command => command.name)
        },
        {
            handleEvent: Array.from(Utils.handleEvent.values())
                .map(handler => handler.name)
        }
    ];

    return new Promise((resolve, reject) => {
        login({ appState: state }, async (error, api) => {
            if (error) {
                reject(error);
                return;
            }

            try {
                const userid = await api.getCurrentUserID();

                addThisUser(
                    userid,
                    enableCommands,
                    state,
                    prefix,
                    admin
                );

                const userInfo = await api.getUserInfo(userid);

                if (
                    !userInfo ||
                    !userInfo[userid]?.name ||
                    !userInfo[userid]?.profileUrl ||
                    !userInfo[userid]?.thumbSrc
                ) {
                    throw new Error(
                        'Unable to locate the account; it may be locked or unavailable.'
                    );
                }

                const {
                    name,
                    profileUrl,
                    thumbSrc
                } = userInfo[userid];

                const history = JSON.parse(
                    fs.readFileSync('./data/history.json', 'utf-8')
                );

                const savedTime = history.find(
                    user => user.userid === userid
                )?.time || 0;

                Utils.account.set(userid, {
                    name,
                    profileUrl,
                    thumbSrc,
                    time: savedTime
                });

                const intervalId = setInterval(() => {
                    const account = Utils.account.get(userid);

                    if (!account) {
                        clearInterval(intervalId);
                        return;
                    }

                    Utils.account.set(userid, {
                        ...account,
                        time: account.time + 1
                    });
                }, 1000);

                api.setOptions({
                    listenEvents: config[0].fcaOption.listenEvents,
                    logLevel: config[0].fcaOption.logLevel,
                    updatePresence: config[0].fcaOption.updatePresence,
                    selfListen: config[0].fcaOption.selfListen,
                    forceLogin: config[0].fcaOption.forceLogin,
                    online: config[0].fcaOption.online,
                    autoMarkDelivery: config[0].fcaOption.autoMarkDelivery,
                    autoMarkRead: config[0].fcaOption.autoMarkRead
                });

                const listenEmitter = api.listenMqtt(
                    async (listenError, event) => {
                        if (listenError) {
                            console.error(
                                'Error during API listen:',
                                listenError,
                                userid
                            );
                        }

                        if (!event || !event.threadID) return;

                        // Show typing status before processing messages.
                        if (
                            ['message', 'message_reply'].includes(event.type)
                        ) {
                            showTyping(api, event.threadID);
                        }

                        const database = fs.existsSync('./data/database.json')
                            ? JSON.parse(
                                fs.readFileSync('./data/database.json', 'utf8')
                            )
                            : [];

                        let threadData = Array.isArray(database)
                            ? database.find(
                                item => Object.keys(item)[0] === event.threadID
                            )
                            : null;

                        if (!threadData) {
                            await createThread(event.threadID, api);
                            threadData = {};
                        }

                        const history = JSON.parse(
                            fs.readFileSync('./data/history.json', 'utf-8')
                        );

                        const blacklist = (
                            history.find(user => user.userid === userid) || {}
                        ).blacklist || [];

                        const body = (event.body || '').trim();
                        const firstWord = body
                            .toLowerCase()
                            .split(/\s+/)[0];

                        let hasPrefix =
                            aliases(firstWord)?.hasPrefix === false
                                ? ''
                                : prefix;

                        const commandParts =
                            body.toLowerCase().startsWith(
                                (hasPrefix || '').toLowerCase()
                            )
                                ? body
                                    .substring((hasPrefix || '').length)
                                    .trim()
                                    .split(/\s+/)
                                : [];

                        const [command, ...args] = commandParts;

                        if (
                            hasPrefix &&
                            aliases(command)?.hasPrefix === false
                        ) {
                            api.sendMessage(
                                "Invalid usage: this command doesn't need a prefix.",
                                event.threadID,
                                event.messageID
                            );
                            return;
                        }

                        if (body && aliases(command)?.name) {
                            const commandConfig = aliases(command);

                            if (
                                commandConfig.dev &&
                                !dev.includes(event.senderID)
                            ) {
                                api.sendMessage(
                                    'You do not have access to this developer-only command.',
                                    event.threadID,
                                    event.messageID
                                );
                                return;
                            }

                            const role = commandConfig.role ?? 0;

                            const isAdmin =
                                config?.[0]?.masterKey?.admin?.includes(
                                    event.senderID
                                ) ||
                                admin.includes(event.senderID);

                            const threadAdmins = Array.isArray(threadData)
                                ? threadData.find(
                                    item =>
                                        Object.keys(item)[0] === event.threadID
                                )?.[event.threadID] || []
                                : threadData?.[event.threadID] || [];

                            const isThreadAdmin =
                                isAdmin ||
                                threadAdmins.some(
                                    item => item.id === event.senderID
                                );

                            if (
                                (role == 1 && !isAdmin) ||
                                (role == 2 && !isThreadAdmin) ||
                                (
                                    role == 3 &&
                                    !config?.[0]?.masterKey?.admin?.includes(
                                        event.senderID
                                    )
                                )
                            ) {
                                api.sendMessage(
                                    "You don't have permission to use this command.",
                                    event.threadID,
                                    event.messageID
                                );
                                return;
                            }
                        }

                        if (
                            body &&
                            aliases(command)?.name &&
                            body.toLowerCase().startsWith(
                                (prefix || '').toLowerCase()
                            ) &&
                            blacklist.includes(event.senderID)
                        ) {
                            api.sendMessage(
                                'You are not allowed to use this bot.',
                                event.threadID,
                                event.messageID
                            );
                            return;
                        }

                        if (body && aliases(command)?.name) {
                            const now = Date.now();
                            const name = aliases(command).name;
                            const key =
                                `${event.senderID}_${name}_${userid}`;

                            const previous = Utils.cooldowns.get(key);
                            const delay = Number(
                                aliases(command)?.cooldown ?? 0
                            );

                            if (
                                previous &&
                                now - previous.timestamp < delay * 1000
                            ) {
                                const remaining = Math.ceil(
                                    (
                                        previous.timestamp +
                                        delay * 1000 -
                                        now
                                    ) / 1000
                                );

                                api.sendMessage(
                                    `Please wait ${remaining} seconds before using "${name}" again.`,
                                    event.threadID,
                                    event.messageID
                                );
                                return;
                            }

                            Utils.cooldowns.set(key, {
                                timestamp: now,
                                command: name
                            });
                        }

                        if (
                            body &&
                            !command &&
                            prefix &&
                            body.toLowerCase().startsWith(
                                prefix.toLowerCase()
                            )
                        ) {
                            api.sendMessage(
                                `Invalid command. Use ${prefix}help to see the command list.`,
                                event.threadID,
                                event.messageID
                            );
                            return;
                        }

                        if (
                            body &&
                            command &&
                            prefix &&
                            body.toLowerCase().startsWith(
                                prefix.toLowerCase()
                            ) &&
                            !aliases(command)?.name
                        ) {
                            api.sendMessage(
                                `Invalid command '${command}'. Use ${prefix}help to see the command list.`,
                                event.threadID,
                                event.messageID
                            );
                            return;
                        }

                        for (const {
                            handleEvent,
                            name
                        } of Utils.handleEvent.values()) {
                            if (
                                handleEvent &&
                                name &&
                                (
                                    (enableCommands[1]?.handleEvent || [])
                                        .includes(name) ||
                                    (enableCommands[0]?.commands || [])
                                        .includes(name)
                                )
                            ) {
                                try {
                                    await handleEvent({
                                        api,
                                        event,
                                        enableCommands,
                                        admin,
                                        prefix,
                                        blacklist
                                    });
                                } catch (handlerError) {
                                    console.error(
                                        '[EVENT HANDLER ERROR]',
                                        handlerError
                                    );
                                }
                            }
                        }

                        switch (event.type) {
                            case 'message':
                            case 'message_reply':
                                if (
                                    (enableCommands[0]?.commands || [])
                                        .includes(
                                            aliases(command)?.name
                                        )
                                ) {
                                    await (
                                        aliases(command)?.run || (() => {})
                                    )({
                                        api,
                                        event,
                                        args,
                                        enableCommands,
                                        admin,
                                        prefix,
                                        blacklist,
                                        Utils
                                    });
                                }
                                break;

                            case 'message_unsend':
                            case 'message_reaction':
                                break;
                        }
                    }
                );

                // Keep a reference if the listener exposes one.
                void listenEmitter;

                resolve();
            } catch (error) {
                console.error('Error during account login:', error);
                Utils.account.delete(userid);
                await deleteThisUser(userid);
                reject(error);
            }
        });
    });
}

async function deleteThisUser(userid) {
    const historyFile = './data/history.json';
    const history = JSON.parse(
        fs.readFileSync(historyFile, 'utf-8')
    );

    const index = history.findIndex(
        item => item.userid === userid
    );

    if (index !== -1) {
        history.splice(index, 1);
    }

    fs.writeFileSync(
        historyFile,
        JSON.stringify(history, null, 2)
    );

    const sessionFile = path.join(
        './data/session',
        `${userid}.json`
    );

    try {
        if (fs.existsSync(sessionFile)) {
            fs.unlinkSync(sessionFile);
        }
    } catch (error) {
        console.error('[SESSION DELETE]', error.message);
    }
}

async function addThisUser(
    userid,
    enableCommands,
    state,
    prefix,
    admin,
    blacklist
) {
    const historyFile = './data/history.json';
    const sessionFolder = './data/session';
    const sessionFile = path.join(
        sessionFolder,
        `${userid}.json`
    );

    if (fs.existsSync(sessionFile)) return;

    const history = JSON.parse(
        fs.readFileSync(historyFile, 'utf-8')
    );

    history.push({
        userid,
        prefix: prefix || '',
        admin: admin || [],
        blacklist: blacklist || [],
        enableCommands,
        time: 0
    });

    fs.writeFileSync(
        historyFile,
        JSON.stringify(history, null, 2)
    );

    fs.writeFileSync(
        sessionFile,
        JSON.stringify(state)
    );
}

function aliases(command) {
    return Array.from(Utils.commands.entries())
        .find(([commands]) =>
            commands.some(
                item => String(item).toLowerCase() ===
                    String(command || '').toLowerCase()
            )
        )?.[1] || null;
}

async function main() {
    const empty = require('fs-extra');
    const cacheFile = './script/cache';
    const historyFile = './data/history.json';
    const sessionFolder = './data/session';

    if (!fs.existsSync(cacheFile)) {
        fs.mkdirSync(cacheFile, { recursive: true });
    }

    if (!fs.existsSync(historyFile)) {
        fs.writeFileSync(historyFile, '[]', 'utf-8');
    }

    if (!fs.existsSync(sessionFolder)) {
        fs.mkdirSync(sessionFolder, { recursive: true });
    }

    const history = JSON.parse(
        fs.readFileSync(historyFile, 'utf-8')
    );

    const adminConfig = fs.existsSync('./data/config.json')
        ? JSON.parse(fs.readFileSync('./data/config.json', 'utf8'))
        : createConfig();

    const restartTime = Number(
        adminConfig?.[0]?.masterKey?.restartTime || 15
    );

    cron.schedule(`*/${restartTime} * * * *`, async () => {
        try {
            const savedHistory = JSON.parse(
                fs.readFileSync(historyFile, 'utf-8')
            );

            savedHistory.forEach(user => {
                const account = Utils.account.get(user.userid);

                if (account) {
                    user.time = account.time;
                }
            });

            await empty.emptyDir(cacheFile);

            fs.writeFileSync(
                historyFile,
                JSON.stringify(savedHistory, null, 2)
            );

            // Existing index.js should restart this process.
            process.exit(1);
        } catch (error) {
            console.error('[CRON ERROR]', error);
        }
    });

    for (const file of fs.readdirSync(sessionFolder)) {
        const filePath = path.join(sessionFolder, file);

        try {
            const userid = path.parse(file).name;
            const savedUser = history.find(
                item => item.userid === userid
            );

            if (!savedUser) continue;

            const {
                prefix,
                admin,
                enableCommands
            } = savedUser;

            const state = JSON.parse(
                fs.readFileSync(filePath, 'utf-8')
            );

            if (enableCommands) {
                await accountLogin(
                    state,
                    enableCommands,
                    prefix,
                    admin
                );
            }
        } catch (error) {
            console.error(
                '[SESSION LOGIN ERROR]',
                file,
                error.message
            );
        }
    }
}

function createConfig() {
    const config = [{
        masterKey: {
            admin: [],
            devMode: false,
            database: false,
            restartTime: 15
        },
        fcaOption: {
            forceLogin: true,
            listenEvents: true,
            logLevel: 'silent',
            updatePresence: true,
            selfListen: true,
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            online: true,
            autoMarkDelivery: false,
            autoMarkRead: false
        }
    }];

    if (!fs.existsSync('./data')) {
        fs.mkdirSync('./data', { recursive: true });
    }

    fs.writeFileSync(
        './data/config.json',
        JSON.stringify(config, null, 2)
    );

    return config;
}

async function createThread(threadID, api) {
    try {
        const databaseFile = './data/database.json';

        const database = fs.existsSync(databaseFile)
            ? JSON.parse(fs.readFileSync(databaseFile, 'utf8'))
            : [];

        const existing = database.find(
            item => Object.keys(item)[0] === threadID
        );

        if (existing) return database;

        const threadInfo = await api.getThreadInfo(threadID);
        const adminIDs = threadInfo?.adminIDs || [];

        database.push({
            [threadID]: adminIDs
        });

        fs.writeFileSync(
            databaseFile,
            JSON.stringify(database, null, 2),
            'utf-8'
        );

        return database;
    } catch (error) {
        console.error('[CREATE THREAD ERROR]', error.message);
        return [];
    }
}

async function createDatabase() {
    const dataFolder = './data';
    const databaseFile = './data/database.json';

    if (!fs.existsSync(dataFolder)) {
        fs.mkdirSync(dataFolder, { recursive: true });
    }

    if (!fs.existsSync(databaseFile)) {
        fs.writeFileSync(databaseFile, JSON.stringify([]));
    }

    return databaseFile;
}

main().catch(error => {
    console.error('[MAIN ERROR]', error);
    process.exitCode = 1;
});
