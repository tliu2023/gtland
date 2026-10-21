"""
URL configuration for management_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path

from accounts import api as accounts_api
from cards import api
from orders import api as orders_api

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/login/', accounts_api.login),
    path('api/auth/register/', accounts_api.register),
    path('api/auth/verify-email/', accounts_api.verify_email),
    path('api/auth/resend-verification/', accounts_api.resend_verification),
    path('api/auth/me/', accounts_api.me),
    path('api/submissions/', api.create_submission),
    path('api/submissions/<int:card_id>/', api.update_submission),
    path('api/submissions/<int:card_id>/delete/', api.delete_submission),
    path('api/cart/', orders_api.cart),
    path('api/cart/add/', orders_api.add_to_cart),
    path('api/cart/update/', orders_api.update_cart),
    path('api/cart/remove/', orders_api.remove_from_cart),
    path('api/cart/merge/', orders_api.merge_cart),
    path('api/orders/', orders_api.orders),
    path('api/orders/place/', orders_api.place_order),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
