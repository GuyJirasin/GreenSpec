import os
import sys

# Ensure root directory is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app import app

# Vercel ASGI entry point
# All FastAPI endpoints (/api/analyze, /api/tools/*, /api/catalog, /docs) are routed here
