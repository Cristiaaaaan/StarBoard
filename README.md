# StarBoard - Starlink Dashboard

Real-time dashboard for monitoring Starlink satellite internet antenna data.

## Features

- **Real-time updates** — polls every second via gRPC or HTTP
- **Speedtest integration** — runs periodic speed tests with configurable frequency
- **3 themes** — Dark (default), Light, Cyberpunk
- **3 languages** — English, Italian, Spanish
- **Responsive** — works on desktop, tablet, and mobile
- **Auto fallback** — simulated data when the dish is unreachable

## Metrics Displayed

- Download / Upload speed (Mbps)
- Latency with quality bar (ms)
- Uptime with history chart
- SNR and obstruction gauges
- Satellite count with animation
- Dish azimuth / elevation compass
- System info (hardware/software version, packet loss)
- Ping decile statistics
- 24-hour obstruction tracking
- Speedtest historical averages

## Installation

```bash
pip install -r requirements.txt
python app.py
```

Open `http://localhost:5000` in your browser.

## Starlink Connection

The dashboard connects to the dish at `192.168.100.1:9200` via gRPC automatically.

**Requirements:**
- Connected to Starlink WiFi
- Dish powered on
- Port 9200 not blocked by firewall

To change the dish IP, set the environment variable:
```bash
export STARLINK_IP=192.168.1.100
```

If the dish is unreachable, the dashboard uses realistic simulated data automatically.

## Tech

- **Backend:** Flask (Python), SQLite for history
- **Frontend:** Vanilla JS, Chart.js, CSS Grid/Flexbox
- **Data sources:** gRPC (primary), HTTP API (fallback), speedtest-cli

## License

MIT — see [LICENSE](LICENSE).
