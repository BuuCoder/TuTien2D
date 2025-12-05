/**
 * Performance monitoring script
 * Chạy: node scripts/monitor-performance.js
 */

const os = require('os');

// Colors for console
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function formatBytes(bytes) {
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function formatPercent(value) {
    return (value * 100).toFixed(2) + '%';
}

function getColorForValue(value, thresholds) {
    if (value < thresholds.good) return colors.green;
    if (value < thresholds.warning) return colors.yellow;
    return colors.red;
}

function monitorPerformance() {
    console.clear();
    console.log(`${colors.cyan}=== Server Performance Monitor ===${colors.reset}\n`);

    // Memory usage
    const memUsage = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const memPercent = usedMem / totalMem;

    console.log('📊 Memory Usage:');
    console.log(`  Heap Used:  ${formatBytes(memUsage.heapUsed)} / ${formatBytes(memUsage.heapTotal)}`);
    console.log(`  RSS:        ${formatBytes(memUsage.rss)}`);
    console.log(`  External:   ${formatBytes(memUsage.external)}`);
    console.log(`  System:     ${getColorForValue(memPercent, { good: 0.7, warning: 0.85 })}${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${formatPercent(memPercent)})${colors.reset}\n`);

    // CPU usage
    const cpus = os.cpus();
    const cpuCount = cpus.length;
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
        for (let type in cpu.times) {
            totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
    });

    const cpuUsage = 1 - totalIdle / totalTick;

    console.log('💻 CPU Usage:');
    console.log(`  Cores:      ${cpuCount}`);
    console.log(`  Usage:      ${getColorForValue(cpuUsage, { good: 0.5, warning: 0.8 })}${formatPercent(cpuUsage)}${colors.reset}`);
    console.log(`  Load Avg:   ${os.loadavg().map(l => l.toFixed(2)).join(', ')}\n`);

    // Process info
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    console.log('⏱️  Process Info:');
    console.log(`  Uptime:     ${hours}h ${minutes}m ${seconds}s`);
    console.log(`  PID:        ${process.pid}`);
    console.log(`  Node:       ${process.version}`);
    console.log(`  Platform:   ${process.platform} ${process.arch}\n`);

    // Thresholds
    console.log('📈 Health Status:');
    const memHealth = memPercent < 0.85 ? '✅ Good' : memPercent < 0.95 ? '⚠️  Warning' : '❌ Critical';
    const cpuHealth = cpuUsage < 0.8 ? '✅ Good' : cpuUsage < 0.95 ? '⚠️  Warning' : '❌ Critical';
    
    console.log(`  Memory:     ${memHealth}`);
    console.log(`  CPU:        ${cpuHealth}\n`);

    console.log(`${colors.cyan}Press Ctrl+C to stop monitoring${colors.reset}`);
}

// Monitor every 2 seconds
console.log('Starting performance monitor...\n');
setInterval(monitorPerformance, 2000);
monitorPerformance(); // Run immediately

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\nMonitoring stopped.');
    process.exit(0);
});
