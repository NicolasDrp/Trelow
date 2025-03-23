import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import * as webpush from "web-push";

const prisma = new PrismaClient();

// Configurer web-push
webpush.setVapidDetails(
  "mailto:contact@votresite.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

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

    const { columnId } = await params;
    const body = await request.json();
    const { title, content, priority } = body;

    if (!title) {
      return NextResponse.json(
        { message: "Le titre est requis" },
        { status: 400 }
      );
    }

    // Vérifier que la colonne existe et récupérer les informations du tableau
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: {
        board: {
          include: {
            creator: true,
            members: true,
          },
        },
      },
    });

    if (!column) {
      return NextResponse.json(
        { message: "Colonne non trouvée" },
        { status: 404 }
      );
    }

    // Vérifier que l'utilisateur a accès au tableau
    const board = column.board;
    const hasAccess =
      board.creatorId === session.user.id ||
      board.members.some((member) => member.id === session.user.id);

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

    // Envoyer des notifications
    const usersToNotify = [
      ...board.members.filter((m) => m.id !== session.user.id),
    ];

    if (board.creator.id !== session.user.id) {
      usersToNotify.push(board.creator);
    }

    for (const user of usersToNotify) {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: user.id },
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title: "Nouvelle tâche ajoutée",
              body: `${
                session.user.username || "Un utilisateur"
              } a ajouté "${title}" au tableau "${board.content}"`,
              url: `/board/${board.id}`,
            })
          );
        } catch (error) {
          console.error("Erreur d'envoi de notification:", error);
        }
      }
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création de la tâche:", error);
    return NextResponse.json(
      { message: "Erreur lors de la création de la tâche" },
      { status: 500 }
    );
  }
}
