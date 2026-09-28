import Link from "next/link";
import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import { Deconnexion } from "@/components/Deconnexion";

export const dynamic = "force-dynamic";

export default async function LayoutCreateur({ children }: { children: React.ReactNode }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion?callbackUrl=/createur");
  if (user.role !== "createur") redirect("/fan");

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <nav className="container flex h-12 items-center gap-5 text-sm">
          <Link href="/createur" className="font-serif text-lg text-or">Studio créateur</Link>
          <Link href="/createur/persona" className="text-muted-foreground hover:text-foreground">Persona & limites</Link>
          <Link href="/createur/fans" className="text-muted-foreground hover:text-foreground">Fans</Link>
          <div className="ml-auto"><Deconnexion /></div>
        </nav>
      </header>
      <main className="container py-8">{children}</main>
    </div>
  );
}
