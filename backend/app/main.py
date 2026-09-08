from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.supabase import get_supabase_client

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
)

# CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/health/supabase")
def supabase_health_check():
    """Verify backend Supabase configuration and client initialization."""
    supabase_url = settings.SUPABASE_URL
    supabase_service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not supabase_url or not supabase_service_key:
        return {
            "status": "unconfigured",
            "supabase": "missing_credentials",
        }

    try:
        _ = get_supabase_client()
        return {
            "status": "configured",
            "supabase": "client_initialized",
        }
    except ValueError:
        return {
            "status": "unconfigured",
            "supabase": "missing_credentials",
        }
    except RuntimeError:
        return {
            "status": "configured",
            "supabase": "library_not_installed",
        }
    except Exception:
        return {
            "status": "error",
            "supabase": "connection_failed",
        }
