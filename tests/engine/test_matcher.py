import numpy as np

from app.engine.screen import Region


class TestOrbMatcher:
    def _make_matcher(self, confidence=0.8):
        from app.engine.matcher_orb import OrbMatcher

        return OrbMatcher(confidence=confidence)

    def _make_test_images(self):
        """Create screen with a unique pattern and matching template."""
        rng = np.random.RandomState(0)
        # Screen: random noise background
        screen = rng.randint(0, 60, (200, 300, 3), dtype=np.uint8)

        # Place a distinctive pattern at (100, 60)
        pattern = rng.randint(150, 255, (50, 60, 3), dtype=np.uint8)
        screen[60:110, 100:160] = pattern

        # Template is exactly that pattern
        template = pattern.copy()

        return screen, template

    def test_find_returns_match_when_present(self):
        screen, template = self._make_test_images()
        matcher = self._make_matcher(confidence=0.5)
        result = matcher.find(template, screen)

        assert result is not None
        assert result.confidence >= 0.5
        # The match should be roughly near (100, 60)
        assert abs(result.x - 100) < 20
        assert abs(result.y - 60) < 20

    def test_find_returns_none_when_not_present(self):
        screen = np.zeros((200, 300, 3), dtype=np.uint8)
        screen[:] = 50

        # Template is a complex pattern not in screen
        rng = np.random.RandomState(42)
        template = rng.randint(0, 255, (40, 40, 3), dtype=np.uint8)

        matcher = self._make_matcher(confidence=0.99)
        result = matcher.find(template, screen)
        assert result is None

    def test_find_with_region(self):
        screen, template = self._make_test_images()
        matcher = self._make_matcher(confidence=0.5)

        # Search only in the area containing the pattern
        region = Region(x=80, y=40, w=100, h=90)
        result = matcher.find(template, screen, region=region)

        assert result is not None
        # Coordinates should be in screen space (offset by region)
        assert result.x >= 80

    def test_find_all_returns_list(self):
        screen, template = self._make_test_images()
        matcher = self._make_matcher(confidence=0.5)
        results = matcher.find_all(template, screen)

        assert isinstance(results, list)
        # Should find at least one match
        assert len(results) >= 1
        for r in results:
            assert r.confidence >= 0.5
