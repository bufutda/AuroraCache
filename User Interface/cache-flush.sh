#!/usr/bin/env bash
redis-cli -p 6390 -a $(node -e "console.log(require(__dirname + '/secure.json')['db-auth-token']);") flushall
