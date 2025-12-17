/*
  Warnings:

  - You are about to drop the column `roomId` on the `Message` table. All the data in the column will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomInvite` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomMember` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `friendId` to the `Message` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_ownerId_fkey";

-- DropForeignKey
ALTER TABLE "RoomInvite" DROP CONSTRAINT "RoomInvite_inviteeId_fkey";

-- DropForeignKey
ALTER TABLE "RoomInvite" DROP CONSTRAINT "RoomInvite_inviterId_fkey";

-- DropForeignKey
ALTER TABLE "RoomInvite" DROP CONSTRAINT "RoomInvite_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_roomId_fkey";

-- DropForeignKey
ALTER TABLE "RoomMember" DROP CONSTRAINT "RoomMember_userId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "roomId",
ADD COLUMN     "friendId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Room";

-- DropTable
DROP TABLE "RoomInvite";

-- DropTable
DROP TABLE "RoomMember";

-- DropEnum
DROP TYPE "RoomType";

-- CreateTable
CREATE TABLE "Friend" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,

    CONSTRAINT "Friend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Friend_senderId_receiverId_key" ON "Friend"("senderId", "receiverId");

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friend" ADD CONSTRAINT "Friend_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Friend"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
