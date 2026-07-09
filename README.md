# Jezykowy Mistrz AI

Aplikacja webowa do nauki jezykow z generowaniem lekcji, cwiczen i korekta tekstu przez AI. Dostep do aplikacji wymaga logowania.

## Dostep i administracja

- Pierwszy zarejestrowany i zalogowany uzytkownik zostaje administratorem.
- Kolejni uzytkownicy rejestruja konto, ale nie maja dostepu do aplikacji do czasu akceptacji przez administratora.
- Administrator akceptuje uzytkownikow w panelu administracyjnym. Po akceptacji aplikacja wysyla mail z linkiem aktywacyjnym SMTP.
- Klucz API, model AI, SMTP i publiczny URL aplikacji sa konfigurowane w panelu administratora.
- Zwykly uzytkownik nie widzi modelu AI, klucza API ani informacji o dostawcy.

## Dane

Dane aplikacji sa trzymane w katalogu `history/`:

- `app.sqlite` - uzytkownicy, sesje i ustawienia administratora.
- `*.json` - zapisane lekcje.
- `jobs/` i `exercises/` - kolejka generowania i zestawy cwiczen.

W Dockerze katalog jest montowany jako `./persist/history:/app/history`.

## Uruchomienie lokalne

```bash
npm install
npm run start
```

Aplikacja dziala pod `http://localhost:3000`.

## Build

```bash
npm run build
```

## Docker

```bash
docker compose build
docker compose up -d
```

Domyslny prefiks wdrozenia w `docker-compose.yml` to `/jezyki-ai/` przez `VITE_BASE_PATH`.

## Deploy

Push do galezi `main` uruchamia `.github/workflows/deploy.yml`, ktory synchronizuje kod na serwer i wykonuje `docker compose build && docker compose up -d`.
