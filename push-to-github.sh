#!/usr/bin/env bash
# push-to-github.sh — Push this repo to your GitHub account.
#
# Usage:
#   ./push-to-github.sh <your-github-username> <repo-name>
#
# Example:
#   ./push-to-github.sh johndoe shortforge
#
# Before running:
#   1. Create an empty repo on GitHub (no README, no .gitignore)
#      URL: https://github.com/new
#   2. Have a Personal Access Token ready (Settings → Developer settings →
#      Personal access tokens → Generate new token with "repo" scope)
#      OR have SSH keys set up with GitHub.
#
set -e

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 <github-username> <repo-name>"
  echo "Example: $0 johndoe shortforge"
  exit 1
fi

USERNAME="$1"
REPO="$2"

echo "🚀 Pushing to github.com/$USERNAME/$REPO"
echo ""

# Check if remote already exists
if git remote get-url origin &> /dev/null; then
  echo "Updating existing origin remote..."
  git remote set-url origin "https://github.com/$USERNAME/$REPO.git"
else
  echo "Adding origin remote..."
  git remote add origin "https://github.com/$USERNAME/$REPO.git"
fi

echo ""
echo "📤 Pushing to GitHub..."
echo "  (You'll be prompted for your GitHub username + Personal Access Token as password)"
echo ""
git push -u origin main

echo ""
echo "✅ Done!"
echo ""
echo "Your repo is live at: https://github.com/$USERNAME/$REPO"
