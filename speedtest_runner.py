"""Speedtest Runner Module.

Esegue speedtest in background e mantiene i risultati in cache.
"""

from __future__ import annotations

import logging
import threading
import time
from dataclasses import dataclass
from typing import Optional

try:
    import speedtest
    SPEEDTEST_AVAILABLE = True
except ImportError:
    SPEEDTEST_AVAILABLE = False

logger = logging.getLogger(__name__)


@dataclass
class SpeedtestResult:
    """Risultato dello speedtest.

    Attributes:
        download: Velocità download in Mbps.
        upload: Velocità upload in Mbps.
        ping: Ping in ms.
        timestamp: Timestamp del test.
        is_real: True se i dati sono reali, False se simulati.
    """
    download: float
    upload: float
    ping: float
    timestamp: float
    is_real: bool = True


class SpeedtestRunner:
    """Gestore speedtest con esecuzione in background."""

    def __init__(self, interval_seconds: int = 60):
        """Inizializza il runner speedtest.

        Args:
            interval_seconds: Intervallo tra i test in secondi (default 60).
        """
        self.interval = interval_seconds
        self._result: Optional[SpeedtestResult] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._history: list[SpeedtestResult] = []  # History for averages

        # Check if speedtest is available
        if not SPEEDTEST_AVAILABLE:
            logger.warning("speedtest-cli not installed, using simulated data")

    def start(self) -> None:
        """Avvia il thread di speedtest in background."""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(target=self._run_loop, daemon=True)
        self._thread.start()
        logger.info(f"Speedtest runner started (interval: {self.interval}s)")

    def stop(self) -> None:
        """Ferma il thread di speedtest."""
        self._running = False
        if self._thread:
            self._thread.join(timeout=5)
            self._thread = None
        logger.info("Speedtest runner stopped")

    def set_interval(self, interval_seconds: int) -> None:
        """Cambia l'intervallo di esecuzione dello speedtest.

        Args:
            interval_seconds: Nuovo intervallo in secondi.
        """
        old_interval = self.interval
        self.interval = max(10, interval_seconds)  # Minimum 10 seconds
        logger.info(f"Speedtest interval changed: {old_interval}s -> {self.interval}s")

    def get_averages(self) -> dict[str, float]:
        """Calcola le medie dai risultati storici.

        Returns:
            Dict con download_avg, upload_avg, latency_avg in Mbps/ms.
        """
        with self._lock:
            if not self._history:
                # Return current result if no history
                if self._result:
                    return {
                        'download_avg': self._result.download,
                        'upload_avg': self._result.upload,
                        'latency_avg': self._result.ping
                    }
                return {'download_avg': 0, 'upload_avg': 0, 'latency_avg': 0}

            downloads = [r.download for r in self._history]
            uploads = [r.upload for r in self._history]
            latencies = [r.ping for r in self._history]

            return {
                'download_avg': round(sum(downloads) / len(downloads), 1),
                'upload_avg': round(sum(uploads) / len(uploads), 1),
                'latency_avg': round(sum(latencies) / len(latencies), 1)
            }

    def get_result(self) -> SpeedtestResult:
        """Restituisce l'ultimo risultato disponibile.

        Se non ci sono risultati, restituisce dati simulati.
        """
        with self._lock:
            if self._result is None:
                return self._simulate_result()
            return self._result

    def _run_loop(self) -> None:
        """Loop di esecuzione speedtest in background."""
        while self._running:
            try:
                result = self._run_speedtest()
                with self._lock:
                    self._result = result
                    # Add to history (keep last 60 results)
                    self._history.append(result)
                    if len(self._history) > 60:
                        self._history.pop(0)
                logger.info(f"Speedtest completed: DL={result.download:.1f} Mbps, UL={result.upload:.1f} Mbps, Ping={result.ping:.0f} ms")
            except Exception as e:
                logger.error(f"Speedtest failed: {e}", exc_info=True)
                # Use simulated result on error
                with self._lock:
                    result = self._simulate_result()
                    self._result = result
                    self._history.append(result)
                    if len(self._history) > 60:
                        self._history.pop(0)

            # Wait for next interval
            for _ in range(self.interval):
                if not self._running:
                    break
                time.sleep(1)

    def _run_speedtest(self) -> SpeedtestResult:
        """Esegue un singolo speedtest.

        Returns:
            SpeedtestResult con i dati misurati.
        """
        if not SPEEDTEST_AVAILABLE:
            return self._simulate_result()

        try:
            logger.debug("Starting speedtest...")
            st = speedtest.Speedtest(secure=True)

            # Get best server
            logger.debug("Finding best server...")
            st.get_best_server()

            # Download test
            logger.debug("Running download test...")
            download_bits = st.download()
            download_mbps = download_bits / 1_000_000

            # Upload test
            logger.debug("Running upload test...")
            upload_bits = st.upload()
            upload_mbps = upload_bits / 1_000_000

            # Ping
            ping_ms = st.results.ping

            return SpeedtestResult(
                download=round(download_mbps, 1),
                upload=round(upload_mbps, 1),
                ping=round(ping_ms, 1),
                timestamp=time.time(),
                is_real=True
            )

        except Exception as e:
            logger.error(f"Speedtest error: {e}")
            return self._simulate_result()

    def _simulate_result(self) -> SpeedtestResult:
        """Genera dati simulati realistici.

        Returns:
            SpeedtestResult con dati simulati.
        """
        import random

        # Realistic values for Starlink
        download = 100 + random.random() * 150  # 100-250 Mbps
        upload = 10 + random.random() * 20      # 10-30 Mbps
        ping = 25 + random.random() * 30        # 25-55 ms

        return SpeedtestResult(
            download=round(download, 1),
            upload=round(upload, 1),
            ping=round(ping, 1),
            timestamp=time.time(),
            is_real=False
        )


# Global singleton
_runner: Optional[SpeedtestRunner] = None


def get_speedtest_runner(interval_seconds: int = 60) -> SpeedtestRunner:
    """Restituisce il singleton SpeedtestRunner.

    Args:
        interval_seconds: Intervallo tra i test in secondi.

    Returns:
        Istanza di SpeedtestRunner.
    """
    global _runner

    if _runner is None:
        _runner = SpeedtestRunner(interval_seconds=interval_seconds)
        _runner.start()

    return _runner


def get_speedtest_result() -> SpeedtestResult:
    """Restituisce l'ultimo risultato speedtest.

    Returns:
        SpeedtestResult con i dati (reali o simulati).
    """
    runner = get_speedtest_runner()
    return runner.get_result()


def set_speedtest_interval(interval_seconds: int) -> None:
    """Cambia l'intervallo dello speedtest.

    Args:
        interval_seconds: Nuovo intervallo in secondi.
    """
    runner = get_speedtest_runner()
    runner.set_interval(interval_seconds)


def get_speedtest_averages() -> dict[str, float]:
    """Restituisce le medie dello speedtest.

    Returns:
        Dict con download_avg, upload_avg, latency_avg.
    """
    runner = get_speedtest_runner()
    return runner.get_averages()


if __name__ == "__main__":
    # Test the speedtest runner
    logging.basicConfig(level=logging.INFO)

    print("Testing Speedtest Runner...")
    runner = SpeedtestRunner(interval_seconds=30)
    runner.start()

    try:
        for i in range(5):
            time.sleep(5)
            result = runner.get_result()
            print(f"[{i+1}] DL: {result.download:.1f} Mbps | UL: {result.upload:.1f} Mbps | Ping: {result.ping:.0f} ms | Real: {result.is_real}")
    finally:
        runner.stop()
