import os
from dotenv import load_dotenv

load_dotenv()


def _build_mysql_uri_from_env() -> str:
    host = os.environ.get('MYSQL_HOST')
    user = os.environ.get('MYSQL_USER')
    password = os.environ.get('MYSQL_PASSWORD', '')
    db = os.environ.get('MYSQL_DB')
    if host and user and db:
        return f"mysql+pymysql://{user}:{password}@{host}/{db}"
    return ''


class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    # Priority: DATABASE_URL -> MYSQL_* -> fallback sqlite (dev-friendly)
    _db_url = os.environ.get('DATABASE_URL') or _build_mysql_uri_from_env()
    if not _db_url:
        _db_url = 'sqlite:///instance/smartedu.db'
    SQLALCHEMY_DATABASE_URI = _db_url
    SQLALCHEMY_TRACK_MODIFICATIONS = False


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}
