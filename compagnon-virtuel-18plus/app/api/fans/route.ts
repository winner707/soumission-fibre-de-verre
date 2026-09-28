import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/redis";
import { SchemaInscription } from "@/lib/validations";
import { exigerCreateur, reponseErreur } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/fans : inscription d'un fan (majeur, CGU acceptées, consentement explicite). */
export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if ((await kv.incr(`inscription:${ip}`, 60 * 60)) > 10) {
      return NextResponse.json({ erreur: "Trop de tentatives, réessayez plus tard." }, { status: 429 });
    }

    const parsed = SchemaInscription.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const d = parsed.data;

    // MVP : un seul créateur / persona actif par instance
    const persona = await prisma.persona.findFirst({ where: { actif: true }, orderBy: { createdAt: "asc" } });
    if (!persona) return NextResponse.json({ erreur: "Aucun personnage disponible pour le moment." }, { status: 503 });

    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash: await bcrypt.hash(d.password, 12),
        role: "fan",
        dateNaissance: new Date(d.dateNaissance),
        fan: {
          create: {
            personaId: persona.id,
            pseudo: d.pseudo,
            consentementDonne: true,
            consentementLe: new Date(),
          },
        },
      },
    });
    return NextResponse.json({ id: user.id }, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ erreur: "Cet e-mail est déjà utilisé." }, { status: 409 });
    }
    return reponseErreur(e);
  }
}

/** GET /api/fans : liste des fans du créateur connecté. */
export async function GET() {
  try {
    const createur = await exigerCreateur();
    if (!createur.persona) return NextResponse.json({ fans: [] });
    const fans = await prisma.fan.findMany({
      where: { personaId: createur.persona.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    });
    const signalements = await prisma.message.groupBy({
      by: ["fanId"],
      where: { fan: { personaId: createur.persona.id }, verdict: { in: ["limite", "interdit"] } },
      _count: true,
    });
    const parFan = new Map(signalements.map((s) => [s.fanId, s._count]));
    return NextResponse.json({
      fans: fans.map((f) => ({
        id: f.id,
        pseudo: f.pseudo,
        ton: f.ton,
        banni: f.banni,
        consentementDonne: f.consentementDonne,
        messages: f._count.messages,
        signalements: parFan.get(f.id) ?? 0,
        dernierMessage: f.messages[0]?.createdAt ?? null,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
