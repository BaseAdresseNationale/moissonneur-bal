# Moissonneur bal

Service de moissonnage des Bases Adresses Locales

## 📚 Documentation

Une documentation plus complète et des guides d’utilisation sont disponibles dans le [Wiki](https://github.com/BaseAdresseNationale/moissonneur-bal/wiki).

## Pré-requis

- [Node.js](https://nodejs.org) 22
- [yarn](https://www.yarnpkg.com)
- [PostgresSQL](https://www.postgresql.org/)

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

### Développement

Lancer l'application (worker + api) :

```
$ yarn dev
```

Lancer seulement l'api :

```
$ yarn dev:api
```

### Production

Créer une version de production :

```
$ yarn build
```

Démarrer l'application (port 7000 par défaut) :

```
$ yarn start
```

### Test

Rapport des tests (jest) :

```
$ yarn test
```

### Linter

Rapport du linter (eslint) :

```
$ yarn lint
```

## Configuration

Cette application utilise des variables d'environnement pour sa configuration.
Elles peuvent être définies classiquement ou en créant un fichier `.env` sur la base du modèle `.env.sample`.

| Nom de la variable        | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `POSTGRES_URL`            | Paramètre de connexion à Postgres                                  |
| `PORT`                    | Port de l'api                                                      |
| `ADMIN_TOKEN`             | Jeton nécessaire au contrôle du moissonneur via l'API              |
| `API_DEPOT_URL`           | URL de l'api de depot                                              |
| `API_DEPOT_CLIENT_ID`     | ID du client `moissonneur` de l'api depot                          |
| `API_DEPOT_CLIENT_SECRET` | TOKEN du client `moissonneur` de l'api depot                       |
| `URL_API_DATA_GOUV`       | URL de l'api data.gouv pour récupérer les datasets et organisation |
| ---                       | ---                                                                |
| `S3_ENDPOINT`             | URL de base du serveur S3                                          |
| `S3_REGION`               | région du S3                                                       |
| `S3_CONTAINER_ID`         | Id du container S3                                                 |
| `S3_ACCESS_KEY`           | Clef d'accès S3                                                    |
| `S3_SECRET_KEY`           | Clef secrete S3                                                    |
| `S3_DESCRIPTION`          |                                                                    |

## Licence

MIT
