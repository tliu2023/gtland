from django.forms.models import model_to_dict
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from accounts.auth import submission_editor_required

from .forms import SubmissionCardForm, save_submission
from .models import CardDetails, Product


def _graded_card(card_id):
    return get_object_or_404(
        CardDetails.objects.select_related("product"),
        pk=card_id,
        product__category=Product.Category.GRADED,
    )


def _save(request, card):
    data = request.POST
    if card.pk:
        # allow partial updates (e.g. just the tier) by defaulting to current values
        data = {**model_to_dict(card), "name": card.product.title, **request.POST.dict()}
    form = SubmissionCardForm(data, request.FILES, instance=card)
    if not form.is_valid():
        return JsonResponse({"errors": form.errors}, status=400)
    card = save_submission(form.instance, form.cleaned_data)
    return JsonResponse({"id": card.pk})


# bearer-token calls from the storefront server, so no CSRF cookie
@csrf_exempt
@require_POST
@submission_editor_required
def create_submission(request):
    return _save(request, CardDetails())


@csrf_exempt
@require_POST
@submission_editor_required
def update_submission(request, card_id):
    return _save(request, _graded_card(card_id))


@csrf_exempt
@require_POST
@submission_editor_required
def delete_submission(request, card_id):
    _graded_card(card_id).product.delete()
    return JsonResponse({"deleted": card_id})
