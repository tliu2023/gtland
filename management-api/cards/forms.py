import uuid

from django import forms
from django.db import transaction
from django.db.models import F
from django.utils.text import slugify

from .models import CardDetails, Product, ProductImage

Tier = CardDetails.SubmissionTier
TIERS_BY_ORGANIZATION = {
    "PSA": (Tier.NORMAL, Tier.EXPRESS, Tier.WALKTHROUGH),
    "BGS": (Tier.NORMAL, Tier.EXPRESS, Tier.ONE_DAY),
}


class SubmissionCardForm(forms.ModelForm):
    grading_company = forms.ChoiceField(
        label="Organization",
        choices=[("", "---------")] + [(org, org) for org in TIERS_BY_ORGANIZATION],
    )
    name = forms.CharField(max_length=200)
    image = forms.ImageField(required=False, help_text="Becomes the card's primary image.")

    class Meta:
        model = CardDetails
        fields = (
            "grading_company",
            "submission_tier",
            "cert_number",
            "submission_number",
            "submission_date",
            "grade",
            "submission_status",
            "note",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance.pk:
            self.fields["name"].initial = self.instance.product.title
        else:
            self.fields["submission_status"].initial = CardDetails.SubmissionStatus.SUBMISSION

    def clean(self):
        cleaned = super().clean()
        organization = cleaned.get("grading_company")
        tier = cleaned.get("submission_tier")
        if organization and tier and tier not in TIERS_BY_ORGANIZATION[organization]:
            self.add_error(
                "submission_tier",
                f"{Tier(tier).label} is not a {organization} submission tier.",
            )
        return cleaned


@transaction.atomic
def save_submission(card, cleaned_data):
    name = cleaned_data["name"]
    if card.pk:
        card.product.title = name
        card.product.save()
    else:
        # hidden so it stays off the storefront until listed from Products
        card.product = Product.objects.create(
            slug=f"{slugify(name)[:40]}-{uuid.uuid4().hex[:8]}",
            title=name,
            category=Product.Category.GRADED,
            price=0,
            status=Product.Status.HIDDEN,
        )
    card.save()
    image = cleaned_data.get("image")
    if image:
        card.product.images.update(sort_order=F("sort_order") + 1)
        ProductImage.objects.create(product=card.product, image=image, sort_order=0)
    return card
