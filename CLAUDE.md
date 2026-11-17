# CLAUDE.md

Service de moissonnage des Bases Adresses Locales : récupère les BAL publiées sur data.gouv.fr par les organisations (sources), les valide puis les publie sur api-depot au nom de l'organisation. Expose aussi une API (sources, organisations, moissonnages, révisions) consommée par bal-admin et mes-adresses.

## Commandes

```bash
yarn                         # install (yarn uniquement)
cp .env.sample .env
yarn dev                     # API + worker en watch
yarn dev:api                 # API seule (MODE=api, sans worker)
yarn build && yarn start
yarn lint                    # eslint --fix
yarn test                    # jest (testcontainers Postgres → Docker requis)
yarn test src/modules/worker/tests/harvesting.spec.ts
yarn typeorm:migration:run
yarn typeorm:migration:down
yarn typeorm migration:generate migrations/<nom> -d ./typeorm.config.ts
```

Node 24 (`engines`).

## Architecture

NestJS + TypeORM/Postgres.

- `src/modules/worker/` : tâches de fond. `worker.service.ts` pousse des tâches via `@Interval` dans `queue/` (file d'exécution séquentielle en mémoire). Les workers sont dans `workers/` :
  - `update_source_organization.worker.ts` : synchronise sources et organisations depuis data.gouv.fr ;
  - `harvesting.worker.ts` + `harvesting/` (`handle_file.ts`, `handle_commune.ts`) : télécharge le fichier, le valide (`@ban-team/validateur-bal`), le découpe par commune et publie sur api-depot ;
  - `clean_stalled_harvests.worker.ts` : débloque les moissonnages bloqués.
- Le `WorkerService` n'est **pas** chargé si `MODE=api` (`worker.module.ts`).
- `src/modules/source/`, `organization/` (+ `perimeters.entity.ts`), `harvest/`, `revision/` (+ `commune.controller.ts`), `file/` : entités et API REST.
- `src/modules/api_depot/`, `bal_admin/`, `api_beta_gouv/` : clients HTTP externes.
- `src/lib/utils/` : utilitaires (signature de fichier, périmètres) testés dans `lib/utils/tests/`.

## Points d'attention

- `synchronize: false` : toute modif d'entité → migration dans `migrations/` (+ entité déclarée dans `typeorm.config.ts`).
- Une organisation ne peut publier que dans son périmètre (`perimeters`) : vérifier la logique de périmètre lors de toute modif de publication.
- Le moissonneur publie en prod sur api-depot : ne jamais lancer le worker en local avec un `.env` pointant vers l'api-depot de prod.
