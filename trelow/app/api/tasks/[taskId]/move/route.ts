import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// PUT /api/tasks/[taskId]/move - Déplacer une tâche entre colonnes
export async function PUT(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { taskId } = params;
    const body = await request.json();
    const { destinationColumnId } = body;

    if (!destinationColumnId) {
      return NextResponse.json(
        { message: "Colonne de destination requise" },
        { status: 400 }
      );
    }

    // Vérifier que la tâche existe
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        column: {
          include: { board: true },
        },
      },
    });

    if (!task) {
      return NextResponse.json(
        { message: "Tâche non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a accès au tableau
    const hasAccess = await prisma.board.findFirst({
      where: {
        id: task.column.boardId,
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

    // Vérifier que la colonne de destination existe et appartient au même tableau
    const destinationColumn = await prisma.column.findUnique({
      where: { id: destinationColumnId },
    });

    if (!destinationColumn) {
      return NextResponse.json(
        { message: "Colonne de destination non trouvée" },
        { status: 404 }
      );
    }

    if (destinationColumn.boardId !== task.column.boardId) {
      return NextResponse.json(
        {
          message: "La colonne de destination n'appartient pas au même tableau",
        },
        { status: 400 }
      );
    }

    // Déplacer la tâche
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { columnId: destinationColumnId },
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Erreur lors du déplacement de la tâche:", error);
    return NextResponse.json(
      { message: "Erreur lors du déplacement de la tâche" },
      { status: 500 }
    );
  }
}
