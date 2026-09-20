import Link from "next/link";

export default async function ErreurAuthentification({
  searchParams,
}: PageProps<"/auth/erreur">) {
  const { motif } = await searchParams;
  const message = typeof motif === "string" ? motif : "Raison inconnue.";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-16">
      <h1 className="text-2xl font-semibold">Authentification impossible</h1>
      <p className="mt-3 text-texte-doux">{message}</p>
      <Link
        href="/"
        className="mt-6 inline-block text-accent underline underline-offset-4"
      >
        Retour a l&apos;accueil
      </Link>
    </main>
  );
}
