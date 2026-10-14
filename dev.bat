@echo off
set NODE_ENV=development
node ./node_modules/tsx/dist/cli.mjs watch server/_core/index.ts
