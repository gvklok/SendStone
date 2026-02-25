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
client = httpx.Client(base_url=BASE_URL, timeout=10.0)

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

USER_ID_VALID_RYAN = "user_test_001"
USER_ID_OTHER_RYAN = "user_test_002"
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
                "email": "user_test_001@example.com",
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
                "email": "user_test_001@example.com",
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
        delete_id = "user_test_delete_ryan"
        _ryan_upsert_profile(delete_id)

        delete_response = client.delete(f"/profiles/{delete_id}")
        assert delete_response.status_code == 200

        get_response = client.get(f"/profiles/{delete_id}")
        assert get_response.status_code in (404, 422)

    def test_delete_profile_non_existent_behavior(self):
        response = client.delete("/profiles/user_does_not_exist")
        assert response.status_code in (200, 404, 500)
