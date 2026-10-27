# AxR Battle Cards

Players log in with Discord, design a Battle Card with a live preview, publish it, and `/card` posts that exact image in Discord.
Tiers and combat rank are read automatically from the server roles (`HT1 CART`, `LT5 SWORD`, ...).

## Deploy (works from a phone)

### 1. Put the code on GitHub
Create a free GitHub account, make a new repository, and upload every file in this folder (unzip first). Keep the folder structure (`api/`, `lib/`, `public/`, `package.json`, `vercel.json`).

### 2. Free database (Upstash)
1. upstash.com -> sign up -> Create Database (Redis), any region.
2. On the database page copy **REST URL** and **REST Token**.

### 3. Discord application
1. discord.com/developers/applications -> New Application.
2. **OAuth2**: copy Client ID and Client Secret. Add the redirect `https://YOUR-SITE.vercel.app/api/auth/callback` (you get the real address in step 4; come back and add it).
3. **Bot** tab: create/use a bot, copy its token. Turn ON **Server Members Intent**.
4. Make sure the bot is in your server. Copy the server ID (Developer Mode -> right-click server -> Copy Server ID).

### 4. Vercel
1. vercel.com -> sign up with GitHub -> Add New Project -> pick your repo.
2. Add Environment Variables:

| Name | Value |
|---|---|
| DISCORD_CLIENT_ID | from step 3 |
| DISCORD_CLIENT_SECRET | from step 3 |
| DISCORD_BOT_TOKEN | bot token |
| DISCORD_GUILD_ID | server ID |
| SESSION_SECRET | any random 32+ characters |
| UPSTASH_REDIS_REST_URL | from step 2 |
| UPSTASH_REDIS_REST_TOKEN | from step 2 |

3. Deploy. Copy your address (like `https://something.vercel.app`) and add `/api/auth/callback` to it as the Discord redirect (step 3.2). Do NOT set DEMO_MODE.

### 5. The `/card` command in BDFD
1. BDFD -> your bot -> Slash Commands -> new command named `card`.
2. Add one optional option of type **User** named `member`.
3. Paste `bot/card-command.bdfd.txt`, and replace both `YOUR-SITE.vercel.app` with your real address.
4. Players use `/card` for their own card, `/card member:@someone` for another player's.

## Check it
Open your site -> Login with Discord -> design -> Publish -> `/card` in Discord.

## Notes
- Members must be in the server to publish (the card shows server ranks).
- Role changes show within about 2 minutes.
- Local test: `DEMO_MODE=1 SESSION_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx node dev-server.js`

Deploy test.
