# own-feed-content-tracker

Особистий трекер контенту. Статична сторінка без збірки; дані зберігаються в окремому приватному репозиторії й завантажуються через GitHub API з токеном власника.

## Тести

```bash
node --test tests/*.test.mjs
```

## Локальний режим (синтетичні дані з `fixtures/`)

```bash
python -m http.server 8080
```

Відкрити `http://localhost:8080/?local=1`.

## Перевірка папки з даними

```bash
node scripts/validate-data.mjs <папка-даних> [--expect очікування.json]
```
