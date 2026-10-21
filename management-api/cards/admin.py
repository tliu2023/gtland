from django.contrib import admin
from django.utils.html import format_html

from .forms import SubmissionCardForm, save_submission
from .models import CardDetails, Product, ProductImage, SealedDetails


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1  # one empty upload slot by default


class CardDetailsInline(admin.StackedInline):
    model = CardDetails
    extra = 0
    verbose_name = "Card details"
    verbose_name_plural = "Card details"


class SealedDetailsInline(admin.StackedInline):
    model = SealedDetails
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "game", "category", "price", "quantity", "status", "updated_at")
    list_filter = ("game", "category", "status")
    list_editable = ("price", "quantity", "status")  # quick bulk edits in the list view
    search_fields = ("title", "carddetails__player_or_character", "carddetails__set")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [CardDetailsInline, SealedDetailsInline, ProductImageInline]


@admin.register(CardDetails)
class SubmissionsAdmin(admin.ModelAdmin):
    form = SubmissionCardForm
    list_display = (
        "card_name",
        "cert_number",
        "submission_number",
        "submission_date",
        "submission_tier",
        "grading_company",
        "grade",
        "submission_status",
        "image_preview",
    )
    list_display_links = ("card_name",)
    list_editable = ("submission_tier", "submission_status")
    list_filter = ("submission_tier",)
    search_fields = (
        "product__title",
        "cert_number",
        "submission_number",
        "grading_company",
    )
    fields = (
        "grading_company",
        "submission_tier",
        "name",
        "cert_number",
        "submission_number",
        "submission_date",
        "grade",
        "submission_status",
        "image",
        "note",
    )

    def save_model(self, request, obj, form, change):
        save_submission(obj, form.cleaned_data)

    def delete_model(self, request, obj):
        obj.product.delete()

    def delete_queryset(self, request, queryset):
        Product.objects.filter(carddetails__in=queryset).delete()

    @admin.display(description="Name", ordering="product__title")
    def card_name(self, card_details):
        return card_details.product.title

    @admin.display(description="Image")
    def image_preview(self, card_details):
        image = card_details.product.images.first()
        if not image:
            return "-"
        return format_html(
            '<img src="{}" alt="" style="height: 64px; width: 48px; object-fit: contain;">',
            image.image.url,
        )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .filter(
                product__category=Product.Category.GRADED,
                submission_status=CardDetails.SubmissionStatus.SUBMISSION,
            )
            .select_related("product")
            .prefetch_related("product__images")
        )
