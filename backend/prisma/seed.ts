/**
 * Cria o usuário Administrador (tipo=ADMIN) a partir de ADMIN_EMAIL/
 * ADMIN_PASSWORD (só usadas aqui, nunca em runtime — ver AuthService).
 * Idempotente: se o e-mail já existir, apenas atualiza a senha.
 *
 * Uso: npm run prisma:seed --workspace=backend
 */
import { PrismaClient, TipoUsuario } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const senha = process.env.ADMIN_PASSWORD;

  if (!email || !senha) {
    console.warn(
      'ADMIN_EMAIL/ADMIN_PASSWORD não configurados no .env — nenhum administrador foi criado. ' +
        'Defina as duas variáveis e rode o seed de novo quando quiser criar o primeiro acesso.',
    );
    return;
  }

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.usuario.upsert({
    where: { email },
    update: { senhaHash, tipo: TipoUsuario.ADMIN, ativo: true },
    create: {
      nome: 'Administrador',
      email,
      senhaHash,
      tipo: TipoUsuario.ADMIN,
    },
  });

  console.log(`Administrador pronto: ${usuario.email} (id ${usuario.id}).`);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
