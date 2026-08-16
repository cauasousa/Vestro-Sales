from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""
    frontend_origin: str = "http://localhost:3000"
    sales_model_path: str = "app/ml/saved_models/lgb_sales_model.pkl"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-flash-latest"
    resend_api_key: str = ""
    resend_from_email: str = "onboarding@resend.dev"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
