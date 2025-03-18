import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

const prisma = new PrismaClient();

// PUT /api/columns/[columnId] - Update a column
export async function PUT(
  request: Request,
  { params }: { params: { columnId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { columnId } = params;
    const body = await request.json();
    const { title } = body;

    if (!title) {
      return NextResponse.json(
        { message: "Title is required" },
        { status: 400 }
      );
    }

    // Get the column to check board access
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      return NextResponse.json(
        { message: "Column not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this board
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
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Update the column
    const updatedColumn = await prisma.column.update({
      where: { id: columnId },
      data: { title },
    });

    return NextResponse.json(updatedColumn);
  } catch (error) {
    console.error("Error updating column:", error);
    return NextResponse.json(
      { message: "Error updating column" },
      { status: 500 }
    );
  }
}

// DELETE /api/columns/[columnId] - Delete a column
export async function DELETE(
  request: Request,
  { params }: { params: { columnId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { columnId } = params;

    // Get the column to check board access
    const column = await prisma.column.findUnique({
      where: { id: columnId },
      include: { board: true },
    });

    if (!column) {
      return NextResponse.json(
        { message: "Column not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this board
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
      return NextResponse.json({ message: "Access denied" }, { status: 403 });
    }

    // Delete all tasks in the column first
    await prisma.task.deleteMany({
      where: { columnId },
    });

    // Delete the column
    await prisma.column.delete({
      where: { id: columnId },
    });

    return NextResponse.json({ message: "Column deleted successfully" });
  } catch (error) {
    console.error("Error deleting column:", error);
    return NextResponse.json(
      { message: "Error deleting column" },
      { status: 500 }
    );
  }
}
