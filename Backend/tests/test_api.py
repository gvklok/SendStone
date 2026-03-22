"""
Automated API tests for SendStone Backend.
Based on SendStone_Backend_Plan.md specifications.

IMPORTANT: Start the server first!
    python -m uvicorn main:app --reload

Run tests with: python -m pytest tests/test_api.py -v
"""
import pytest
import httpx

# Test against running server
BASE_URL = "http://127.0.0.1:8000"
client = httpx.Client(base_url=BASE_URL, timeout=60.0)

# ============== TEST DATA ==============

TEST_ROUTE = {
    "name": "Test Route for Automated Testing",
    "difficulty": "v4",
    "description": "A test route created by automated tests",
    "holds": [
        {"x": 5.0, "y": 7.0, "color": "blue"},
        {"x": 3.0, "y": 4.0, "color": "green"},
        {"x": 6.0, "y": 14.0, "color": "red"}
    ],
    "angle": 40,
    "visibility": "public"
}

# Real user ID from profiles table
TEST_USER_ID = "97c01cc9-9b61-492f-811d-90fe5f59da79"

# Will be set during tests
created_route_id = None


# ============== HEALTH CHECK TESTS ==============

class TestHealthCheck:
    """Test health check endpoints."""
    
    def test_root_endpoint(self):
        """GET / should return status ok."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "message" in data
    
    def test_health_endpoint(self):
        """GET /health should return healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "supabase_configured" in data


# ============== ROUTES CRUD TESTS ==============

class TestRoutesList:
    """Test GET /routes endpoint."""
    
    def test_list_routes_default(self):
        """GET /routes should return paginated list."""
        response = client.get("/routes")
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure matches plan
        assert "items" in data
        assert "page" in data
        assert "total" in data
        assert isinstance(data["items"], list)
        assert data["page"] == 1
    
    def test_list_routes_with_pagination(self):
        """GET /routes should support pagination."""
        response = client.get("/routes?page=1&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) <= 5
    
    def test_list_routes_with_search(self):
        """GET /routes should filter by name search."""
        response = client.get("/routes?search=kid")
        assert response.status_code == 200
        data = response.json()
        # All returned routes should contain 'kid' in name (case-insensitive)
        for route in data["items"]:
            assert "kid" in route["name"].lower()
    
    def test_list_routes_with_difficulty_filter(self):
        """GET /routes should filter by difficulty."""
        response = client.get("/routes?difficulty=v0")
        assert response.status_code == 200
        data = response.json()
        for route in data["items"]:
            assert route["difficulty"] == "v0"
    
    def test_list_routes_with_sort(self):
        """GET /routes should support sorting."""
        # Sort ascending by name
        response = client.get("/routes?sort=name")
        assert response.status_code == 200
        
        # Sort descending by created_at (default)
        response = client.get("/routes?sort=-created_at")
        assert response.status_code == 200
    
    def test_list_routes_only_public(self):
        """GET /routes should only return public routes."""
        response = client.get("/routes")
        assert response.status_code == 200
        data = response.json()
        for route in data["items"]:
            assert route["visibility"] == "public"


class TestRoutesCreate:
    """Test POST /routes endpoint."""
    
    def test_create_route_success(self):
        """POST /routes should create a new route."""
        global created_route_id
        
        response = client.post("/routes", json=TEST_ROUTE)
        assert response.status_code == 201
        data = response.json()
        
        # Check response has required fields
        assert "id" in data
        assert data["name"] == TEST_ROUTE["name"]
        assert data["difficulty"] == TEST_ROUTE["difficulty"]
        assert data["angle"] == TEST_ROUTE["angle"]
        assert data["visibility"] == TEST_ROUTE["visibility"]
        assert "holds" in data
        assert "created_at" in data
        
        # Save for later tests
        created_route_id = data["id"]
    
    def test_create_route_missing_name(self):
        """POST /routes should fail without name."""
        invalid_route = {
            "difficulty": "v4",
            "holds": [{"x": 5.0, "y": 7.0, "color": "blue"}]
        }
        response = client.post("/routes", json=invalid_route)
        assert response.status_code == 422  # Validation error
    
    def test_create_route_missing_holds(self):
        """POST /routes should fail without holds."""
        invalid_route = {
            "name": "No Holds Route",
            "difficulty": "v4"
        }
        response = client.post("/routes", json=invalid_route)
        assert response.status_code == 422


class TestRoutesGetSingle:
    """Test GET /routes/{id} endpoint."""
    
    def test_get_route_success(self):
        """GET /routes/{id} should return single route with holds."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        response = client.get(f"/routes/{created_route_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["id"] == created_route_id
        assert "name" in data
        assert "difficulty" in data
        assert "holds" in data
        assert isinstance(data["holds"], list)
    
    def test_get_route_not_found(self):
        """GET /routes/{id} should return 404 for invalid ID."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.get(f"/routes/{fake_id}")
        assert response.status_code == 404


# ============== SAVE/BOOKMARK TESTS ==============

class TestRoutesSave:
    """Test save/bookmark endpoints."""
    
    def test_save_route(self):
        """PUT /routes/{id}/save should bookmark a route."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")

        # Ensure profile exists (user_saved_routes.user_id FK -> profiles.id)
        client.post("/profiles", json={
            "id": TEST_USER_ID,
            "email": "test001@example.com",
            "name": "Test User",
            "username": "testuser001",
            "photo_url": None,
            "climber_level": "beginner",
        })

        response = client.put(
            f"/routes/{created_route_id}/save",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["saved"] == True
        assert "saved_at" in data
    
    def test_save_route_duplicate(self):
        """PUT /routes/{id}/save should handle already saved."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        # Save again - should still return success
        response = client.put(
            f"/routes/{created_route_id}/save",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["saved"] == True
    
    def test_unsave_route(self):
        """DELETE /routes/{id}/save should remove bookmark."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        response = client.delete(
            f"/routes/{created_route_id}/save",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["saved"] == False


# ============== SEND TESTS (completions) ==============

class TestRoutesSend:
    """Test send/unsend endpoints (completions)."""

    def test_send_route(self):
        """PUT /routes/{id}/send should log a completion."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")

        # Ensure profile exists (sends.user_id FK -> profiles.id)
        client.post("/profiles", json={
            "id": TEST_USER_ID,
            "email": "test001@example.com",
            "name": "Test User",
            "username": "testuser001",
            "photo_url": None,
            "climber_level": "beginner",
        })

        response = client.put(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["sent"] == True
        assert "send_count" in data
        assert data["send_count"] >= 1

    def test_send_route_duplicate(self):
        """PUT /routes/{id}/send should handle already sent."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")

        # Send again - should still return success
        response = client.put(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["sent"] == True

    def test_unsend_route(self):
        """DELETE /routes/{id}/send should remove completion."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")

        response = client.delete(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()

        assert data["sent"] == False
        assert "send_count" in data


# ============== DELETE ROUTE TESTS ==============

class TestRoutesDelete:
    """Test DELETE /routes/{id} endpoint."""
    
    def test_delete_route_success(self):
        """DELETE /routes/{id} should delete route and related data."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        response = client.delete(f"/routes/{created_route_id}")
        assert response.status_code == 200
        data = response.json()
        
        assert data["deleted"] == True
        assert data["route_id"] == created_route_id
        
        # Verify it's actually deleted
        response = client.get(f"/routes/{created_route_id}")
        assert response.status_code == 404
    
    def test_delete_route_not_found(self):
        """DELETE /routes/{id} should return 404 for invalid ID."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        response = client.delete(f"/routes/{fake_id}")
        assert response.status_code == 404


# ============== RESPONSE FORMAT TESTS ==============

class TestResponseFormats:
    """Test that responses match the documented format."""
    
    def test_route_response_has_required_fields(self):
        """Route responses should have all documented fields."""
        response = client.get("/routes?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if data["items"]:
            route = data["items"][0]
            required_fields = [
                "id", "name", "difficulty", "angle",
                "visibility", "send_count", "created_at", "holds"
            ]
            for field in required_fields:
                assert field in route, f"Missing field: {field}"
    
    def test_holds_format(self):
        """Holds should have x, y, color fields."""
        response = client.get("/routes?limit=1")
        assert response.status_code == 200
        data = response.json()
        
        if data["items"] and data["items"][0]["holds"]:
            hold = data["items"][0]["holds"][0]
            assert "x" in hold
            assert "y" in hold
            assert "color" in hold


# ============== RUN TESTS ==============

# ============== ML PREDICTION TESTS ==============

class TestMLPrediction:
    """Test POST /ml/predict endpoint."""

    def test_predict_grade(self):
        """POST /ml/predict should return suggested grade."""
        request_body = {
            "holds": [
                {"x": 3.0, "y": 4.0, "color": "green"},
                {"x": 5.0, "y": 7.0, "color": "blue"},
                {"x": 6.0, "y": 14.0, "color": "red"}
            ],
            "angle": 40
        }

        response = client.post("/ml/predict", json=request_body)
        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "suggested_grade" in data
        assert "confidence" in data
        assert "raw" in data

        # Grade should be a valid v-grade (e.g. "v4")
        assert data["suggested_grade"].startswith("v")

        # Confidence should be between 0 and 1
        assert 0 <= data["confidence"] <= 1

        # Raw score should be a number
        assert isinstance(data["raw"], float)

    def test_predict_requires_holds(self):
        """POST /ml/predict should fail with 422 when holds field is missing."""
        response = client.post("/ml/predict", json={"angle": 40})
        assert response.status_code == 422

    def test_predict_empty_holds(self):
        """POST /ml/predict should return 400 for an empty holds array."""
        response = client.post("/ml/predict", json={"holds": [], "angle": 40})
        assert response.status_code == 400

    def test_predict_requires_angle(self):
        """POST /ml/predict should fail with 422 when angle field is missing."""
        request_body = {
            "holds": [
                {"x": 3.0, "y": 4.0, "color": "green"},
                {"x": 6.0, "y": 14.0, "color": "red"}
            ]
        }
        response = client.post("/ml/predict", json=request_body)
        assert response.status_code == 422


# ============== RUN TESTS ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])

# ============== API Tests Ryan ==============

USER_ID_VALID_RYAN = TEST_USER_ID  # Must exist in auth.users (FK constraint on profiles)
USER_ID_OTHER_RYAN = "00000000-0000-0000-0000-000000000002"
ROUTE_INVALID_ID_RYAN = "not-a-real-id"

ROUTE_CREATE_BODY_VALID_RYAN = {
    "name": "Test Route Alpha Ryan",
    "difficulty": "v5",
    "description": "test route description",
    "angle": 40,
    "visibility": "public",
    "holds": [
        {"x": 1, "y": 1, "color": "green"},
        {"x": 3, "y": 5, "color": "blue"}
    ]
}


def _ryan_assert_validation_field(data, field):
    detail = data.get("detail", [])
    assert isinstance(detail, list)
    assert any(field in [str(x) for x in err.get("loc", [])] for err in detail)


def _ryan_create_route():
    response = client.post("/routes", json=ROUTE_CREATE_BODY_VALID_RYAN)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data and data["id"]
    return data["id"]


def _ryan_upsert_profile(user_id, email=None, name="Test User", username=None, climber_level="beginner"):
    payload = {
        "id": user_id,
        "email": email or f"{user_id}@example.com",
        "name": name,
        "username": username or user_id,
        "photo_url": None,
        "climber_level": climber_level,
    }
    response = client.post("/profiles", json=payload)
    assert response.status_code == 201
    return response.json()


class TestRoutesListRyan:
    def test_list_routes_default_limit_and_desc_order_best_effort(self):
        response = client.get("/routes")
        assert response.status_code == 200
        data = response.json()

        assert data["page"] == 1
        assert isinstance(data["total"], int)
        assert len(data["items"]) <= 20

        if len(data["items"]) >= 2:
            first = data["items"][0].get("created_at")
            last = data["items"][-1].get("created_at")
            if first and last:
                assert first >= last

    def test_list_routes_sort_created_at_ascending_best_effort(self):
        response = client.get("/routes?sort=created_at")
        assert response.status_code == 200
        data = response.json()

        if len(data["items"]) >= 2:
            first = data["items"][0].get("created_at")
            last = data["items"][-1].get("created_at")
            if first and last:
                assert first <= last

    def test_list_routes_pagination_page_1_and_2_limit_1(self):
        response1 = client.get("/routes?page=1&limit=1")
        response2 = client.get("/routes?page=2&limit=1")

        assert response1.status_code == 200
        assert response2.status_code == 200

        data1 = response1.json()
        data2 = response2.json()

        assert len(data1["items"]) <= 1
        assert len(data2["items"]) <= 1

        if data1["items"] and data2["items"]:
            assert data1["items"][0]["id"] != data2["items"][0]["id"]

    def test_list_routes_validation_page_less_than_1(self):
        response = client.get("/routes?page=0")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "page")

    def test_list_routes_validation_limit_gt_100(self):
        response = client.get("/routes?limit=101")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "limit")


class TestRoutesCreateRyan:
    def test_create_route_validation_name_empty(self):
        body = {
            "name": "",
            "difficulty": "v5",
            "description": "x",
            "angle": 40,
            "visibility": "public",
            "holds": [{"x": 1, "y": 1, "color": "green"}],
        }
        response = client.post("/routes", json=body)
        assert response.status_code == 422

    def test_create_route_validation_angle_out_of_range(self):
        body = {
            "name": "Bad Angle",
            "difficulty": "v5",
            "description": "x",
            "angle": 71,
            "visibility": "public",
            "holds": [{"x": 1, "y": 1, "color": "green"}],
        }
        response = client.post("/routes", json=body)
        assert response.status_code == 422

    def test_create_route_validation_holds_missing_required_field(self):
        body = {
            "name": "Missing Hold Fields",
            "difficulty": "v5",
            "description": "x",
            "angle": 40,
            "visibility": "public",
            "holds": [{"x": 1, "y": 1}],
        }
        response = client.post("/routes", json=body)
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "holds")


class TestRoutesGetRyan:
    def test_get_route_invalid_string_id_behavior(self):
        response = client.get(f"/routes/{ROUTE_INVALID_ID_RYAN}")
        assert response.status_code in (404, 422)


class TestRoutesDeleteRyan:
    def test_delete_route_with_optional_user_id(self):
        route_id = _ryan_create_route()
        response = client.delete(f"/routes/{route_id}", params={"user_id": USER_ID_VALID_RYAN})
        assert response.status_code == 200


class TestRoutesSaveRyan:
    def test_save_route_missing_required_user_id(self):
        route_id = _ryan_create_route()
        response = client.put(f"/routes/{route_id}/save")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "user_id")

    def test_unsave_route_success_and_idempotency_behavior(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)
        route_id = _ryan_create_route()

        save_response = client.put(f"/routes/{route_id}/save", params={"user_id": USER_ID_VALID_RYAN})
        assert save_response.status_code == 200

        first = client.delete(f"/routes/{route_id}/save", params={"user_id": USER_ID_VALID_RYAN})
        second = client.delete(f"/routes/{route_id}/save", params={"user_id": USER_ID_VALID_RYAN})

        assert first.status_code == 200
        assert second.status_code in (200, 404, 409)

    def test_unsave_route_missing_required_user_id(self):
        route_id = _ryan_create_route()
        response = client.delete(f"/routes/{route_id}/save")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "user_id")


class TestRoutesSendRyan:
    def test_send_route_missing_required_user_id(self):
        route_id = _ryan_create_route()
        response = client.put(f"/routes/{route_id}/send")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "user_id")

    def test_unsend_route_success_and_idempotency_behavior(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)
        route_id = _ryan_create_route()

        send_response = client.put(f"/routes/{route_id}/send", params={"user_id": USER_ID_VALID_RYAN})
        assert send_response.status_code == 200

        first = client.delete(f"/routes/{route_id}/send", params={"user_id": USER_ID_VALID_RYAN})
        second = client.delete(f"/routes/{route_id}/send", params={"user_id": USER_ID_VALID_RYAN})

        assert first.status_code == 200
        assert second.status_code in (200, 404, 409)

    def test_unsend_route_missing_required_user_id(self):
        route_id = _ryan_create_route()
        response = client.delete(f"/routes/{route_id}/send")
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "user_id")


class TestHardwareLEDRyan:
    def test_led_status_success(self):
        response = client.get("/hardware/led/status")
        assert response.status_code == 200
        data = response.json()

        assert "online" in data and isinstance(data["online"], bool)
        assert "led_count" in data and isinstance(data["led_count"], int)
        assert "message" in data and isinstance(data["message"], str)

    def test_led_off_success(self):
        response = client.post("/hardware/led/off")
        assert response.status_code == 200
        data = response.json()

        assert "status" in data
        assert isinstance(data["status"], str)

    def test_led_display_route_success(self):
        route_id = _ryan_create_route()
        response = client.post(f"/hardware/led/routes/{route_id}")
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert "route_id" in data
        assert data["route_id"] == route_id
        assert "hold_count" in data
        assert isinstance(data["hold_count"], int)
        assert data["hold_count"] >= 0

    def test_led_display_invalid_route_id_behavior(self):
        response = client.post(f"/hardware/led/routes/{ROUTE_INVALID_ID_RYAN}")
        assert response.status_code in (404, 422)

    def test_led_preview_success(self):
        body = {
            "holds": [
                {"x": 2, "y": 4, "color": "red"},
                {"x": 5, "y": 10, "color": "yellow"},
            ]
        }
        response = client.post("/hardware/led/preview", json=body)
        assert response.status_code == 200

        data = response.json()
        assert "status" in data
        assert data["hold_count"] == 2

    def test_led_preview_validation_missing_holds(self):
        response = client.post("/hardware/led/preview", json={})
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "holds")

    def test_led_preview_validation_hold_missing_required_field(self):
        body = {"holds": [{"x": 2, "y": 4}]}
        response = client.post("/hardware/led/preview", json=body)
        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "holds")


class TestProfilesRyan:
    def test_list_profiles_success(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)

        response = client.get("/profiles")
        assert response.status_code == 200
        data = response.json()

        assert isinstance(data, list)
        if data:
            profile = data[0]
            assert "id" in profile
            assert "name" in profile
            assert "email" in profile
            assert "username" in profile
            assert "created_at" in profile

    def test_upsert_profile_create_success(self):
        response = client.post(
            "/profiles",
            json={
                "id": USER_ID_VALID_RYAN,
                "email": "test001@example.com",
                "name": "Test User",
                "username": "testuser1",
                "photo_url": None,
                "climber_level": "beginner",
            },
        )

        assert response.status_code == 201
        assert response.json()["id"] == USER_ID_VALID_RYAN

    def test_upsert_profile_update_success(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN, username="testuser1")

        response = client.post(
            "/profiles",
            json={
                "id": USER_ID_VALID_RYAN,
                "email": "test001@example.com",
                "name": "Updated Test User",
                "username": "testuser1-updated",
                "photo_url": None,
                "climber_level": "beginner",
            },
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Updated Test User"
        assert data["username"] == "testuser1-updated"

    def test_upsert_profile_validation_missing_required_field(self):
        response = client.post(
            "/profiles",
            json={
                "id": USER_ID_OTHER_RYAN,
                "name": "No Email",
                "username": "noemail",
                "photo_url": None,
                "climber_level": "beginner",
            },
        )

        assert response.status_code == 422
        _ryan_assert_validation_field(response.json(), "email")

    def test_get_profile_by_id_success(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)

        response = client.get(f"/profiles/{USER_ID_VALID_RYAN}")
        assert response.status_code == 200
        assert response.json()["id"] == USER_ID_VALID_RYAN

    def test_get_profile_not_found_behavior(self):
        response = client.get("/profiles/user_does_not_exist")
        assert response.status_code in (404, 422)

    def test_patch_profile_single_field_success(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)

        patch_response = client.patch(
            f"/profiles/{USER_ID_VALID_RYAN}",
            json={"climber_level": "intermediate"},
        )
        assert patch_response.status_code == 200

        get_response = client.get(f"/profiles/{USER_ID_VALID_RYAN}")
        assert get_response.status_code == 200
        assert get_response.json()["climber_level"] == "intermediate"

    def test_patch_profile_multiple_fields_success(self):
        _ryan_upsert_profile(USER_ID_VALID_RYAN)

        response = client.patch(
            f"/profiles/{USER_ID_VALID_RYAN}",
            json={
                "name": "Updated Name",
                "photo_url": "https://example.com/p.png",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["photo_url"] == "https://example.com/p.png"

    def test_patch_profile_validation_invalid_body_type(self):
        response = client.patch(f"/profiles/{USER_ID_VALID_RYAN}", json=["invalid", "array"])
        assert response.status_code == 422

    def test_delete_profile_success(self):
        delete_id = USER_ID_VALID_RYAN
        _ryan_upsert_profile(delete_id)

        delete_response = client.delete(f"/profiles/{delete_id}")
        assert delete_response.status_code == 200

        get_response = client.get(f"/profiles/{delete_id}")
        assert get_response.status_code in (404, 422)

    def test_delete_profile_non_existent_behavior(self):
        response = client.delete("/profiles/user_does_not_exist")
        assert response.status_code in (200, 404, 500)


# ============================================================
# Final Phase Tests
# ============================================================

import math
from pydantic import ValidationError
from app.models import (
    Hold, RouteCreate, RouteUpdate,
    ProfileBase, SaveResponse, SendResponse,
)
from app.services import led
from app.services import ml_predictor


# ============== PYDANTIC MODEL UNIT TESTS ==============

class TestHoldModelFinal:
    def test_valid_hold(self):
        h = Hold(x=5.0, y=7.0, color="blue")
        assert h.x == 5.0
        assert h.y == 7.0
        assert h.color == "blue"

    def test_hold_missing_x_raises(self):
        with pytest.raises(ValidationError):
            Hold(y=7.0, color="blue")

    def test_hold_missing_y_raises(self):
        with pytest.raises(ValidationError):
            Hold(x=5.0, color="blue")

    def test_hold_missing_color_raises(self):
        with pytest.raises(ValidationError):
            Hold(x=5.0, y=7.0)

    def test_hold_integer_coords_coerced_to_float(self):
        h = Hold(x=3, y=4, color="green")
        assert h.x == 3.0
        assert h.y == 4.0


class TestRouteCreateModelFinal:
    def test_valid_route_create(self):
        r = RouteCreate(
            name="Test Route",
            difficulty="v4",
            holds=[{"x": 5.0, "y": 7.0, "color": "blue"}],
            angle=40,
            visibility="public",
        )
        assert r.name == "Test Route"
        assert len(r.holds) == 1

    def test_missing_name_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(difficulty="v4", holds=[{"x": 5.0, "y": 7.0, "color": "blue"}])

    def test_empty_name_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="", difficulty="v4", holds=[{"x": 5.0, "y": 7.0, "color": "blue"}])

    def test_name_over_255_chars_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="x" * 256, difficulty="v4", holds=[{"x": 5.0, "y": 7.0, "color": "blue"}])

    def test_missing_holds_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="Test", difficulty="v4")

    def test_angle_defaults_to_40(self):
        r = RouteCreate(name="T", difficulty="v4", holds=[{"x": 1.0, "y": 1.0, "color": "green"}])
        assert r.angle == 40

    def test_angle_above_70_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="T", difficulty="v4", holds=[{"x": 1.0, "y": 1.0, "color": "green"}], angle=71)

    def test_angle_below_0_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="T", difficulty="v4", holds=[{"x": 1.0, "y": 1.0, "color": "green"}], angle=-1)

    def test_visibility_defaults_to_public(self):
        r = RouteCreate(name="T", difficulty="v4", holds=[{"x": 1.0, "y": 1.0, "color": "green"}])
        assert r.visibility == "public"

    def test_multiple_holds_accepted(self):
        holds = [
            {"x": 1.0, "y": 1.0, "color": "green"},
            {"x": 3.0, "y": 5.0, "color": "blue"},
            {"x": 6.0, "y": 14.0, "color": "red"},
        ]
        r = RouteCreate(name="Multi", difficulty="v3", holds=holds)
        assert len(r.holds) == 3

    def test_hold_missing_required_field_raises(self):
        with pytest.raises(ValidationError):
            RouteCreate(name="T", difficulty="v4", holds=[{"x": 1.0, "y": 1.0}])


class TestRouteUpdateModelFinal:
    def test_all_fields_optional(self):
        u = RouteUpdate()
        assert u.name is None
        assert u.difficulty is None
        assert u.angle is None

    def test_partial_update_accepted(self):
        u = RouteUpdate(name="New Name")
        assert u.name == "New Name"
        assert u.difficulty is None

    def test_angle_out_of_range_raises(self):
        with pytest.raises(ValidationError):
            RouteUpdate(angle=100)

    def test_empty_name_raises(self):
        with pytest.raises(ValidationError):
            RouteUpdate(name="")


class TestProfileBaseModelFinal:
    def test_valid_profile(self):
        p = ProfileBase(name="Test", email="t@example.com", username="testuser")
        assert p.name == "Test"
        assert p.email == "t@example.com"

    def test_missing_email_raises(self):
        with pytest.raises(ValidationError):
            ProfileBase(name="Test", username="testuser")

    def test_missing_username_raises(self):
        with pytest.raises(ValidationError):
            ProfileBase(name="Test", email="t@example.com")

    def test_photo_url_defaults_to_none(self):
        p = ProfileBase(name="T", email="t@example.com", username="u")
        assert p.photo_url is None

    def test_climber_level_defaults_to_none(self):
        p = ProfileBase(name="T", email="t@example.com", username="u")
        assert p.climber_level is None


class TestSaveResponseModelFinal:
    def test_saved_true_with_timestamp(self):
        from datetime import datetime
        r = SaveResponse(saved=True, saved_at=datetime.now())
        assert r.saved is True

    def test_saved_false_no_timestamp(self):
        r = SaveResponse(saved=False)
        assert r.saved is False
        assert r.saved_at is None


class TestSendResponseModelFinal:
    def test_sent_with_count(self):
        r = SendResponse(sent=True, send_count=5)
        assert r.sent is True
        assert r.send_count == 5

    def test_unsent_zero_count(self):
        r = SendResponse(sent=False, send_count=0)
        assert r.sent is False
        assert r.send_count == 0


# ============== LED SERVICE UNIT TESTS ==============

class TestGetRgbFinal:
    def test_green(self):
        assert led.get_rgb("green") == (34, 197, 94)

    def test_blue(self):
        assert led.get_rgb("blue") == (5, 103, 232)

    def test_yellow(self):
        assert led.get_rgb("yellow") == (234, 179, 8)

    def test_red(self):
        assert led.get_rgb("red") == (239, 68, 68)

    def test_unknown_color_returns_white(self):
        assert led.get_rgb("purple") == (255, 255, 255)

    def test_empty_string_returns_white(self):
        assert led.get_rgb("") == (255, 255, 255)

    def test_case_insensitive_green(self):
        assert led.get_rgb("GREEN") == led.get_rgb("green")

    def test_case_insensitive_blue(self):
        assert led.get_rgb("Blue") == led.get_rgb("blue")


class TestGetLedIndexFinal:
    def test_unmapped_coordinate_returns_none(self):
        assert led.get_led_index(0.0, 0.0) is None

    def test_unmapped_large_coordinate_returns_none(self):
        assert led.get_led_index(99.0, 99.0) is None

    def test_mapped_coordinate_returns_index(self, monkeypatch):
        monkeypatch.setitem(led.COORD_TO_LED, (5, 7), 42)
        assert led.get_led_index(5, 7) == 42


class TestLedConstantsFinal:
    def test_led_count_is_positive(self):
        assert led.LED_COUNT > 0

    def test_colors_dict_has_all_four_roles(self):
        for color in ("green", "blue", "yellow", "red"):
            assert color in led.COLORS

    def test_all_rgb_values_are_valid(self):
        for rgb in led.COLORS.values():
            assert len(rgb) == 3
            assert all(0 <= ch <= 255 for ch in rgb)


class TestLedUnavailableFinal:
    def test_is_available_returns_false_in_dev(self):
        assert led.is_available() is False

    def test_clear_returns_false_when_unavailable(self):
        assert led.clear() is False

    def test_display_holds_returns_zero_when_unavailable(self):
        holds = [{"x": 5.0, "y": 7.0, "color": "blue"}]
        assert led.display_holds(holds) == 0

    def test_display_holds_empty_list_returns_zero(self):
        assert led.display_holds([]) == 0


# ============== ML PREDICTOR UNIT TESTS ==============

class TestMlIsAvailableFinal:
    def test_returns_a_bool(self):
        assert isinstance(ml_predictor.is_available(), bool)


class TestMlFallbackPredictionFinal:
    def test_returns_expected_keys(self):
        result = ml_predictor._fallback_prediction([], 40)
        assert "suggested_grade" in result
        assert "raw" in result
        assert "confidence" in result
        assert "error" in result

    def test_suggested_grade_is_na(self):
        assert ml_predictor._fallback_prediction([], 40)["suggested_grade"] == "N/A"

    def test_raw_is_zero(self):
        assert ml_predictor._fallback_prediction([], 40)["raw"] == 0.0

    def test_confidence_is_zero(self):
        assert ml_predictor._fallback_prediction([], 40)["confidence"] == 0.0

    def test_holds_and_angle_ignored_gracefully(self):
        holds = [{"x": 3.0, "y": 4.0, "color": "blue"}]
        result = ml_predictor._fallback_prediction(holds, 60)
        assert result["suggested_grade"] == "N/A"


class TestMlBuildFallbackPathInfoFinal:
    def test_empty_holds(self):
        r = ml_predictor._build_fallback_path_info([])
        assert r["valid"] is True
        assert r["move_distances"] == []
        assert r["n_moves"] == 1

    def test_single_hold_no_moves(self):
        holds = [{"ui_x": 3.0, "ui_y": 5.0}]
        r = ml_predictor._build_fallback_path_info(holds)
        assert len(r["move_distances"]) == 0
        assert r["n_moves"] == 1

    def test_two_holds_distance_calculated(self):
        holds = [{"ui_x": 0.0, "ui_y": 0.0}, {"ui_x": 3.0, "ui_y": 4.0}]
        r = ml_predictor._build_fallback_path_info(holds)
        assert len(r["move_distances"]) == 1
        assert abs(r["move_distances"][0] - 5.0) < 0.001  # 3-4-5 right triangle

    def test_upward_moves_counted(self):
        holds = [
            {"ui_x": 0.0, "ui_y": 0.0},
            {"ui_x": 0.0, "ui_y": 2.0},
            {"ui_x": 0.0, "ui_y": 5.0},
        ]
        r = ml_predictor._build_fallback_path_info(holds)
        assert r["n_up"] == 2

    def test_required_keys_all_present(self):
        holds = [{"ui_x": 1.0, "ui_y": 1.0}, {"ui_x": 2.0, "ui_y": 3.0}]
        r = ml_predictor._build_fallback_path_info(holds)
        for key in ("valid", "move_distances", "move_dys", "n_up", "n_lateral", "n_moves", "dir_changes"):
            assert key in r


class TestMlLoadRatingsFinal:
    def test_returns_a_dict(self):
        result = ml_predictor._load_ratings()
        assert isinstance(result, dict)

    def test_returns_empty_dict_when_file_missing(self, tmp_path, monkeypatch):
        monkeypatch.setattr(ml_predictor, "RATINGS_PATH", str(tmp_path / "missing.json"))
        assert ml_predictor._load_ratings() == {}

    def test_loads_valid_entries(self, tmp_path, monkeypatch):
        import json
        data = [
            {"x": "5", "y": "7", "difficulty": "3", "type": "regular", "rotation": 0},
            {"x": "2", "y": "3", "difficulty": "5", "type": "foothold", "rotation": 90},
        ]
        f = tmp_path / "holdratings.json"
        f.write_text(json.dumps(data))
        monkeypatch.setattr(ml_predictor, "RATINGS_PATH", str(f))
        result = ml_predictor._load_ratings()
        assert (5.0, 7.0) in result
        assert result[(5.0, 7.0)]["type"] == "edge"   # "regular" maps to "edge"
        assert result[(2.0, 3.0)]["type"] == "foothold"

    def test_skips_malformed_entries(self, tmp_path, monkeypatch):
        import json
        data = [
            {"x": "bad", "y": "7", "difficulty": "3", "type": "regular"},  # invalid
            {"x": "5", "y": "7", "difficulty": "3", "type": "regular"},    # valid
        ]
        f = tmp_path / "holdratings.json"
        f.write_text(json.dumps(data))
        monkeypatch.setattr(ml_predictor, "RATINGS_PATH", str(f))
        result = ml_predictor._load_ratings()
        assert (5.0, 7.0) in result


class TestMlColorToRoleFinal:
    def test_all_four_colors_present(self):
        for color in ("green", "blue", "yellow", "red"):
            assert color in ml_predictor.COLOR_TO_ROLE

    def test_no_role_is_none(self):
        for role in ml_predictor.COLOR_TO_ROLE.values():
            assert role is not None


class TestMlPredictGradeFallbackFinal:
    def test_returns_fallback_when_model_unavailable(self, monkeypatch):
        monkeypatch.setattr(ml_predictor, "_initialized", False)
        monkeypatch.setattr(ml_predictor, "initialize", lambda: False)
        result = ml_predictor.predict_grade([{"x": 3.0, "y": 4.0, "color": "blue"}], 40)
        assert "suggested_grade" in result
        assert "raw" in result
        assert "confidence" in result
