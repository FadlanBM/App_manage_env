-- AlterTable
ALTER TABLE "users" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "secret_items" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "key_name" TEXT NOT NULL,
    "encrypted_data" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_items_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "secret_items" ADD CONSTRAINT "secret_items_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
