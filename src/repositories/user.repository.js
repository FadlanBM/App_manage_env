import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

export const UserRepository = {
  findByEmail(email) {
    return db.user.findUnique({ where: { email } });
  },

  findById(id) {
    return db.user.findUnique({ where: { id } });
  },

  create({ name, email, passwordHash }) {
    return db.user.create({
      data: { name, email, passwordHash },
      select: { id: true, name: true, email: true, createdAt: true },
    });
  },

  updateRole(id, role) {
    return db.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
  },

  async clear() {
    await db.user.deleteMany();
  },
};
