from starlette.testclient import TestClient

from app.main import create_app


def test_websocket_connect():
    app = create_app()
    client = TestClient(app)
    with client.websocket_connect("/ws/logs") as ws:
        # Connection should succeed
        ws.send_text("ping")
        # We don't expect a response to ping, just verify connection works
