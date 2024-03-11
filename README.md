# Moissonneur bal

Service de moissonnage des Bases Adresses Locales

## Documentation

https://adresse-data-gouv-fr.gitbook.io/bal/moissonneur

## Pré-requis

- [Node.js](https://nodejs.org) 16+
- [yarn](https://www.yarnpkg.com)
- [MongoDB](https://www.mongodb.com) 4+

## Utilisation

### Installation

Installation des dépendances Node.js

```
yarn
```

Créer les variables d'environnement

```bash
cp .env.sample .env
```

On pourra ensuite éditer les variables d'environnement dans le fichier `.env` si nécessaire.

### Lancement du moissonnage

```bash
yarn worker
```

### Lancement du serveur de l'API (sur le port 5000 par default)

```bash
yarn start
```

### Test

Rapport des tests (ava) :

```
$ yarn test-unit
```

### Linter

Rapport du linter (xo) :

```
$ yarn lint
```

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable | Description |
| --- | --- |
| `MONGODB_URL` | Paramètre de connexion à MongoDB |
| `MONGODB_DBNAME` | Nom de la base de données à utiliser |
| `PORT` | Port de l'api |
| `SLACK_TOKEN` | Jeton Slack permettant la publication de messages lors du moissonnage |
| `SLACK_CHANNEL` | Canal recevant les messages à publier |
| `ADMIN_TOKEN` | Jeton nécessaire au contrôle du moissonneur via l'API |
| `API_DEPOT_URL` | URL de l'api de depot |
| `API_DEPOT_CLIENT_ID` | ID du client `moissonneur` de l'api depot |
| `API_DEPOT_CLIENT_SECRET` | TOKEN du client `moissonneur` de l'api depot |
| `URL_API_DATA_GOUV` | URL de l'api data.gouv pour récupérer les datasets et organisation |
|---|---|
| `S3_ENDPOINT`| URL de base du serveur S3 |
| `S3_REGION`| région du S3 |
| `S3_CONTAINER_ID`| Id du container S3 |
| `S3_USER`| User S3 |
| `S3_ACCESS_KEY`| Clef d'accès S3 |
| `S3_SECRET_KEY`| Clef secrete S3 |
| `S3_DESCRIPTION`| |


## Licence

MIT
