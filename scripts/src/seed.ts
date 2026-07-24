import { db } from "../../lib/db/src/index.js";
import {
  serviceTypesTable,
  citiesTable,
  platformConfigTable,
} from "../../lib/db/src/schema/index.js";

async function seed() {
  // Service types
  const existing = await db.select().from(serviceTypesTable).limit(1);
  if (existing.length === 0) {
    await db.insert(serviceTypesTable).values([
      {
        name: "Auto Remis",
        icon: "car",
        description: "Transporte en automóvil con conductor profesional",
        basePrice: 500,
        pricePerKm: 80,
        isActive: true,
      },
      {
        name: "Moto Remis",
        icon: "motorcycle",
        description: "Transporte rápido en moto",
        basePrice: 250,
        pricePerKm: 50,
        isActive: true,
      },
      {
        name: "Moto Mandado",
        icon: "package",
        description: "Envío de paquetes y mandados en moto",
        basePrice: 300,
        pricePerKm: 60,
        isActive: true,
      },
    ]);
    console.log("✓ Service types seeded");
  } else {
    console.log("✓ Service types already exist");
  }

  // Cities
  const existingCities = await db.select().from(citiesTable).limit(1);
  if (existingCities.length === 0) {
    await db.insert(citiesTable).values([
      {
        name: "Buenos Aires",
        country: "Argentina",
        state: "Buenos Aires",
        isActive: true,
        lat: -34.6037,
        lng: -58.3816,
      },
      {
        name: "Córdoba",
        country: "Argentina",
        state: "Córdoba",
        isActive: true,
        lat: -31.4201,
        lng: -64.1888,
      },
      {
        name: "Rosario",
        country: "Argentina",
        state: "Santa Fe",
        isActive: true,
        lat: -32.9442,
        lng: -60.6505,
      },
      {
        name: "Mendoza",
        country: "Argentina",
        state: "Mendoza",
        isActive: true,
        lat: -32.8908,
        lng: -68.8272,
      },
      {
        name: "San Miguel de Tucumán",
        country: "Argentina",
        state: "Tucumán",
        isActive: true,
        lat: -26.8083,
        lng: -65.2176,
      },
    ]);
    console.log("✓ Cities seeded");
  } else {
    console.log("✓ Cities already exist");
  }

  // Platform config
  const existingConfig = await db.select().from(platformConfigTable).limit(1);
  if (existingConfig.length === 0) {
    await db.insert(platformConfigTable).values({
      commissionPercent: 20,
      minTripPrice: 350,
      maxSearchRadius: 10,
      allowedPaymentMethods: '["cash","mercadopago","card"]',
      maintenanceMode: false,
    });
    console.log("✓ Platform config seeded");
  } else {
    console.log("✓ Platform config already exists");
  }

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
