from typing import Annotated,Optional
from datetime import datetime
from pydantic import BaseModel,Field,EmailStr
from sqlmodel import SQLModel
from sqlalchemy.ext.declarative import declarative_base
from backend.database import engine
Base=declarative_base()

class Disp_blog(BaseModel):
    id: int
    user_id: Optional[int] = None
    title:str
    content:str
    created_at:datetime
    class Config:
        from_attributes=True
        
class Disp_blog_list(Disp_blog):
    blogs:list[Disp_blog]


class Blog(BaseModel):
    id:int
    title:str=Field(max_length=50,default=None,examples=["My First Blog"])
    content:str=Field(default=None,examples=["hey this is my first blog"])
    created_at:datetime
    updated_at:datetime


class BlogCreate(BaseModel):
    id: Optional[int] = None
    title: str = Field(max_length=50, default=None, examples=["My First Blog"])
    content: Optional[str] = Field(default=None, examples=["hey this is my first blog"])
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class BlogUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    
class UserBase(BaseModel):
    username:str
    email:EmailStr
    created_at: Optional[datetime] = None
    
class UserCreate(UserBase):
    password:str

class UserOut(UserBase):
    user_id:int
    is_active:bool
    class Config:
        from_attributes=True
        

    
    


    
    
