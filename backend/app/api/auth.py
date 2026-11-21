from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserResponse
from app.auth.security import get_password_hash, verify_password, create_access_token
from app.auth.dependencies import get_current_user
from app.services.institution import normalize_email
from sqlalchemy import func

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    # Public registration NEVER allows self-assignment of faculty/admin privileges.
    if user_in.role != UserRole.STUDENT:
        raise HTTPException(status_code=403, detail="Only student accounts can self-register. Ask an administrator to create faculty or admin accounts.")
    email = normalize_email(user_in.email)
    existing = db.query(User).filter(func.lower(User.email) == email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already registered"
        )
    
    # Hash password & create user
    hashed_pwd = get_password_hash(user_in.password)
    user = User(
        name=user_in.name,
        email=email,
        password_hash=hashed_pwd,
        role=UserRole.STUDENT,
        department=user_in.department,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue JWT token
    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(credentials: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(func.lower(User.email) == str(credentials.email).lower()).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    is_valid = verify_password(credentials.password, user.password_hash)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)
