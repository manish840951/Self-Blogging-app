from backend.dependency import FastAPI,Depends,HTTPException,APIRouter,select,SessionDep,OAuth2PasswordRequestForm,OAuth2PasswordBearer
from backend.dependency import PasswordHash,Annotated
from datetime import datetime,timezone
from typing import List
import backend.schemas as schemas,backend.models as models,backend.security_jwt as security_jwt,jwt
import backend.models as models,backend.schemas as schemas
password_hash=PasswordHash.recommended()

router=APIRouter(tags=["user"])

@router.post("/create_user",response_model=schemas.UserOut,status_code=200)
def create_user(request:schemas.UserCreate,db:SessionDep):
    hashed_password=password_hash.hash(request.password)
    # ensure created_at exists; use server time if client didn't provide it
    created_at_val = request.created_at or datetime.now(timezone.utc)
    new_user=models.user(email=request.email,username=request.username,
                         hashed_password=hashed_password, created_at=created_at_val)

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/blog_user",response_model=List[schemas.Disp_blog])
def get_bg_user(db:SessionDep,active_user:Annotated[models.user,Depends(security_jwt.get_current_user)]):
    # return only blogs that are not soft-deleted
    command = select(models.blog).where(models.blog.user_id == active_user.user_id, models.blog.is_deleted == False)
    result = db.execute(command)
    blogs = result.scalars().all()
    return blogs
    
    
@router.post("/login")
def login(form_data:Annotated[OAuth2PasswordRequestForm,Depends()],db:SessionDep):
    command=select(models.user).where(models.user.username==form_data.username)
    result=db.execute(command)
    query=result.scalars().first()
 
    if not query:
        raise HTTPException(status_code=401,detail="Invalid username")
    flag=password_hash.verify(form_data.password,query.hashed_password)
    if not flag:
        raise HTTPException(status_code=401,detail="Invalid password")
    
    access_token=security_jwt.create_access_token(data={"sub":form_data.username})
    token_type="bearer"
    return {"access_token": access_token, "token_type": "bearer"}

