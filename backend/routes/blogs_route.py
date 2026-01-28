from backend.dependency import SessionDep,oauth2_scheme, FastAPI,Depends,HTTPException,APIRouter
from backend.dependency import select,func,DateTime,Annotated
import backend.database as database,backend.models as models,backend.schemas as schemas
import backend.security_jwt as security_jwt


router=APIRouter(tags=["blogs"])

@router.post("/post",response_model=schemas.Disp_blog,status_code=201)
def post(bg:schemas.BlogCreate,db:SessionDep,token:Annotated[str,Depends(oauth2_scheme)],active_user:Annotated[models.user,Depends(security_jwt.get_current_user)]):
    provided_id = bg.id
    if provided_id is not None:
        query = db.get(models.blog, provided_id)
        if query and not query.is_deleted:
            raise HTTPException(status_code=409, detail=f"Blog with id:{provided_id} already exist")
        if query:
            query.is_deleted = False
            query.title = bg.title
            query.content = bg.content
            query.updated_at = func.now()
            db.commit()
            db.refresh(query)
            return query

    if provided_id is not None:
        new_blog = models.blog(id=provided_id, title=bg.title, content=bg.content, user_id=active_user.user_id)
    else:
        new_blog = models.blog(title=bg.title, content=bg.content, user_id=active_user.user_id)

    db.add(new_blog)
    db.commit()
    db.refresh(new_blog)
    return new_blog

@router.get("/blog_by_id/{id}",response_model=schemas.Disp_blog,status_code=200)
def fetch(id:int,db:SessionDep):
    query=db.get(models.blog,id)
    if not query or query.is_deleted:
        raise HTTPException(status_code=404,detail=f"BLOG with id:{id} not found")
    return query

@router.get("/title/{title}")
def fetch_title(title:str,db:SessionDep):
    command=select(models.blog).where(models.blog.title.contains(title),models.blog.is_deleted==False)
    result=db.execute(command)
    query=result.scalars().all()
    if not query:
        raise HTTPException(status_code=404,detail="blog not found")
    return query

@router.patch("/update/{id}",status_code=201)
def update(id:int,request:schemas.BlogUpdate,db:SessionDep,active_user:Annotated[models.user,Depends(security_jwt.get_current_user)]):
    query=db.get(models.blog,id)
    if not query:
        raise HTTPException(status_code=404,detail=f"Blog with id {id} does not exist to update")
    # only the blog owner may update
    if query.user_id != active_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this blog")
    # Only allow updating mutable fields. Ignore any `id`, `user_id`, timestamps or deletion flags
    updated_data = request.model_dump(exclude_unset=True)
    protected = {"id", "user_id", "created_at", "updated_at", "is_deleted"}
    # Keep only allowed keys (title, content) to be safe
    for key in list(updated_data.keys()):
        if key in protected or key not in ("title", "content"):
            updated_data.pop(key, None)

    # Apply allowed updates
    for key, value in updated_data.items():
        setattr(query, key, value)
    db.add(query)
    db.commit()
    db.refresh(query)
    return query


@router.patch("/undo/{id}",response_model=schemas.Disp_blog,status_code=201)
def undo_del(id:int,db:SessionDep,active_user:Annotated[models.user,Depends(security_jwt.get_current_user)]):
    query=db.get(models.blog,id)
    if not query:
        raise HTTPException(status_code=404,detail="No blog found to undo")
    if query.user_id != active_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to undo this blog")
    query.is_deleted=False
    db.add(query)
    db.commit()
    db.refresh(query)
    return query

@router.delete("/delete/{id}",status_code=200)
def delete(id:int,db:SessionDep,active_user:Annotated[models.user,Depends(security_jwt.get_current_user)]):
    query=db.get(models.blog,id)
    if not query:
        raise HTTPException(status_code=404,detail="blog not found")
    if query.user_id != active_user.user_id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this blog")
    query.is_deleted=True
    db.add(query)
    db.commit()
    db.refresh(query)
    return {"detail":"Blog deleted successfully; to undo the operation call /undo/{id}"}
