import json

from django.db import transaction
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from accounts.auth import login_required_api
from cards.models import Product

from .models import CartItem, Order, OrderItem, available_quantity

MAX_QUANTITY = 99
MAX_MERGE_LINES = 50


def _positive_int(value, default=None):
    try:
        number = int(value)
    except (TypeError, ValueError):
        return default
    return number if number >= 0 else default


def _cart_payload(user):
    items = (
        CartItem.objects.filter(user=user)
        .select_related("product")
        .prefetch_related("product__images")
    )
    payload = []
    for item in items:
        product = item.product
        image = next(iter(product.images.all()), None)
        payload.append(
            {
                "product_id": product.pk,
                "slug": product.slug,
                "title": product.title,
                "game": product.game,
                "category": product.category,
                "unit_price": str(product.price),
                "quantity": item.quantity,
                "available": available_quantity(product),
                "image": image.image.name if image else None,
            }
        )
    return JsonResponse({"items": payload, "count": sum(i["quantity"] for i in payload)})


@require_GET
@login_required_api
def cart(request):
    return _cart_payload(request.user)


# bearer-token calls from the storefront server, so no CSRF cookie
@csrf_exempt
@require_POST
@login_required_api
def add_to_cart(request):
    product = Product.objects.filter(pk=_positive_int(request.POST.get("product_id"))).first()
    if product is None or product.status == Product.Status.HIDDEN:
        return JsonResponse({"error": "Product not found."}, status=404)
    available = available_quantity(product)
    if available == 0:
        return JsonResponse({"error": "This item is sold out."}, status=409)

    quantity = _positive_int(request.POST.get("quantity"), 1) or 1
    item, _ = CartItem.objects.get_or_create(user=request.user, product=product, defaults={"quantity": 0})
    item.quantity = min(item.quantity + quantity, available, MAX_QUANTITY)
    item.save(update_fields=["quantity"])
    return _cart_payload(request.user)


@csrf_exempt
@require_POST
@login_required_api
def update_cart(request):
    item = (
        CartItem.objects.filter(user=request.user, product_id=_positive_int(request.POST.get("product_id")))
        .select_related("product")
        .first()
    )
    quantity = _positive_int(request.POST.get("quantity"))
    if item is None or quantity is None:
        return JsonResponse({"error": "Invalid cart update."}, status=400)
    if quantity == 0:
        item.delete()
        return _cart_payload(request.user)

    available = available_quantity(item.product)
    if quantity > min(available, MAX_QUANTITY):
        return JsonResponse({"error": f"Only {available} of \u201c{item.product.title}\u201d available."}, status=409)
    item.quantity = quantity
    item.save(update_fields=["quantity"])
    return _cart_payload(request.user)


@csrf_exempt
@require_POST
@login_required_api
def remove_from_cart(request):
    CartItem.objects.filter(user=request.user, product_id=_positive_int(request.POST.get("product_id"))).delete()
    return _cart_payload(request.user)


@csrf_exempt
@require_POST
@login_required_api
def merge_cart(request):
    """Fold a logged-out (guest) cart into the user's saved cart after they log in."""
    try:
        entries = json.loads(request.POST.get("items", "[]"))
    except ValueError:
        return JsonResponse({"error": "Invalid cart data."}, status=400)
    if not isinstance(entries, list) or len(entries) > MAX_MERGE_LINES:
        return JsonResponse({"error": "Invalid cart data."}, status=400)

    with transaction.atomic():
        for entry in entries:
            if not isinstance(entry, dict):
                continue
            quantity = _positive_int(entry.get("quantity"))
            product = (
                Product.objects.filter(pk=_positive_int(entry.get("product_id")))
                .exclude(status=Product.Status.HIDDEN)
                .first()
            )
            if not quantity or product is None:
                continue
            item, _ = CartItem.objects.get_or_create(user=request.user, product=product, defaults={"quantity": 0})
            item.quantity = min(item.quantity + quantity, MAX_QUANTITY)
            available = available_quantity(product)
            # sold-out items are kept (shown greyed out) rather than silently dropped
            if available:
                item.quantity = min(item.quantity, available)
            item.save(update_fields=["quantity"])
    return _cart_payload(request.user)


@csrf_exempt
@require_POST
@login_required_api
def place_order(request):
    with transaction.atomic():
        # lock the products so two people can't order the last copy at the same time
        items = list(
            CartItem.objects.filter(user=request.user)
            .select_related("product")
            .select_for_update(of=("self", "product"))
        )
        if not items:
            return JsonResponse({"error": "Your cart is empty."}, status=400)

        unavailable = [i.product.title for i in items if i.quantity > available_quantity(i.product)]
        if unavailable:
            return JsonResponse(
                {
                    "error": "Some items are no longer available in the quantity requested: "
                    + ", ".join(unavailable)
                    + ". Update or remove them to place your order.",
                },
                status=409,
            )

        order = Order.objects.create(user=request.user)
        for item in items:
            product = item.product
            OrderItem.objects.create(
                order=order, product=product, title=product.title, unit_price=product.price, quantity=item.quantity
            )
            product.quantity -= item.quantity
            if product.quantity == 0:
                product.status = Product.Status.SOLD
            product.save(update_fields=["quantity", "status", "updated_at"])
        CartItem.objects.filter(pk__in=[i.pk for i in items]).delete()

    return JsonResponse({"order_id": order.pk}, status=201)


@require_GET
@login_required_api
def orders(request):
    payload = []
    for order in Order.objects.filter(user=request.user).prefetch_related("items"):
        payload.append(
            {
                "id": order.pk,
                "status": order.status,
                "created_at": order.created_at.isoformat(),
                "total": str(order.total),
                "items": [
                    {
                        "title": item.title,
                        "unit_price": str(item.unit_price),
                        "quantity": item.quantity,
                        "line_total": str(item.line_total),
                    }
                    for item in order.items.all()
                ],
            }
        )
    return JsonResponse({"orders": payload})
