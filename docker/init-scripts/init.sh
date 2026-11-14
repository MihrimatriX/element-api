#!/bin/sh
# Runs once, on the first start of an empty data volume (postgres entrypoint, initdb.d).
# One database and one login role per service: a service that is compromised, or simply buggy, can reach
# its own data only. The superuser (POSTGRES_USER) stays for this script, backups and operators.
set -eu

create_service_database() { # database, role, password
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
        -v database="$1" -v role="$2" -v password="$3" <<'SQL'
CREATE ROLE :"role" LOGIN PASSWORD :'password';
CREATE DATABASE :"database" OWNER :"role";
REVOKE CONNECT ON DATABASE :"database" FROM PUBLIC;
SQL
}

create_service_database element_identity_db  element_identity  "$DB_PASSWORD_IDENTITY"
create_service_database element_market_db    element_catalog   "$DB_PASSWORD_CATALOG"
create_service_database element_compound_db  element_compound  "$DB_PASSWORD_COMPOUND"
create_service_database element_order_db     element_order     "$DB_PASSWORD_ORDER"
create_service_database element_wallet_db    element_wallet    "$DB_PASSWORD_WALLET"
create_service_database element_inventory_db element_inventory "$DB_PASSWORD_INVENTORY"
create_service_database element_shipment_db  element_shipment  "$DB_PASSWORD_SHIPMENT"
