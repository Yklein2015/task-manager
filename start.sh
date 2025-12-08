#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║     📋 Task Manager - Starting Application                 ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Start backend
echo "Starting backend server..."
cd backend
node server.js &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "Starting frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  Application Started!                                      ║"
echo "║                                                            ║"
echo "║  Frontend: http://localhost:3000                           ║"
echo "║  Backend:  http://localhost:3001                           ║"
echo "║                                                            ║"
echo "║  Press Ctrl+C to stop all services                         ║"
echo "╚════════════════════════════════════════════════════════════╝"

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
