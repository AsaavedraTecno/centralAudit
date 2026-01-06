<?php

declare(strict_types=1);

namespace App\Tenancy\TenantDatabaseManagers;

use Illuminate\Database\Connection;
use Illuminate\Support\Facades\DB;
use Stancl\Tenancy\Contracts\TenantDatabaseManager;
use Stancl\Tenancy\Contracts\TenantWithDatabase;
use Stancl\Tenancy\Exceptions\NoConnectionSetException;

class SqlServerDatabaseManager implements TenantDatabaseManager
{
    /** @var string */
    protected $connection;

    protected function database(): Connection
    {
        if ($this->connection === null) {
            throw new NoConnectionSetException(static::class);
        }

        return DB::connection($this->connection);
    }

    public function setConnection(string $connection): void
    {
        $this->connection = $connection;
    }

    public function createDatabase(TenantWithDatabase $tenant): bool
    {
        $database = $tenant->database()->getName();
        // Basic CREATE DATABASE for SQL Server
        return $this->database()->statement("CREATE DATABASE [{$database}]");
    }

    public function deleteDatabase(TenantWithDatabase $tenant): bool
    {
        $database = $tenant->database()->getName();
        // Terminate active connections and drop the database
        $this->database()->statement(
            "DECLARE @db NVARCHAR(128) = N'{$database}';\n" .
            "IF EXISTS (SELECT name FROM sys.databases WHERE name = @db) BEGIN\n" .
            "    DECLARE @sql NVARCHAR(MAX);\n" .
            "    SET @sql = 'ALTER DATABASE [' + @db + '] SET SINGLE_USER WITH ROLLBACK IMMEDIATE';\n" .
            "    EXEC(@sql);\n" .
            "END"
        );

        return $this->database()->statement("DROP DATABASE [{$database}]");
    }

    public function databaseExists(string $name): bool
    {
        $result = $this->database()->select("SELECT name FROM sys.databases WHERE name = ?", [$name]);
        return !empty($result);
    }

    public function makeConnectionConfig(array $baseConfig, string $databaseName): array
    {
        $baseConfig['database'] = $databaseName;
        return $baseConfig;
    }
}
