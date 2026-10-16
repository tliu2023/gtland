from django.contrib import admin

from .models import CardDetails, Product, ProductImage, SealedDetails


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1  # one empty upload slot by default


class CardDetailsInline(admin.StackedInline):
    model = CardDetails
    extra = 0


class SealedDetailsInline(admin.StackedInline):
    model = SealedDetails
    extra = 0


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "price", "quantity", "status", "updated_at")
    list_filter = ("category", "status")
    list_editable = ("price", "quantity", "status")  # quick bulk edits in the list view
    search_fields = ("title", "carddetails__player_or_character", "carddetails__set")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [CardDetailsInline, SealedDetailsInline, ProductImageInline]
