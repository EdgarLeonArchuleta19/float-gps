import net from 'net';

interface Options {
  imei: string;
  host: string;
  port: number;
  intervalMs: number;
  count: number;
  startLat: number;
  startLng: number;
  speedKmh: number;
  alarms: boolean;
  move: boolean;
}

function parseArgs(argv: string[]): Options {
  const get = (name: string, fallback?: string): string | undefined => {
    const i = argv.indexOf(`--${name}`);
    return i === -1 ? fallback : argv[i + 1];
  };
  const num = (name: string, fallback: number): number => {
    const raw = get(name);
    const v = raw === undefined ? NaN : parseFloat(raw);
    return Number.isFinite(v) ? v : fallback;
  };

  const options: Options = {
    imei: (get('imei') || '').replace(/\D/g, ''),
    host: get('host', '127.0.0.1') as string,
    port: num('port', 5001),
    intervalMs: num('interval', 10) * 1000,
    count: num('count', 0),
    startLat: num('lat', 19.432608),
    startLng: num('lng', -99.133209),
    speedKmh: num('speed', 40),
    alarms: argv.includes('--alarms'),
    move: !argv.includes('--static'),
  };

  if (options.imei.length === 16) options.imei = options.imei.slice(1);
  return options;
}

function pad(n: number, width: number): string {
  return String(Math.floor(Math.abs(n))).padStart(width, '0');
}

function toNmea(value: number, degDigits: 2 | 3): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  let min = (abs - deg) * 60;
  if (min >= 59.99995) min = 0;
  return pad(deg, degDigits) + min.toFixed(4).padStart(degDigits + 4, '0');
}

function gt06Timestamp(date: Date): string {
  return (
    pad(date.getUTCDate(), 2) +
    pad(date.getUTCMonth() + 1, 2) +
    pad(date.getUTCFullYear(), 4) +
    pad(date.getUTCHours(), 2) +
    pad(date.getUTCMinutes(), 2) +
    '.' +
    pad(date.getUTCSeconds(), 2)
  );
}

function heartbeat(imei: string): string {
  return `##+GT06,${imei},HEARTBEAT##`;
}

function gpsPacket(
  imei: string,
  position: { lat: number; lng: number },
  speedKmh: number,
  ignition: boolean,
  timestamp: Date,
): string {
  const knots = Math.round(speedKmh / 1.852);
  const heading = ((Math.abs(position.lng * 7) % 360) + 360) % 360;

  const fields = [
    'GPSV1',
    '9',
    '1',
    gt06Timestamp(timestamp),
    toNmea(position.lat, 2),
    position.lat >= 0 ? 'N' : 'S',
    toNmea(position.lng, 3),
    position.lng >= 0 ? 'E' : 'W',
    pad(knots, 3),
    heading.toFixed(1).padStart(5, '0'),
    '2240',
    '3.5',
    '1.2',
    '334-5',
    'A1B2',
    'ACC',
    ignition ? '1' : '0',
  ];

  return `##+GT06,${imei},${fields.join(',')}##`;
}

function overspeedPacket(
  imei: string,
  position: { lat: number; lng: number },
  speedKmh: number,
  limit: number,
  timestamp: Date,
): string {
  return `##+GT06,${imei},OVERSPEED,${limit},${gt06Timestamp(timestamp)},${toNmea(position.lat, 2)},N,${toNmea(position.lng, 3)},W,${pad(Math.round(speedKmh / 1.852), 3)},000.0,2240,3.5,1.2,334-5,A1B2,##`;
}

function sosPacket(imei: string, position: { lat: number; lng: number }, timestamp: Date): string {
  return `##+GT06,${imei},SOS,${gt06Timestamp(timestamp)},${toNmea(position.lat, 2)},N,${toNmea(position.lng, 3)},W,000,000.0,2240,3.5,1.2,334-5,A1B2,##`;
}

const M_PER_DEG_LAT = 111320;

function advance(position: { lat: number; lng: number }, speedKmh: number, seconds: number): void {
  const meters = (speedKmh * 1000 * seconds) / 3600;
  const bearing = (Date.now() / 90000) % (Math.PI * 2);
  position.lat += (meters * Math.cos(bearing)) / M_PER_DEG_LAT;
  position.lng += (meters * Math.sin(bearing)) / (M_PER_DEG_LAT * Math.cos((position.lat * Math.PI) / 180));
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));

  if (options.imei.length !== 15) {
    console.error('Uso: npx ts-node scripts/simulate-gt06.ts --imei <15 digitos> [opciones]');
    console.error('');
    console.error('  --host      host del tracker        (default 127.0.0.1)');
    console.error('  --port      puerto TCP              (default 5001)');
    console.error('  --interval  segundos entre puntos   (default 10)');
    console.error('  --count     numero de puntos, 0=inf (default 0)');
    console.error('  --lat       latitud inicial         (default 19.432608, Zocalo CDMX)');
    console.error('  --lng       longitud inicial        (default -99.133209)');
    console.error('  --speed     velocidad km/h          (default 40)');
    console.error('  --static    no mover la unidad');
    console.error('  --alarms    emitir SOS y OVERSPEED');
    process.exit(1);
  }

  const socket = net.createConnection({ host: options.host, port: options.port });
  const position = { lat: options.startLat, lng: options.startLng };
  let sent = 0;

  socket.setEncoding('utf8');
  socket.on('connect', () => {
    console.log(`[SIM] Conectado a ${options.host}:${options.port} como IMEI ${options.imei}`);
    console.log(`[SIM] Posicion inicial ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`);
    socket.write(heartbeat(options.imei));
  });

  socket.on('data', (data: string) => {
    for (const chunk of data.split('##')) {
      const trimmed = chunk.trim();
      if (trimmed.length > 0) console.log(`[SIM] <- ${trimmed}`);
    }
  });

  socket.on('error', (err) => {
    console.error(`[SIM] Error: ${err.message}`);
    process.exit(1);
  });

  socket.on('close', () => {
    console.log('[SIM] Conexion cerrada');
    process.exit(0);
  });

  const tick = (): void => {
    if (socket.destroyed) return;

    if (options.move) advance(position, options.speedKmh, options.intervalMs / 1000);

    const now = new Date();
    socket.write(gpsPacket(options.imei, position, options.speedKmh, true, now));

    if (options.alarms && sent % 5 === 4) {
      socket.write(overspeedPacket(options.imei, position, options.speedKmh + 60, 80, new Date(now.getTime() + 1000)));
      console.log('[SIM] -> OVERSPEED');
    }
    if (options.alarms && sent % 11 === 10) {
      socket.write(sosPacket(options.imei, position, new Date(now.getTime() + 2000)));
      console.log('[SIM] -> SOS');
    }

    sent += 1;
    console.log(
      `[SIM] ${sent} enviado: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)} @ ${options.speedKmh} km/h`,
    );

    if (options.count > 0 && sent >= options.count) {
      setTimeout(() => socket.end(), 800);
      return;
    }
    setTimeout(tick, options.intervalMs);
  };

  setTimeout(tick, 600);
}

main();
