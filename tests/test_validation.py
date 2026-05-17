import pytest
from pathlib import Path
from service import run_pipeline
from validation import validate_pipeline_inputs, ValidationError


class TestValidation:
    """Test input validation system."""

    def test_valid_simulate_mode(self):
        """Test valid simulate mode parameters."""
        validate_pipeline_inputs(
            mode="simulate",
            sessions=16,
            seed=42,
            top_k=8,
        )
        # Should not raise

    def test_invalid_mode(self):
        """Test invalid mode raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="invalid")
        assert "mode" in str(excinfo.value)

    def test_invalid_sessions_negative(self):
        """Test negative sessions raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="simulate", sessions=-1)
        assert "sessions" in str(excinfo.value)

    def test_invalid_sessions_too_large(self):
        """Test sessions > 1000 raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="simulate", sessions=1001)
        assert "sessions" in str(excinfo.value)

    def test_invalid_seed(self):
        """Test invalid seed raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="simulate", seed=-100)
        assert "seed" in str(excinfo.value)

    def test_invalid_top_k(self):
        """Test invalid top-k raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="simulate", top_k=100)
        assert "top_k" in str(excinfo.value)

    def test_replay_requires_dataset(self):
        """Test replay mode requires dataset."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="replay")
        assert "dataset" in str(excinfo.value)

    def test_missing_dataset_file(self):
        """Test missing dataset file raises error."""
        with pytest.raises(ValidationError) as excinfo:
            validate_pipeline_inputs(mode="replay", dataset="/nonexistent/file.jsonl")
        assert "dataset" in str(excinfo.value)


class TestPipeline:
    """Test analysis pipeline execution."""

    @pytest.fixture
    def sample_jsonl(self, tmp_path):
        """Create a sample JSONL file for testing."""
        jsonl_file = tmp_path / "test.jsonl"
        # Create a simple JSONL with mock data
        with open(jsonl_file, "w") as f:
            f.write('{"session_id": "S001", "timestamp": 1.0, "packet_size": 100}\n')
        return str(jsonl_file)

    def test_simulate_pipeline(self):
        """Test simulate mode pipeline."""
        result = run_pipeline(mode="simulate", sessions=2, seed=42)
        assert result is not None
        assert "summary" in result
        assert result["summary"]["rawEvents"] > 0
        assert result["meta"]["mode"] == "simulate"

    def test_pipeline_output_structure(self):
        """Test pipeline output has required fields."""
        result = run_pipeline(mode="simulate", sessions=2)
        assert "meta" in result
        assert "summary" in result
        assert "estimates" in result
        assert "evaluation" in result
        assert "paths" in result
        assert "report" in result

    def test_different_top_k_values(self):
        """Test pipeline with different top-k values."""
        for top_k in [3, 5, 8]:
            result = run_pipeline(mode="simulate", sessions=2, top_k=top_k)
            assert len(result["paths"]) <= top_k


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
