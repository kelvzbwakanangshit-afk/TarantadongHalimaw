
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_PATH = path.join(__dirname, "auto.js");
const RESTART_DELAY = 5000;

let main = null;
let restarting = false;
let stopping = false;

function start() {
    if (stopping || restarting) return;

    restarting = true;

    console.log("[BOT] Starting auto.js...");

    main = spawn(process.execPath, [SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: false
    });

    main.once("spawn", () => {
        console.log("[BOT] auto.js is running.");
    });

    main.on("error", (err) => {
        console.error("[BOT] Failed to start:", err.message);
    });

    main.once("close", (code, signal) => {
        main = null;
        restarting = false;

        if (stopping) return;

        console.log(
            `[BOT] Exited: code=${code}, signal=${signal}`
        );

        console.log(
            `[BOT] Restarting in ${RESTART_DELAY / 1000} seconds...`
        );

        setTimeout(start, RESTART_DELAY);
    });
}

function shutdown() {
    if (stopping) return;

    stopping = true;
    console.log("[BOT] Shutting down...");

    if (main) {
        main.kill("SIGTERM");
    }
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start();
