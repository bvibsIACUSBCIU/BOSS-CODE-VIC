# Boss Hiring Website

Boss Hiring official static website for the first-stage lightweight recruitment entry.

## Local Preview

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

Production-ready homepage demo:

```text
http://localhost:8000/demo.html
```

## Production Configuration

Edit `app.js` before deployment:

```js
telegramBaseUrl: "https://t.me/YOUR_BOT_USERNAME",
email: "hello@bosshiring.com",
```

Current Telegram links are placeholders until the official Bot username is confirmed.

## Deploy

This is a static site. It can be deployed directly to Vercel, Netlify, Cloudflare Pages, or any static hosting service.

For Vercel, deploy the folder as-is. `vercel.json` is already included.
