@echo off
REM Starts a local postgres via docker-compose and runs integration tests (Windows)
setlocal
set DB_URL=postgres://test:test@localhost:5432/testdb
set DATABASE_URL_TEST=%DB_URL%
docker compose up -d db
REM Wait for Postgres to be ready (simple loop)
for /l %%i in (1,1,30) do (
  echo Waiting for Postgres (attempt %%i)...
  powershell -Command "try{ $c = New-Object Npgsql.NpgsqlConnection('%DB_URL%'); $c.Open(); $c.Close(); exit 0 } catch { exit 1 }" 2>nul
  if NOT ERRORLEVEL 1 goto :dbready
  ping -n 2 127.0.0.1 > nul
)
echo Postgres did not become ready in time
exit /b 1
:dbready
echo Postgres ready
set DATABASE_URL_TEST=%DB_URL%
REM Run migrations (requires prisma installed)
	npm run prisma:migrate:deploy || echo "prisma migrate failed (ensure prisma client is built)"
REM Run integration tests
set NODE_ENV=test
node -r ./scripts/use-test-db.cjs ./node_modules/vitest/vitest.mjs run --dir test/integration
endlocal
