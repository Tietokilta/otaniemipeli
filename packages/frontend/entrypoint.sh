#!/bin/sh
# Generate runtime env config from Docker environment variables.
# This overrides the build-time NEXT_PUBLIC_* values baked into the JS bundle.

cat <<EOF > /app/packages/frontend/public/__env.js
window.__RUNTIME_ENV__ = {
  NEXT_PUBLIC_API_URL: "${NEXT_PUBLIC_API_URL}",
  NEXT_PUBLIC_API_BASE_URL: "${NEXT_PUBLIC_API_BASE_URL}"
};
EOF

exec node server.js
