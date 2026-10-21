from django.contrib import admin, messages
from django.db import transaction

from cards.models import Product

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ("product", "title", "unit_price", "quantity")

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("__str__", "user", "status", "item_count", "total", "created_at")
    list_filter = ("status",)
    search_fields = ("user__username", "user__email", "items__title")
    readonly_fields = ("user", "created_at")
    inlines = [OrderItemInline]
    actions = ["mark_completed", "cancel_and_restock"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("user").prefetch_related("items")

    @admin.display(description="Items")
    def item_count(self, order):
        return sum(item.quantity for item in order.items.all())

    @admin.action(description="Mark selected orders as completed")
    def mark_completed(self, request, queryset):
        updated = queryset.filter(status=Order.Status.PLACED).update(status=Order.Status.COMPLETED)
        self.message_user(request, f"Marked {updated} order(s) completed.")

    @admin.action(description="Cancel selected orders and return items to stock")
    @transaction.atomic
    def cancel_and_restock(self, request, queryset):
        orders = list(queryset.filter(status=Order.Status.PLACED).prefetch_related("items"))
        for order in orders:
            for item in order.items.all():
                product = Product.objects.select_for_update().filter(pk=item.product_id).first()
                if product is None:
                    continue
                product.quantity += item.quantity
                if product.status == Product.Status.SOLD:
                    product.status = Product.Status.AVAILABLE
                product.save(update_fields=["quantity", "status", "updated_at"])
            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status"])
        self.message_user(request, f"Cancelled and restocked {len(orders)} order(s).", messages.SUCCESS)
