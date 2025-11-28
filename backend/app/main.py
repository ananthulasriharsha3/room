from __future__ import annotations

import asyncio
import os
import re
import smtplib
import ssl
import time
from datetime import date, datetime, timedelta, timezone
from email.message import EmailMessage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from io import BytesIO
from itertools import count
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator, Callable, Dict, List, Optional, TypeVar

from dateutil.parser import isoparse
from dateutil.relativedelta import relativedelta
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from PIL import Image
from pydantic import BaseModel, EmailStr, Field, ValidationError, validator
from pytesseract import image_to_string
from supabase import Client, create_client


DEFAULT_TASKS: List[str] = [
    "Cooking",
    "Dishes Washing",
    "Cutting & Rice",
]

DEFAULT_PERSONS: List[str] = [
    "Person 1",
    "Person 2",
    "Person 3",
]


SUPABASE_URL = os.getenv(
    "SUPABASE_URL",
    "https://rbkaydwtrhutrfyxidxo.supabase.co",
)
SUPABASE_ANON_KEY = os.getenv(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJia2F5ZHd0cmh1dHJmeXhpZHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1MDgzMDgsImV4cCI6MjA3ODA4NDMwOH0.DxySA23-6-9BinbqNkefKYxd8Nn2WPzQYA8-4g8Sttg",
)


def _init_supabase_client() -> Client:
    """Initialize Supabase client. Raises error if configuration is missing."""
    if not SUPABASE_URL or not SUPABASE_ANON_KEY:
        raise ValueError(
            "Supabase configuration is required. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
        )
    try:
        return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)
    except Exception as error:
        raise ValueError(
            f"Failed to initialize Supabase client: {error}. Please check your SUPABASE_URL and SUPABASE_ANON_KEY."
        ) from error


supabase_client: Client = _init_supabase_client()


def _recreate_supabase_client() -> None:
    """Recreate the Supabase client to fix connection issues."""
    global supabase_client
    supabase_client = _init_supabase_client()


def _is_connection_error(error: Exception) -> bool:
    """Check if an error is a Supabase connection error."""
    error_msg = str(error)
    error_lower = error_msg.lower()
    return (
        "PROTOCOL_ERROR" in error_msg
        or "ConnectionTerminated" in error_msg
        or "COMPRESSION_ERROR" in error_msg
        or "StreamInputs" in error_msg
        or "stream" in error_lower
        or ("state" in error_lower and ("invalid" in error_lower or "error" in error_lower))
        or "disconnected" in error_lower
        or "connection" in error_lower
        or "server disconnected" in error_lower
        or "compression" in error_lower
    )


def _handle_supabase_error(error: Exception, operation: str = "database operation") -> HTTPException:
    """Handle Supabase errors with user-friendly messages."""
    if _is_connection_error(error):
        return HTTPException(
            status_code=502,
            detail=f"Database connection error during {operation}. Please try again in a moment.",
        )
    
    # Check for schema errors (missing columns)
    error_str = str(error)
    error_lower = error_str.lower()
    if ("does not exist" in error_lower or 
        ("column" in error_lower and ("42703" in error_str or "not found" in error_lower))):
        # Check if it's specifically the is_completed column
        if "is_completed" in error_str.lower():
            return HTTPException(
                status_code=502,
                detail=f"Database schema error during {operation}. The database is missing the 'is_completed' column. Please run the migration script: backend/migrations/add_is_completed_column.sql in your Supabase SQL editor.",
            )
        return HTTPException(
            status_code=502,
            detail=f"Database schema error during {operation}. The database is missing required columns. Please check the README.md for migration instructions.",
        )
    
    # Extract a more meaningful error message
    error_msg = error_str
    if not error_msg or error_msg.strip() == "":
        error_msg = f"Unknown database error (type: {type(error).__name__})"
    elif len(error_msg) < 5 and error_msg.isdigit():
        # Handle numeric error codes
        error_msg = f"Database error code: {error_msg}"
    
    return HTTPException(status_code=502, detail=f"Database error during {operation}: {error_msg}")


T = TypeVar("T")


def _retry_supabase_operation(
    operation: Callable[[], T],
    max_retries: int = 3,
    initial_delay: float = 0.5,
    operation_name: str = "database operation",
) -> T:
    """Retry a Supabase operation with exponential backoff on connection errors."""
    last_error = None
    for attempt in range(max_retries):
        try:
            return operation()
        except Exception as error:
            last_error = error
            if not _is_connection_error(error):
                # Not a connection error, don't retry
                raise _handle_supabase_error(error, operation_name) from error
            
            # If it's a connection error and we have retries left, recreate the client
            if attempt < max_retries - 1:
                # Recreate the client to fix connection issues
                _recreate_supabase_client()
                # Calculate delay with exponential backoff
                delay = initial_delay * (2 ** attempt)
                time.sleep(delay)
                continue
            else:
                # Last attempt failed
                raise _handle_supabase_error(error, operation_name) from error
    
    # Should never reach here, but just in case
    if last_error:
        raise _handle_supabase_error(last_error, operation_name) from last_error
    raise HTTPException(status_code=502, detail=f"Failed to complete {operation_name} after {max_retries} attempts.")
EXPENSES_TABLE = "expenses"
SETTINGS_TABLE = "settings"
SHOPPING_ITEMS_TABLE = "shopping_items"
USERS_TABLE = "users"
DAY_NOTES_TABLE = "day_notes"
STOCK_ITEMS_TABLE = "stock_items"
GROCERY_PURCHASES_TABLE = "grocery_purchases"
SCHEDULES_TABLE = "schedules"
DEFAULT_SETTINGS_ID = "default"
JWT_SECRET = os.getenv("JWT_SECRET", "change-this-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "ananthulasriharsha3@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "xnki emje kawx veah")
SENDER_EMAIL = os.getenv("SENDER_EMAIL", SMTP_USERNAME)
SMTP_USE_TLS = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
SMTP_USE_SSL = os.getenv("SMTP_USE_SSL", "false").lower() == "true"


class ScheduleRequest(BaseModel):
    year: int = Field(default_factory=lambda: datetime.now().year, ge=1900, le=2100)
    month: Optional[int] = Field(default=None)
    persons: Optional[List[str]] = Field(default=None, min_items=1)
    tasks: Optional[List[str]] = Field(default=None, min_items=1)

    @validator("month")
    def month_valid_range(cls, value: Optional[int]) -> Optional[int]:
        if value is not None and (value < 1 or value > 12):
            raise ValueError("Month must be between 1 and 12")
        return value

    @validator("persons")
    def non_empty_strings(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        cleaned = [name.strip() for name in value if name.strip()]
        if not cleaned:
            raise ValueError("At least one person name is required.")
        return cleaned

    @validator("tasks")
    def tasks_non_empty(cls, value: Optional[List[str]]) -> Optional[List[str]]:
        if value is None:
            return value
        cleaned = [task.strip() for task in value if task.strip()]
        if not cleaned:
            raise ValueError("At least one task name is required.")
        return cleaned


class ExpenseEntry(BaseModel):
    person: str
    amount: float = Field(..., gt=0)
    description: str = Field(default="")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @validator("person")
    def validate_person(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Person name cannot be empty.")
        return cleaned


class ExpenseResponse(BaseModel):
    id: int
    person: str
    amount: float
    description: str
    timestamp: datetime
    month_closed: Optional[str] = None


class DailyAssignment(BaseModel):
    date: date
    day_name: str
    assignments: Dict[str, str]
    note: Optional[str] = None


class ScheduleResponse(BaseModel):
    persons: List[str]
    tasks: List[str]
    days: List[DailyAssignment]


class SettingsPayload(BaseModel):
    persons: List[str] = Field(default_factory=list, min_items=1)
    tasks: List[str] = Field(default_factory=list, min_items=1)

    @validator("persons", each_item=True)
    def persons_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Person name cannot be empty.")
        return cleaned

    @validator("tasks", each_item=True)
    def tasks_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Task name cannot be empty.")
        return cleaned


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


class TokenData(BaseModel):
    sub: str
    email: EmailStr
    display_name: str
    is_admin: bool = False
    has_access: bool = False


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)

    @validator("display_name")
    def display_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Display name cannot be empty.")
        return cleaned


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    is_admin: bool = False
    has_access: bool = False


class PasswordResetRequest(BaseModel):
    email: EmailStr
    new_password: str = Field(..., min_length=6, max_length=128)


class ShoppingItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)

    @validator("name")
    def name_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Item name cannot be empty.")
        return cleaned


class ShoppingItemVote(BaseModel):
    person: Optional[str] = None

    @validator("person")
    def person_not_blank(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Person name cannot be empty.")
        return cleaned


class ShoppingItemResponse(BaseModel):
    id: int
    name: str
    votes: Dict[str, int]
    total_votes: int
    created_at: datetime
    created_by: str
    creator_name: Optional[str] = None
    is_completed: bool = False


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    print("Application startup...")
    try:
        # Any startup tasks can go here
        yield
    except asyncio.CancelledError:
        # Cancellation during reload/shutdown is expected - allow it to propagate
        # This is necessary for uvicorn to properly handle shutdown
        raise
    except KeyboardInterrupt:
        # Keyboard interrupt - allow shutdown to proceed
        raise
    except Exception as e:
        # Log other exceptions but still allow shutdown
        print(f"Error during application lifecycle: {e}")
        raise
    finally:
        # Shutdown - always runs unless cancelled
        try:
            print("Application shutdown complete.")
        except (asyncio.CancelledError, KeyboardInterrupt):
            # Cancellation during shutdown is expected - just continue
            pass
        except Exception:
            # Ignore other errors during shutdown
            pass


app = FastAPI(title="Room Duties & Expenses API", lifespan=lifespan)

# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://localhost:3000"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _generate_month_dates(year: int, month: int) -> List[date]:
    start = date(year, month, 1)
    end = start + relativedelta(months=1)
    days: List[date] = []
    current = start
    while current < end:
        days.append(current)
        current += timedelta(days=1)
    return days


def _generate_year_dates(year: int) -> List[date]:
    start = date(year, 1, 1)
    end = date(year + 1, 1, 1)
    days: List[date] = []
    current = start
    while current < end:
        days.append(current)
        current += timedelta(days=1)
    return days


def _rotate_assignments(
    persons: List[str],
    tasks: List[str],
    task_counts: Dict[str, Dict[str, int]],
    weekday_index: int,
) -> Dict[str, str]:
    """
    Assign tasks to persons based on a 3-day cyclic rotation pattern.
    This matches the exact pattern shown in the user's schedule images.
    
    Pattern (for 3 persons and 3 tasks):
    - Day 0 (first weekday): Task[0]→Person[0], Task[1]→Person[1], Task[2]→Person[2]
    - Day 1 (second weekday): Task[0]→Person[1], Task[1]→Person[2], Task[2]→Person[0]
    - Day 2 (third weekday): Task[0]→Person[2], Task[1]→Person[0], Task[2]→Person[1]
    - Day 3 (fourth weekday): Repeats Day 0 pattern
    
    Example with persons=[Dinesh, Harsha, Srinivas] and tasks=[Cooking, Dish Washing, Cutting & Rice]:
    - Day 0: Cooking→Dinesh, Dish Washing→Harsha, Cutting & Rice→Srinivas
    - Day 1: Cooking→Harsha, Dish Washing→Srinivas, Cutting & Rice→Dinesh
    - Day 2: Cooking→Srinivas, Dish Washing→Dinesh, Cutting & Rice→Harsha
    - Day 3: Repeats Day 0
    """
    assignments: Dict[str, str] = {}
    
    if len(persons) == 0 or len(tasks) == 0:
        return assignments
    
    # Use modulo 3 for the 3-day cycle (works for any number of persons/tasks)
    cycle_index = weekday_index % len(persons) if len(persons) > 0 else 0
    
    # Assign each task to a person based on the cycle
    # Each task gets assigned to persons[(task_index + cycle_index) % len(persons)]
    # This creates the rotating pattern where tasks shift by one position each day
    for task_index, task in enumerate(tasks):
        person_index = (task_index + cycle_index) % len(persons)
        person = persons[person_index]
        assignments[task] = person
        
        # Update the count (for tracking purposes)
        if task not in task_counts:
            task_counts[task] = {}
        task_counts[task][person] = task_counts[task].get(person, 0) + 1
    
    return assignments


@app.post("/schedule", response_model=ScheduleResponse)
def create_schedule(request: ScheduleRequest) -> ScheduleResponse:
    # Get current settings from cache or database
    current_settings = get_settings()
    
    # Use provided persons/tasks from request, or fall back to current settings
    persons = request.persons if request.persons is not None else current_settings.persons
    tasks = request.tasks if request.tasks is not None else current_settings.tasks
    
    # Final fallback to defaults if settings are empty
    if not persons or len(persons) == 0:
        persons = DEFAULT_PERSONS
    if not tasks or len(tasks) == 0:
        tasks = DEFAULT_TASKS

    if len(persons) == 0:
        raise HTTPException(status_code=400, detail="At least one person is required.")
    if len(tasks) == 0:
        raise HTTPException(status_code=400, detail="At least one task is required.")

    # Generate dates for month or full year
    if request.month is None:
        days = _generate_year_dates(request.year)
    else:
        days = _generate_month_dates(request.year, request.month)
    
    # Fetch notes for all days in the month
    notes_map: Dict[str, str] = {}
    try:
        start_date = days[0].isoformat()
        end_date = days[-1].isoformat()
        response = (
            supabase_client.table(DAY_NOTES_TABLE)
            .select("date, note")
            .gte("date", start_date)
            .lte("date", end_date)
            .execute()
        )
        for record in response.data or []:
            notes_map[record["date"]] = record["note"]
    except Exception as error:
        error_msg = str(error)
        # If connection error, continue without notes (non-critical)
        if "disconnected" in error_msg.lower() or "connection" in error_msg.lower():
            pass  # Continue without notes
        else:
            # Log other errors but don't fail the schedule generation
            pass
    
    assignments: List[DailyAssignment] = []
    
    # Track task counts per person (for tracking purposes)
    task_counts: Dict[str, Dict[str, int]] = {task: {person: 0 for person in persons} for task in tasks}
    
    # Track weekday index (only count weekdays for rotation)
    # Reset at the start of each month for consistent monthly patterns
    weekday_index = 0
    current_month = None
    
    for day in days:
        day_str = day.isoformat()
        day_name = day.strftime("%A")
        day_month = day.month
        note = notes_map.get(day_str)
        
        # Reset weekday_index at the start of each new month
        if current_month is not None and day_month != current_month:
            weekday_index = 0
        current_month = day_month
        
        # Skip weekends (Saturday and Sunday)
        if day_name in ['Saturday', 'Sunday']:
            assignments.append(
                DailyAssignment(
                    date=day,
                    day_name=day_name,
                    assignments={},  # Empty assignments for weekends
                    note=note,
                )
            )
        else:
            # Weekday - assign duties with 3-day cyclic rotation
            # The pattern rotates every 3 weekdays, resetting at the start of each month
            day_assignments = _rotate_assignments(persons, tasks, task_counts, weekday_index)
            assignments.append(
                DailyAssignment(
                    date=day,
                    day_name=day_name,
                    assignments=day_assignments,
                    note=note,
                )
            )
            # Increment weekday_index only for weekdays (not weekends)
            weekday_index += 1

    schedule_response = ScheduleResponse(persons=persons, tasks=tasks, days=assignments)
    
    # Save the schedule to database for persistence
    try:
        schedule_data = {
            "year": request.year,
            "month": request.month,
            "persons": persons,
            "tasks": tasks,
            "days": [
                {
                    "date": day.date.isoformat() if isinstance(day.date, date) else str(day.date),
                    "day_name": day.day_name,
                    "assignments": day.assignments,
                    "note": day.note,
                }
                for day in assignments
            ],
        }
        
        # Use year-month as unique key (or just year if month is None)
        schedule_id = f"{request.year}-{request.month if request.month else 'full'}"
        
        supabase_client.table(SCHEDULES_TABLE).upsert(
            {
                "id": schedule_id,
                "year": request.year,
                "month": request.month,
                "schedule_data": schedule_data,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            },
            on_conflict="id",
        ).execute()
    except Exception as error:
        # Don't fail if saving fails - schedule generation succeeded
        error_msg = str(error)
        if "disconnected" not in error_msg.lower() and "connection" not in error_msg.lower():
            # Log non-connection errors but continue
            pass
    
    return schedule_response


expenses: List[ExpenseEntry] = []
settings_cache: SettingsPayload = SettingsPayload(persons=DEFAULT_PERSONS, tasks=DEFAULT_TASKS)
shopping_items_memory: Dict[int, Dict[str, Any]] = {}
shopping_items_counter = count(1)
users_memory_email: Dict[str, Dict[str, Any]] = {}
users_memory_id: Dict[str, Dict[str, Any]] = {}
users_counter = count(1)


def _parse_timestamp(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return isoparse(value)
        except ValueError:
            normalized = value.replace("Z", "+00:00")
            return isoparse(normalized)
    raise ValueError("Unsupported timestamp format")


def _expense_from_supabase(record: Dict[str, Any]) -> ExpenseResponse:
    try:
        return ExpenseResponse(
            id=int(record["id"]),
            person=str(record["person"]),
            amount=float(record["amount"]),
            description=str(record.get("description", "")),
            timestamp=_parse_timestamp(record["timestamp"]),
            month_closed=record.get("month_closed"),
        )
    except (KeyError, ValueError, TypeError) as error:
        raise HTTPException(status_code=500, detail=f"Malformed expense record: {error}") from error


def _settings_from_supabase(record: Dict[str, Any]) -> SettingsPayload:
    return SettingsPayload(
        persons=[str(person).strip() for person in (record.get("persons") or DEFAULT_PERSONS)],
        tasks=[str(task).strip() for task in (record.get("tasks") or DEFAULT_TASKS)],
    )


def _normalize_votes(raw_votes: Any) -> Dict[str, int]:
    votes: Dict[str, int] = {}
    if isinstance(raw_votes, dict):
        for key, value in raw_votes.items():
            try:
                votes[str(key)] = int(value)
            except (TypeError, ValueError):
                continue
    return votes


def _smtp_configured() -> bool:
    return all([SMTP_SERVER, SMTP_USERNAME, SMTP_PASSWORD, SENDER_EMAIL])


def send_email(recipient: str, subject: str, body: str, html_body: Optional[str] = None) -> None:
    if not _smtp_configured():
        raise HTTPException(status_code=500, detail="Email service is not configured.")

    if html_body:
        message = MIMEMultipart("alternative")
        message["From"] = SENDER_EMAIL
        message["To"] = recipient
        message["Subject"] = subject
        message.attach(MIMEText(body, "plain"))
        message.attach(MIMEText(html_body, "html"))
    else:
        message = EmailMessage()
        message["From"] = SENDER_EMAIL
        message["To"] = recipient
        message["Subject"] = subject
        message.set_content(body)

    try:
        if SMTP_USE_SSL:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT, context=context) as server:
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
        else:
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                if SMTP_USE_TLS:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                server.login(SMTP_USERNAME, SMTP_PASSWORD)
                server.send_message(message)
    except Exception as error:
        raise HTTPException(status_code=502, detail=f"Email delivery failed: {error}") from error


MAX_PASSWORD_BYTES = 72


def _validate_password(password: str) -> str:
    encoded = password.encode("utf-8")
    if len(encoded) > MAX_PASSWORD_BYTES:
        raise HTTPException(status_code=400, detail="Password must be at most 72 UTF-8 bytes.")
    return password


def get_password_hash(password: str) -> str:
    return pwd_context.hash(_validate_password(password))


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _user_to_public(record: Dict[str, Any]) -> UserPublic:
    return UserPublic(
        id=str(record["id"]),
        email=str(record["email"]),
        display_name=str(record["display_name"]),
        is_admin=bool(record.get("is_admin", False)),
        has_access=bool(record.get("has_access", False)),
    )


def _get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    normalized = email.lower()
    try:
        response = (
            supabase_client.table(USERS_TABLE)
            .select("id, email, display_name, password_hash, is_admin, has_access")
            .eq("email", normalized)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "user lookup") from error
    records = response.data or []
    if records:
        record = records[0]
        record["email"] = record["email"].lower()
        _store_user_memory(record)
        return record
    return None


def _get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    try:
        response = (
            supabase_client.table(USERS_TABLE)
            .select("id, email, display_name, password_hash, is_admin, has_access")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "user lookup") from error
    records = response.data or []
    if records:
        record = records[0]
        record["email"] = record["email"].lower()
        _store_user_memory(record)
        return record
    return None


def _store_user_memory(record: Dict[str, Any]) -> None:
    email_key = record["email"].lower()
    copied = dict(record)
    users_memory_email[email_key] = copied
    users_memory_id[str(record["id"])] = copied


def _get_all_users() -> List[Dict[str, Any]]:
    """Get all users from the database."""
    users: List[Dict[str, Any]] = []
    try:
        response = (
            supabase_client.table(USERS_TABLE)
            .select("id, email, display_name")
            .execute()
        )
        records = response.data or []
        for record in records:
            record["email"] = record["email"].lower()
            users.append(record)
    except Exception as error:
        # Log error but don't fail - email sending should be resilient
        print(f"Error fetching users: {error}")
    return users


def _html_email_template(title: str, content: str, color: str = "#3b82f6") -> str:
    """Create a colorful HTML email template."""
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                background: linear-gradient(135deg, {color} 0%, {color}dd 100%);
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            }}
            .content {{
                background: white;
                border-radius: 8px;
                padding: 30px;
                margin-top: 20px;
            }}
            h1 {{
                color: white;
                margin: 0;
                font-size: 28px;
                text-align: center;
            }}
            .content h2 {{
                color: {color};
                margin-top: 0;
                font-size: 22px;
            }}
            .content p {{
                color: #555;
                font-size: 16px;
                margin: 15px 0;
            }}
            .highlight {{
                background: linear-gradient(120deg, #fef3c7 0%, #fde68a 100%);
                padding: 15px;
                border-radius: 6px;
                border-left: 4px solid #f59e0b;
                margin: 20px 0;
            }}
            .footer {{
                text-align: center;
                margin-top: 30px;
                color: white;
                font-size: 14px;
                opacity: 0.9;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>{title}</h1>
            <div class="content">
                {content}
            </div>
            <div class="footer">
                <p>Room Duty Scheduler</p>
            </div>
        </div>
    </body>
    </html>
    """


def _send_email_safe(recipient: str, subject: str, body: str, html_body: Optional[str] = None) -> None:
    """Send email with error handling - doesn't raise exceptions."""
    try:
        send_email(recipient, subject, body, html_body)
    except Exception as error:
        print(f"Failed to send email to {recipient}: {error}")


def _issue_token_for_user(record: Dict[str, Any]) -> Token:
    public_user = _user_to_public(record)
    access_token = create_access_token(
        {
            "sub": public_user.id,
            "email": public_user.email,
            "display_name": public_user.display_name,
            "is_admin": public_user.is_admin,
            "has_access": public_user.has_access,
        }
    )
    return Token(access_token=access_token, token_type="bearer", user=public_user)


def get_current_user(token: str = Depends(oauth2_scheme)) -> UserPublic:
    credentials_exception = HTTPException(status_code=401, detail="Could not validate credentials")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        data = TokenData(
            sub=str(payload.get("sub")),
            email=payload.get("email"),
            display_name=payload.get("display_name"),
            is_admin=bool(payload.get("is_admin", False)),
            has_access=bool(payload.get("has_access", False)),
        )
    except (JWTError, ValidationError, ValueError):
        raise credentials_exception

    if not data.sub or not data.email:
        raise credentials_exception

    user_record = _get_user_by_id(data.sub)
    if user_record is None:
        raise credentials_exception

    public_user = _user_to_public(user_record)
    
    # Check if user has access (admin always has access)
    has_access = bool(user_record.get("has_access", False))
    is_admin = bool(user_record.get("is_admin", False))
    if not has_access and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Your account access has been revoked. Please contact an administrator.",
        )
    
    return public_user


@app.post("/auth/register", response_model=Token)
def register_user(user: UserCreate) -> Token:
    email = user.email.lower()
    existing = _get_user_by_email(email)
    if existing is not None:
        raise HTTPException(status_code=400, detail="User already exists.")

    password_hash = get_password_hash(user.password)
    try:
        response = (
            supabase_client.table(USERS_TABLE)
            .insert(
                {
                    "email": email,
                    "display_name": user.display_name.strip(),
                    "password_hash": password_hash,
                    "is_admin": False,
                    "has_access": False,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "user registration") from error
    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to create user.")
    record = data[0]
    record["email"] = record["email"].lower()
    record.setdefault("password_hash", password_hash)
    _store_user_memory(record)

    html_content = _html_email_template(
        "🎉 Account Created!",
        f"""
        <h2>Hello {record['display_name']}!</h2>
        <p>Your account has been created successfully. However, your account is pending admin approval.</p>
        <div class="highlight">
            <p><strong>What happens next:</strong></p>
            <ul>
                <li>An admin will review your account</li>
                <li>You'll receive an email once access is granted</li>
                <li>Then you can log in and manage your room duties</li>
            </ul>
        </div>
        <p>Thank you for your patience!</p>
        """,
        color="#f59e0b"
    )
    plain_text = f"Hello {record['display_name']},\n\nYour account has been created successfully. However, your account is pending admin approval. You'll receive an email once access is granted.\n"
    _send_email_safe(record["email"], "Account Created - Pending Approval", plain_text, html_content)
    
    # Notify admin about new user registration
    admin_email = "ananthulasriharsha3@gmail.com"
    admin_html = _html_email_template(
        "👤 New User Registration",
        f"""
        <h2>New User Registration</h2>
        <p>A new user has registered and is waiting for approval.</p>
        <div class="highlight">
            <p><strong>User Details:</strong></p>
            <ul>
                <li><strong>Name:</strong> {record['display_name']}</li>
                <li><strong>Email:</strong> {record['email']}</li>
            </ul>
        </div>
        <p>Please log in to the admin panel to grant or revoke access.</p>
        """,
        color="#3b82f6"
    )
    admin_plain = f"A new user has registered:\n\nName: {record['display_name']}\nEmail: {record['email']}\n\nPlease log in to grant or revoke access.\n"
    _send_email_safe(admin_email, f"New User Registration: {record['display_name']}", admin_plain, admin_html)

    return _issue_token_for_user(record)


@app.post("/auth/login", response_model=Token)
def login_user(user: UserLogin) -> Token:
    email = user.email.lower()
    record = _get_user_by_email(email)
    if record is None:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not verify_password(user.password, record.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    # Check if user has access (admin always has access)
    has_access = bool(record.get("has_access", False))
    is_admin = bool(record.get("is_admin", False))
    if not has_access and not is_admin:
        raise HTTPException(
            status_code=403,
            detail="Your account is pending approval. Please wait for an admin to grant you access.",
        )

    return _issue_token_for_user(record)


@app.post("/auth/reset-password")
def reset_password(payload: PasswordResetRequest) -> Dict[str, str]:
    email = payload.email.lower()
    record = _get_user_by_email(email)
    if record is None:
        raise HTTPException(status_code=404, detail="User not found.")

    password_hash = get_password_hash(payload.new_password)

    try:
        response = (
            supabase_client.table(USERS_TABLE)
            .update(
                {
                    "password_hash": password_hash,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .eq("email", email)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "password reset") from error
    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to update password.")
    record = data[0]
    record["email"] = record["email"].lower()
    record.setdefault("password_hash", password_hash)
    _store_user_memory(record)

    html_content = _html_email_template(
        "🔒 Password Updated",
        f"""
        <h2>Hello {record['display_name']}!</h2>
        <p>Your password for the Room Duty Scheduler has been updated successfully.</p>
        <div class="highlight">
            <p><strong>Security Notice:</strong></p>
            <p>If you did not make this change, please contact support immediately.</p>
        </div>
        <p>You can now log in with your new password.</p>
        """,
        color="#f59e0b"
    )
    plain_text = f"Hello {record['display_name']},\n\nYour password for the room duty scheduler has been updated successfully.\n"
    _send_email_safe(record["email"], "Your password has been updated", plain_text, html_content)

    return {"message": "Password updated successfully."}


def _item_from_supabase(record: Dict[str, Any]) -> ShoppingItemResponse:
    votes = _normalize_votes(record.get("votes"))
    for person in settings_cache.persons:
        votes.setdefault(person, 0)
    total_votes = sum(votes.values())
    created_at_raw = record.get("created_at")
    created_at = _parse_timestamp(created_at_raw) if created_at_raw is not None else datetime.now(timezone.utc)
    created_by_raw = record.get("created_by")
    created_by = str(created_by_raw) if created_by_raw is not None else ""
    is_completed = bool(record.get("is_completed", False))
    
    # Get creator name
    creator_name = None
    if created_by:
        try:
            all_users = _get_all_users()
            creator = next((u for u in all_users if u["id"] == created_by), None)
            if creator:
                creator_name = creator.get("display_name") or creator.get("email", "Unknown")
        except Exception:
            pass  # If we can't get user info, just leave it as None
    
    return ShoppingItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        votes=votes,
        total_votes=total_votes,
        created_at=created_at,
        created_by=created_by,
        is_completed=is_completed,
        creator_name=creator_name,
    )


def _item_from_memory(record: Dict[str, Any]) -> ShoppingItemResponse:
    votes = _normalize_votes(record.get("votes"))
    for person in settings_cache.persons:
        votes.setdefault(person, 0)
    total_votes = sum(votes.values())
    created_at = record.get("created_at")
    if not isinstance(created_at, datetime):
        created_at = datetime.now(timezone.utc)
    created_by_raw = record.get("created_by")
    created_by = str(created_by_raw) if created_by_raw is not None else ""
    is_completed = bool(record.get("is_completed", False))
    
    # Get creator name
    creator_name = None
    if created_by:
        try:
            all_users = _get_all_users()
            creator = next((u for u in all_users if u["id"] == created_by), None)
            if creator:
                creator_name = creator.get("display_name") or creator.get("email", "Unknown")
        except Exception:
            pass  # If we can't get user info, just leave it as None
    
    return ShoppingItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        votes=votes,
        total_votes=total_votes,
        created_at=created_at,
        created_by=created_by,
        is_completed=is_completed,
        creator_name=creator_name,
    )


def _normalize_votes(raw_votes: Any) -> Dict[str, int]:
    votes: Dict[str, int] = {}
    if isinstance(raw_votes, dict):
        for key, value in raw_votes.items():
            try:
                votes[str(key)] = int(value)
            except (TypeError, ValueError):
                continue
    return votes


@app.get("/schedule/{year}", response_model=ScheduleResponse)
def get_schedule(year: int, month: Optional[int] = Query(None)) -> ScheduleResponse:
    """Retrieve a saved schedule for a given year (and optionally month)."""
    try:
        schedule_id = f"{year}-{month if month else 'full'}"
        response = (
            supabase_client.table(SCHEDULES_TABLE)
            .select("schedule_data")
            .eq("id", schedule_id)
            .limit(1)
            .execute()
        )
        
        records = response.data or []
        if records:
            schedule_data = records[0].get("schedule_data", {})
            if schedule_data:
                # Reconstruct the schedule response
                days = [
                    DailyAssignment(
                        date=date.fromisoformat(day["date"]),
                        day_name=day["day_name"],
                        assignments=day["assignments"],
                        note=day.get("note"),
                    )
                    for day in schedule_data.get("days", [])
                ]
                return ScheduleResponse(
                    persons=schedule_data.get("persons", []),
                    tasks=schedule_data.get("tasks", []),
                    days=days,
                )
    except Exception as error:
        # If schedule not found or error, return 404
        error_msg = str(error)
        if "disconnected" in error_msg.lower() or "connection" in error_msg.lower():
            raise HTTPException(status_code=502, detail="Database connection error")
    
    raise HTTPException(status_code=404, detail=f"Schedule for year {year}" + (f", month {month}" if month else "") + " not found")


@app.get("/settings", response_model=SettingsPayload)
def get_settings() -> SettingsPayload:
    try:
        response = (
            supabase_client.table(SETTINGS_TABLE)
            .select("persons, tasks")
            .eq("id", DEFAULT_SETTINGS_ID)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching settings") from error

    records = response.data or []
    if records:
        settings = _settings_from_supabase(records[0])
        global settings_cache
        settings_cache = settings
        return settings

    return settings_cache


@app.post("/settings", response_model=SettingsPayload)
def save_settings(payload: SettingsPayload) -> SettingsPayload:
    global settings_cache

    try:
        supabase_client.table(SETTINGS_TABLE).upsert(
            {
                "id": DEFAULT_SETTINGS_ID,
                "persons": payload.persons,
                "tasks": payload.tasks,
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
        ).execute()
    except Exception as error:
        raise _handle_supabase_error(error, "saving settings") from error

    settings_cache = payload
    return settings_cache


@app.get("/shopping-items", response_model=List[ShoppingItemResponse])
def list_shopping_items() -> List[ShoppingItemResponse]:
    def fetch_items():
        response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .select("id, name, votes, created_at, created_by, is_completed")
            .execute()
        )
        return response
    
    response = _retry_supabase_operation(fetch_items, operation_name="fetching shopping items")
    records = response.data or []
    items = [_item_from_supabase(record) for record in records]

    items.sort(key=lambda item: (-item.total_votes, item.created_at))
    return items


@app.post("/shopping-items", response_model=ShoppingItemResponse)
def add_shopping_item(
    payload: ShoppingItemCreate, current_user: UserPublic = Depends(get_current_user)
) -> ShoppingItemResponse:
    try:
        current_settings = get_settings()
    except HTTPException:
        current_settings = settings_cache

    persons = current_settings.persons or DEFAULT_PERSONS
    votes_template = {person: 0 for person in persons}

    try:
        response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .insert(
                {
                    "name": payload.name.strip(),
                    "votes": votes_template,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "created_by": current_user.id,
                    "is_completed": False,
                },
                returning="representation",
            )
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "adding shopping item") from error

    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to save shopping item.")
    return _item_from_supabase(data[0])


@app.post("/shopping-items/{item_id}/vote", response_model=ShoppingItemResponse)
def vote_shopping_item(
    item_id: int,
    payload: ShoppingItemVote,
    current_user: UserPublic = Depends(get_current_user),
) -> ShoppingItemResponse:
    if payload.person is not None and payload.person.strip() != current_user.display_name:
        raise HTTPException(status_code=403, detail="Cannot vote as another person.")

    try:
        current_settings = get_settings()
    except HTTPException:
        current_settings = settings_cache

    if current_user.display_name not in current_settings.persons:
        raise HTTPException(status_code=400, detail="You are not part of the current roster.")
    person = current_user.display_name

    try:
        response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .select("id, name, votes, created_at, created_by, is_completed")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching shopping item") from error

    records = response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Shopping item not found.")

    record = records[0]
    votes = _normalize_votes(record.get("votes"))
    if votes.get(person, 0) >= 1:
        raise HTTPException(status_code=400, detail="You have already voted for this item.")
    votes[person] = votes.get(person, 0) + 1

    try:
        update_response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .update(
                {
                    "votes": votes,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .eq("id", item_id)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "updating shopping item vote") from error

    updated = update_response.data or []
    if updated:
        return _item_from_supabase(updated[0])
    # Fallback to local constructed record if Supabase did not return representation
    record["votes"] = votes
    return _item_from_supabase(record)


@app.delete("/shopping-items/{item_id}", response_model=ShoppingItemResponse)
def delete_shopping_item(item_id: int, current_user: UserPublic = Depends(get_current_user)) -> ShoppingItemResponse:
    try:
        existing_response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .select("id, name, votes, created_at, created_by, is_completed")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching shopping item for deletion") from error

    records = existing_response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Shopping item not found.")

    record = records[0]
    creator_id = record.get("created_by")
    # Allow deletion if: no creator (old items) OR user is the creator
    if creator_id and creator_id not in {current_user.id, current_user.display_name}:
        raise HTTPException(status_code=403, detail="Only the creator can delete this item.")

    # Store the record before deletion so we can return it
    item_to_return = _item_from_supabase(record)
    
    try:
        supabase_client.table(SHOPPING_ITEMS_TABLE).delete().eq("id", item_id).execute()
    except Exception as error:
        raise _handle_supabase_error(error, "deleting shopping item") from error

    return item_to_return


@app.post("/shopping-items/{item_id}/complete", response_model=ShoppingItemResponse)
def complete_shopping_item(item_id: int, current_user: UserPublic = Depends(get_current_user)) -> ShoppingItemResponse:
    try:
        existing_response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .select("id, name, votes, created_at, created_by, is_completed")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching shopping item") from error

    records = existing_response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Shopping item not found.")

    record = records[0]
    current_completed = bool(record.get("is_completed", False))
    new_completed = not current_completed

    try:
        update_response = (
            supabase_client.table(SHOPPING_ITEMS_TABLE)
            .update(
                {
                    "is_completed": new_completed,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .eq("id", item_id)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "updating shopping item completion status") from error

    updated = update_response.data or []
    if updated:
        return _item_from_supabase(updated[0])

    record["is_completed"] = new_completed
    return _item_from_supabase(record)


@app.get("/expenses", response_model=List[ExpenseResponse])
def list_expenses() -> List[ExpenseResponse]:
    def fetch_expenses():
        response = (
            supabase_client.table(EXPENSES_TABLE)
            .select("*")
            .order("timestamp", desc=True)
            .execute()
        )
        return response
    
    response = _retry_supabase_operation(fetch_expenses, operation_name="fetching expenses")
    records = response.data or []
    return [_expense_from_supabase(record) for record in records]


@app.post("/expenses", response_model=ExpenseResponse)
def add_expense(expense: ExpenseEntry, current_user: UserPublic = Depends(get_current_user)) -> ExpenseResponse:
    expense.person = current_user.display_name
    payload = {
        "person": expense.person,
        "amount": expense.amount,
        "description": expense.description,
        "timestamp": expense.timestamp.isoformat(),
    }
    try:
        response = (
            supabase_client.table(EXPENSES_TABLE)
            .insert(payload, returning="representation")
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "adding expense") from error

    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to save expense to Supabase")

    return _expense_from_supabase(data[0])


@app.delete("/expenses/{expense_id}", response_model=ExpenseResponse)
def delete_expense(expense_id: int, current_user: UserPublic = Depends(get_current_user)) -> ExpenseResponse:
    try:
        existing_response = (
            supabase_client.table(EXPENSES_TABLE)
            .select("*")
            .eq("id", expense_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching expense for deletion") from error

    existing_records = existing_response.data or []
    if not existing_records:
        raise HTTPException(status_code=404, detail="Expense not found")

    record = existing_records[0]
    if str(record.get("person")) != current_user.display_name:
        raise HTTPException(status_code=403, detail="Not allowed to delete this expense.")

    try:
        response = (
            supabase_client.table(EXPENSES_TABLE)
            .delete()
            .eq("id", expense_id)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "deleting expense") from error

    return _expense_from_supabase(record)


class CloseMonthRequest(BaseModel):
    month: str  # Format: "YYYY-MM" (e.g., "2024-01")


class CloseMonthResponse(BaseModel):
    month: str
    expenses_closed: int
    groceries_closed: int
    message: str


@app.post("/months/close", response_model=CloseMonthResponse)
def close_month(
    request: CloseMonthRequest,
    current_user: UserPublic = Depends(get_current_user),
) -> CloseMonthResponse:
    """Close a month by marking all expenses and groceries for that month as closed."""
    # Validate month format (YYYY-MM)
    import re
    if not re.match(r'^\d{4}-\d{2}$', request.month):
        raise HTTPException(status_code=400, detail="Month must be in format YYYY-MM (e.g., 2024-01)")
    
    month_str = request.month
    
    try:
        # Calculate start and end of the month
        year, month = map(int, month_str.split('-'))
        month_start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            month_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        # Update expenses for this month (where month_closed is NULL)
        # Note: Supabase Python client may not support .is_() in update, so we'll filter first
        expenses_to_close = (
            supabase_client.table(EXPENSES_TABLE)
            .select("id")
            .gte("timestamp", month_start.isoformat())
            .lt("timestamp", month_end.isoformat())
            .is_("month_closed", "null")
            .execute()
        )
        expense_ids = [e["id"] for e in (expenses_to_close.data or [])]
        expenses_closed = len(expense_ids)
        
        # Update expenses in batch
        if expense_ids:
            # Update each expense (Supabase doesn't support bulk update with filters easily)
            for expense_id in expense_ids:
                try:
                    supabase_client.table(EXPENSES_TABLE).update({"month_closed": month_str}).eq("id", expense_id).execute()
                except Exception as e:
                    print(f"Error updating expense {expense_id}: {e}")
        
        # Update grocery purchases for this month (where month_closed is NULL)
        groceries_to_close = (
            supabase_client.table(GROCERY_PURCHASES_TABLE)
            .select("id")
            .gte("purchase_date", month_start.date().isoformat())
            .lt("purchase_date", month_end.date().isoformat())
            .is_("month_closed", "null")
            .execute()
        )
        grocery_ids = [g["id"] for g in (groceries_to_close.data or [])]
        groceries_closed = len(grocery_ids)
        
        # Update groceries in batch
        if grocery_ids:
            for grocery_id in grocery_ids:
                try:
                    supabase_client.table(GROCERY_PURCHASES_TABLE).update({"month_closed": month_str}).eq("id", grocery_id).execute()
                except Exception as e:
                    print(f"Error updating grocery {grocery_id}: {e}")
        
        return CloseMonthResponse(
            month=month_str,
            expenses_closed=expenses_closed,
            groceries_closed=groceries_closed,
            message=f"Successfully closed {month_str}. {expenses_closed} expenses and {groceries_closed} grocery purchases marked as closed."
        )
    except Exception as error:
        raise _handle_supabase_error(error, "closing month") from error


class DayNotePayload(BaseModel):
    date: date
    note: str = Field(..., min_length=1, max_length=500)


class DayNoteResponse(BaseModel):
    date: date
    note: str
    created_by: Optional[str] = None
    creator_name: Optional[str] = None


class StockItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    start_date: date

    @validator("name")
    def name_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Stock item name cannot be empty.")
        return cleaned


class StockItemResponse(BaseModel):
    id: int
    name: str
    start_date: date
    end_date: Optional[date]
    is_active: bool
    days_active: int
    created_by: str
    created_at: datetime


@app.post("/day-notes", response_model=DayNoteResponse)
def set_day_note(payload: DayNotePayload, current_user: UserPublic = Depends(get_current_user)) -> DayNoteResponse:
    try:
        response = (
            supabase_client.table(DAY_NOTES_TABLE)
            .upsert(
                {
                    "date": payload.date.isoformat(),
                    "note": payload.note.strip(),
                    "created_by": current_user.id,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                on_conflict="date",
                returning="representation",
            )
            .execute()
        )
        data = response.data or []
        if not data:
            raise HTTPException(status_code=500, detail="Failed to save day note.")
        record = data[0]
        
        # Get creator name for response
        creator_name = current_user.display_name or current_user.email
        
        # Send emails to all users
        all_users = _get_all_users()
        note_date_str = payload.date.strftime("%B %d, %Y")
        day_name = payload.date.strftime("%A")
        
        for user in all_users:
            user_email = user["email"]
            user_name = user["display_name"]
            
            if user["id"] == current_user.id:
                # Email to creator
                html_content = _html_email_template(
                    "📌 Note Added Successfully",
                    f"""
                    <h2>Hello {user_name}!</h2>
                    <p>Your note has been added to the schedule for <strong>{day_name}, {note_date_str}</strong>.</p>
                    <div class="highlight">
                        <p><strong>Your Note:</strong></p>
                        <p style="font-size: 18px; font-weight: 600; color: #92400e;">{payload.note.strip()}</p>
                    </div>
                    <p>All users have been notified about this special day.</p>
                    """,
                    color="#10b981"
                )
                plain_text = f"Hello {user_name},\n\nYour note has been added to the schedule for {day_name}, {note_date_str}.\n\nYour Note: {payload.note.strip()}\n\nAll users have been notified about this special day.\n"
            else:
                # Email to other users
                html_content = _html_email_template(
                    "📅 New Special Day Added",
                    f"""
                    <h2>Hello {user_name}!</h2>
                    <p><strong>{current_user.display_name}</strong> has added a note to the schedule for <strong>{day_name}, {note_date_str}</strong>.</p>
                    <div class="highlight">
                        <p><strong>Note Information:</strong></p>
                        <p style="font-size: 18px; font-weight: 600; color: #92400e;">{payload.note.strip()}</p>
                    </div>
                    <p>This day will be highlighted in the schedule. Don't forget to check it out!</p>
                    """,
                    color="#3b82f6"
                )
                plain_text = f"Hello {user_name},\n\n{current_user.display_name} has added a note to the schedule for {day_name}, {note_date_str}.\n\nNote: {payload.note.strip()}\n\nThis day will be highlighted in the schedule.\n"
            
            _send_email_safe(user_email, f"Special Day: {note_date_str}", plain_text, html_content)
        
        return DayNoteResponse(
            date=date.fromisoformat(record["date"]), 
            note=record["note"],
            created_by=current_user.id,
            creator_name=creator_name
        )
    except Exception as error:
        raise _handle_supabase_error(error, "saving day note") from error


@app.get("/day-notes/{date_str}", response_model=DayNoteResponse)
def get_day_note(
    date_str: str,
    current_user: UserPublic = Depends(get_current_user)
) -> DayNoteResponse:
    """Get a day note for a specific date."""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    def fetch_note():
        response = (
            supabase_client.table(DAY_NOTES_TABLE)
            .select("date, note, created_by")
            .eq("date", target_date.isoformat())
            .limit(1)
            .execute()
        )
        return response
    
    try:
        response = _retry_supabase_operation(fetch_note, operation_name="fetching day note")
        
        data = response.data or []
        if not data:
            raise HTTPException(status_code=404, detail="Day note not found for this date.")
        
        record = data[0]
        creator_id = record.get("created_by")
        creator_name = None
        
        if creator_id:
            all_users = _get_all_users()
            creator = next((u for u in all_users if u["id"] == creator_id), None)
            if creator:
                creator_name = creator.get("display_name") or creator.get("email", "Unknown")
        
        return DayNoteResponse(
            date=date.fromisoformat(record["date"]),
            note=record["note"],
            created_by=creator_id,
            creator_name=creator_name
        )
    except HTTPException:
        raise
    except Exception as error:
        raise _handle_supabase_error(error, "fetching day note") from error


@app.delete("/day-notes/{date_str}")
def delete_day_note(date_str: str) -> Dict[str, str]:
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")
    
    try:
        supabase_client.table(DAY_NOTES_TABLE).delete().eq("date", target_date.isoformat()).execute()
        return {"message": "Day note deleted successfully."}
    except Exception as error:
        raise _handle_supabase_error(error, "deleting day note") from error


@app.post("/day-notes/send-reminders")
def send_note_reminders(days_ahead: int = 1) -> Dict[str, Any]:
    """
    Send reminder emails for notes that are coming up.
    days_ahead: Number of days before the note date to send reminders (default: 1)
    """
    
    try:
        today = date.today()
        reminder_date = today + timedelta(days=days_ahead)
        
        # Fetch notes for the reminder date
        response = (
            supabase_client.table(DAY_NOTES_TABLE)
            .select("date, note, created_by")
            .eq("date", reminder_date.isoformat())
            .execute()
        )
        
        notes = response.data or []
        if not notes:
            return {"message": f"No notes found for {reminder_date.isoformat()}", "reminders_sent": 0}
        
        # Get all users
        all_users = _get_all_users()
        if not all_users:
            return {"message": "No users found", "reminders_sent": 0}
        
        # Get creator info for each note
        creator_map: Dict[str, Dict[str, Any]] = {}
        for note_record in notes:
            creator_id = note_record.get("created_by")
            if creator_id:
                creator = next((u for u in all_users if u["id"] == creator_id), None)
                if creator:
                    creator_map[note_record["date"]] = creator
        
        reminders_sent = 0
        for note_record in notes:
            note_date = date.fromisoformat(note_record["date"])
            note_text = note_record["note"]
            note_date_str = note_date.strftime("%B %d, %Y")
            day_name = note_date.strftime("%A")
            creator = creator_map.get(note_record["date"])
            creator_name = creator["display_name"] if creator else "A user"
            
            # Send reminder to all users
            for user in all_users:
                html_content = _html_email_template(
                    "⏰ Reminder: Special Day Tomorrow",
                    f"""
                    <h2>Hello {user['display_name']}!</h2>
                    <p>This is a reminder that there's a special day coming up <strong>tomorrow ({day_name}, {note_date_str})</strong>.</p>
                    <div class="highlight">
                        <p><strong>Note:</strong></p>
                        <p style="font-size: 18px; font-weight: 600; color: #92400e;">{note_text}</p>
                        <p style="margin-top: 10px; font-size: 14px; color: #666;">Created by: {creator_name}</p>
                    </div>
                    <p>Don't forget to check the schedule!</p>
                    """,
                    color="#f59e0b"
                )
                plain_text = f"Hello {user['display_name']},\n\nThis is a reminder that there's a special day coming up tomorrow ({day_name}, {note_date_str}).\n\nNote: {note_text}\nCreated by: {creator_name}\n\nDon't forget to check the schedule!\n"
                _send_email_safe(user["email"], f"Reminder: Special Day Tomorrow - {note_date_str}", plain_text, html_content)
                reminders_sent += 1
        
        return {
            "message": f"Reminders sent for {len(notes)} note(s)",
            "reminders_sent": reminders_sent,
            "reminder_date": reminder_date.isoformat()
        }
    except Exception as error:
        raise _handle_supabase_error(error, "sending note reminders") from error


def get_current_admin(current_user: UserPublic = Depends(get_current_user)) -> UserPublic:
    """Ensure the current user is an admin."""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user


class UserListResponse(BaseModel):
    id: str
    email: EmailStr
    display_name: str
    is_admin: bool
    has_access: bool
    created_at: datetime


class UserAccessUpdate(BaseModel):
    has_access: bool


@app.get("/admin/users", response_model=List[UserListResponse])
def list_users(admin: UserPublic = Depends(get_current_admin)) -> List[UserListResponse]:
    """List all users (admin only)."""
    def fetch_users():
        response = (
            supabase_client.table(USERS_TABLE)
            .select("id, email, display_name, is_admin, has_access, created_at")
            .execute()
        )
        return response
    
    response = _retry_supabase_operation(fetch_users, operation_name="fetching users")
    records = response.data or []
    users = []
    for record in records:
        users.append(
            UserListResponse(
                id=str(record["id"]),
                email=str(record["email"]),
                display_name=str(record["display_name"]),
                is_admin=bool(record.get("is_admin", False)),
                has_access=bool(record.get("has_access", False)),
                created_at=_parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat())),
            )
        )
    return users


@app.get("/stock-items", response_model=List[StockItemResponse])
def list_stock_items() -> List[StockItemResponse]:
    """List all stock items, sorted by active status and start date."""
    def fetch_stock_items():
        response = (
            supabase_client.table(STOCK_ITEMS_TABLE)
            .select("id, name, start_date, end_date, is_active, created_by, created_at")
            .order("is_active", desc=True)
            .order("start_date", desc=True)
            .execute()
        )
        return response
    
    response = _retry_supabase_operation(fetch_stock_items, operation_name="fetching stock items")
    records = response.data or []
    
    today = date.today()
    items = []
    for record in records:
        start_date = date.fromisoformat(record["start_date"])
        end_date = date.fromisoformat(record["end_date"]) if record.get("end_date") else None
        is_active = bool(record.get("is_active", True))
        
        # Calculate days active
        if is_active and end_date is None:
            # Still active - count from start_date to today
            days_active = (today - start_date).days
        elif end_date:
            # Ended - count from start_date to end_date
            days_active = (end_date - start_date).days
        else:
            days_active = 0
        
        created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
        created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
        
        items.append(
            StockItemResponse(
                id=int(record["id"]),
                name=str(record["name"]),
                start_date=start_date,
                end_date=end_date,
                is_active=is_active,
                days_active=days_active,
                created_by=created_by,
                created_at=created_at,
            )
        )
    
    return items


@app.post("/stock-items", response_model=StockItemResponse)
def add_stock_item(
    payload: StockItemCreate, current_user: UserPublic = Depends(get_current_user)
) -> StockItemResponse:
    """Add a new stock item (e.g., rice bag, LPG gas)."""
    today = date.today()
    start_date = payload.start_date
    
    try:
        response = (
            supabase_client.table(STOCK_ITEMS_TABLE)
            .insert(
                {
                    "name": payload.name.strip(),
                    "start_date": start_date.isoformat(),
                    "is_active": True,
                    "created_by": current_user.id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "adding stock item") from error
    
    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to save stock item.")
    
    record = data[0]
    days_active = (today - start_date).days
    created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
    created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
    
    return StockItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        start_date=start_date,
        end_date=None,
        is_active=True,
        days_active=days_active,
        created_by=created_by,
        created_at=created_at,
    )


@app.post("/stock-items/{item_id}/end", response_model=StockItemResponse)
def end_stock_item(
    item_id: int, current_user: UserPublic = Depends(get_current_user)
) -> StockItemResponse:
    """Mark a stock item as ended (finished/used up)."""
    today = date.today()
    
    # First, get the current item
    try:
        existing_response = (
            supabase_client.table(STOCK_ITEMS_TABLE)
            .select("id, name, start_date, end_date, is_active, created_by, created_at")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching stock item") from error
    
    records = existing_response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Stock item not found.")
    
    record = records[0]
    if not record.get("is_active", True):
        raise HTTPException(status_code=400, detail="Stock item is already ended.")
    
    # Update to mark as ended
    try:
        update_response = (
            supabase_client.table(STOCK_ITEMS_TABLE)
            .update(
                {
                    "is_active": False,
                    "end_date": today.isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .eq("id", item_id)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "ending stock item") from error
    
    updated = update_response.data or []
    if not updated:
        raise HTTPException(status_code=500, detail="Failed to update stock item.")
    
    updated_record = updated[0]
    start_date = date.fromisoformat(updated_record["start_date"])
    end_date = date.fromisoformat(updated_record["end_date"]) if updated_record.get("end_date") else None
    days_active = (end_date - start_date).days if end_date else (today - start_date).days
    created_by = str(updated_record.get("created_by", "")) if updated_record.get("created_by") else ""
    created_at = _parse_timestamp(updated_record.get("created_at", datetime.now(timezone.utc).isoformat()))
    
    return StockItemResponse(
        id=int(updated_record["id"]),
        name=str(updated_record["name"]),
        start_date=start_date,
        end_date=end_date,
        is_active=False,
        days_active=days_active,
        created_by=created_by,
        created_at=created_at,
    )


@app.delete("/stock-items/{item_id}", response_model=StockItemResponse)
def delete_stock_item(item_id: int, current_user: UserPublic = Depends(get_current_user)) -> StockItemResponse:
    """Delete a stock item."""
    try:
        existing_response = (
            supabase_client.table(STOCK_ITEMS_TABLE)
            .select("id, name, start_date, end_date, is_active, created_by, created_at")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching stock item for deletion") from error
    
    records = existing_response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Stock item not found.")
    
    record = records[0]
    creator_id = record.get("created_by")
    # Allow deletion if: no creator (old items) OR user is the creator
    if creator_id and creator_id not in {current_user.id, current_user.display_name}:
        raise HTTPException(status_code=403, detail="Only the creator can delete this item.")
    
    # Store the record before deletion
    start_date = date.fromisoformat(record["start_date"])
    end_date = date.fromisoformat(record["end_date"]) if record.get("end_date") else None
    is_active = bool(record.get("is_active", True))
    today = date.today()
    
    if is_active and end_date is None:
        days_active = (today - start_date).days
    elif end_date:
        days_active = (end_date - start_date).days
    else:
        days_active = 0
    
    created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
    created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
    
    item_to_return = StockItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        start_date=start_date,
        end_date=end_date,
        is_active=is_active,
        days_active=days_active,
        created_by=created_by,
        created_at=created_at,
    )
    
    try:
        supabase_client.table(STOCK_ITEMS_TABLE).delete().eq("id", item_id).execute()
    except Exception as error:
        raise _handle_supabase_error(error, "deleting stock item") from error
    
    return item_to_return


# OCR and Bill Processing Functions
# Set up Tesseract path at module load time
def _setup_tesseract_path():
    """Configure Tesseract path for Windows if needed."""
    import platform
    import pytesseract
    
    if platform.system() == 'Windows':
        # Common Tesseract installation paths on Windows
        possible_paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            r'C:\Program Files (x86)\Tesseract-OCR\tesseract.exe',
            r'C:\Users\{}\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'.format(os.getenv('USERNAME', '')),
        ]
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"Tesseract found at: {path}")  # Debug log
                return True
        # If not found, try to use environment variable
        tesseract_path = os.getenv('TESSERACT_CMD')
        if tesseract_path and os.path.exists(tesseract_path):
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            print(f"Tesseract found via env var: {tesseract_path}")  # Debug log
            return True
        print("Tesseract not found in common paths")  # Debug log
        return False
    return False

# Call setup function at module load to configure Tesseract path early
try:
    _setup_tesseract_path()
except Exception as e:
    print(f"Warning: Could not set up Tesseract path: {e}")  # Debug log


def _preprocess_image(image: Image.Image) -> Image.Image:
    """Preprocess image to improve OCR accuracy."""
    from PIL import ImageEnhance, ImageFilter
    import numpy as np
    
    # Convert to RGB if necessary
    if image.mode != 'RGB':
        image = image.convert('RGB')
    
    # Convert to grayscale for better OCR accuracy
    if image.mode == 'RGB':
        image = image.convert('L')  # Grayscale
    
    # Apply adaptive thresholding for better text extraction
    # Convert PIL to numpy array for thresholding
    img_array = np.array(image)
    
    # Apply Otsu's thresholding for better text/background separation
    from PIL import Image as PILImage
    # Use simple thresholding if we can't use cv2
    try:
        import cv2
        # Apply adaptive thresholding
        thresh = cv2.adaptiveThreshold(
            img_array, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
            cv2.THRESH_BINARY, 11, 2
        )
        image = PILImage.fromarray(thresh)
    except ImportError:
        # Fallback: manual thresholding
        threshold = np.mean(img_array)
        img_array = np.where(img_array > threshold, 255, 0).astype(np.uint8)
        image = PILImage.fromarray(img_array)
    
    # Enhance contrast (more aggressive)
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.5)  # Increase contrast by 2.5x
    
    # Enhance sharpness
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.5)  # Increase sharpness by 2.5x
    
    # Apply denoising (median filter)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    
    # Apply additional sharpening
    image = image.filter(ImageFilter.SHARPEN)
    
    # Resize if image is too small (OCR works better on larger images)
    width, height = image.size
    min_size = 1200  # Increased minimum size for better OCR
    if width < min_size or height < min_size:
        # Scale up while maintaining aspect ratio
        scale_factor = max(min_size / width, min_size / height)
        new_width = int(width * scale_factor)
        new_height = int(height * scale_factor)
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    return image


def _process_bill_image(image_data: bytes) -> str:
    """Extract text from bill image using OCR with enhanced preprocessing."""
    import pytesseract
    
    # Ensure Tesseract path is set
    _setup_tesseract_path()
    
    try:
        image = Image.open(BytesIO(image_data))
        
        # Preprocess image for better OCR accuracy
        processed_image = _preprocess_image(image)
        
        # Try multiple OCR configurations and combine results
        # PSM 6: Assume a single uniform block of text (good for receipts)
        # PSM 11: Sparse text (good for itemized lists)
        # PSM 12: Sparse text with OSD (Orientation and Script Detection)
        # PSM 4: Assume a single column of text of variable sizes
        # PSM 3: Fully automatic page segmentation, but no OSD
        
        # Include Indian currency symbol (₹) and common bill characters
        ocr_configs = [
            '--psm 6 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;-$₹ /',
            '--psm 11 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;-$₹ /',
            '--psm 12 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;-$₹ /',
            '--psm 4 -c tessedit_char_whitelist=0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:;-$₹ /',
            '--psm 3',  # No whitelist for this one to catch any missed characters
        ]
        
        texts = []
        for config in ocr_configs:
            try:
                text = pytesseract.image_to_string(processed_image, lang='eng', config=config)
                if text.strip():
                    texts.append(text.strip())
            except Exception:
                continue
        
        # If we got multiple results, try to merge them intelligently
        if texts:
            # Use the result with the most lines (likely most complete)
            if len(texts) > 1:
                # Combine unique lines from all results
                all_lines = set()
                for text in texts:
                    for line in text.split('\n'):
                        line = line.strip()
                        if line and len(line) > 2:
                            all_lines.add(line)
                # Return combined text, prioritizing longer/more detailed results
                combined = '\n'.join(sorted(all_lines, key=lambda x: (-len(x), x)))
                if combined:
                    return combined
            
            return texts[0] if texts[0] else ''
        
        # Fallback to basic OCR if all configs fail
        text = pytesseract.image_to_string(processed_image, lang='eng', config='--psm 6')
        return text
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=400,
            detail="Tesseract OCR is not installed or not found in PATH. Please install Tesseract OCR:\n"
                   "Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki\n"
                   "After installation, restart the backend server."
        )
    except Exception as error:
        error_msg = str(error)
        if 'tesseract' in error_msg.lower() or 'not found' in error_msg.lower():
            raise HTTPException(
                status_code=400,
                detail="Tesseract OCR is not installed or not found in PATH. Please install Tesseract OCR:\n"
                       "Windows: Download from https://github.com/UB-Mannheim/tesseract/wiki\n"
                       "After installation, restart the backend server."
            )
        raise HTTPException(
            status_code=400,
            detail=f"Failed to process image: {error_msg}. Please ensure Tesseract OCR is installed."
        ) from error


def _fix_ocr_errors(text: str) -> str:
    """Fix common OCR errors in text."""
    # Common OCR mistakes
    replacements = {
        '0': 'O',  # Sometimes O is read as 0 in text
        '1': 'I',  # Sometimes I is read as 1 in text
        '5': 'S',  # Sometimes S is read as 5 in text
    }
    # But we need to be careful - only fix in item names, not prices
    # This is a simple heuristic - in practice, we'll handle this in parsing
    return text


def _is_valid_item_name(name: str) -> bool:
    """Validate that an item name looks reasonable (not just OCR garbage)."""
    if not name or len(name) < 2:
        return False
    
    # Remove common valid characters and check if enough letters remain
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', '', name)
    
    # Count letters (not digits)
    letter_count = sum(1 for c in cleaned if c.isalpha())
    total_chars = len(cleaned.replace(' ', ''))
    
    # Item name should have at least 30% letters (to filter out pure numbers/codes)
    if total_chars == 0:
        return False
    
    letter_ratio = letter_count / total_chars if total_chars > 0 else 0
    
    # Must have at least 2 letters and reasonable letter ratio
    if letter_count < 2:
        return False
    
    # If mostly special characters or numbers, reject
    if letter_ratio < 0.3:
        return False
    
    # Reject if it's mostly numbers (like HSN codes)
    digit_count = sum(1 for c in cleaned if c.isdigit())
    if digit_count > letter_count * 2:
        return False
    
    # Reject common OCR garbage patterns
    garbage_patterns = [
        r'^[^a-zA-Z]*$',  # No letters at all
        r'^[\d\s\.\$:=\-\/]+$',  # Just numbers and symbols
        r'^[A-Z]{1,2}\d+',  # Short codes like "A1", "B2"
    ]
    for pattern in garbage_patterns:
        if re.match(pattern, name):
            return False
    
    return True


def _parse_bill_text(text: str) -> List[Dict[str, Any]]:
    """Parse bill text to extract grocery items, prices, and quantities."""
    items = []
    lines = text.split('\n')
    
    # Patterns for different bill formats
    # Pattern 1: Item Name: Price (e.g., "Large Eggs: 0.99")
    colon_pattern = r'^(.+?)\s*[:]\s*(\d+\.?\d*)\s*$'
    # Pattern 2: Item Name Price (e.g., "Milk 1.15")
    space_price_pattern = r'^(.+?)\s+(\d+\.?\d{2})\s*$'
    # Pattern 3: Item Name $Price or ₹Price (e.g., "Milk $1.15" or "Milk ₹50.00")
    dollar_pattern = r'^(.+?)\s+[$\₹](\d+\.?\d*)\s*$'
    # Pattern 4: Item Name with quantity (e.g., "Cherry Tomatoes 1lb: 1.29")
    quantity_pattern = r'(\d+\.?\d*)\s*(kg|g|gm|grams?|lb|lbs|oz|ml|l|liters?|pcs?|pieces?|nos?|numbers?|pk|pack|each|ea|ct|count)'
    # Pattern 5: Item with quantity and price (e.g., "2x Milk 1.15" or "2 @ 1.15")
    qty_price_pattern = r'(\d+)\s*[xX@]\s*(.+?)\s+(\d+\.?\d*)'
    
    # Pattern for Indian receipt format: HSN code at start (e.g., "190590 MODERN MILK")
    # Also handle format with ₹ symbol: "190590 MODERN MILK ₹50.00"
    hsn_pattern = r'^\d{6}\s+(.+?)\s+[₹]?(\d+\.?\d*)\s*$'
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        # Skip header/footer lines and separators
        line_lower = line.lower()
        skip_keywords = ['total', 'subtotal', 'tax', 'gst', 'vat', 'discount', 'cash', 'change', 
                        'thank', 'store', 'receipt', 'invoice', 'date', 'time', '==', '---', '___',
                        'balance', 'amount', 'paid', 'due', 'refund', 'return', 'round', 'off',
                        'sale', 'account', 'items:', 'qty:', 'particulars', 'hsn', 'n/rate', 'value',
                        'cgst', 'sgst', 'breakup', 'details', 'inr']
        if any(skip in line_lower for skip in skip_keywords):
            continue
        
        # Skip lines that are just numbers, separators, or dates
        if re.match(r'^[\d\s\.\$:=\-\/]+$', line):
            continue
        
        # Skip date/time patterns
        if re.match(r'^\d{1,2}[\-\/]\d{1,2}[\-\/]\d{2,4}', line) or re.match(r'^\d{1,2}:\d{2}', line):
            continue
        
        # Skip GST percentage lines (e.g., "CGST @ 2.50%, SGST @ 2.50%")
        if re.search(r'@\s*\d+\.?\d*\s*%', line, re.IGNORECASE):
            continue
        
        # Skip lines that start with just numbers (likely HSN codes or line numbers)
        if re.match(r'^\d{4,}\s*$', line):  # Just a long number
            continue
        
        price = None
        item_name = None
        quantity = None
        unit = None
        
        # Try Indian receipt format first: HSN code followed by item name, quantity, rate, and value
        # Format: "190590 MODERN MILK PLUS BR 1 30.00 30.00"
        # Or: "190590 MODERN MILK PLUS BR 30.00"
        # Pattern: 6-digit HSN, item name, optional quantity, rate, optional value
        hsn_match = re.match(r'^(\d{6})\s+(.+)$', line)
        if hsn_match:
            # Extract item name and remaining parts (skip HSN code)
            remaining = hsn_match.group(2).strip()
            parts = remaining.split()
            
            if len(parts) >= 1:
                # Try to parse: ItemName [Qty] [Rate] [Value]
                # Look for numbers at the end (likely prices/quantities)
                numbers = []
                text_parts = []
                
                for part in parts:
                    # Check if it's a number (price or quantity)
                    if re.match(r'^\d+\.?\d*$', part):
                        try:
                            numbers.append(float(part))
                        except ValueError:
                            text_parts.append(part)
                    else:
                        text_parts.append(part)
                
                if numbers and text_parts:
                    # Reconstruct item name from text parts
                    item_name = ' '.join(text_parts).strip()
                    
                    # Determine which numbers are what
                    # Usually: [quantity, rate, value] or [rate, value] or just [value]
                    if len(numbers) >= 2:
                        # Likely format: quantity rate value or rate value
                        # If first number is small (1-10), it's probably quantity
                        if numbers[0] <= 10 and numbers[0] == int(numbers[0]):
                            quantity = str(int(numbers[0]))
                            price = numbers[-1]  # Use last number as price (value)
                        else:
                            # No quantity, just rate and value - use value as price
                            price = numbers[-1]
                    elif len(numbers) == 1:
                        # Single number - likely the price
                        price = numbers[0]
                    
                    # Validate we got something reasonable
                    if not item_name or not price or price <= 0:
                        item_name = None
                        price = None
                elif len(text_parts) > 0:
                    # No numbers found, might be just item name - skip this format
                    item_name = None
                    price = None
        
        # If HSN format didn't match, try other formats
        if not price or not item_name:
            # Try quantity x item format (e.g., "2x Milk 1.15" or "2 @ Milk 1.15")
            qty_price_match = re.search(qty_price_pattern, line)
            if qty_price_match:
                try:
                    quantity = qty_price_match.group(1)
                    item_name = qty_price_match.group(2).strip()
                    price = float(qty_price_match.group(3))
                    unit = 'each'
                except (ValueError, IndexError):
                    pass
            else:
                # Try colon format (Item Name: Price)
                colon_match = re.match(colon_pattern, line)
                if colon_match:
                    item_name = colon_match.group(1).strip()
                    try:
                        price = float(colon_match.group(2))
                    except ValueError:
                        pass
                else:
                    # Try dollar sign or rupee format (Item Name $Price or Item Name ₹Price)
                    dollar_match = re.match(dollar_pattern, line)
                    if dollar_match:
                        item_name = dollar_match.group(1).strip()
                        try:
                            price = float(dollar_match.group(2))
                        except ValueError:
                            pass
                    else:
                        # Try space-separated format (Item Name Price or Item Name ₹Price)
                        # Look for price at the end (usually 2 decimal places)
                        space_match = re.match(r'^(.+?)\s+[₹]?(\d+\.\d{2})\s*$', line)
                        if space_match:
                            item_name = space_match.group(1).strip()
                            try:
                                price = float(space_match.group(2))
                            except ValueError:
                                pass
                        else:
                            # Try format with single decimal (Item Name 1.5 or Item Name ₹1.5)
                            space_match_single = re.match(r'^(.+?)\s+[₹]?(\d+\.\d{1})\s*$', line)
                            if space_match_single:
                                item_name = space_match_single.group(1).strip()
                                try:
                                    price = float(space_match_single.group(2))
                                except ValueError:
                                    pass
                            else:
                                # Try Indian format: Item Name with price at end (₹50 or 50.00)
                                # Pattern: text followed by optional ₹ and number
                                indian_price_match = re.search(r'(.+?)\s+[₹]?(\d+\.?\d*)\s*$', line)
                                if indian_price_match:
                                    item_text = indian_price_match.group(1).strip()
                                    try:
                                        potential_price = float(indian_price_match.group(2))
                                        # More lenient price range for grocery items
                                        if potential_price > 0 and potential_price < 10000:
                                            item_name = item_text
                                            price = potential_price
                                    except ValueError:
                                        pass
                                else:
                                    # Fallback: find any number at the end as price
                                    # Look for patterns like "Item 12.99" or "Item 12" (but be more careful)
                                    price_match = re.search(r'[₹]?(\d+\.\d{1,2})\s*$', line)  # Prefer decimal prices
                                    if not price_match:
                                        price_match = re.search(r'[₹]?(\d+)\s*$', line)  # Fallback to integer
                                    
                                    if price_match:
                                        item_text = line[:price_match.start()].strip()
                                        # Only use if the number looks like a price (has decimal or reasonable value)
                                        try:
                                            potential_price = float(price_match.group(1))
                                            # More lenient price range for grocery items
                                            if potential_price > 0 and potential_price < 10000:
                                                item_name = item_text
                                                price = potential_price
                                        except ValueError:
                                            pass
        
        if not item_name or not price or price <= 0:
            continue
        
        # Remove HSN codes if still present (6-digit codes at start)
        item_name = re.sub(r'^\d{6}\s+', '', item_name)
        
        # Extract quantity and unit from item name
        qty_match = re.search(quantity_pattern, item_name, re.IGNORECASE)
        if qty_match:
            if not quantity:  # Only extract if we don't already have quantity
                quantity = qty_match.group(1)
                unit = qty_match.group(2)
            # Remove quantity from item name
            item_name = re.sub(quantity_pattern, '', item_name, flags=re.IGNORECASE).strip()
        
        # Clean item name
        item_name = re.sub(r'^\d+\.?\s*', '', item_name)  # Remove leading numbers
        item_name = re.sub(r'\s+', ' ', item_name)  # Normalize whitespace
        item_name = item_name.strip()
        
        # Validate item name is reasonable (not OCR garbage)
        if not _is_valid_item_name(item_name):
            continue
        
        # Skip if price is unreasonable
        if price <= 0 or price >= 10000:
            continue
        
        items.append({
            'name': item_name,
            'price': price,
            'quantity': quantity,
            'unit': unit,
        })
    
    # Post-processing: Remove duplicates and filter out suspicious items
    seen = set()
    filtered_items = []
    for item in items:
        # Create a key based on name and price to detect duplicates
        key = (item['name'].lower().strip(), round(item['price'], 2))
        if key not in seen:
            seen.add(key)
            filtered_items.append(item)
    
    # If we have too many items compared to reasonable expectations, 
    # filter more aggressively (likely OCR errors)
    if len(filtered_items) > 20:
        # Keep only items with the most reasonable names (highest letter ratio)
        scored_items = []
        for item in filtered_items:
            name = item['name']
            letter_count = sum(1 for c in name if c.isalpha())
            total_chars = len(name.replace(' ', ''))
            score = letter_count / total_chars if total_chars > 0 else 0
            scored_items.append((score, item))
        
        # Sort by score and take top items
        scored_items.sort(key=lambda x: x[0], reverse=True)
        filtered_items = [item for _, item in scored_items[:20]]
    
    return filtered_items


class GroceryItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    price: float = Field(..., gt=0)
    quantity: Optional[str] = None
    unit: Optional[str] = None
    purchase_date: date = Field(default_factory=lambda: date.today())

    @validator("name")
    def name_not_blank(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Grocery item name cannot be empty.")
        return cleaned


class GroceryItemResponse(BaseModel):
    id: int
    name: str
    price: float
    quantity: Optional[str]
    unit: Optional[str]
    purchase_date: date
    bill_image_url: Optional[str]
    is_from_bill: bool
    created_by: str
    created_at: datetime
    month_closed: Optional[str] = None


class BillScanResponse(BaseModel):
    items: List[Dict[str, Any]]
    raw_text: str


@app.post("/grocery-bills/scan", response_model=BillScanResponse)
def scan_bill(
    file: UploadFile = File(...),
    current_user: UserPublic = Depends(get_current_user),
) -> BillScanResponse:
    """Upload a bill image and extract grocery items using OCR.
    
    Note: Requires Tesseract OCR to be installed. If not installed, use manual entry instead.
    """
    # Check if Tesseract is available
    try:
        import pytesseract
        # Ensure path is set
        if not _setup_tesseract_path():
            # Try to use the known path directly
            tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            if os.path.exists(tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
            else:
                raise HTTPException(
                    status_code=503,
                    detail="Tesseract OCR is not installed or not found. Please install Tesseract OCR from https://github.com/UB-Mannheim/tesseract/wiki, or use the manual entry feature instead."
                )
        
        # Try a simple test to see if Tesseract works
        try:
            from PIL import Image
            test_img = Image.new('RGB', (100, 100), color='white')
            pytesseract.image_to_string(test_img)
        except Exception as test_error:
            # If test fails but path exists, still try to proceed
            tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
            if os.path.exists(tesseract_path):
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
            else:
                raise HTTPException(
                    status_code=503,
                    detail=f"Tesseract OCR is not configured correctly: {str(test_error)}. Please ensure Tesseract is installed at C:\\Program Files\\Tesseract-OCR\\tesseract.exe, or use the manual entry feature instead."
                )
    except ImportError:
        raise HTTPException(
            status_code=503,
            detail="OCR dependencies are not installed. Please install pytesseract: pip install pytesseract"
        )
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Read image data
    try:
        image_data = file.file.read()
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file")
    except Exception as error:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(error)}") from error
    
    # Process image with OCR
    try:
        text = _process_bill_image(image_data)
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"OCR processing failed: {str(error)}. Please ensure Tesseract OCR is installed on the server, or use manual entry instead."
        ) from error
    
    # Parse text to extract items
    items = _parse_bill_text(text)
    
    return BillScanResponse(items=items, raw_text=text)


@app.post("/grocery-purchases", response_model=GroceryItemResponse)
def add_grocery_purchase(
    payload: GroceryItemCreate,
    current_user: UserPublic = Depends(get_current_user),
) -> GroceryItemResponse:
    """Add a grocery purchase (from bill scan or manual entry)."""
    try:
        response = (
            supabase_client.table(GROCERY_PURCHASES_TABLE)
            .insert(
                {
                    "name": payload.name.strip(),
                    "price": float(payload.price),
                    "quantity": payload.quantity,
                    "unit": payload.unit,
                    "purchase_date": payload.purchase_date.isoformat(),
                    "is_from_bill": False,
                    "created_by": current_user.id,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "adding grocery purchase") from error
    
    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to save grocery purchase.")
    
    record = data[0]
    created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
    created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
    
    return GroceryItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        price=float(record["price"]),
        quantity=record.get("quantity"),
        unit=record.get("unit"),
        purchase_date=date.fromisoformat(record["purchase_date"]),
        bill_image_url=record.get("bill_image_url"),
        is_from_bill=bool(record.get("is_from_bill", False)),
        created_by=created_by,
        created_at=created_at,
        month_closed=record.get("month_closed"),
    )


@app.post("/grocery-purchases/batch", response_model=List[GroceryItemResponse])
def add_grocery_purchases_batch(
    items: List[GroceryItemCreate],
    current_user: UserPublic = Depends(get_current_user),
) -> List[GroceryItemResponse]:
    """Add multiple grocery purchases at once (e.g., from bill scan)."""
    if not items:
        raise HTTPException(status_code=400, detail="No items provided")
    
    today = date.today()
    records_to_insert = []
    for item in items:
        records_to_insert.append({
            "name": item.name.strip(),
            "price": float(item.price),
            "quantity": item.quantity,
            "unit": item.unit,
            "purchase_date": item.purchase_date.isoformat(),
            "is_from_bill": True,
            "created_by": current_user.id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    
    try:
        response = (
            supabase_client.table(GROCERY_PURCHASES_TABLE)
            .insert(records_to_insert, returning="representation")
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "adding grocery purchases") from error
    
    data = response.data or []
    result = []
    for record in data:
        created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
        created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
        result.append(
            GroceryItemResponse(
                id=int(record["id"]),
                name=str(record["name"]),
                price=float(record["price"]),
                quantity=record.get("quantity"),
                unit=record.get("unit"),
                purchase_date=date.fromisoformat(record["purchase_date"]),
                bill_image_url=record.get("bill_image_url"),
                is_from_bill=bool(record.get("is_from_bill", False)),
                created_by=created_by,
                created_at=created_at,
                month_closed=record.get("month_closed"),
            )
        )
    
    return result


@app.get("/grocery-purchases", response_model=List[GroceryItemResponse])
def list_grocery_purchases(
    limit: int = 100,
    offset: int = 0,
) -> List[GroceryItemResponse]:
    """List grocery purchases, sorted by purchase date (newest first)."""
    try:
        def fetch_purchases():
            response = (
                supabase_client.table(GROCERY_PURCHASES_TABLE)
                .select("id, name, price, quantity, unit, purchase_date, bill_image_url, is_from_bill, created_by, created_at")
                .order("purchase_date", desc=True)
                .order("created_at", desc=True)
                .limit(limit)
                .offset(offset)
                .execute()
            )
            return response
        
        response = _retry_supabase_operation(fetch_purchases, operation_name="fetching grocery purchases")
        records = response.data or []
        
        result = []
        for record in records:
            try:
                created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
                created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
                
                # Handle purchase_date - it might be a string or date object
                purchase_date_value = record.get("purchase_date")
                if purchase_date_value is None:
                    # Skip records with missing purchase_date
                    continue
                
                try:
                    if isinstance(purchase_date_value, str):
                        # Try ISO format first
                        try:
                            purchase_date = date.fromisoformat(purchase_date_value)
                        except ValueError:
                            # Try parsing with dateutil if ISO format fails
                            purchase_date = isoparse(purchase_date_value).date()
                    elif isinstance(purchase_date_value, date):
                        purchase_date = purchase_date_value
                    elif isinstance(purchase_date_value, datetime):
                        purchase_date = purchase_date_value.date()
                    else:
                        # Try to parse as string if it's another format
                        try:
                            purchase_date = date.fromisoformat(str(purchase_date_value))
                        except ValueError:
                            purchase_date = isoparse(str(purchase_date_value)).date()
                except (ValueError, TypeError, AttributeError) as date_error:
                    # Skip records with unparseable dates
                    print(f"Error parsing purchase_date for record {record.get('id', 'unknown')}: {date_error}, value: {purchase_date_value}")
                    continue
                
                result.append(
                    GroceryItemResponse(
                        id=int(record["id"]),
                        name=str(record.get("name", "")),
                        price=float(record.get("price", 0)),
                        quantity=record.get("quantity"),
                        unit=record.get("unit"),
                        purchase_date=purchase_date,
                        bill_image_url=record.get("bill_image_url"),
                        is_from_bill=bool(record.get("is_from_bill", False)),
                        created_by=created_by,
                        created_at=created_at,
                        month_closed=record.get("month_closed"),
                    )
                )
            except (ValueError, KeyError, TypeError) as e:
                # Log the error but continue processing other records
                print(f"Error processing grocery purchase record {record.get('id', 'unknown')}: {e}")
                continue
        
        return result
    except Exception as error:
        raise _handle_supabase_error(error, "fetching grocery purchases") from error


@app.delete("/grocery-purchases/{item_id}", response_model=GroceryItemResponse)
def delete_grocery_purchase(
    item_id: int,
    current_user: UserPublic = Depends(get_current_user),
) -> GroceryItemResponse:
    """Delete a grocery purchase."""
    try:
        existing_response = (
            supabase_client.table(GROCERY_PURCHASES_TABLE)
            .select("id, name, price, quantity, unit, purchase_date, bill_image_url, is_from_bill, created_by, created_at")
            .eq("id", item_id)
            .limit(1)
            .execute()
        )
    except Exception as error:
        raise _handle_supabase_error(error, "fetching grocery purchase for deletion") from error
    
    records = existing_response.data or []
    if not records:
        raise HTTPException(status_code=404, detail="Grocery purchase not found.")
    
    record = records[0]
    creator_id = record.get("created_by")
    if creator_id and creator_id not in {current_user.id, current_user.display_name}:
        raise HTTPException(status_code=403, detail="Only the creator can delete this item.")
    
    # Store the record before deletion
    created_by = str(record.get("created_by", "")) if record.get("created_by") else ""
    created_at = _parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat()))
    
    item_to_return = GroceryItemResponse(
        id=int(record["id"]),
        name=str(record["name"]),
        price=float(record["price"]),
        quantity=record.get("quantity"),
        unit=record.get("unit"),
        purchase_date=date.fromisoformat(record["purchase_date"]),
        bill_image_url=record.get("bill_image_url"),
        is_from_bill=bool(record.get("is_from_bill", False)),
        created_by=created_by,
        created_at=created_at,
        month_closed=record.get("month_closed"),
    )
    
    try:
        supabase_client.table(GROCERY_PURCHASES_TABLE).delete().eq("id", item_id).execute()
    except Exception as error:
        raise _handle_supabase_error(error, "deleting grocery purchase") from error
    
    return item_to_return


@app.post("/admin/users/{user_id}/access", response_model=UserListResponse)
def update_user_access(
    user_id: str,
    access_update: UserAccessUpdate,
    admin: UserPublic = Depends(get_current_admin),
) -> UserListResponse:
    """Grant or revoke access for a user (admin only)."""
    # Get the user first
    user_record = _get_user_by_id(user_id)
    if user_record is None:
        raise HTTPException(status_code=404, detail="User not found.")
    
    def update_access():
        response = (
            supabase_client.table(USERS_TABLE)
            .update(
                {
                    "has_access": access_update.has_access,
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                },
                returning="representation",
            )
            .eq("id", user_id)
            .execute()
        )
        return response
    
    response = _retry_supabase_operation(update_access, operation_name="updating user access")
    data = response.data or []
    if not data:
        raise HTTPException(status_code=500, detail="Failed to update user access.")
    
    record = data[0]
    
    # Send email to user
    user_email = record["email"]
    user_name = record["display_name"]
    if access_update.has_access:
        html_content = _html_email_template(
            "✅ Access Granted!",
            f"""
            <h2>Hello {user_name}!</h2>
            <p>Great news! Your account has been approved and you now have access to the Room Duty Scheduler.</p>
            <div class="highlight">
                <p><strong>You can now:</strong></p>
                <ul>
                    <li>View and manage the duty schedule</li>
                    <li>Track shared expenses</li>
                    <li>Add items to the shopping list</li>
                    <li>Add notes to special days</li>
                </ul>
            </div>
            <p>You can now log in and start using the application!</p>
            """,
            color="#10b981"
        )
        plain_text = f"Hello {user_name},\n\nYour account has been approved! You can now log in and use the Room Duty Scheduler.\n"
        _send_email_safe(user_email, "Access Granted - Room Duty Scheduler", plain_text, html_content)
    else:
        html_content = _html_email_template(
            "⚠️ Access Revoked",
            f"""
            <h2>Hello {user_name}!</h2>
            <p>Your access to the Room Duty Scheduler has been revoked.</p>
            <p>If you believe this is an error, please contact the administrator.</p>
            """,
            color="#ef4444"
        )
        plain_text = f"Hello {user_name},\n\nYour access to the Room Duty Scheduler has been revoked. If you believe this is an error, please contact the administrator.\n"
        _send_email_safe(user_email, "Access Revoked - Room Duty Scheduler", plain_text, html_content)
    
    return UserListResponse(
        id=str(record["id"]),
        email=str(record["email"]),
        display_name=str(record["display_name"]),
        is_admin=bool(record.get("is_admin", False)),
        has_access=bool(record.get("has_access", False)),
        created_at=_parse_timestamp(record.get("created_at", datetime.now(timezone.utc).isoformat())),
    )


Token.model_rebuild()

