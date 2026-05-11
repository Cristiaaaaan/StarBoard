"""StarBoard Flask Application.

Modulo principale per l'applicazione web di monitoraggio Starlink.
Fornisce API REST per il recupero dei dati dall'antenna Starlink
e la dashboard web per la visualizzazione in tempo reale.

Example:
    Avvia il server:
        $ python app.py

    Accesso API:
        GET /api/status?mode=device
"""

from __future__ import annotations

import logging
from typing import Any

from flask import Flask, jsonify, render_template, request

from starlink_client import (
    StarlinkHttpClient,
    fetch_real_data,
)
from starlink_grpc import fetch_grpc_data
from speedtest_runner import get_speedtest_result, set_speedtest_interval, get_speedtest_averages, SpeedtestResult


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Constants
HOST = '0.0.0.0'
PORT = 5000
DEBUG_MODE = True

# Starlink Configuration
DEFAULT_STARLINK_IP = '192.168.100.1'
STARLINK_IP_ENV = 'STARLINK_IP'


def get_starlink_data() -> dict[str, Any]:
    """Recupera dati dall'antenna Starlink via gRPC/HTTP e speedtest.

    Returns:
        Dict contenente tutti i dati della dashboard Starlink.
    """
    # Try gRPC first (most reliable for real Starlink dishes)
    data = fetch_grpc_data()

    # Fallback to HTTP if gRPC fails
    if not data or not data.get("online"):
        logger.debug("gRPC failed, trying HTTP")
        try:
            http_data = fetch_real_data()
            if http_data and http_data.get("online"):
                data = http_data
            else:
                data = _get_error_data()
        except Exception as e:
            logger.error(f"HTTP fallback also failed: {e}")
            data = _get_error_data()

    # Override speed/ping with real speedtest results
    try:
        speedtest_result = get_speedtest_result()
        data["download"] = speedtest_result.download
        data["upload"] = speedtest_result.upload
        data["ping"] = speedtest_result.ping
        data["latency"] = int(speedtest_result.ping)
        data["packet_loss"] = 0.0  # Speedtest doesn't provide packet loss

        # Add metadata
        data["speedtest_real"] = speedtest_result.is_real
        data["speedtest_timestamp"] = speedtest_result.timestamp

    except Exception as e:
        logger.error(f"Error getting speedtest data: {e}")

    return data


def _get_error_data() -> dict[str, Any]:
    """Restituisce dati di errore quando l'antenna non è disponibile.

    Returns:
        Dict con tutti i campi impostati a valori di default/zero.
    """
    return {
        "status": "error",
        "online": False,
        "mode": "device",
        "uptime": "--",
        "ping": 0,
        "ping_unit": "ms",
        "download": 0,
        "upload": 0,
        "speed_unit": "Mbps",
        "latency": 0,
        "packet_loss": 0,
        "snr": 0,
        "obstruction": 0,
        "currently_obstructed": False,
        "last_24h_obstructed_s": 0,
        "ping_deciles": [],
        "ping_samples": 0,
        "azimuth": 0,
        "elevation": 0,
        "satellites": 0,
        "hardware_version": "",
        "software_version": "",
        "obstruction_events": 0,
        "last_obstruction_time": 0,
    }


# Flask application factory
def create_app() -> Flask:
    """Create and configure Flask application.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)
    app.config['JSON_SORT_KEYS'] = False
    app.config['JSONIFY_PRETTYPRINT'] = False

    # Register routes
    _register_routes(app)

    return app


def _register_routes(app: Flask) -> None:
    """Registra tutte le route dell'applicazione Flask.

    Args:
        app: Istanza Flask configurata.
    """

    @app.route('/')
    def index() -> str:
        """Renderizza la dashboard principale.

        Returns:
            HTML della dashboard renderizzata.
        """
        return render_template('index.html')

    @app.route('/api/status')
    def api_status() -> tuple[dict[str, Any], int]:
        """API endpoint per ottenere lo stato Starlink.

        Returns:
            Tuple con (dict dati JSON, HTTP status code 200).
        """
        data = get_starlink_data()

        # Add speedtest averages
        averages = get_speedtest_averages()
        data['download_avg'] = averages['download_avg']
        data['upload_avg'] = averages['upload_avg']
        data['latency_avg'] = averages['latency_avg']

        return jsonify(data), 200

    @app.route('/api/speedtest/interval', methods=['POST'])
    def api_set_speedtest_interval() -> tuple[dict[str, Any], int]:
        """API endpoint per cambiare l'intervallo dello speedtest.

        Expects JSON: {"interval": 60}

        Returns:
            Tuple con (dict conferma, HTTP status code 200).
        """
        try:
            req_data = request.get_json()
            interval = req_data.get('interval', 60)

            # Validate interval (min 10s, max 600s)
            interval = max(10, min(600, int(interval)))

            set_speedtest_interval(interval)

            return jsonify({
                'success': True,
                'interval': interval,
                'message': f'Intervallo speedtest impostato a {interval} secondi'
            }), 200
        except Exception as e:
            logger.error(f"Error setting speedtest interval: {e}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400


# Create app instance
app = create_app()


if __name__ == '__main__':
    # Start speedtest runner (every 60 seconds)
    from speedtest_runner import get_speedtest_runner
    speedtest_runner = get_speedtest_runner(interval_seconds=60)
    logger.info("Speedtest runner started - first test running...")

    logger.info(f"Starting StarBoard server on {HOST}:{PORT}")
    try:
        app.run(debug=DEBUG_MODE, host=HOST, port=PORT)
    finally:
        speedtest_runner.stop()
