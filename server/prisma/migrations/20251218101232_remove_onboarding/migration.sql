/*
  Warnings:

  - You are about to drop the column `onboardingSeen` on the `User` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_friendId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN "onboardingSeen";

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "Friend"("id") ON DELETE CASCADE ON UPDATE CASCADE;
