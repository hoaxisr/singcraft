# Singcraft

Веб-генератор конфигураций для [sing-box](https://sing-box.sagernet.org/) с поддержкой различных протоколов и форматов.

**[Открыть приложение](https://hoaxisr.github.io/singcraft/)**

## Возможности

### Поддерживаемые форматы импорта

- **VLESS ссылки** — стандартные прокси-ссылки формата `vless://...`
- **AmneziaVPN** — JSON конфигурации в формате XRay/V2Ray
- **AmneziaWG** — WireGuard `.conf` файлы с полной поддержкой AWG 1.0/2.0

### AmneziaWG параметры

Полная поддержка параметров обфускации:
- Jitter: `Jc`, `Jmin`, `Jmax`
- Packet size: `S1`, `S2`, `S3`, `S4`
- Header: `H1`, `H2`, `H3`, `H4`
- Init packet (AWG 2.0): `I1`, `I2`, `I3`, `I4`, `I5`

### Пресеты

**DNS:**
- Google DNS
- Cloudflare DNS
- AdGuard DNS
- Quad9 DNS

**Inbound:**
- TUN (системный туннель)
- Mixed (HTTP + SOCKS5)

## Использование

1. Выберите формат импорта (VLESS / AmneziaVPN / AmneziaWG)
2. Вставьте данные или загрузите файл
3. Выберите DNS и Inbound пресеты
4. Скачайте готовый `config.json`

## Локальная разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка
npm run build
```

## Технологии

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Zustand

## Лицензия

MIT
