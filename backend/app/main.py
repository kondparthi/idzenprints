"""
FastAPI application entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.routers import (
    auth,
    brands,
    card_types,
    cards,
    customer_details,
    customers,
    dashboard,
    documents,
    guest_orders,
    member_auth,
    member_cards,
    member_sessions,
    member_types,
    members,
    orders,
    packages,
    print_bucket,
    product_categories,
    products,
    public,
    reports,
    storefront,
    subscriptions,
    tags,
    templates,
)

settings = get_settings()

app = FastAPI(title=settings.APP_NAME, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(customers.router)
app.include_router(dashboard.router)
app.include_router(documents.router)
app.include_router(customer_details.router)
app.include_router(card_types.router)
app.include_router(templates.router)
app.include_router(cards.router)
app.include_router(orders.router)
app.include_router(reports.router)
app.include_router(product_categories.router)
app.include_router(brands.router)
app.include_router(tags.router)
app.include_router(products.router)
app.include_router(member_types.router)
app.include_router(members.router)
app.include_router(packages.router)
app.include_router(subscriptions.router)
app.include_router(member_auth.router)
app.include_router(member_cards.router)
app.include_router(public.router)
app.include_router(storefront.router)
app.include_router(guest_orders.router)
app.include_router(member_sessions.router)
app.include_router(print_bucket.router)


@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME}
