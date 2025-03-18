import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// POST /api/columns/[columnId]/tasks - Ajouter une tâche à une colonne
export async function POST(
  request: Request,
  { params }: { params: { columnId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { columnId } = params;
    const body = await request.json();
    const { title, content, priority } = body;

    if (!title) {
      return NextResponse.json(
        { message: "Le titre est requis" },
        { status: 400 }
      );
    }

    // Vérifier que la colonne existe et que l'utilisateur a accès
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      return NextResponse.json(
        { message: "Colonne non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a accès au tableau
    const hasAccess = await prisma.board.findFirst({
      where: {
        id: column.boardId,
        OR: [
          { creatorId: session.user.id },
          { members: { some: { id: session.user.id } } },
        ],
      },
    });

    if (!hasAccess) {
      return NextResponse.json(
        { message: "Accès non autorisé" },
        { status: 403 }
      );
    }

    const task = await prisma.task.create({
      data: {
        title,
        content,
        priority: priority || "medium",
        columnId,
        userId: session.user.id,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création de la tâche" },
      { status: 500 }
    );
  }
}
