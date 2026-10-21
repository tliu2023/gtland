#!/bin/sh
# Runs on every container start so a deploy is just `docker compose up -d --build`.
set -e

python manage.py migrate --noinput
python manage.py createcachetable
python manage.py collectstatic --noinput --verbosity 0

if [ -n "$STOREFRONT_DB_USER" ]; then
  python manage.py grant_storefront_access "$STOREFRONT_DB_USER"
fi

exec "$@"
