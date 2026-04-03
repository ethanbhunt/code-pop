#!/bin/bash

set -eu

# Configuration: set your PostgreSQL credentials and database name here
DB_NAME="codepop_database"
DB_USER="postgres"
DB_HOST="localhost"
DB_PORT="5432"

echo "Cleaning out the database: $DB_NAME"
echo "This will drop every table in the public schema and recreate the database contents."
read -r -p "Type DELETE to continue: " confirmation
if [ "$confirmation" != "DELETE" ]; then
    echo "Aborted."
    exit 1
fi

# Step 1: Drop all tables in the public schema
echo "Dropping all tables in database $DB_NAME..."
psql -U $DB_USER -h $DB_HOST -p $DB_PORT -d $DB_NAME -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END \$\$;
"

# Step 2: Run Django migrations to recreate schema
echo "Running Django migrations..."
python manage.py makemigrations
python manage.py migrate
echo "Database cleaned and migrations applied."

python manage.py populate_db


