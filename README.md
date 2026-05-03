# Norma Camera

MVP Expo + VisionCamera (appareil photo Android)  
Ce guide documente le workflow de lancement propre en développement, comme celui utilisé pour faire tourner le build dev-client sur Pixel par USB.

## Prérequis

- Node.js + npm
- Android SDK / adb dispo dans le PATH (`which adb`)
- Un appareil Android déjà connecté en USB avec débogage USB activé
- Un build dev-client déjà installé sur le téléphone (`com.anonymous.normacamera`)

## Commandes de vérification rapides

```bash
pwd
git status --short
cat package.json
cat app.json
cat babel.config.js
npm ls babel-preset-expo
npm test
npx tsc --noEmit
npx expo config --type public
```

Objectif : confirmer que la config Expo est valide, le preset Babel présent, et que l'app compile.

## Lancement propre Android (USB + Metro local)

### 1) Vérifier l’environnement + nettoyer Metro 8081

```bash
npx expo start --dev-client --host localhost -c
```

Si ce port est déjà pris, dans un autre terminal :

```bash
lsof -nP -iTCP:8081 -sTCP:LISTEN
kill -9 <PID_8081>
lsof -nP -iTCP:8081 -sTCP:LISTEN
```

### 2) Vérifier adb et l’appareil

```bash
which adb
adb version
adb devices
```

Le téléphone doit apparaître en état `device` (pas `unauthorized`).

### 3) Configurer le reverse réseau

```bash
adb reverse --remove-all
adb reverse tcp:8081 tcp:8081
adb reverse --list
```

Il faut voir :

- `tcp:8081 tcp:8081`

### 4) Vérifier que Metro répond en local

Dans un autre terminal :

```bash
curl -I "http://127.0.0.1:8081"
```

### 5) (Re)lancer l’app depuis adb

```bash
adb shell am force-stop com.anonymous.normacamera
adb shell am start -a android.intent.action.VIEW -d "exp+norma-camera://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
```

### 6) Vérification ciblée si ça bloque sur “Connecting to dev server”

```bash
adb logcat -c
adb shell am force-stop com.anonymous.normacamera
adb shell am start -a android.intent.action.VIEW -d "exp+norma-camera://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"
sleep 8
adb logcat -d | grep -i -E "TransformError|Cannot find module|babel|metro|dev server|localhost|127.0.0.1|8081|expo|ReactHost|fatal|norma|vision|camera|error" > /tmp/norma-camera-connect.log
cat /tmp/norma-camera-connect.log
```

### 7) Fallback si nécessaire

- LAN :  
  ```bash
  npx expo start --dev-client --host lan -c
  ```
  puis utiliser l’URL `http://192.168.x.x:8081` affichée par Expo.
- Tunnel :  
  ```bash
  npx expo start --dev-client --tunnel -c
  ```  
  puis scanner le QR code.

## URL à saisir manuellement sur le téléphone

- USB reverse : `http://127.0.0.1:8081`
- LAN : l’URL exacte affichée par Expo (ex: `http://192.168.1.16:8081`)
- Tunnel : scanner le QR code

## Dépannage ultra-court

- Si caméra pas accessible : vérifier les permissions iOS/Android dans `app.json`
- Si erreur babel/preset : `babel.config.js` doit utiliser `babel-preset-expo` (sans autre preset incompatible)
- Si `gradlew`/build Android n’est pas requis pour ce flux : le build debug doit être déjà installé localement
- Si l’appareil reste bloqué en connexion, inspecter uniquement le blocage final dans `/tmp/norma-camera-connect.log`

## Prompt LLM recommandé (copier-coller)

Tu es sur macOS. Le projet est dans `/Volumes/video/git/norma-camera`.  
Je veux un workflow stable pour démarrer le build dev-client Android (Pixel/USB).

Fais exactement :
1) Vérifier l’état du repo et la base (`package.json`, `app.json`, `babel.config.js`, `npx expo config --type public`, `npm test`, `npx tsc --noEmit`)  
2) Vérifier et tuer tout process sur le port `8081`  
3) Vérifier adb (`which adb`, `adb version`, `adb devices`)  
4) Exécuter `adb reverse --remove-all`, `adb reverse tcp:8081 tcp:8081`, confirmer avec `adb reverse --list`  
5) Lancer Metro: `npx expo start --dev-client --host localhost -c`  
6) Lancer l’app: `adb shell am force-stop com.anonymous.normacamera` puis  
   `adb shell am start -a android.intent.action.VIEW -d "exp+norma-camera://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081"`  
7) Si erreur “Connecting to dev server”, collecter dans `/tmp/norma-camera-connect.log` avec la commande grep ciblée  
   et ne corriger que le blocage bloquant suivant.

Si ça passe, confirmer : app en “camera permission” ou aperçu caméra.
