# @etalab/adresses-locales

Agrégation des bases Adresse locales

➡️ Plus d'informations sur [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/5cc718ff634f4170dd8ba0ca/).

## Pré-requis

* Node.js 14 ou supérieur
* MongoDB 4 ou supérieur
* Yarn

## Utilisation

### Installer les dépendances

```bash
yarn
```

### Création du fichier de définition des variables d'environnement
```bash
cp .env.sample .env
```

| Nom de la variable | Description |
| --- | --- |
| `MONGODB_URL` | Paramètre de connexion à MongoDB |
| `MONGODB_DBNAME` | Nom de la base de données à utiliser |
| `SLACK_TOKEN` | Jeton Slack permettant la publication de messages lors du moissonnage |
| `SLACK_CHANNEL` | Canal recevant les messages à publier |
| `ADMIN_TOKEN` | Jeton nécessaire au contrôle du moissonneur via l'API |

### Lancement du moissonnage
```bash
yarn worker
```

### Lancement du serveur de l'API (dans un autre terminal)
```bash
yarn start
```

## Documentation API

Les requêtes nécessitant un jeton doivent utiliser l'en-tête HTTP `Authorization`
>Exemple : 
>`Authorization: Token f66gdjfehfv66DBD`

### Points d'accès

### `/sources`
- `GET` : Liste les sources

### `/sources/{sourceId}`
- `GET` : Retourne les informations de la source
- `PUT` : Modifie la source *

### `/sources/{sourceId}/harvest`
- `POST` : Déclenche le moissonnage d'une source *

### `/sources/{sourceId}/harvests`
- `GET` : Retourne les 10 derniers moissonnages d'une source

### `/harvest/{harvestId}`
- `GET` : Retourne les informations d'un moissonnage

### `/files/{fileId}/download`
- `GET` : Télécharge un fichier un fonction de son id

**Nécessite un jeton*

## Licence

MIT
