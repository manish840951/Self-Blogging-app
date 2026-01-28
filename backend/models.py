from sqlalchemy import String,Integer,Column,ForeignKey,DateTime,func,Index,Boolean
from sqlalchemy.orm import Relationship,Mapped,mapped_column
from backend.schemas import Base
from typing import List,Optional

    
class user(Base):
    __tablename__ = "user_table"
    # Use mapped_column instead of Column
    user_id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Use Mapped[List["blog"]] so SQLAlchemy knows this is a relationship
    blogs: Mapped[List["blog"]] = Relationship(back_populates="author")

class blog(Base):
    __tablename__ = "blog_table"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    content: Mapped[str] = mapped_column(String)
    
    # Pointing to the table "USER" and column "user_id"
    user_id: Mapped[int] = mapped_column(Integer,ForeignKey("user_table.user_id"))
    
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(),onupdate=func.now())
    
    author: Mapped[Optional["user"]] = Relationship(back_populates="blogs")