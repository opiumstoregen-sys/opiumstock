import express from "express";
import cors from "cors";
import { z } from "zod";
import { prisma } from "./db.js";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

const category = z.enum(["SOCIAL", "GAMING", "WORK", "WEB", "OTHER"]);

const serviceCreate = z.object({
  name: z.string().trim().min(1).max(80),
  category
});

const serviceUpdate = serviceCreate.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Aucune modification."
);

const credentialCreate = z.object({
  email: z.string().trim().min(1).max(320),
  password: z.string().min(1).max(1000)
});

const credentialUpdate = credentialCreate.partial().refine(
  (data) => Object.keys(data).length > 0,
  "Aucune modification."
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/dashboard", async (_req, res) => {
  const [serviceCount, credentialCount, services, lastActivity] = await Promise.all([
    prisma.service.count(),
    prisma.credential.count(),
    prisma.service.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { _count: { select: { credentials: true } } }
    }),
    prisma.activity.findFirst({
      orderBy: { createdAt: "desc" },
      include: { service: true }
    })
  ]);

  res.json({
    serviceCount,
    credentialCount,
    recentServices: services,
    lastActivity
  });
});

app.get("/api/services", async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const categoryFilter = typeof req.query.category === "string" ? req.query.category : undefined;

  const services = await prisma.service.findMany({
    where: {
      ...(q ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { credentials: { some: { email: { contains: q, mode: "insensitive" } } } }
        ]
      } : {}),
      ...(categoryFilter && category.safeParse(categoryFilter).success
        ? { category: categoryFilter as z.infer<typeof category> }
        : {})
    },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { credentials: true } }
    }
  });

  res.json(services);
});

app.get("/api/services/:id", async (req, res) => {
  const service = await prisma.service.findUnique({
    where: { id: req.params.id },
    include: { credentials: { orderBy: { createdAt: "desc" } } }
  });

  if (!service) return res.status(404).json({ error: "Service introuvable." });
  res.json(service);
});

app.post("/api/services", async (req, res) => {
  const parsed = serviceCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  const service = await prisma.service.create({ data: parsed.data });
  await prisma.activity.create({
    data: { action: "SERVICE_CREATED", serviceId: service.id }
  });

  res.status(201).json(service);
});

app.patch("/api/services/:id", async (req, res) => {
  const parsed = serviceUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  try {
    const service = await prisma.service.update({
      where: { id: req.params.id },
      data: parsed.data
    });
    await prisma.activity.create({
      data: { action: "SERVICE_UPDATED", serviceId: service.id }
    });
    res.json(service);
  } catch {
    res.status(404).json({ error: "Service introuvable." });
  }
});

app.delete("/api/services/:id", async (req, res) => {
  try {
    await prisma.activity.create({
      data: { action: "SERVICE_DELETED", serviceId: req.params.id }
    }).catch(() => undefined);

    await prisma.service.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Service introuvable." });
  }
});

app.post("/api/services/:id/credentials", async (req, res) => {
  const parsed = credentialCreate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) return res.status(404).json({ error: "Service introuvable." });

  const credential = await prisma.credential.create({
    data: { ...parsed.data, serviceId: service.id }
  });

  await prisma.activity.create({
    data: { action: "CREDENTIAL_CREATED", serviceId: service.id }
  });

  res.status(201).json(credential);
});

app.patch("/api/credentials/:id", async (req, res) => {
  const parsed = credentialUpdate.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });

  try {
    const credential = await prisma.credential.update({
      where: { id: req.params.id },
      data: parsed.data
    });
    await prisma.activity.create({
      data: { action: "CREDENTIAL_UPDATED", serviceId: credential.serviceId }
    });
    res.json(credential);
  } catch {
    res.status(404).json({ error: "Entrée introuvable." });
  }
});

app.delete("/api/credentials/:id", async (req, res) => {
  try {
    const credential = await prisma.credential.delete({ where: { id: req.params.id } });
    await prisma.activity.create({
      data: { action: "CREDENTIAL_DELETED", serviceId: credential.serviceId }
    });
    res.status(204).send();
  } catch {
    res.status(404).json({ error: "Entrée introuvable." });
  }
});

app.listen(port, () => {
  console.log(`OpiumStock API: http://localhost:${port}`);
});