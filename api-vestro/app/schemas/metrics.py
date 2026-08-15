from pydantic import BaseModel


class MetricsSummary(BaseModel):
    revenue: float
    newCustomers: int
    conversionRate: float
    ordersCount: int
    totalUsers: int
