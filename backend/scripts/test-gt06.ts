import assert from 'assert';
import { buildResponse, decodeGt06, normalizeImei, splitFrames } from '../src/tracker/gt06';

interface Case {
  name: string;
  frames: string[];
  expectImei: string;
  expectCommand: string;
  expectFixes: number;
  expectLat?: number;
  expectLng?: number;
  expectSpeed?: number;
  expectSatellites?: number;
  expectIgnition?: boolean;
  expectFixCount?: number;
  alarmType?: string;
  expectLimit?: number;
  expectReason?: string;
}

const cases: Case[] = [
  {
    name: 'GPSV1 simple (coords NMEA, sat, ACC)',
    frames: ['+GT06,860000000000001,GPSV1,9,1,300920261902.18,2447.9620,N,10723.6713,W,051,031.8,2240,3.5,1.2,334-5,A1B2,ACC,1'],
    expectImei: '860000000000001',
    expectCommand: 'GPSV1',
    expectFixes: 1,
    expectLat: 24.799367,
    expectLng: -107.394522,
    expectSpeed: 94,
    expectSatellites: 9,
    expectIgnition: true,
  },
  {
    name: 'GPSV1 con grados decimales (sin formato NMEA)',
    frames: ['+GT06,860000000000001,GPSV1,9,1,300920261902.18,24.7994,N,107.3945,W,051,031.8,2240,3.5,1.2,334-5,A1B2,ACC,1'],
    expectImei: '860000000000001',
    expectCommand: 'GPSV1',
    expectFixes: 1,
    expectLat: 24.7994,
    expectLng: -107.3945,
  },
  {
    name: 'GPSV1 con longitud < 100 grados (2 digitos de grado)',
    frames: ['+GT06,860000000000001,GPSV1,7,1,300920261902.18,2015.5000,N,09913.1653,E,000,000.0,1200,2.0,1.0,704-5,ABCD,'],
    expectImei: '860000000000001',
    expectCommand: 'GPSV1',
    expectFixes: 1,
    expectLat: 20.258333,
    expectLng: 99.219422,
    expectSpeed: 0,
  },
  {
    name: 'Lote 3 registros (3GPSV1)',
    frames: ['+GT06,860000000000001,3GPSV1,9,1,300920261902.18,2447.9620,N,10723.6713,W,051,031.8,2240,3.5,1.2,334-5,A1B2,GPSV1,9,1,300920261904.20,2447.9700,N,10723.6900,W,052,032.0,2241,3.5,1.2,334-5,A1B2,GPSV1,9,1,300920261906.22,2447.9800,N,10723.7000,W,053,033.0,2242,3.5,1.2,334-5,A1B2,'],
    expectImei: '860000000000001',
    expectCommand: 'GPSV1',
    expectFixes: 3,
    expectFixCount: 3,
  },
  {
    name: 'HEARTBEAT sin payload',
    frames: ['+GT06,860000000000001,HEARTBEAT'],
    expectImei: '860000000000001',
    expectCommand: 'HEARTBEAT',
    expectFixes: 0,
  },
  {
    name: 'IMEI de 16 digitos con cero inicial',
    frames: [`+GT06,0${'860000000000001'},HEARTBEAT`],
    expectImei: '860000000000001',
    expectCommand: 'HEARTBEAT',
    expectFixes: 0,
  },
  {
    name: 'OVERSPEED con limite',
    frames: ['+GT06,860000000000001,OVERSPEED,80,300920261902.27,2447.9604,N,10723.7966,W,084,000.0,2240,3.5,1.2,334-5,A1B2,'],
    expectImei: '860000000000001',
    expectCommand: 'OVERSPEED',
    expectFixes: 1,
    expectLat: 24.799340,
    expectLng: -107.396610,
    alarmType: 'OVERSPEED',
    expectLimit: 80,
    expectReason: 'OVERSPEED',
  },
  {
    name: 'SOS',
    frames: ['+GT06,860000000000001,SOS,300920261902.27,2447.9604,N,10723.7966,W,000,000.0,2240,3.5,1.2,334-5,A1B2,'],
    expectImei: '860000000000001',
    expectCommand: 'SOS',
    expectFixes: 1,
    alarmType: 'SOS',
    expectReason: 'SOS',
  },
  {
    name: 'ALARM con codigo de razon EA',
    frames: ['+GT06,860000000000001,ALARM,EA,1,300920261902.27,2447.9604,N,10723.7966,W,000,000.0,2240,3.5,1.2,334-5,A1B2,'],
    expectImei: '860000000000001',
    expectCommand: 'ALARM',
    expectFixes: 1,
    alarmType: 'ALARM',
    expectReason: 'EA',
  },
  {
    name: 'BUFFERRD (historia sin senal)',
    frames: ['+GT06,860000000000001,BUFFERRD'],
    expectImei: '860000000000001',
    expectCommand: 'BUFFERRD',
    expectFixes: 0,
  },
  {
    name: 'Coordenadas invalidas se descartan',
    frames: ['+GT06,860000000000001,GPSV1,0,0,300920261902.18,0000.0000,N,00000.0000,W,000,000.0,0,99.9,99.9,,,'],
    expectImei: '860000000000001',
    expectCommand: 'GPSV1',
    expectFixes: 1,
    expectLat: 0,
    expectLng: 0,
  },
];

function approx(a: number, b: number, tolerance = 0.001): boolean {
  return Math.abs(a - b) <= tolerance;
}

let passed = 0;
let failed = 0;

for (const testCase of cases) {
  try {
    const decoded = decodeGt06(testCase.frames[0]);
    assert.ok(decoded, 'el decoder devolvio null');
    assert.strictEqual(decoded.imei, testCase.expectImei, 'IMEI');
    assert.strictEqual(decoded.command, testCase.expectCommand, 'comando');
    assert.strictEqual(decoded.fixes.length, testCase.expectFixes, 'numero de fixes');

    if (testCase.expectFixCount !== undefined) {
      assert.strictEqual(decoded.fixes.length, testCase.expectFixCount, 'fixCount');
    }

    if (testCase.expectLat !== undefined) {
      assert.ok(approx(decoded.fixes[0].latitude, testCase.expectLat), `lat ${decoded.fixes[0].latitude}`);
    }
    if (testCase.expectLng !== undefined) {
      assert.ok(approx(decoded.fixes[0].longitude, testCase.expectLng), `lng ${decoded.fixes[0].longitude}`);
    }
    if (testCase.expectSpeed !== undefined) {
      assert.ok(Math.abs(decoded.fixes[0].speed - testCase.expectSpeed) <= 1, `speed ${decoded.fixes[0].speed}`);
    }
    if (testCase.expectSatellites !== undefined) {
      assert.strictEqual(decoded.fixes[0].satellites, testCase.expectSatellites, 'satellites');
    }
    if (testCase.expectIgnition !== undefined) {
      assert.strictEqual(decoded.fixes[0].ignition, testCase.expectIgnition, 'ignition');
    }
    if (testCase.alarmType) {
      assert.ok(decoded.alarm, 'se esperaba una alarma');
    }
    if (testCase.expectLimit !== undefined) {
      assert.strictEqual(decoded.alarm?.limit, testCase.expectLimit, 'alarm.limit');
    }
    if (testCase.expectReason !== undefined) {
      assert.strictEqual(decoded.alarm?.reason, testCase.expectReason, 'alarm.reason');
    }

    console.log(`  OK   ${testCase.name}`);
    passed += 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  FAIL ${testCase.name}: ${message}`);
    failed += 1;
  }
}

console.log('');
console.log('--- framing ---');
const framingCases: Array<{ name: string; input: string; expectFrames: number; expectRest: string }> = [
  { name: 'un frame completo', input: '##+GT06,1,HEARTBEAT##', expectFrames: 1, expectRest: '' },
  { name: 'varios frames pegados', input: '##+GT06,1,HEARTBEAT####+GT06,1,GPSV1##', expectFrames: 2, expectRest: '' },
  { name: 'frame partido a la mitad', input: '##+GT06,860000000000001,HE', expectFrames: 0, expectRest: '##+GT06,860000000000001,HE' },
  { name: 'frame partido justo en el delimitador', input: '##+GT06,860000000000001,HEART#', expectFrames: 0, expectRest: '##+GT06,860000000000001,HEART#' },
  { name: 'basura antes del frame', input: 'ruido\x00##+GT06,1,HEARTBEAT##', expectFrames: 1, expectRest: '' },
];

for (const fc of framingCases) {
  const { frames, rest } = splitFrames(fc.input);
  const ok = frames.length === fc.expectFrames && rest === fc.expectRest;
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${fc.name} -> frames=${frames.length} rest=${JSON.stringify(rest)}`);
  if (ok) passed += 1;
  else failed += 1;
}

console.log('');
console.log('--- respuestas ---');
const resp = buildResponse('860000000000001', 'GPSV1');
const respOk = resp === '##+RESP,GT06,860000000000001,GPSV1,OK##';
console.log(`  ${respOk ? 'OK  ' : 'FAIL'} buildResponse -> ${resp}`);
if (respOk) passed += 1;
else failed += 1;

const imeiOk = normalizeImei(`0${'860000000000001'}`) === '860000000000001' && normalizeImei('860000000000001') === '860000000000001';
console.log(`  ${imeiOk ? 'OK  ' : 'FAIL'} normalizeImei`);
if (imeiOk) passed += 1;
else failed += 1;

console.log('');
console.log(`Resultado: ${passed} pasaron, ${failed} fallaron`);
process.exit(failed === 0 ? 0 : 1);
