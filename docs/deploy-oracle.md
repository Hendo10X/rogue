# Moving Rogue to an Oracle Cloud free server

Rogue runs on one Oracle Cloud "Always Free" server: Node.js runs the app,
Caddy serves it on https://www.roguesocials.com with free certificates, a cron
job refreshes supplier stock, and every merge to `master` deploys by itself.
The database stays on Neon, so no data moves.

Takes about an hour. Do the steps in order.

## 1. Create the Oracle account

1. Sign up at https://signup.cloud.oracle.com (choose the free tier).
   - It asks for a card to confirm you're a real person. Free-tier resources
     never charge it. Don't click "Upgrade to Pay As You Go".
   - **Home region** can't be changed later. Pick one close to Nigeria with
     free ARM servers, e.g. **UK South (London)**, **Germany Central (Frankfurt)**
     or **South Africa (Johannesburg)**.

## 2. Create the server

1. Menu → **Compute → Instances → Create instance**.
2. **Image**: Canonical **Ubuntu 24.04**.
3. **Shape**: Ampere → **VM.Standard.A1.Flex**, **4 OCPUs, 24 GB memory**
   (all free). If it says *out of capacity*, try 2 OCPUs / 12 GB, or try again
   later.
4. **SSH keys**: "Generate a key pair for me" → **Save private key**. Keep that
   file safe; it's the key to the server.
5. Create. When it's running, copy the **Public IP address**.

## 3. Open the web ports

1. On the instance page, click the **subnet** → its **Default security list**.
2. **Add ingress rules** (twice):
   - Source `0.0.0.0/0`, TCP, destination port `80`
   - Source `0.0.0.0/0`, TCP, destination port `443`

## 4. Set up the server

From PowerShell on your PC (use your key file path and IP):

```
ssh -i C:\path\to\ssh-key.key ubuntu@YOUR_SERVER_IP
```

If it complains the key is "unprotected", run once in PowerShell:
`icacls C:\path\to\ssh-key.key /inheritance:r /grant:r "$($env:USERNAME):R"`

Then, on the server:

```
curl -fsSL https://raw.githubusercontent.com/Hendo10X/rogue/master/deploy/setup.sh | bash
```

## 5. Add the secret keys

The app needs the same environment variables it has on Vercel (Vercel →
project → **Settings → Environment Variables**; your local `.env` has most of
them). On the server:

```
nano /opt/rogue/.env
```

Paste one per line, `NAME=value`. Make sure it includes at least:

- `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL=https://www.roguesocials.com`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `FLUTTERWAVE_PUBLIC_KEY`, `FLUTTERWAVE_SECRET_KEY`, `FLUTTERWAVE_SECRET_HASH`, `KORAPAY_PUBLIC_KEY`, `KORAPAY_SECRET_KEY`, `PLISIO_API_KEY`
- `REALLYSIMPLESOCIAL_API_KEY`, `SUPPLIER_SHOPVIACLONE_API_KEY`, `SUPPLIER_ACCTSHOP_API_KEY`
- `FIVESIM_API_KEY`, `PROXY_SELLER_API_KEY`
- `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `CRON_SECRET`
- `ADMIN_EMAILS` (who can open the admin panel), `ADMIN_SEED_SECRET`, `NEXT_PUBLIC_USD_TO_NGN`, `SOCIALLY_API_KEY`, `RESELLER_PROVIDER_API_KEY`
- anything else listed in Vercel

Save with **Ctrl+O, Enter**, exit with **Ctrl+X**. Then build and start:

```
bash /opt/rogue/deploy/deploy.sh
curl -sI http://127.0.0.1:3000 | head -1
```

The last line should print `HTTP/1.1 200 OK`.

## 6. Point the domain at the server

Where the domain's DNS is managed (your registrar, or Vercel if its
nameservers are Vercel's):

- Delete the old Vercel records for `roguesocials.com` and `www`.
- Add **A** record `@` → `YOUR_SERVER_IP`
- Add **A** record `www` → `YOUR_SERVER_IP`

If the nameservers are Vercel's (`ns1.vercel-dns.com`), switch them back to
your registrar's default nameservers first and add the two A records there.

Within minutes to a few hours, https://www.roguesocials.com opens from the
server (Caddy fetches the certificate on the first visit). Then remove the
domain from the Vercel project so Vercel stops answering for it.

## 7. Turn on auto-deploy

GitHub → repo **Settings → Secrets and variables → Actions → New repository secret**:

- `ORACLE_HOST` = the server IP
- `ORACLE_SSH_KEY` = the whole contents of the private key file
  (open it in Notepad, copy everything including the BEGIN/END lines)

From now on every merged PR deploys in about 3–5 minutes (GitHub → **Actions**
shows progress). Disconnect the GitHub repo in the Vercel projects so they
stop trying to deploy.

## Day-to-day

- Logs: `journalctl -u rogue -f`
- Restart: `sudo systemctl restart rogue`
- Redeploy by hand: `bash /opt/rogue/deploy/deploy.sh`
- Changing a key: edit `/opt/rogue/.env`, then run the redeploy (keys starting
  with `NEXT_PUBLIC_` need a rebuild; others just a restart).

Webhook addresses (Flutterwave, Korapay, Plisio) don't change: they use the
same domain.
