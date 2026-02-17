# Włoski Mistrz AI

Aplikacja do nauki języka włoskiego zasilana przez AI. Generuje bogate, dwujęzyczne (włoski-polski) artykuły edukacyjne na dowolny temat — słownictwo, gramatykę, kulturę, dialogi i idiomy.

Korzysta z [OpenRouter](https://openrouter.ai) jako pośrednika API, co pozwala używać wielu modeli AI (domyślnie: `google/gemini-2.5-flash-preview`).

---

## Wymagania

- [Node.js](https://nodejs.org/) (wersja 18 lub nowsza)
- Klucz API OpenRouter — uzyskaj bezpłatnie na [openrouter.ai/keys](https://openrouter.ai/keys)

---

## Szybki start (Windows)

### Tryb deweloperski

Kliknij dwukrotnie `run.bat` lub uruchom w terminalu:

```
run.bat
```

Aplikacja uruchomi się pod adresem **http://localhost:3000**

### Budowanie wersji produkcyjnej

```
build.bat
```

Pliki wynikowe trafią do katalogu `dist/`.

---

## Ręczna instalacja

```bash
# Instalacja zależności
npm install

# Tryb deweloperski
npm run dev

# Budowanie produkcji
npm run build

# Podgląd zbudowanej aplikacji
npm run preview
```

---

## Klucz API

Przy pierwszym uruchomieniu aplikacja wyświetli okno z prośbą o podanie klucza API OpenRouter.

- Klucz jest zapisywany **wyłącznie lokalnie** w przeglądarce (localStorage).
- Nigdy nie jest wysyłany nigdzie poza bezpośrednie wywołania API do OpenRouter.
- Możesz zmienić lub usunąć klucz klikając ikonę klucza w prawym górnym rogu aplikacji.

---

## Funkcje

- **Generowanie lekcji AI** — wpisz dowolny temat i otrzymaj pełny artykuł edukacyjny
- **Dwujęzyczność** — cała treść dostępna po polsku i po włosku, przełączana jednym kliknięciem
- **Bogate treści** — słownictwo z rodzajnikami i liczbą mnogą, gramatyka, idiomy, dialogi, typowe błędy Polaków
- **Wymowa** — synteza mowy dla słów i zdań włoskich (Web Speech API)
- **Biblioteka** — historia wygenerowanych artykułów zapisywana lokalnie
- **Responsywny design** — działa na telefonach i komputerach

---

## Zmiana modelu AI

Domyślny model to `google/gemini-2.5-flash-preview`. Aby go zmienić, edytuj stałą `DEFAULT_MODEL` w pliku `services/geminiService.ts`:

```ts
const DEFAULT_MODEL = "google/gemini-2.5-flash-preview";
```

Lista dostępnych modeli: [openrouter.ai/models](https://openrouter.ai/models)

---

## Struktura projektu

```
wloski-mistrz-ai/
├── App.tsx                  # Główny komponent aplikacji + modal klucza API
├── index.tsx                # Punkt wejścia React
├── index.html               # Szablon HTML
├── types.ts                 # Definicje TypeScript
├── vite.config.ts           # Konfiguracja Vite
├── run.bat                  # Uruchamianie trybu deweloperskiego (Windows)
├── build.bat                # Budowanie produkcji (Windows)
├── components/
│   ├── LessonView.tsx       # Widok pełnej lekcji
│   └── QuizSection.tsx      # Komponent quizu
└── services/
    └── geminiService.ts     # Integracja z OpenRouter API
```
