#!/bin/sh
set -eu

echo "Applying database migrations..."
npm run db:migrate
