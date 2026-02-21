# Włoski Mistrz AI 🇮🇹

Aplikacja webowa do nauki języka włoskiego dla Polaków, generująca artykuły klasy magazynowej z pomocą AI (OpenRouter). Wpisz dowolny temat — otrzymasz pełną, dwujęzyczną lekcję.

## Funkcje

- **Generowanie lekcji na żądanie** — wpisz temat (np. *"Kawa"*, *"Renesans"*, *"Opera"*) i AI tworzy pełny artykuł
- **Dwujęzyczność** — wszystkie treści dostępne po polsku i włosku, przełączalne jednym klikiem
- **Bogate słownictwo** — z rodzajnikami, formami liczby mnogiej i wskazówkami wymowy
- **Gramatyka** — szczegółowe wyjaśnienia z przykładami
- **Typowe błędy** — pułapki specyficzne dla Polaków (fałszywi przyjaciele itp.)
- **Dialogi i kultura** — konwersacje, kontekst kulturowy, idiomy
- **TTS** — wymowa włoskich słów i zdań przez Web Speech API (regulowana prędkość)
- **Biblioteka** — historia wygenerowanych artykułów zapisywana w `localStorage`
- **Klucz API w przeglądarce** — aplikacja pyta o klucz przy pierwszym uruchomieniu; jest on przechowywany tylko lokalnie w przeglądarce

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Style | Tailwind CSS |
| AI | OpenRouter API → `google/gemini-3-pro-preview` |
| HTTP client | openai SDK (OpenAI-compatible) |

## Szybki start (Windows)

**Wymagania:** Node.js 18+

### Tryb deweloperski

Kliknij dwukrotnie `run.bat` lub uruchom z terminala:

```bat
run.bat
```

Aplikacja uruchamia się pod `http://localhost:3000`.
Przy pierwszym uruchomieniu aplikacja poprosi o klucz API OpenRouter.

### Build produkcyjny

```bat
build.bat
```

Gotowe pliki lądują w folderze `dist\`.

---

## Uruchomienie ręczne (npm)

```bash
# 1. Zainstaluj zależności
npm install

# 2. Uruchom serwer deweloperski
npm run dev

# 3. (opcjonalnie) Build produkcyjny
npm run build

# 4. (opcjonalnie) Podgląd buildu produkcyjnego
npm run preview
```

## Konfiguracja klucza API

Przy pierwszym uruchomieniu aplikacja wyświetla ekran konfiguracji klucza API. Nie trzeba tworzyć żadnych plików `.env`.

1. Wejdź na [openrouter.ai/keys](https://openrouter.ai/keys) i wygeneruj klucz (format `sk-or-v1-...`)
2. Wklej klucz w polu i kliknij **Zapisz i kontynuuj**
3. Klucz zostaje zapisany w `localStorage` przeglądarki — dostępne są darmowe limity dla wielu modeli

Aby zmienić klucz w dowolnym momencie, kliknij ikonę klucza w prawym górnym rogu paska nawigacji.

### Zmiana modelu AI

Domyślnie używany jest `google/gemini-3-pro-preview`. Możesz zmienić model w [services/aiService.ts](services/aiService.ts):

```ts
export const DEFAULT_MODEL = "google/gemini-3-pro-preview";  // np. "anthropic/claude-3.5-sonnet"
```

Pełna lista modeli: [openrouter.ai/models](https://openrouter.ai/models)

## Struktura projektu

```
wloski-mistrz-ai/
├── components/
│   ├── LessonView.tsx     # Widok pełnego artykułu (TTS, sekcje, przełącznik języka)
│   └── QuizSection.tsx    # Komponent quizów
├── services/
│   └── aiService.ts       # Integracja z OpenRouter API
├── App.tsx                # Główny komponent + ekran konfiguracji klucza API
├── types.ts               # Definicje typów TypeScript
├── index.tsx              # Entry point
├── run.bat                # Szybkie uruchomienie w trybie deweloperskim (Windows)
└── build.bat              # Szybki build produkcyjny (Windows)
```

## Licencja

MIT
