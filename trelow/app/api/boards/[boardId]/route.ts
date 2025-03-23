import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma"; // Use singleton import

// GET /api/boards/[boardId] - Récupérer les détails d'un tableau
export async function GET(
  request: Request,
  { params }: { params: { boardId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
    }

    const { boardId } = await params;

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          include: {
            tasks: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!board) {
      return NextResponse.json(
        { message: "Tableau non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a accès à ce tableau
    const isCreator = board.creatorId === session.user.id;
    const isMember = await prisma.board.findFirst({
      where: {
        id: boardId,
        members: { some: { id: session.user.id } },
      },
    });

    if (!isCreator && !isMember) {
      return NextResponse.json(
        { message: "Accès non autorisé" },
        { status: 403 }
      );
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Erreur lors de la récupération du tableau:", error);
    return NextResponse.json(
      { message: "Erreur lors de la récupération du tableau" },
      { status: 500 }
    );
  }
}
