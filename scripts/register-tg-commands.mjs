import { BOT_COMMANDS } from '../src/tg/commands.js';

const TOKEN = process.env.TG_BOT_TOKEN;
const CHAT_ID = process.env.TG_CHAT_ID;

if (!TOKEN) {
    console.error('Error: TG_BOT_TOKEN is not set.');
    process.exit(1);
}

const url = `https://api.telegram.org/bot${TOKEN}/setMyCommands`;

const payload = { commands: BOT_COMMANDS };
if (CHAT_ID) {
    payload.scope = { type: 'chat', chat_id: Number(CHAT_ID) };
}

const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));

if (!res.ok) {
    process.exit(1);
}
