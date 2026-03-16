# NutriSnap Flutter App (Starter)

This folder contains a starter Flutter client for the existing NutriSnap backend in `nutrisnap/`.

## Features included

- Register + login using `/register` and `/login`
- JWT token persistence with `shared_preferences`
- Dashboard summary using `/summary`
- Meal history using `/history`
- Image upload analysis using `/analyze`

## Prerequisites

- Flutter SDK 3.22+ (Dart 3.3+)
- A running NutriSnap backend (`uvicorn app.main:app --reload --port 3001` in `nutrisnap/`)

## Run the app

```bash
cd nutrisnap-flutter
flutter pub get
flutter run
```

> On Android emulator, use `http://10.0.2.2:3001` as backend URL instead of `127.0.0.1`.

## Suggested next steps

1. Add state management (Riverpod/BLoC/Provider).
2. Add meal confirmation + discard flows (`/meal/{id}/confirm`, `/meal/{id}/discard`).
3. Add profile/community screens.
4. Add robust models + JSON serialization (`freezed` + `json_serializable`).
