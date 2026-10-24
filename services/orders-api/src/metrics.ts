// Minimal Prometheus exposition (text format 0.0.4) with no third-party
// dependency: a request counter and a latency histogram per route.

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5];

interface Histogram {
  buckets: number[];
  sum: number;
  count: number;
}

export class Metrics {
  private readonly requests = new Map<string, number>();
  private readonly durations = new Map<string, Histogram>();
  private readonly ordersCreated = { value: 0 };

  observe(method: string, route: string, status: number, seconds: number): void {
    const key = `method="${method}",route="${route}",status="${status}"`;
    this.requests.set(key, (this.requests.get(key) ?? 0) + 1);

    const hKey = `method="${method}",route="${route}"`;
    const h = this.durations.get(hKey) ?? { buckets: BUCKETS.map(() => 0), sum: 0, count: 0 };
    BUCKETS.forEach((le, i) => {
      if (seconds <= le) h.buckets[i] += 1;
    });
    h.sum += seconds;
    h.count += 1;
    this.durations.set(hKey, h);
  }

  orderCreated(): void {
    this.ordersCreated.value += 1;
  }

  render(): string {
    const lines: string[] = [
      "# HELP http_requests_total Total HTTP requests handled.",
      "# TYPE http_requests_total counter",
    ];
    for (const [labels, value] of this.requests) lines.push(`http_requests_total{${labels}} ${value}`);

    lines.push(
      "# HELP http_request_duration_seconds HTTP request latency.",
      "# TYPE http_request_duration_seconds histogram",
    );
    for (const [labels, h] of this.durations) {
      BUCKETS.forEach((le, i) => lines.push(`http_request_duration_seconds_bucket{${labels},le="${le}"} ${h.buckets[i]}`));
      lines.push(`http_request_duration_seconds_bucket{${labels},le="+Inf"} ${h.count}`);
      lines.push(`http_request_duration_seconds_sum{${labels}} ${h.sum}`);
      lines.push(`http_request_duration_seconds_count{${labels}} ${h.count}`);
    }

    lines.push(
      "# HELP orders_created_total Orders successfully created.",
      "# TYPE orders_created_total counter",
      `orders_created_total ${this.ordersCreated.value}`,
    );
    return `${lines.join("\n")}\n`;
  }
}
