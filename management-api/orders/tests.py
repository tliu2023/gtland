import json

from django.contrib.admin.sites import AdminSite
from django.contrib.auth import get_user_model
from django.contrib.messages.storage.fallback import FallbackStorage
from django.test import RequestFactory, TestCase

from accounts.auth import issue_token
from cards.models import Product

from .admin import OrderAdmin
from .models import CartItem, Order

User = get_user_model()


class CartAndOrderTests(TestCase):
    def setUp(self):
        self.alice = User.objects.create_user("alice", "alice@example.com", "pw-for-tests-123")
        self.bob = User.objects.create_user("bob", "bob@example.com", "pw-for-tests-123")
        self.card = Product.objects.create(slug="card", title="Card", category="single_card", price="10.00", quantity=2)
        self.box = Product.objects.create(slug="box", title="Box", category="sealed", price="100.00", quantity=1)

    def auth(self, user):
        return {"HTTP_AUTHORIZATION": f"Bearer {issue_token(user)}"}

    def add(self, user, product, quantity=1):
        return self.client.post("/api/cart/add/", {"product_id": product.pk, "quantity": quantity}, **self.auth(user))

    def test_cart_requires_login(self):
        self.assertEqual(self.client.get("/api/cart/").status_code, 401)
        self.assertEqual(self.client.post("/api/cart/add/", {"product_id": self.card.pk}).status_code, 401)

    def test_add_increments_and_caps_at_stock(self):
        self.add(self.alice, self.card)
        res = self.add(self.alice, self.card, quantity=5)
        item = res.json()["items"][0]
        self.assertEqual((item["quantity"], item["available"]), (2, 2))

    def test_cannot_add_sold_or_hidden_products(self):
        self.box.status = Product.Status.SOLD
        self.box.save()
        self.assertEqual(self.add(self.alice, self.box).status_code, 409)
        self.card.status = Product.Status.HIDDEN
        self.card.save()
        self.assertEqual(self.add(self.alice, self.card).status_code, 404)

    def test_cart_persists_and_shows_sold_items_as_unavailable(self):
        self.add(self.alice, self.box)
        self.add(self.bob, self.box)
        self.assertEqual(self.client.post("/api/orders/place/", **self.auth(self.bob)).status_code, 201)

        items = self.client.get("/api/cart/", **self.auth(self.alice)).json()["items"]
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["available"], 0)
        self.box.refresh_from_db()
        self.assertEqual((self.box.quantity, self.box.status), (0, Product.Status.SOLD))
        self.assertFalse(CartItem.objects.filter(user=self.bob).exists())

    def test_place_order_rejects_unavailable_items(self):
        self.add(self.alice, self.card, quantity=2)
        Product.objects.filter(pk=self.card.pk).update(quantity=1)
        res = self.client.post("/api/orders/place/", **self.auth(self.alice))
        self.assertEqual(res.status_code, 409)
        self.assertIn("Card", res.json()["error"])
        self.assertFalse(Order.objects.exists())

    def test_update_and_remove(self):
        self.add(self.alice, self.card)
        auth = self.auth(self.alice)
        self.assertEqual(
            self.client.post("/api/cart/update/", {"product_id": self.card.pk, "quantity": 3}, **auth).status_code, 409
        )
        res = self.client.post("/api/cart/update/", {"product_id": self.card.pk, "quantity": 2}, **auth)
        self.assertEqual(res.json()["count"], 2)
        res = self.client.post("/api/cart/remove/", {"product_id": self.card.pk}, **auth)
        self.assertEqual(res.json()["items"], [])

    def test_orders_list_only_own_orders_with_snapshot(self):
        self.add(self.alice, self.card, quantity=2)
        self.client.post("/api/orders/place/", **self.auth(self.alice))
        Product.objects.filter(pk=self.card.pk).update(title="Renamed", price="99.00")

        orders = self.client.get("/api/orders/", **self.auth(self.alice)).json()["orders"]
        self.assertEqual(len(orders), 1)
        self.assertEqual(orders[0]["total"], "20.00")
        self.assertEqual(orders[0]["items"][0]["title"], "Card")
        self.assertEqual(self.client.get("/api/orders/", **self.auth(self.bob)).json()["orders"], [])

    def merge(self, user, items):
        return self.client.post("/api/cart/merge/", {"items": json.dumps(items)}, **self.auth(user))

    def test_merge_requires_login_and_valid_data(self):
        self.assertEqual(self.client.post("/api/cart/merge/", {"items": "[]"}).status_code, 401)
        res = self.client.post("/api/cart/merge/", {"items": "not json"}, **self.auth(self.alice))
        self.assertEqual(res.status_code, 400)

    def test_merge_combines_caps_and_keeps_sold_items(self):
        self.add(self.alice, self.card)
        hidden = Product.objects.create(slug="hid", title="Hid", category="sealed", price="1.00", status="hidden")
        sold = Product.objects.create(slug="sold", title="Sold", category="sealed", price="1.00", quantity=0, status="sold")
        res = self.merge(
            self.alice,
            [
                {"product_id": self.card.pk, "quantity": 5},
                {"product_id": sold.pk, "quantity": 1},
                {"product_id": hidden.pk, "quantity": 1},
                {"product_id": 999999, "quantity": 1},
                "garbage",
            ],
        )
        self.assertEqual(res.status_code, 200)
        items = {i["title"]: (i["quantity"], i["available"]) for i in res.json()["items"]}
        self.assertEqual(items, {"Card": (2, 2), "Sold": (1, 0)})

    def test_admin_cancel_restocks(self):
        self.add(self.alice, self.box)
        self.client.post("/api/orders/place/", **self.auth(self.alice))
        request = RequestFactory().post("/")
        request.user = User.objects.create_superuser("root", "root@example.com", "pw-for-tests-123")
        request.session = {}
        request._messages = FallbackStorage(request)

        OrderAdmin(Order, AdminSite()).cancel_and_restock(request, Order.objects.all())
        self.box.refresh_from_db()
        self.assertEqual((self.box.quantity, self.box.status), (1, Product.Status.AVAILABLE))
        self.assertEqual(Order.objects.get().status, Order.Status.CANCELLED)
