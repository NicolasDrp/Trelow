import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import { compare } from "bcryptjs";
import type { NextAuthOptions } from "next-auth";

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  debug: true, // Activer le mode debug
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 jours
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Nom d'utilisateur", type: "text" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        console.log(
          "Tentative d'authentification pour:",
          credentials?.username
        );

        if (!credentials?.username || !credentials?.password) {
          console.log("Identifiants manquants");
          throw new Error("Identifiants manquants");
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username },
        });

        if (!user) {
          console.log("Utilisateur non trouvé");
          throw new Error("Utilisateur non trouvé");
        }

        const isValid = await compare(credentials.password, user.password);
        if (!isValid) {
          console.log("Mot de passe incorrect");
          throw new Error("Mot de passe incorrect");
        }

        console.log("Authentification réussie pour:", user.username);
        return {
          id: user.id,
          username: user.username,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      console.log("JWT Callback - User:", user ? "présent" : "absent");
      if (user) {
        token.id = user.id;
        token.username = user.username;
      }
      console.log("JWT token généré:", token);
      return token;
    },
    async session({ session, token }) {
      console.log("Session Callback - Token:", token ? "présent" : "absent");
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.username = token.username as string;
      }
      console.log("Session créée:", session);
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
