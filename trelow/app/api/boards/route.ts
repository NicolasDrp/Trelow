import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// GET /api/boards - Récupérer tous les tableaux de l'utilisateur
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const boards = await prisma.board.findMany({
      where: {
        OR: [
          { creatorId: session.user.id },
          { members: { some: { id: session.user.id } } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(boards);
  } catch (error) {
    console.error("Erreur lors de la récupération des tableaux:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération des tableaux" },
      { status: 500 }
    );
  }
}

// POST /api/boards - Créer un nouveau tableau
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { message: "Le contenu est requis" },
        { status: 400 }
      );
    }

    const board = await prisma.board.create({
      data: {
        content,
        creatorId: session.user.id,
      },
    });

    return NextResponse.json(board, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du tableau:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création du tableau" },
      { status: 500 }
    );
  }
}
