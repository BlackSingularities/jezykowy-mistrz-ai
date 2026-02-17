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

## Stos technologiczny

| Warstwa | Technologia |
|---|---|
| Frontend | React 19 + TypeScript |
| Build | Vite 6 |
| Style | Tailwind CSS |
| AI | OpenRouter API → `google/gemini-2.5-flash` |
| HTTP client | openai SDK (OpenAI-compatible) |

## Uruchomienie lokalne

**Wymagania:** Node.js 18+

```bash
# 1. Sklonuj repozytorium
git clone https://github.com/adam001d/wloski-mistrz-ai.git
cd wloski-mistrz-ai

# 2. Zainstaluj zależności
npm install

# 3. Skonfiguruj klucz API
#    Wejdź na https://openrouter.ai/keys i wygeneruj klucz
echo "OPENROUTER_API_KEY=sk-or-v1-twój-klucz" > .env.local

# 4. Uruchom serwer deweloperski
npm run dev
```

Aplikacja dostępna pod `http://localhost:3000`.

## Konfiguracja

Plik `.env.local` (nie jest commitowany do repo):

```env
OPENROUTER_API_KEY=sk-or-v1-...
```

Klucz API OpenRouter uzyskasz na [openrouter.ai/keys](https://openrouter.ai/keys). Dostępne są darmowe limity dla wielu modeli.

### Zmiana modelu AI

Domyślnie używany jest `google/gemini-2.5-flash`. Możesz zmienić model w [services/geminiService.ts](services/geminiService.ts):

```ts
model: "google/gemini-2.5-flash",  // np. "anthropic/claude-3.5-sonnet"
```

Pełna lista modeli: [openrouter.ai/models](https://openrouter.ai/models)

## Struktura projektu

```
wloski-mistrz-ai/
├── components/
│   ├── LessonView.tsx     # Widok pełnego artykułu (TTS, sekcje, przełącznik języka)
│   └── QuizSection.tsx    # Komponent quizów
├── services/
│   └── geminiService.ts   # Integracja z OpenRouter API
├── App.tsx                # Główny komponent (biblioteka, formularz)
├── types.ts               # Definicje typów TypeScript
└── index.tsx              # Entry point
```

## Licencja

MIT
