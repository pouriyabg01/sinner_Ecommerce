گواهی امنیتی را اینجا بگذارید:

- `fullchain.pem` — گواهی به‌همراه زنجیره‌ی صادرکننده
- `privkey.pem` — کلید خصوصی

بعد در `.env` مقدار `NGINX_CONF=https.conf` را بگذارید و `docker compose up -d nginx` بزنید.
این پوشه نباید در هیچ مخزنی آپلود شود.
