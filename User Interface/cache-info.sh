#!/usr/bin/env bash
HIT=$(redis-cli -p 6390 -a $(node -e "console.log(require(__dirname + '/secure.json')['db-auth-token']);") get cachehit)
MISS=$(redis-cli -p 6390 -a $(node -e "console.log(require(__dirname + '/secure.json')['db-auth-token']);") get cachemiss)
if [ -z "$HIT" ]; then
    HIT="0"
fi
if [ -z "$MISS" ]; then
    MISS="0"
fi
echo "Cache hits: $HIT"
echo "Cache misses: $MISS"
