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
        {"x": 6.0, "y": 14.0, "color": "purple"}
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


# ============== LIKE/SEND TESTS ==============

class TestRoutesLike:
    """Test like/send endpoints."""
    
    def test_like_route(self):
        """PUT /routes/{id}/send should like a route."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        response = client.put(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["liked"] == True
        assert "likes" in data
        assert data["likes"] >= 1
    
    def test_like_route_duplicate(self):
        """PUT /routes/{id}/send should handle already liked."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        # Like again - should still return success
        response = client.put(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["liked"] == True
    
    def test_unlike_route(self):
        """DELETE /routes/{id}/send should unlike a route."""
        global created_route_id
        if not created_route_id:
            pytest.skip("No route created in previous test")
        
        response = client.delete(
            f"/routes/{created_route_id}/send",
            params={"user_id": TEST_USER_ID}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["liked"] == False
        assert "likes" in data


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
                "visibility", "likes", "created_at", "holds"
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

# ============== ML PREDICTION TESTS (PLACEHOLDER) ==============

class TestMLPrediction:
    """Test POST /ml/predict endpoint.
    
    NOTE: These tests are placeholders until the ML model is integrated.
    They will be skipped until the endpoint exists.
    """
    
    @pytest.mark.skip(reason="ML endpoint not yet implemented")
    def test_predict_grade(self):
        """POST /ml/predict should return suggested grade."""
        request_body = {
            "holds": [
                {"x": 5.0, "y": 7.0, "color": "blue"},
                {"x": 3.0, "y": 4.0, "color": "green"},
                {"x": 6.0, "y": 14.0, "color": "purple"}
            ],
            "angle": 40
        }
        
        response = client.post("/ml/predict", json=request_body)
        assert response.status_code == 200
        data = response.json()
        
        # Check response structure
        assert "suggested_grade" in data
        assert "confidence" in data
        
        # Grade should be valid v-grade
        assert data["suggested_grade"].startswith("v")
        
        # Confidence should be between 0 and 1
        assert 0 <= data["confidence"] <= 1
    
    @pytest.mark.skip(reason="ML endpoint not yet implemented")
    def test_predict_requires_holds(self):
        """POST /ml/predict should fail without holds."""
        response = client.post("/ml/predict", json={"angle": 40})
        assert response.status_code == 422
    
    @pytest.mark.skip(reason="ML endpoint not yet implemented")
    def test_predict_empty_holds(self):
        """POST /ml/predict should fail with empty holds array."""
        response = client.post("/ml/predict", json={"holds": [], "angle": 40})
        assert response.status_code == 422


# ============== RUN TESTS ==============

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
