#!/bin/bash
# Watchdog: keep dev server alive
cd /home/z/my-project
while true; do
  if ! pgrep -f "next dev" > /dev/null; then
    echo "[$(date)] Dev server down, restarting..." >> /tmp/watchdog.log
    pkill -9 -f "next" 2>/dev/null
    sleep 2
    nohup bun run dev </dev/null >/home/z/my-project/dev.log 2>&1 &
    disown
    sleep 10
    if curl -s -o /dev/null http://localhost:3000; then
      echo "[$(date)] Restarted OK" >> /tmp/watchdog.log
    else
      echo "[$(date)] Restart FAILED" >> /tmp/watchdog.log
    fi
  fi
  sleep 30
done
