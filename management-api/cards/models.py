from django.db import models


class Product(models.Model):
    class Category(models.TextChoices):
        SINGLE_CARD = "single_card", "Single card"
        SEALED = "sealed", "Sealed product"
        GRADED = "graded", "Graded card"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        SOLD = "sold", "Sold"
        HIDDEN = "hidden", "Hidden"

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=20, choices=Category.choices)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.AVAILABLE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title


class CardDetails(models.Model):
    """Extra fields for single_card / graded products."""

    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    set = models.CharField(max_length=200, blank=True)
    player_or_character = models.CharField(max_length=200, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    condition = models.CharField(max_length=100, blank=True)
    grading_company = models.CharField(max_length=50, blank=True)
    grade = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"Card details for {self.product.title}"


class SealedDetails(models.Model):
    """Extra fields for sealed products (packs/boxes)."""

    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    set = models.CharField(max_length=200, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    box_type = models.CharField(max_length=200, blank=True)
    sealed_condition = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"Sealed details for {self.product.title}"


class ProductImage(models.Model):
    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, related_name="images"
    )
    image = models.ImageField(upload_to="products/")
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]

    def __str__(self):
        return f"Image for {self.product.title}"
