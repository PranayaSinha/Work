// memoryUsageTimer.ts

class MemoryUsageTimer {
	private interval: number;
	private timer: ReturnType<typeof setInterval> | null;

	constructor(interval: number = 60000) { // Default interval is 1 minute
		this.interval = interval;
		this.timer = null;
	}

	start(): void {
		this.timer = setInterval(() => {
			const memoryUsage = process.memoryUsage();
			const formattedMemoryUsage = {
				rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
				heapTotal: `${(memoryUsage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
				heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
				external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`,
			};
			console.log('Memory Usage:', formattedMemoryUsage);
		}, this.interval);
	}

	stop(): void {
		if (this.timer) {
			clearInterval(this.timer);
			this.timer = null;
		}
	}
}

export default MemoryUsageTimer;
