from app.schemas.ai import AssistantRequest, AssistantResponse, SummarizeFeedbackResponse
from app.schemas.auth import AuthResponse, LoginRequest, Profile, RegisterRequest, Session
from app.schemas.chat import (
    ChatMessage,
    ChatMessageCreateRequest,
    ChatReport,
    ChatReportRequest,
    Conversation,
)
from app.schemas.calendar_event import CalendarEvent, CalendarEventCreateRequest
from app.schemas.discount import Discount, DiscountCreateRequest
from app.schemas.marketing import MarketingEmailRequest, MarketingEmailResponse
from app.schemas.metrics import MetricsSummary
from app.schemas.order import CartItem, Order, OrderCreateRequest, OrderCustomer
from app.schemas.product import Product, ProductCreateRequest, ProductUpdateRequest
from app.schemas.sales import (
    CalendarContextEntry,
    CalendarContextIn,
    SalesForecastPoint,
    SalesForecastResponse,
    SalesMLForecastResponse,
    SalesRetrainResponse,
)
from app.schemas.user import UserCreateRequest

__all__ = [
    "AssistantRequest",
    "AssistantResponse",
    "SummarizeFeedbackResponse",
    "AuthResponse",
    "LoginRequest",
    "Profile",
    "RegisterRequest",
    "Session",
    "ChatMessage",
    "ChatMessageCreateRequest",
    "ChatReport",
    "ChatReportRequest",
    "Conversation",
    "CalendarEvent",
    "CalendarEventCreateRequest",
    "Discount",
    "DiscountCreateRequest",
    "MarketingEmailRequest",
    "MarketingEmailResponse",
    "MetricsSummary",
    "CartItem",
    "Order",
    "OrderCreateRequest",
    "OrderCustomer",
    "Product",
    "ProductCreateRequest",
    "ProductUpdateRequest",
    "CalendarContextEntry",
    "CalendarContextIn",
    "SalesForecastPoint",
    "SalesForecastResponse",
    "SalesMLForecastResponse",
    "SalesRetrainResponse",
    "UserCreateRequest",
]
