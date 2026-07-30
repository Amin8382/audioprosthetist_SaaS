<#
Destructive local-development utility for Odyio Marketplace.

This script is intended only for the local development database:
  odyio_marketplace

It drops and recreates the public schema. After running it, start the
application with the local profile so Flyway applies V1, V2, V3 and the
local repeatable seed migration.

It refuses to run against odyio_marketplace_test, postgres, or any database
name other than odyio_marketplace.
#>

param(
    [string] $HostName = "localhost",
    [int] $Port = 5432,
    [string] $DatabaseName = "odyio_marketplace",
    [string] $Username = "postgres"
)

if ($DatabaseName -ne "odyio_marketplace") {
    throw "Refusing to reset database '$DatabaseName'. This script may only target odyio_marketplace."
}

if ($DatabaseName -eq "odyio_marketplace_test" -or $DatabaseName -eq "postgres") {
    throw "Refusing to reset protected database '$DatabaseName'."
}

Write-Host "WARNING: dropping and recreating schema public in local database '$DatabaseName'."
Write-Host "Press Ctrl+C now to cancel, or wait 5 seconds to continue."
Start-Sleep -Seconds 5

psql `
    --host $HostName `
    --port $Port `
    --username $Username `
    --dbname $DatabaseName `
    --command "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
