#!/bin/bash
# Runs once, when the Postgres volume is first created. Table-level SELECT grants are
# applied by Django (`manage.py grant_storefront_access`) after each migrate.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v role="$STOREFRONT_DB_USER" -v pass="$STOREFRONT_DB_PASSWORD" <<'EOSQL'
CREATE ROLE :"role" LOGIN PASSWORD :'pass';
EOSQL
