import { withAuth } from "next-auth/middleware";

/**
 * Protection des espaces par rôle (vérification rapide sur le JWT).
 * Les contrôles fins (18+ vérifié, consentement, bannissement) sont refaits
 * côté serveur dans les layouts et les routes API, à partir de la base.
 */
export default withAuth({
  pages: { signIn: "/connexion" },
  callbacks: {
    authorized({ req, token }) {
      if (!token) return false;
      const chemin = req.nextUrl.pathname;
      if (chemin.startsWith("/createur")) return token.role === "createur";
      if (chemin.startsWith("/fan")) return token.role === "fan";
      return true;
    },
  },
});

export const config = { matcher: ["/createur/:path*", "/fan/:path*"] };
