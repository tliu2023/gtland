from django.conf import settings
from django.db import models

from cards.models import Product


def available_quantity(product):
    return product.quantity if product.status == Product.Status.AVAILABLE else 0


class CartItem(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="cart_items")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="+")
    quantity = models.PositiveIntegerField(default=1)
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["added_at"]
        constraints = [models.UniqueConstraint(fields=["user", "product"], name="unique_cart_product")]

    def __str__(self):
        return f"{self.quantity} x {self.product} for {self.user}"


class Order(models.Model):
    class Status(models.TextChoices):
        PLACED = "placed", "Placed"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLACED)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Order #{self.pk}"

    @property
    def total(self):
        return sum((item.line_total for item in self.items.all()), 0)


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    # snapshot fields below keep the order readable even if the product is later edited or deleted
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    title = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField()

    def __str__(self):
        return f"{self.quantity} x {self.title}"

    @property
    def line_total(self):
        return self.unit_price * self.quantity
