# Сборка APK и EXE

## Предварительные требования

### Для Android (APK):
- Android Studio (скачать с developer.android.com)
- Java JDK 17+

### Для Windows (EXE):
- Node.js 22

---

## Сборка APK

```bash
# 1. Собрать веб-версию и синхронизировать
npm run cap:sync

# 2. Открыть проект в Android Studio
npx cap open android
```

В Android Studio:
1. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
2. APK появится в `android/app/build/outputs/apk/debug/app-debug.apk`
3. Для релизной версии: **Build → Generate Signed Bundle / APK**

---

## Сборка EXE

```bash
# 1. Синхронизировать
npm run cap:sync

# 2. Собрать Electron
cd electron
npm run build
```

EXE появится в `electron/dist/`.

---

## Конфигурация

Файл `capacitor.config.ts` — URL приложения:
```ts
server: {
  url: "https://rimix-pixel-ai.vercel.app",  // замени на свой URL
}
```

---

## Иконка приложения

Для APK: замени файлы в `android/app/src/main/res/mipmap-*/`
Для EXE: замени `electron/build/icon.ico`

Сгенерировать иконки можно на https://icon.kitchen
