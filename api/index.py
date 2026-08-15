# api/index.py — Vercel serverless entry point
import sys
import os

# The Django project lives in the "core" folder, not "backend" —
# the original path here was pointing at a folder that doesn't exist.
sys.path.append(os.path.join(os.path.dirname(__file__), '../core'))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

from core.wsgi import application

# Vercel requires an app/handler entrypoint
app = application
