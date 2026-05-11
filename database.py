"""Database Module for StarBoard Historical Data.

Gestisce il salvataggio e il recupero dei dati storici utilizzando SQLite.
"""

from __future__ import annotations

import logging
import sqlite3
import threading
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Database path
DB_PATH = Path(__file__).parent / "starboard.db"


class StarboardDatabase:
    """Gestore del database SQLite per StarBoard."""

    def __init__(self, db_path: Path = DB_PATH):
        """Inizializza il database.

        Args:
            db_path: Percorso del file database.
        """
        self.db_path = db_path
        self._local = threading.local()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        """Ottiene una connessione al database thread-local."""
        if not hasattr(self._local, 'conn'):
            self._local.conn = sqlite3.connect(
                self.db_path,
                check_same_thread=False,
                timeout=30
            )
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self) -> None:
        """Inizializza le tabelle del database."""
        conn = self._get_connection()
        cursor = conn.cursor()

        # Tabella speedtest_history
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS speedtest_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                download REAL,
                upload REAL,
                ping REAL,
                is_real BOOLEAN DEFAULT 1
            )
        """)

        # Tabella starlink_metrics
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS starlink_metrics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                online BOOLEAN,
                latency INTEGER,
                download REAL,
                upload REAL,
                packet_loss REAL,
                snr REAL,
                obstruction REAL,
                satellites INTEGER,
                azimuth REAL,
                elevation REAL,
                uptime_seconds INTEGER
            )
        """)

        # Indici per performance
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_speedtest_timestamp
            ON speedtest_history(timestamp DESC)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_metrics_timestamp
            ON starlink_metrics(timestamp DESC)
        """)

        conn.commit()
        logger.info(f"Database initialized at {self.db_path}")

    def save_speedtest(self, download: float, upload: float, ping: float, is_real: bool = True) -> None:
        """Salva un risultato speedtest.

        Args:
            download: Velocità download in Mbps.
            upload: Velocità upload in Mbps.
            ping: Ping in ms.
            is_real: True se dati reali, False se simulati.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO speedtest_history (download, upload, ping, is_real)
            VALUES (?, ?, ?, ?)
        """, (download, upload, ping, is_real))

        conn.commit()

        # Pulizia vecchi dati (mantieni 90 giorni)
        self._cleanup_old_data('speedtest_history', 90)

    def save_metrics(self, data: dict) -> None:
        """Salva metriche Starlink.

        Args:
            data: Dict con le metriche da salvare.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO starlink_metrics (
                online, latency, download, upload, packet_loss,
                snr, obstruction, satellites, azimuth, elevation, uptime_seconds
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('online', False),
            data.get('latency', 0),
            data.get('download', 0),
            data.get('upload', 0),
            data.get('packet_loss', 0),
            data.get('snr', 0),
            data.get('obstruction', 0),
            data.get('satellites', 0),
            data.get('azimuth', 0),
            data.get('elevation', 0),
            data.get('uptime_seconds', 0)
        ))

        conn.commit()

        # Pulizia vecchi dati (mantieni 90 giorni)
        self._cleanup_old_data('starlink_metrics', 90)

    def _cleanup_old_data(self, table: str, days: int) -> None:
        """Rimuove dati più vecchi di N giorni.

        Args:
            table: Nome della tabella.
            days: Giorni di retention.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute(f"""
            DELETE FROM {table}
            WHERE timestamp < datetime('now', '-{days} days')
        """)

        deleted = cursor.rowcount
        conn.commit()

        if deleted > 0:
            logger.debug(f"Cleaned {deleted} old records from {table}")

    def get_speedtest_history(self, hours: int = 24) -> list[dict]:
        """Recupera storico speedtest.

        Args:
            hours: Ore di storico da recuperare.

        Returns:
            Lista di dict con i risultati.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT timestamp, download, upload, ping, is_real
            FROM speedtest_history
            WHERE timestamp >= datetime('now', '-' || ? || ' hours')
            ORDER BY timestamp ASC
        """, (hours,))

        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_metrics_history(self, hours: int = 24) -> list[dict]:
        """Recupera storico metriche.

        Args:
            hours: Ore di storico da recuperare.

        Returns:
            Lista di dict con le metriche.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT timestamp, online, latency, download, upload,
                   packet_loss, snr, obstruction, satellites
            FROM starlink_metrics
            WHERE timestamp >= datetime('now', '-' || ? || ' hours')
            ORDER BY timestamp ASC
        """, (hours,))

        rows = cursor.fetchall()
        return [dict(row) for row in rows]

    def get_averages(self, hours: int = 24) -> dict:
        """Calcola le medie dello speedtest.

        Args:
            hours: Ore di storico da considerare.

        Returns:
            Dict con download_avg, upload_avg, latency_avg.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT
                AVG(download) as download_avg,
                AVG(upload) as upload_avg,
                AVG(ping) as latency_avg
            FROM speedtest_history
            WHERE timestamp >= datetime('now', '-' || ? || ' hours')
        """, (hours,))

        row = cursor.fetchone()

        if row and row['download_avg'] is not None:
            return {
                'download_avg': round(row['download_avg'], 1),
                'upload_avg': round(row['upload_avg'], 1),
                'latency_avg': round(row['latency_avg'], 1)
            }

        return {'download_avg': 0, 'upload_avg': 0, 'latency_avg': 0}

    def get_stats(self) -> dict:
        """Restituisce statistiche generali.

        Returns:
            Dict con total_tests, first_test, etc.
        """
        conn = self._get_connection()
        cursor = conn.cursor()

        # Statistiche speedtest
        cursor.execute("""
            SELECT
                COUNT(*) as total_tests,
                MIN(timestamp) as first_test,
                MAX(timestamp) as last_test
            FROM speedtest_history
        """)

        row = cursor.fetchone()

        return {
            'total_tests': row['total_tests'] or 0,
            'first_test': row['first_test'],
            'last_test': row['last_test']
        }

    def close(self) -> None:
        """Chiude la connessione al database."""
        if hasattr(self._local, 'conn'):
            self._local.conn.close()
            delattr(self._local, 'conn')


# Singleton instance
_db: Optional[StarboardDatabase] = None
_db_lock = threading.Lock()


def get_database() -> StarboardDatabase:
    """Restituisce il singleton del database.

    Returns:
        Istanza di StarboardDatabase.
    """
    global _db

    with _db_lock:
        if _db is None:
            _db = StarboardDatabase()
        return _db
