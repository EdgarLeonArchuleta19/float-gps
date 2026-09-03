import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generatePositions(
  gpsDeviceId: string,
  startLat: number,
  startLng: number,
  points: number,
  baseDate: Date,
  routeType: 'urban' | 'highway' | 'construction'
) {
  const positions = [];
  let lat = startLat;
  let lng = startLng;
  const startTime = new Date(baseDate);

  for (let i = 0; i < points; i++) {
    const isMoving = Math.random() > 0.2;
    const speed = isMoving ? randomBetween(routeType === 'highway' ? 60 : 10, routeType === 'highway' ? 110 : 45) : 0;
    const heading = randomBetween(0, 360);

    if (isMoving) {
      const distance = speed * 0.001;
      lat += (Math.random() - 0.5) * distance * 0.01;
      lng += (Math.random() - 0.5) * distance * 0.01;
    }

    const ignition = isMoving || Math.random() > 0.3;
    const voltage = ignition ? randomBetween(12.5, 14.2) : randomBetween(11.8, 12.4);

    positions.push({
      latitude: lat,
      longitude: lng,
      speed,
      altitude: randomBetween(50, 200),
      heading,
      ignition,
      voltage,
      timestamp: new Date(startTime.getTime() + i * 30000),
    });
  }

  return positions;
}

async function main() {
  console.log('Seeding database...');

  await prisma.gpsPosition.deleteMany();
  await prisma.trackingEvent.deleteMany();
  await prisma.ignitionEvent.deleteMany();
  await prisma.geofenceEvent.deleteMany();
  await prisma.workSession.deleteMany();
  await prisma.geofence.deleteMany();
  await prisma.gpsDevice.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.machine.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: 'demo123',
      name: 'Administrador',
      role: 'admin',
    },
  });

  const geofences = await Promise.all([
    prisma.geofence.create({ data: { name: 'Patio Principal', type: 'CIRCLE', color: '#3B82F6', radius: 500, centerLat: 24.7994, centerLng: -107.3940 } }),
    prisma.geofence.create({ data: { name: 'Obra Culiacán Norte', type: 'CIRCLE', color: '#F59E0B', radius: 800, centerLat: 24.8200, centerLng: -107.4050 } }),
    prisma.geofence.create({ data: { name: 'Obra Malecón', type: 'CIRCLE', color: '#10B981', radius: 600, centerLat: 24.7890, centerLng: -107.3850 } }),
    prisma.geofence.create({ data: { name: 'Almacén Central', type: 'CIRCLE', color: '#8B5CF6', radius: 400, centerLat: 24.8100, centerLng: -107.3900 } }),
    prisma.geofence.create({ data: { name: 'Zona Industrial', type: 'CIRCLE', color: '#EF4444', radius: 1000, centerLat: 24.8050, centerLng: -107.4100 } }),
    prisma.geofence.create({ data: { name: 'Bodega Sur', type: 'CIRCLE', color: '#06B6D4', radius: 350, centerLat: 24.7850, centerLng: -107.4000 } }),
  ]);

  const vehicleData = [
    { name: 'Nissan NP300', plate: 'ABC-1234', type: 'Pickup', brand: 'Nissan', vehicleModel: 'NP300', year: 2023, color: 'Blanco' },
    { name: 'Ford F-150', plate: 'DEF-5678', type: 'Pickup', brand: 'Ford', vehicleModel: 'F-150', year: 2024, color: 'Gris' },
    { name: 'Chevrolet Silverado', plate: 'GHI-9012', type: 'Pickup', brand: 'Chevrolet', vehicleModel: 'Silverado', year: 2023, color: 'Negro' },
    { name: 'Volkswagen Saveiro', plate: 'JKL-3456', type: 'Compacta', brand: 'Volkswagen', vehicleModel: 'Saveiro', year: 2022, color: 'Blanco' },
    { name: 'Toyota Hilux', plate: 'MNO-7890', type: 'Pickup', brand: 'Toyota', vehicleModel: 'Hilux', year: 2024, color: 'Plata' },
    { name: 'Isuzu NPR', plate: 'PQR-1234', type: 'Camión', brand: 'Isuzu', vehicleModel: 'NPR', year: 2023, color: 'Blanco' },
    { name: 'Freightliner M2', plate: 'STU-5678', type: 'Tractocamión', brand: 'Freightliner', vehicleModel: 'M2', year: 2022, color: 'Azul' },
    { name: 'Kenworth T370', plate: 'VWX-9012', type: 'Tractocamión', brand: 'Kenworth', vehicleModel: 'T370', year: 2023, color: 'Rojo' },
    { name: 'Mitsubishi L200', plate: 'YZA-3456', type: 'Pickup', brand: 'Mitsubishi', vehicleModel: 'L200', year: 2024, color: 'Verde' },
    { name: 'Hyundai Tucson', plate: 'BCD-7890', type: 'SUV', brand: 'Hyundai', vehicleModel: 'Tucson', year: 2024, color: 'Gris' },
  ];

  const vehicles = [];
  for (const v of vehicleData) {
    const rand = Math.random();
    const status = rand < 0.4 ? 'MOVING' : rand < 0.7 ? 'STOPPED' : 'OFFLINE';
    const vehicle = await prisma.vehicle.create({ data: { ...v, status } });
    vehicles.push(vehicle);
  }

  const machineData = [
    { name: 'Excavadora CAT 320', serialNumber: 'CAT-320-001', type: 'Excavadora', brand: 'Caterpillar', machineModel: '320', year: 2022 },
    { name: 'Retroexcavadora JCB 3CX', serialNumber: 'JCB-3CX-001', type: 'Retroexcavadora', brand: 'JCB', machineModel: '3CX', year: 2023 },
    { name: 'Bulldozer Komatsu D65', serialNumber: 'KOM-D65-001', type: 'Bulldozer', brand: 'Komatsu', machineModel: 'D65', year: 2021 },
    { name: 'Grúa Grove GMK5250', serialNumber: 'GRV-250-001', type: 'Grúa', brand: 'Grove', machineModel: 'GMK5250', year: 2023 },
    { name: 'Motoniveladora CAT 120', serialNumber: 'CAT-120-001', type: 'Motoniveladora', brand: 'Caterpillar', machineModel: '120', year: 2022 },
    { name: 'Cargador Frontal CAT 950', serialNumber: 'CAT-950-001', type: 'Cargador', brand: 'Caterpillar', machineModel: '950', year: 2024 },
    { name: 'Excavadora Komatsu PC200', serialNumber: 'KOM-PC200-001', type: 'Excavadora', brand: 'Komatsu', machineModel: 'PC200', year: 2023 },
    { name: 'Mini Excavadora Kubota U35', serialNumber: 'KUB-U35-001', type: 'Mini Excavadora', brand: 'Kubota', machineModel: 'U35', year: 2024 },
  ];

  const machines = [];
  for (const m of machineData) {
    const rand = Math.random();
    const status = rand < 0.5 ? 'MOVING' : rand < 0.75 ? 'STOPPED' : 'OFFLINE';
    const machine = await prisma.machine.create({ data: { ...m, status } });
    machines.push(machine);
  }

  const gpsDevices = [];
  let imeiCounter = 860000000000001;
  for (let i = 0; i < vehicles.length; i++) {
    const gps = await prisma.gpsDevice.create({
      data: {
        imei: String(imeiCounter++),
        model: randomElement(['Teltonika FMC130', 'Queclink GL300', 'Coban GPS103']),
        simNumber: `521${randomInt(6000000000, 6999999999)}`,
        vehicleId: vehicles[i].id,
      },
    });
    gpsDevices.push(gps);
  }
  for (let i = 0; i < machines.length; i++) {
    const gps = await prisma.gpsDevice.create({
      data: {
        imei: String(imeiCounter++),
        model: randomElement(['Teltonika FMC130', 'Queclink GL300', 'Coban GPS103']),
        simNumber: `521${randomInt(6000000000, 6999999999)}`,
        machineId: machines[i].id,
      },
    });
    gpsDevices.push(gps);
  }

  // Spare devices available for linking
  for (let i = 0; i < 4; i++) {
    await prisma.gpsDevice.create({
      data: {
        imei: String(imeiCounter++),
        model: randomElement(['Teltonika FMC130', 'Queclink GL300', 'Coban GPS103', 'Suntech ST4305']),
        simNumber: `521${randomInt(6000000000, 6999999999)}`,
      },
    });
  }

  console.log('Generating GPS positions...');
  const routes = [
    { lat: 24.7994, lng: -107.3940, type: 'urban' as const },
    { lat: 24.8200, lng: -107.4050, type: 'highway' as const },
    { lat: 24.7890, lng: -107.3850, type: 'construction' as const },
    { lat: 24.8100, lng: -107.3900, type: 'urban' as const },
    { lat: 24.8050, lng: -107.4100, type: 'highway' as const },
  ];

  const allPositions: any[] = [];
  for (const gps of gpsDevices) {
    const route = randomElement(routes);
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      date.setHours(8, 0, 0, 0);
      const dayOffset = randomBetween(-0.02, 0.02);
      const points = randomInt(60, 120);
      const positions = generatePositions(gps.id, route.lat + dayOffset, route.lng + dayOffset, points, date, route.type);
      for (const pos of positions) {
        allPositions.push({ ...pos, gpsDeviceId: gps.id });
      }
    }
  }
  for (let i = 0; i < allPositions.length; i += 1000) {
    await prisma.gpsPosition.createMany({ data: allPositions.slice(i, i + 1000) });
  }

  console.log('Generating ignition events...');
  for (const gps of gpsDevices) {
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const onTime1 = new Date(date);
      onTime1.setHours(randomInt(6, 9), randomInt(0, 59), randomInt(0, 59));
      const offTime1 = new Date(date);
      offTime1.setHours(randomInt(12, 14), randomInt(0, 59), randomInt(0, 59));
      const onTime2 = new Date(date);
      onTime2.setHours(randomInt(13, 15), randomInt(0, 59), randomInt(0, 59));
      const offTime2 = new Date(date);
      offTime2.setHours(randomInt(17, 20), randomInt(0, 59), randomInt(0, 59));

      await prisma.ignitionEvent.createMany({
        data: [
          { type: 'IGNITION_ON', timestamp: onTime1, latitude: 24.7994 + randomBetween(-0.01, 0.01), longitude: -107.3940 + randomBetween(-0.01, 0.01) },
          { type: 'IGNITION_OFF', timestamp: offTime1, latitude: 24.8100 + randomBetween(-0.01, 0.01), longitude: -107.4000 + randomBetween(-0.01, 0.01) },
          { type: 'IGNITION_ON', timestamp: onTime2, latitude: 24.8100 + randomBetween(-0.01, 0.01), longitude: -107.4000 + randomBetween(-0.01, 0.01) },
          { type: 'IGNITION_OFF', timestamp: offTime2, latitude: 24.8200 + randomBetween(-0.01, 0.01), longitude: -107.4100 + randomBetween(-0.01, 0.01) },
        ],
      });
    }
  }

  console.log('Generating tracking events...');
  const eventTypes = ['IGNITION_ON', 'IGNITION_OFF', 'GEOFENCE_ENTER', 'GEOFENCE_EXIT', 'OVERSPEED', 'LOW_BATTERY'];

  for (const gps of gpsDevices) {
    for (let day = 0; day < 7; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);
      const eventCount = randomInt(3, 8);
      const events = [];
      for (let i = 0; i < eventCount; i++) {
        const type = randomElement(eventTypes);
        events.push({
          type,
          severity: type === 'OVERSPEED' || type === 'LOW_BATTERY' ? 'WARNING' : 'INFO',
          message: `${type} event`,
          latitude: 24.8000 + randomBetween(-0.03, 0.03),
          longitude: -107.3950 + randomBetween(-0.03, 0.03),
          speed: randomBetween(0, 80),
          timestamp: new Date(date.getTime() + randomInt(28800000, 72000000)),
          gpsDeviceId: gps.id,
        });
      }
      await prisma.trackingEvent.createMany({ data: events });
    }
  }

  console.log('Generating geofence events...');
  const unitNames = [...vehicles.map(v => v.name), ...machines.map(m => m.name)];
  for (let day = 0; day < 7; day++) {
    const date = new Date();
    date.setDate(date.getDate() - day);
    const eventCount = randomInt(4, 10);
    const events = [];
    for (let i = 0; i < eventCount; i++) {
      const gf = randomElement(geofences);
      events.push({
        type: Math.random() > 0.5 ? 'ENTER_GEOFENCE' : 'EXIT_GEOFENCE',
        timestamp: new Date(date.getTime() + randomInt(28800000, 72000000)),
        latitude: gf.centerLat! + randomBetween(-0.01, 0.01),
        longitude: gf.centerLng! + randomBetween(-0.01, 0.01),
        unitName: randomElement(unitNames),
        unitType: Math.random() > 0.4 ? 'VEHICLE' : 'MACHINE',
        geofenceId: gf.id,
      });
    }
    await prisma.geofenceEvent.createMany({ data: events });
  }

  console.log('Generating work sessions...');
  for (const vehicle of vehicles) {
    for (let day = 0; day < 7; day++) {
      if (Math.random() < 0.3) continue;
      const date = new Date();
      date.setDate(date.getDate() - day);
      const startTime = new Date(date);
      startTime.setHours(randomInt(6, 9), randomInt(0, 59), 0, 0);
      const endTime = new Date(date);
      endTime.setHours(randomInt(16, 20), randomInt(0, 59), 0, 0);
      const totalHours = (endTime.getTime() - startTime.getTime()) / 3600000;
      const movingRatio = randomBetween(0.5, 0.8);
      await prisma.workSession.create({
        data: {
          date, startTime, endTime, totalHours,
          kilometers: totalHours * randomBetween(15, 60),
          idleHours: totalHours * (1 - movingRatio),
          movingHours: totalHours * movingRatio,
          vehicleId: vehicle.id,
        },
      });
    }
  }

  for (const machine of machines) {
    for (let day = 0; day < 7; day++) {
      if (Math.random() < 0.2) continue;
      const date = new Date();
      date.setDate(date.getDate() - day);
      const startTime = new Date(date);
      startTime.setHours(randomInt(7, 9), randomInt(0, 59), 0, 0);
      const endTime = new Date(date);
      endTime.setHours(randomInt(17, 19), randomInt(0, 59), 0, 0);
      const totalHours = (endTime.getTime() - startTime.getTime()) / 3600000;
      await prisma.workSession.create({
        data: {
          date, startTime, endTime, totalHours,
          kilometers: totalHours * randomBetween(5, 20),
          idleHours: totalHours * randomBetween(0.15, 0.35),
          movingHours: totalHours * randomBetween(0.65, 0.85),
          machineId: machine.id,
        },
      });
    }
  }

  console.log('Seed completed!');
  console.log(`Created: ${vehicles.length} vehicles, ${machines.length} machines, ${gpsDevices.length} GPS devices`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
