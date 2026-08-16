import asyncio
import contextlib
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    ai,
    auth,
    calendar_events,
    chat,
    discounts,
    marketing,
    metrics,
    newsletter,
    orders,
    products,
    sales,
    users,
)
from app.services.scheduler import daily_retrain_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    retrain_task = asyncio.create_task(daily_retrain_loop())
    yield
    retrain_task.cancel()
    with contextlib.suppress(asyncio.CancelledError):
        await retrain_task


app = FastAPI(
    title="Vestro Sales API",
    version="1.0.0",
    lifespan=lifespan,
)
print("FRONTEND ORIGIN:", get_settings().frontend_origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[get_settings().frontend_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(users.router)
app.include_router(metrics.router)
app.include_router(sales.router)
app.include_router(chat.router)
app.include_router(ai.router)
app.include_router(newsletter.router)
app.include_router(discounts.router)
app.include_router(calendar_events.router)
app.include_router(marketing.router)


@app.get("/")
def root():
    return {
        "message": "Vestro Sales API",
        "status": "online"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }
