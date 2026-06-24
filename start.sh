#!/bin/bash
# Start Last-Minute Life Saver (backend + frontend)
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend..."
cd "$ROOT/backend"
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

echo "Starting frontend..."
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend : http://localhost:8000"
echo "Frontend: http://localhost:5173"
echo "API docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers."

cleanup() {
  echo "Stopping..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM
wait
