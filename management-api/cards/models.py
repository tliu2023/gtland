from django.db import models


class Product(models.Model):
    class Category(models.TextChoices):
        SINGLE_CARD = "single_card", "Singles"
        SEALED = "sealed", "Sealed"
        GRADED = "graded", "Graded"
        DECK = "deck", "Decks"

    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        SOLD = "sold", "Sold"
        HIDDEN = "hidden", "Hidden"

    # keep in sync with storefront/src/lib/games.ts
    class Game(models.TextChoices):
        ONE_PIECE = "one_piece", "One Piece TCG"
        GUNDAM = "gundam", "Gundam TCG"
        RIFTBOUND = "riftbound", "Riftbound"
        UNION_ARENA = "union_arena", "Union Arena"
        NARUTO_MYTHOS = "naruto_mythos", "Naruto Mythos"
        NARUTO = "naruto", "Naruto TCG"

    slug = models.SlugField(unique=True)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    game = models.CharField(max_length=20, choices=Game.choices, blank=True)
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

    class Meta:
        verbose_name = "submission"
        verbose_name_plural = "Submissions"

    class SubmissionTier(models.TextChoices):
        EXPRESS = "express", "Express"
        NORMAL = "normal", "Normal"
        WALKTHROUGH = "walkthrough", "Walkthrough"
        ONE_DAY = "one_day", "1-day"

    class SubmissionStatus(models.TextChoices):
        NOT_SUBMITTED = "not_submitted", "Not submitted"
        SUBMISSION = "submission", "Submission"
        IN_PROGRESS = "in_progress", "In progress"
        COMPLETED = "completed", "Completed"
        RETURNED = "returned", "Returned"

    product = models.OneToOneField(Product, on_delete=models.CASCADE)
    set = models.CharField(max_length=200, blank=True)
    player_or_character = models.CharField(max_length=200, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    condition = models.CharField(max_length=100, blank=True)
    grading_company = models.CharField(max_length=50, blank=True, verbose_name="Organization")
    grade = models.CharField(max_length=20, blank=True)
    cert_number = models.CharField(max_length=100, blank=True)
    submission_number = models.CharField(max_length=100, blank=True)
    submission_date = models.DateField(null=True, blank=True)
    submission_tier = models.CharField(
        max_length=20, choices=SubmissionTier.choices, default=SubmissionTier.NORMAL
    )
    submission_status = models.CharField(
        max_length=20,
        choices=SubmissionStatus.choices,
        default=SubmissionStatus.NOT_SUBMITTED,
    )
    note = models.TextField(blank=True)

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
