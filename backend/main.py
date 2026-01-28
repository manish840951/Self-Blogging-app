from backend.dependency import FastAPI,Sessionlocal,Session,engine,Annotated,Depends,OAuth2PasswordBearer
import backend.models as models,backend.schemas as schemas,backend.security_jwt as security_jwt
from backend.routes import blogs_route,user_route
from rich.traceback import install
install(show_locals=True, suppress=["uvicorn", "starlette", "asyncio"])

app=FastAPI()
# start
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
     CORSMiddleware,
     allow_origins=["http://localhost:5500","http://127.0.0.1:5500","http://localhost:8000"],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
   )

# end



app.include_router(blogs_route.router)
app.include_router(user_route.router)
    
@app.get("/")
def root():
    return {"message": "Welcome to the Blogging API"}

    
    
    
    
    

   
    
    