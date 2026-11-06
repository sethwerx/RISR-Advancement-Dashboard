#!/bin/bash
# Double-click this on a Mac. It serves the dashboard at http://localhost:4173
# and opens it in the default browser. Leave this window open while you use the app.
cd "$(dirname "$0")" || exit 1
PORT=4173
URL="http://localhost:${PORT}/advancement-office.html"

pause() {
  echo
  read -r -p "Press Return to close."
}

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is not installed, so this launcher cannot serve the dashboard."
  echo "Install Python 3, then double-click this file again."
  pause
  exit 1
fi

if [[ -f dist/advancement-office.html ]]; then
  SERVE_DIR="dist"
elif [[ -f advancement-office.html ]]; then
  SERVE_DIR="."
else
  echo "Could not find advancement-office.html."
  echo "Put advancement-office.html in this same folder as Open Advancement Office.command,"
  echo "or keep it at dist/advancement-office.html inside the project folder."
  pause
  exit 1
fi

if lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN >/dev/null 2>&1; then
  open "${URL}"
  echo "Already serving on port ${PORT}. Opened ${URL}."
  echo "Leave the existing server window open."
  pause
  exit 0
fi

python3 -m http.server "${PORT}" --directory "${SERVE_DIR}" >/tmp/advancement-office-server.log 2>&1 &
SERVER_PID=$!
sleep 0.6
if ! kill -0 "${SERVER_PID}" 2>/dev/null; then
  echo "The local server on port ${PORT} did not stay running."
  echo "Last lines from /tmp/advancement-office-server.log:"
  tail -n 20 /tmp/advancement-office-server.log 2>/dev/null || true
  pause
  exit 1
fi

open "${URL}"
echo "Advancement Office is at ${URL}"
echo "Serving the ${SERVE_DIR} folder. Sign in with a @risr.ac.th Google account."
echo "Close this window to stop the server."
trap 'kill "${SERVER_PID}" 2>/dev/null' EXIT
wait "${SERVER_PID}"
