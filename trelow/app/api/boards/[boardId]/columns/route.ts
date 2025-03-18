import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// POST /api/boards/[boardId]/columns - Ajouter une colonne à un tableau
export async function POST(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { boardId } = await params;
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { message: "Le titre est requis" },
        { status: 400 }
      );
    }

    // Vérifier que l'utilisateur a accès au tableau
    const board = await prisma.board.findFirst({
      where: {
        id: boardId,
        OR: [
          { creatorId: session.user.id },
          { members: { some: { id: session.user.id } } },
        ],
      },
    });

    if (!board) {
      return NextResponse.json(
        { message: "Tableau non trouvé ou accès refusé" },
        { status: 404 }
      );
    }

    const column = await prisma.column.create({
      data: {
        title,
        boardId,
      },
    });

    return NextResponse.json(column, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la colonne:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création de la colonne" },
      { status: 500 }
    );
  }
}
