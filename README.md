# Projet Cantine

Ce projet est divise en 2 parties:

- `backend/`: API Node.js + Express + MongoDB.
- `mobile/`: application Expo / React Native pour les admins et les etudiants.

## Structure utile

### Backend

- `server.js`: point d'entree de l'API.
- `config/`: connexion MongoDB.
- `routes/`: definition des routes HTTP.
- `controllers/`: logique metier appelee par les routes.
- `models/`: schemas Mongoose.
- `services/`: traitements metier reutilisables.
- `middlewares/` et `middleware/`: auth et upload des fichiers.

### Mobile

- `App.js`: point d'entree de l'application.
- `src/navigation/`: navigation entre les ecrans.
- `src/screens/`: interfaces admin et etudiant.
- `src/repositories/`: appels HTTP vers le backend.
- `src/services/`: logique cote mobile au-dessus des repositories.
- `src/context/`: etat global partage.
- `src/utils/`: helpers reutilisables.

## Demarrage

### Backend

```bash
cd backend
npm install
npm run dev
```

### Mobile

```bash
cd mobile
npm install
npm start
```

## Note

Les dossiers `node_modules/` et `.expo/` sont des fichiers generes. Ils peuvent etre recrees avec `npm install` ou `npm start`.
