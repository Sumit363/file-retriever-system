#!/bin/sh

npx prisma migrate deploy
node server.js -H 0.0.0.0 >> /app/prisma/prisma/app.log