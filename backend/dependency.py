from fastapi import FastAPI,Depends,HTTPException,APIRouter
from sqlmodel import Session,SQLModel,Relationship
from backend.database import Sessionlocal,engine
from fastapi.security import OAuth2PasswordRequestForm,OAuth2PasswordBearer
from typing import Annotated
from sqlalchemy import select,func,DateTime
from pwdlib import PasswordHash
from datetime import datetime,timedelta,timezone
from jwt.exceptions import InvalidTokenError
import backend.models as models



models.Base.metadata.create_all(engine)

def get_db():
    db=Sessionlocal()
    try:
        yield db
    finally:
        db.close()

SessionDep=Annotated[Session,Depends(get_db)]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")