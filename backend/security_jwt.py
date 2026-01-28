from datetime import datetime, timedelta, timezone
import jwt 
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from backend.dependency import oauth2_scheme,SessionDep,select
import backend.models as models

Secret_key="1838f4024675789b383eecbb5a1287131b3b8c05cfb25c4172a0c05991d950b4"
Algorithm="HS256"

def create_access_token(data:dict):
    # sort of variable only where it copies data
    token=data.copy()
    expire=datetime.now(timezone.utc)+timedelta(minutes=10)
    token.update({"exp":expire})
    encoded_token=jwt.encode(data,Secret_key,algorithm=Algorithm)
    return encoded_token    

def get_current_user(db:SessionDep,token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # 1. Decode the JWT
        payload = jwt.decode(token, Secret_key, algorithms=[Algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError as e:
        raise credentials_exception

    # 2. Get user from DB
    person=db.query(models.user).filter(models.user.username==username).first()
    # blog = db.query(models.blog).filter(models.blog.id == 5).first()
   
    if person is None:
        raise credentials_exception
        
    return person # This is what 'current_user' becomes in your route