#!/bin/bash
# Double-click this on a Mac. It serves the dashboard at http://localhost:4173
# and opens it in the default browser. Leave this window open while you use the app.
cd "$(dirname "$0")" || exit 1
PORT=4173
URL="http://localhost:${PORT}/advancement-office.html"

if [[ ! -f dist/advancement-office.html ]]; then
  echo "Missing dist/advancement-office.html. Run npm run standalone from this folder first."
  read -r -p "Press Return to close."
  exit 1
fi

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  open "${URL}"
  echo "Already serving on port ${PORT}. Opened ${URL}."
  echo "Leave the existing server window open."
  read -r -p "Press Return to close this window."
  exit 0
fi

python3 -m http.server "${PORT}" --directory dist >/tmp/advancement-office-server.log 2>&1 &
SERVER_PID=$!
sleep 0.6
open "${URL}"
echo "Advancement Office is at ${URL}"
echo "Sign in with a @risr.ac.th Google account. Close this window to stop the server."
trap 'kill "${SERVER_PID}" 2>/dev/null' EXIT
wait "${SERVER_PID}"
