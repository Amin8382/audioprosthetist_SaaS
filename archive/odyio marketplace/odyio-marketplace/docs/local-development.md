# Odyio Marketplace Local Development

This backend uses three separated configurations:

- Default: normal application configuration, Flyway loads only `classpath:db/migration`.
- Local development: uses `odyio_marketplace` and additionally loads local seed data from `classpath:db/local`.
- Automated tests: use `odyio_marketplace_test` and never write to the local development database.

## Databases

Create the local and test databases in PostgreSQL:

```powershell
createdb -U postgres odyio_marketplace
createdb -U postgres odyio_marketplace_test
```

Equivalent SQL:

```sql
CREATE DATABASE odyio_marketplace;
CREATE DATABASE odyio_marketplace_test;
```

## Environment Variables

Default/local database credentials can stay in `src/main/resources/application.properties` for local work, or be overridden by your IDE if needed.

Tests use these variables when present:

```powershell
$env:MARKETPLACE_TEST_DB_URL="jdbc:postgresql://localhost:5432/odyio_marketplace_test"
$env:MARKETPLACE_TEST_DB_USERNAME="postgres"
$env:MARKETPLACE_TEST_DB_PASSWORD="postgres"
```

If the variables are absent, `src/test/resources/application-test.properties` falls back to the same local defaults.

## Run Locally

Run the backend with the local profile:

```powershell
$env:SPRING_PROFILES_ACTIVE="local"
.\mvnw.cmd spring-boot:run
```

In IntelliJ, add this VM option or environment variable to the run configuration:

```text
-Dspring.profiles.active=local
```

or:

```text
SPRING_PROFILES_ACTIVE=local
```

## Local Seed Data

The local profile configures Flyway with:

```properties
spring.flyway.locations=classpath:db/migration,classpath:db/local
```

The default and test profiles load only:

```properties
spring.flyway.locations=classpath:db/migration
```

Local seed data lives in:

```text
src/main/resources/db/local/R__seed_local_marketplace_data.sql
```

It is a repeatable local-only migration with stable UUIDs for suppliers, clinics, products, quotation requests, and supplier offers.

## Reset Local Database

Use the local reset script only when you want to wipe local development data:

```powershell
.\scripts\reset-local-database.ps1
```

The script refuses to run against any database name other than `odyio_marketplace`. After reset, restart with the local profile so Flyway applies V1, V2, V3 and the local seed data.

Do not run this script against `odyio_marketplace_test`, `postgres`, staging, or production databases.

## Run Tests

Tests use the `test` Spring profile:

```powershell
.\mvnw.cmd test
```

The test profile points to `odyio_marketplace_test`. Integration tests are transactional, so test records roll back after each test and do not persist in either local or test databases.

Automated tests must never use `odyio_marketplace` because that database is reserved for manual development and frontend testing data.
