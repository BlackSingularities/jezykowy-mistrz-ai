// Dopisuje bazowy prefiks ścieżki (Vite `base`) do wywołań własnego API tej appki,
// żeby działały poprawnie zarówno pod "/", jak i pod prefiksem (np. "/jezyki-ai/")
// gdy appka jest wystawiona za reverse proxy.
export const apiUrl = (path: string) => `${import.meta.env.BASE_URL.replace(/\/$/, "")}${path}`;
