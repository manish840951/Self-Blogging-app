from sqlalchemy import create_engine

from sqlalchemy.orm import sessionmaker



url="postgresql+psycopg2://postgres:rJkBu9ea@localhost:5432/postgres"
engine = create_engine(url=url)

Sessionlocal=sessionmaker(bind=engine,autocommit=False,autoflush=False)


